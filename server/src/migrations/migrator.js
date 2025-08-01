import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseMigrator {
  constructor(db, dbConfig) {
    this.db = db;
    this.dbConfig = dbConfig;
    this.migrationsPath = path.join(__dirname, 'scripts');
    this.isPostgreSQL = dbConfig.type === 'postgresql';
    
    this.ensureMigrationsTable();
  }

  /**
   * Ensure migrations tracking table exists
   */
  async ensureMigrationsTable() {
    const createTableSQL = this.isPostgreSQL ? `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        success BOOLEAN DEFAULT TRUE
      );
    ` : `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        success BOOLEAN DEFAULT 1
      );
    `;

    try {
      if (this.isPostgreSQL) {
        await this.db.query(createTableSQL);
      } else {
        await new Promise((resolve, reject) => {
          this.db.run(createTableSQL, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      console.log('✅ Migrations table ready');
    } catch (error) {
      console.error('❌ Failed to create migrations table:', error);
      throw error;
    }
  }

  /**
   * Get list of applied migrations
   * @returns {Array} List of applied migrations
   */
  async getAppliedMigrations() {
    const query = 'SELECT version, name, checksum, executed_at, success FROM migrations ORDER BY version';
    
    try {
      if (this.isPostgreSQL) {
        const result = await this.db.query(query);
        return result.rows;
      } else {
        return new Promise((resolve, reject) => {
          this.db.all(query, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });
      }
    } catch (error) {
      console.error('Failed to get applied migrations:', error);
      return [];
    }
  }

  /**
   * Get list of available migration files
   * @returns {Array} List of migration files
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrations = [];
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(this.migrationsPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          const checksum = crypto.createHash('sha256').update(content).digest('hex');
          
          // Extract version and name from filename (format: YYYYMMDD_HHMMSS_description.js)
          const match = file.match(/^(\d{8}_\d{6})_(.+)\.js$/);
          if (match) {
            migrations.push({
              version: match[1],
              name: match[2].replace(/_/g, ' '),
              filename: file,
              filePath,
              checksum
            });
          }
        }
      }
      
      // Sort by version
      return migrations.sort((a, b) => a.version.localeCompare(b.version));
    } catch (error) {
      console.error('Failed to get available migrations:', error);
      return [];
    }
  }

  /**
   * Get pending migrations
   * @returns {Array} List of pending migrations
   */
  async getPendingMigrations() {
    const applied = await this.getAppliedMigrations();
    const available = await this.getAvailableMigrations();
    
    const appliedVersions = new Set(applied.map(m => m.version));
    return available.filter(m => !appliedVersions.has(m.version));
  }

  /**
   * Validate migration checksums
   * @returns {Array} List of checksum mismatches
   */
  async validateMigrations() {
    const applied = await this.getAppliedMigrations();
    const available = await this.getAvailableMigrations();
    
    const availableMap = new Map(available.map(m => [m.version, m]));
    const mismatches = [];
    
    for (const appliedMigration of applied) {
      const availableMigration = availableMap.get(appliedMigration.version);
      
      if (!availableMigration) {
        mismatches.push({
          version: appliedMigration.version,
          type: 'missing_file',
          message: 'Migration file not found'
        });
      } else if (appliedMigration.checksum !== availableMigration.checksum) {
        mismatches.push({
          version: appliedMigration.version,
          type: 'checksum_mismatch',
          message: 'Migration file has been modified after execution'
        });
      }
    }
    
    return mismatches;
  }

  /**
   * Run a single migration
   * @param {Object} migration - Migration to run
   * @returns {Object} Execution result
   */
  async runMigration(migration) {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Running migration: ${migration.version} - ${migration.name}`);
      
      // Import the migration module
      const migrationModule = await import(migration.filePath);
      
      if (!migrationModule.up || typeof migrationModule.up !== 'function') {
        throw new Error('Migration must export an "up" function');
      }
      
      // Start transaction
      if (this.isPostgreSQL) {
        await this.db.query('BEGIN');
      } else {
        await new Promise((resolve, reject) => {
          this.db.run('BEGIN TRANSACTION', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      
      try {
        // Run the migration
        await migrationModule.up(this.db, this.isPostgreSQL);
        
        // Record successful migration
        const executionTime = Date.now() - startTime;
        await this.recordMigration(migration, executionTime, true);
        
        // Commit transaction
        if (this.isPostgreSQL) {
          await this.db.query('COMMIT');
        } else {
          await new Promise((resolve, reject) => {
            this.db.run('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        
        console.log(`✅ Migration completed: ${migration.version} (${executionTime}ms)`);
        
        return {
          success: true,
          version: migration.version,
          executionTime
        };
        
      } catch (error) {
        // Rollback transaction
        if (this.isPostgreSQL) {
          await this.db.query('ROLLBACK');
        } else {
          await new Promise((resolve) => {
            this.db.run('ROLLBACK', () => resolve());
          });
        }
        
        throw error;
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Record failed migration
      try {
        await this.recordMigration(migration, executionTime, false, error.message);
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }
      
      console.error(`❌ Migration failed: ${migration.version} - ${error.message}`);
      
      return {
        success: false,
        version: migration.version,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Record migration execution in database
   * @param {Object} migration - Migration info
   * @param {number} executionTime - Execution time in ms
   * @param {boolean} success - Whether migration succeeded
   * @param {string} errorMessage - Error message if failed
   */
  async recordMigration(migration, executionTime, success, errorMessage = null) {
    const query = this.isPostgreSQL ? `
      INSERT INTO migrations (version, name, checksum, execution_time, success)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (version) DO UPDATE SET
        execution_time = $4,
        success = $5,
        executed_at = CURRENT_TIMESTAMP
    ` : `
      INSERT OR REPLACE INTO migrations (version, name, checksum, execution_time, success)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      migration.version,
      migration.name,
      migration.checksum,
      executionTime,
      success
    ];
    
    if (this.isPostgreSQL) {
      await this.db.query(query, params);
    } else {
      await new Promise((resolve, reject) => {
        this.db.run(query, params, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  /**
   * Run all pending migrations
   * @param {Object} options - Migration options
   * @returns {Object} Migration results
   */
  async migrate(options = {}) {
    const { dryRun = false, target = null } = options;
    
    console.log(`🚀 Starting database migration${dryRun ? ' (dry run)' : ''}...`);
    
    // Validate existing migrations
    const validationErrors = await this.validateMigrations();
    if (validationErrors.length > 0) {
      console.error('❌ Migration validation failed:');
      validationErrors.forEach(error => {
        console.error(`  - ${error.version}: ${error.message}`);
      });
      
      if (!options.force) {
        throw new Error('Migration validation failed. Use --force to ignore.');
      }
    }
    
    // Get pending migrations
    let pendingMigrations = await this.getPendingMigrations();
    
    // Filter to target version if specified
    if (target) {
      pendingMigrations = pendingMigrations.filter(m => m.version <= target);
    }
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return { success: true, executed: [] };
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach(m => {
      console.log(`  - ${m.version}: ${m.name}`);
    });
    
    if (dryRun) {
      console.log('🔍 Dry run completed - no migrations executed');
      return { success: true, executed: [], dryRun: true };
    }
    
    // Execute migrations
    const results = [];
    let allSuccessful = true;
    
    for (const migration of pendingMigrations) {
      const result = await this.runMigration(migration);
      results.push(result);
      
      if (!result.success) {
        allSuccessful = false;
        if (!options.continueOnError) {
          break;
        }
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failureCount}`);
    
    if (allSuccessful) {
      console.log('🎉 All migrations completed successfully!');
    } else {
      console.log('⚠️  Some migrations failed. Check the logs above.');
    }
    
    return {
      success: allSuccessful,
      executed: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    };
  }

  /**
   * Rollback last migration(s)
   * @param {number} steps - Number of migrations to rollback
   * @returns {Object} Rollback results
   */
  async rollback(steps = 1) {
    console.log(`🔄 Rolling back ${steps} migration(s)...`);
    
    const appliedMigrations = await this.getAppliedMigrations();
    const successfulMigrations = appliedMigrations
      .filter(m => m.success)
      .sort((a, b) => b.version.localeCompare(a.version)) // Newest first
      .slice(0, steps);
    
    if (successfulMigrations.length === 0) {
      console.log('✅ No migrations to rollback');
      return { success: true, rolledBack: [] };
    }
    
    const results = [];
    let allSuccessful = true;
    
    for (const appliedMigration of successfulMigrations) {
      try {
        console.log(`🔄 Rolling back: ${appliedMigration.version} - ${appliedMigration.name}`);
        
        // Find migration file
        const available = await this.getAvailableMigrations();
        const migrationFile = available.find(m => m.version === appliedMigration.version);
        
        if (!migrationFile) {
          throw new Error('Migration file not found');
        }
        
        // Import the migration module
        const migrationModule = await import(migrationFile.filePath);
        
        if (!migrationModule.down || typeof migrationModule.down !== 'function') {
          throw new Error('Migration must export a "down" function for rollback');
        }
        
        // Start transaction
        if (this.isPostgreSQL) {
          await this.db.query('BEGIN');
        } else {
          await new Promise((resolve, reject) => {
            this.db.run('BEGIN TRANSACTION', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
        
        try {
          // Run rollback
          await migrationModule.down(this.db, this.isPostgreSQL);
          
          // Remove migration record
          const deleteQuery = 'DELETE FROM migrations WHERE version = ?';
          const params = [appliedMigration.version];
          
          if (this.isPostgreSQL) {
            await this.db.query(deleteQuery.replace('?', '$1'), params);
          } else {
            await new Promise((resolve, reject) => {
              this.db.run(deleteQuery, params, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
          
          // Commit transaction
          if (this.isPostgreSQL) {
            await this.db.query('COMMIT');
          } else {
            await new Promise((resolve, reject) => {
              this.db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
          
          console.log(`✅ Rollback completed: ${appliedMigration.version}`);
          results.push({ success: true, version: appliedMigration.version });
          
        } catch (error) {
          // Rollback transaction
          if (this.isPostgreSQL) {
            await this.db.query('ROLLBACK');
          } else {
            await new Promise((resolve) => {
              this.db.run('ROLLBACK', () => resolve());
            });
          }
          throw error;
        }
        
      } catch (error) {
        console.error(`❌ Rollback failed: ${appliedMigration.version} - ${error.message}`);
        results.push({ 
          success: false, 
          version: appliedMigration.version, 
          error: error.message 
        });
        allSuccessful = false;
        break; // Stop on first failure
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 Rollback Summary: ${successCount}/${results.length} successful`);
    
    return {
      success: allSuccessful,
      rolledBack: results
    };
  }

  /**
   * Get migration status
   * @returns {Object} Migration status
   */
  async getStatus() {
    const applied = await this.getAppliedMigrations();
    const available = await this.getAvailableMigrations();
    const pending = await this.getPendingMigrations();
    const validationErrors = await this.validateMigrations();
    
    return {
      applied: applied.length,
      available: available.length,
      pending: pending.length,
      validationErrors: validationErrors.length,
      lastMigration: applied.length > 0 ? applied[applied.length - 1] : null,
      isUpToDate: pending.length === 0 && validationErrors.length === 0
    };
  }

  /**
   * Create a new migration file
   * @param {string} name - Migration name
   * @returns {string} Migration file path
   */
  async createMigration(name) {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .substring(0, 15); // YYYYMMDD_HHMMSS
    
    const safeName = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    
    const filename = `${timestamp}_${safeName}.js`;
    const filePath = path.join(this.migrationsPath, filename);
    
    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

/**
 * Run the migration
 * @param {Object} db - Database connection
 * @param {boolean} isPostgreSQL - Whether using PostgreSQL
 */
export async function up(db, isPostgreSQL) {
  // Add your migration logic here
  
  // Example for PostgreSQL:
  if (isPostgreSQL) {
    await db.query(\`
      -- PostgreSQL specific SQL
    \`);
  } else {
    // SQLite specific logic
    await new Promise((resolve, reject) => {
      db.run(\`
        -- SQLite specific SQL
      \`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * Rollback the migration
 * @param {Object} db - Database connection
 * @param {boolean} isPostgreSQL - Whether using PostgreSQL
 */
export async function down(db, isPostgreSQL) {
  // Add your rollback logic here
  
  // Example for PostgreSQL:
  if (isPostgreSQL) {
    await db.query(\`
      -- PostgreSQL rollback SQL
    \`);
  } else {
    // SQLite rollback logic
    await new Promise((resolve, reject) => {
      db.run(\`
        -- SQLite rollback SQL
      \`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
`;

    // Ensure migrations directory exists
    await fs.mkdir(this.migrationsPath, { recursive: true });
    
    // Write migration file
    await fs.writeFile(filePath, template);
    
    console.log(`✅ Created migration: ${filename}`);
    return filePath;
  }
}

export default DatabaseMigrator;