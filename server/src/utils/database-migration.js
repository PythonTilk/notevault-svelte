import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from '../config/database.js';
import dbPool from '../config/database-optimized.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Database Migration Utility
 * 
 * Helps migrate from basic SQLite setup to optimized connection pool
 * and applies performance optimizations.
 */

class DatabaseMigration {
  constructor() {
    this.migrationPath = path.join(__dirname, '../../migrations');
    this.ensureMigrationDirectory();
  }

  ensureMigrationDirectory() {
    if (!fs.existsSync(this.migrationPath)) {
      fs.mkdirSync(this.migrationPath, { recursive: true });
    }
  }

  async createMigrationTable() {
    await dbPool.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT,
        description TEXT
      )
    `);

    // Also create encryption_keys table for key rotation
    await dbPool.run(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id TEXT PRIMARY KEY,
        key_version INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        active BOOLEAN DEFAULT true,
        deactivated_at DATETIME,
        rotated_by TEXT,
        secrets_count INTEGER DEFAULT 0
      )
    `);

    console.log('Migration tracking table created');
  }

  async getAppliedMigrations() {
    try {
      const migrations = await dbPool.query(
        'SELECT filename FROM migrations ORDER BY applied_at ASC'
      );
      return migrations.map(m => m.filename);
    } catch (error) {
      // If table doesn't exist, return empty array
      return [];
    }
  }

  async applyMigration(filename, sql, description = '') {
    const startTime = Date.now();
    
    try {
      await dbPool.transaction(async (connection) => {
        // Execute the migration
        await connection.exec(sql);
        
        // Record the migration
        await connection.run(
          'INSERT INTO migrations (filename, checksum, description) VALUES (?, ?, ?)',
          [filename, this.calculateChecksum(sql), description]
        );
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Migration ${filename} applied successfully (${duration}ms)`);
      
    } catch (error) {
      console.error(`❌ Migration ${filename} failed:`, error.message);
      throw error;
    }
  }

  calculateChecksum(content) {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async runOptimizationMigration() {
    const migrationSql = `
      -- Performance optimizations for existing database
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000;
      PRAGMA temp_store = MEMORY;
      PRAGMA mmap_size = 268435456;
      PRAGMA foreign_keys = ON;
      PRAGMA auto_vacuum = INCREMENTAL;
      
      -- Create performance indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
      
      CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
      CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);
      CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
      CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
      CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
      
      CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
      CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename);
      
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);
      CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
      
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
      
      CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
      CREATE INDEX IF NOT EXISTS idx_secrets_active ON secrets(active);
      CREATE INDEX IF NOT EXISTS idx_secrets_created_at ON secrets(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
      CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
      CREATE INDEX IF NOT EXISTS idx_bots_platform ON bots(platform);
      CREATE INDEX IF NOT EXISTS idx_bots_enabled ON bots(enabled);
      
      CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
      
      -- Create tables for new features
      CREATE TABLE IF NOT EXISTS user_invitations (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        inviter_id TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending',
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
      CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
      CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);
      
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id TEXT PRIMARY KEY,
        key_version INTEGER NOT NULL,
        created_at DATETIME NOT NULL,
        active BOOLEAN DEFAULT true,
        deactivated_at DATETIME,
        rotated_by TEXT,
        secrets_count INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(active);
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at);
      CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_version ON encryption_keys(key_version);
      
      -- Run optimization
      PRAGMA optimize;
      ANALYZE;
    `;

    return this.applyMigration(
      '001_performance_optimization.sql',
      migrationSql,
      'Database performance optimization with indexes and new tables'
    );
  }

  async runAllPendingMigrations() {
    await this.createMigrationTable();
    
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Check if optimization migration has been applied
    if (!appliedMigrations.includes('001_performance_optimization.sql')) {
      console.log('🚀 Applying database performance optimization...');
      await this.runOptimizationMigration();
    }

    console.log('✅ All database migrations completed');
  }

  async validateDatabaseIntegrity() {
    console.log('🔍 Validating database integrity...');
    
    try {
      // Check foreign key constraints
      const fkViolations = await dbPool.query('PRAGMA foreign_key_check');
      if (fkViolations.length > 0) {
        console.warn('⚠️ Foreign key violations found:', fkViolations);
      }

      // Check database integrity
      const integrityCheck = await dbPool.get('PRAGMA integrity_check');
      if (integrityCheck.integrity_check !== 'ok') {
        console.error('❌ Database integrity check failed:', integrityCheck);
        throw new Error('Database integrity check failed');
      }

      // Verify critical tables exist
      const criticalTables = [
        'users', 'workspaces', 'notes', 'files', 'api_keys', 
        'audit_logs', 'secrets', 'webhooks', 'bots', 'migrations'
      ];

      for (const table of criticalTables) {
        const exists = await dbPool.get(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [table]
        );
        if (!exists) {
          throw new Error(`Critical table '${table}' is missing`);
        }
      }

      console.log('✅ Database integrity validation passed');
      return true;

    } catch (error) {
      console.error('❌ Database integrity validation failed:', error);
      throw error;
    }
  }

  async getOptimizationReport() {
    const report = {
      tableStats: {},
      indexStats: {},
      performanceMetrics: dbPool.getMetrics(),
      recommendations: []
    };

    try {
      // Get table statistics
      const tables = await dbPool.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );

      for (const table of tables) {
        const count = await dbPool.get(`SELECT COUNT(*) as count FROM ${table.name}`);
        report.tableStats[table.name] = count.count;
      }

      // Get index statistics
      const indexes = await dbPool.query(
        "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
      );

      report.indexStats = {
        totalIndexes: indexes.length,
        indexesByTable: indexes.reduce((acc, idx) => {
          if (!acc[idx.tbl_name]) acc[idx.tbl_name] = 0;
          acc[idx.tbl_name]++;
          return acc;
        }, {})
      };

      // Generate recommendations
      Object.entries(report.tableStats).forEach(([table, count]) => {
        if (count > 50000) {
          report.recommendations.push({
            type: 'performance',
            table,
            message: `Table ${table} has ${count} records. Consider archiving old data.`
          });
        }
      });

    } catch (error) {
      report.error = error.message;
    }

    return report;
  }
}

export default DatabaseMigration;

// Auto-run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new DatabaseMigration();
  
  migration.runAllPendingMigrations()
    .then(() => migration.validateDatabaseIntegrity())
    .then(() => migration.getOptimizationReport())
    .then(report => {
      console.log('📊 Database Optimization Report:');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}