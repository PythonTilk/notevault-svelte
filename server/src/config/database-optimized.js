import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import EventEmitter from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Optimized Database Configuration with Connection Pooling
 * 
 * Features:
 * - Connection pooling with configurable pool size
 * - Performance optimizations (WAL mode, synchronous, cache size)
 * - Query monitoring and metrics
 * - Automatic index creation and maintenance
 * - Health checks and monitoring
 * - Transaction management
 */

class DatabasePool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      database: options.database || process.env.DB_PATH || join(__dirname, '../../database/notevault.db'),
      maxConnections: options.maxConnections || parseInt(process.env.DB_POOL_SIZE || '10'),
      acquireTimeoutMs: options.acquireTimeoutMs || 30000,
      idleTimeoutMs: options.idleTimeoutMs || 600000, // 10 minutes
      busyTimeoutMs: options.busyTimeoutMs || 30000,
      enableWAL: options.enableWAL !== false,
      enableForeignKeys: options.enableForeignKeys !== false,
      enableMetrics: options.enableMetrics !== false,
      maxQueryTimeMs: options.maxQueryTimeMs || 10000
    };

    this.pool = [];
    this.activeConnections = new Set();
    this.waitingQueue = [];
    this.metrics = {
      totalQueries: 0,
      totalConnections: 0,
      activeConnectionsCount: 0,
      queueLength: 0,
      avgQueryTime: 0,
      slowQueries: 0,
      errors: 0,
      lastHealthCheck: null
    };

    this.initialized = false;
    this.initializing = false;
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initializing) {
      // Wait for initialization to complete
      return new Promise((resolve) => {
        this.once('initialized', resolve);
      });
    }

    this.initializing = true;

    try {
      // Ensure database directory exists
      const dbDir = dirname(this.config.database);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create initial connection to set up database
      const setupConnection = await this.createConnection();
      await this.optimizeDatabase(setupConnection);
      await this.createIndexes(setupConnection);
      await setupConnection.close();

      // Pre-populate connection pool
      const initialConnections = Math.min(3, this.config.maxConnections);
      for (let i = 0; i < initialConnections; i++) {
        const connection = await this.createConnection();
        this.pool.push({
          connection,
          inUse: false,
          createdAt: Date.now(),
          lastUsed: Date.now()
        });
      }

      this.initialized = true;
      this.initializing = false;
      
      // Start maintenance tasks
      this.startMaintenanceTasks();
      
      this.emit('initialized');
      console.log(`Database pool initialized with ${this.pool.length} connections`);

    } catch (error) {
      this.initializing = false;
      console.error('Failed to initialize database pool:', error);
      throw error;
    }
  }

  async createConnection() {
    const connection = await open({
      filename: this.config.database,
      driver: sqlite3.Database
    });

    // Configure connection for optimal performance
    await connection.exec(`
      PRAGMA busy_timeout = ${this.config.busyTimeoutMs};
      PRAGMA cache_size = -64000; -- 64MB cache
      PRAGMA temp_store = MEMORY;
      PRAGMA mmap_size = 268435456; -- 256MB memory map
      PRAGMA optimize;
    `);

    if (this.config.enableWAL) {
      await connection.exec('PRAGMA journal_mode = WAL');
      await connection.exec('PRAGMA synchronous = NORMAL');
    }

    if (this.config.enableForeignKeys) {
      await connection.exec('PRAGMA foreign_keys = ON');
    }

    this.metrics.totalConnections++;
    return connection;
  }

  async optimizeDatabase(connection) {
    // Set optimal SQLite configuration
    await connection.exec(`
      -- Performance optimizations
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000;
      PRAGMA temp_store = MEMORY;
      PRAGMA mmap_size = 268435456;
      
      -- Security and integrity
      PRAGMA foreign_keys = ON;
      PRAGMA trusted_schema = OFF;
      
      -- Maintenance
      PRAGMA auto_vacuum = INCREMENTAL;
      PRAGMA optimize;
    `);

    console.log('Database optimizations applied');
  }

  async createIndexes(connection) {
    // Create performance indexes for common queries
    const indexes = [
      // User-related indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active)',
      
      // Workspace indexes
      'CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id)',
      'CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id)',
      
      // Note indexes
      'CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)',
      'CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)',
      
      // File indexes
      'CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id)',
      'CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by)',
      'CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename)',
      
      // API Keys indexes
      'CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active)',
      
      // Audit logs indexes
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address)',
      
      // Secrets indexes
      'CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name)',
      'CREATE INDEX IF NOT EXISTS idx_secrets_active ON secrets(active)',
      'CREATE INDEX IF NOT EXISTS idx_secrets_created_at ON secrets(created_at)',
      
      // Webhooks indexes
      'CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active)',
      'CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at)',
      
      // Bot indexes
      'CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bots_platform ON bots(platform)',
      'CREATE INDEX IF NOT EXISTS idx_bots_enabled ON bots(enabled)',
      
      // Calendar indexes
      'CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time)',
      
      // User invitations indexes
      'CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email)',
      'CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token)',
      'CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status)',
      'CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at)',
      
      // Encryption keys indexes
      'CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(active)',
      'CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_version ON encryption_keys(key_version)'
    ];

    for (const indexSql of indexes) {
      try {
        await connection.exec(indexSql);
      } catch (error) {
        console.warn('Index creation warning:', error.message);
      }
    }

    console.log(`Created ${indexes.length} database indexes for performance optimization`);
  }

  async acquireConnection() {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeoutMs);

      const tryAcquire = () => {
        // Find available connection
        const available = this.pool.find(conn => !conn.inUse);
        
        if (available) {
          available.inUse = true;
          available.lastUsed = Date.now();
          this.activeConnections.add(available);
          this.metrics.activeConnectionsCount = this.activeConnections.size;
          
          clearTimeout(timeout);
          resolve(available.connection);
          return;
        }

        // Create new connection if under limit
        if (this.pool.length < this.config.maxConnections) {
          this.createConnection()
            .then(connection => {
              const poolItem = {
                connection,
                inUse: true,
                createdAt: Date.now(),
                lastUsed: Date.now()
              };
              
              this.pool.push(poolItem);
              this.activeConnections.add(poolItem);
              this.metrics.activeConnectionsCount = this.activeConnections.size;
              
              clearTimeout(timeout);
              resolve(connection);
            })
            .catch(error => {
              clearTimeout(timeout);
              reject(error);
            });
          return;
        }

        // Queue the request
        this.waitingQueue.push({ resolve, reject, timeout });
        this.metrics.queueLength = this.waitingQueue.length;
      };

      tryAcquire();
    });
  }

  releaseConnection(connection) {
    const poolItem = this.pool.find(item => item.connection === connection);
    if (poolItem && poolItem.inUse) {
      poolItem.inUse = false;
      poolItem.lastUsed = Date.now();
      this.activeConnections.delete(poolItem);
      this.metrics.activeConnectionsCount = this.activeConnections.size;

      // Process waiting queue
      if (this.waitingQueue.length > 0) {
        const { resolve } = this.waitingQueue.shift();
        poolItem.inUse = true;
        this.activeConnections.add(poolItem);
        this.metrics.activeConnectionsCount = this.activeConnections.size;
        this.metrics.queueLength = this.waitingQueue.length;
        resolve(connection);
      }
    }
  }

  async query(sql, params = []) {
    const startTime = Date.now();
    let connection;

    try {
      connection = await this.acquireConnection();
      this.metrics.totalQueries++;

      const result = params.length > 0 ? 
        await connection.all(sql, params) : 
        await connection.all(sql);

      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(queryTime);

      if (queryTime > this.config.maxQueryTimeMs) {
        this.metrics.slowQueries++;
        console.warn(`Slow query detected (${queryTime}ms):`, sql.substring(0, 100));
      }

      return result;

    } catch (error) {
      this.metrics.errors++;
      console.error('Database query error:', error);
      throw error;
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  async get(sql, params = []) {
    const startTime = Date.now();
    let connection;

    try {
      connection = await this.acquireConnection();
      this.metrics.totalQueries++;

      const result = params.length > 0 ? 
        await connection.get(sql, params) : 
        await connection.get(sql);

      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(queryTime);

      return result;

    } catch (error) {
      this.metrics.errors++;
      console.error('Database get error:', error);
      throw error;
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  async run(sql, params = []) {
    const startTime = Date.now();
    let connection;

    try {
      connection = await this.acquireConnection();
      this.metrics.totalQueries++;

      const result = params.length > 0 ? 
        await connection.run(sql, params) : 
        await connection.run(sql);

      const queryTime = Date.now() - startTime;
      this.updateQueryMetrics(queryTime);

      return result;

    } catch (error) {
      this.metrics.errors++;
      console.error('Database run error:', error);
      throw error;
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  async transaction(callback) {
    let connection;

    try {
      connection = await this.acquireConnection();
      await connection.exec('BEGIN TRANSACTION');

      const result = await callback(connection);
      
      await connection.exec('COMMIT');
      return result;

    } catch (error) {
      if (connection) {
        try {
          await connection.exec('ROLLBACK');
        } catch (rollbackError) {
          console.error('Transaction rollback error:', rollbackError);
        }
      }
      throw error;
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  updateQueryMetrics(queryTime) {
    // Update moving average
    const currentAvg = this.metrics.avgQueryTime;
    const totalQueries = this.metrics.totalQueries;
    this.metrics.avgQueryTime = (currentAvg * (totalQueries - 1) + queryTime) / totalQueries;
  }

  async healthCheck() {
    try {
      const connection = await this.acquireConnection();
      await connection.get('SELECT 1');
      this.releaseConnection(connection);
      
      this.metrics.lastHealthCheck = Date.now();
      return {
        status: 'healthy',
        metrics: this.getMetrics()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        metrics: this.getMetrics()
      };
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      poolSize: this.pool.length,
      availableConnections: this.pool.filter(conn => !conn.inUse).length,
      maxConnections: this.config.maxConnections
    };
  }

  startMaintenanceTasks() {
    // Clean up idle connections every 5 minutes
    setInterval(async () => {
      const now = Date.now();
      const idleConnections = this.pool.filter(
        conn => !conn.inUse && (now - conn.lastUsed) > this.config.idleTimeoutMs
      );

      for (const conn of idleConnections) {
        try {
          await conn.connection.close();
          const index = this.pool.indexOf(conn);
          if (index !== -1) {
            this.pool.splice(index, 1);
          }
        } catch (error) {
          console.error('Error closing idle connection:', error);
        }
      }

      if (idleConnections.length > 0) {
        console.log(`Cleaned up ${idleConnections.length} idle database connections`);
      }
    }, 5 * 60 * 1000);

    // Database maintenance every hour
    setInterval(async () => {
      try {
        const connection = await this.acquireConnection();
        await connection.exec('PRAGMA optimize');
        await connection.exec('PRAGMA incremental_vacuum(1000)');
        this.releaseConnection(connection);
        console.log('Database maintenance completed');
      } catch (error) {
        console.error('Database maintenance error:', error);
      }
    }, 60 * 60 * 1000);

    // Log metrics every 10 minutes if enabled
    if (this.config.enableMetrics) {
      setInterval(() => {
        console.log('Database Metrics:', this.getMetrics());
      }, 10 * 60 * 1000);
    }
  }

  async close() {
    for (const poolItem of this.pool) {
      try {
        await poolItem.connection.close();
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
    this.pool = [];
    this.activeConnections.clear();
    this.initialized = false;
    console.log('Database pool closed');
  }
}

// Create and export optimized database instance
const dbPool = new DatabasePool({
  maxConnections: parseInt(process.env.DB_POOL_SIZE || '10'),
  enableMetrics: process.env.NODE_ENV !== 'production'
});

// Initialize pool
dbPool.initialize().catch(console.error);

export default dbPool;
export { DatabasePool };