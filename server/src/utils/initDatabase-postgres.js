import db, { dbConfig } from '../config/database-postgres.js';
import bcrypt from 'bcryptjs';

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const isPostgreSQL = dbConfig.type === 'postgresql';
    
    // SQL for PostgreSQL vs SQLite differences
    const timestampType = isPostgreSQL ? 'TIMESTAMP' : 'DATETIME';
    const booleanType = isPostgreSQL ? 'BOOLEAN' : 'BOOLEAN';
    const textType = isPostgreSQL ? 'TEXT' : 'TEXT';
    const integerType = isPostgreSQL ? 'INTEGER' : 'INTEGER';
    const realType = isPostgreSQL ? 'REAL' : 'REAL';
    const primaryKeyType = isPostgreSQL ? 'TEXT PRIMARY KEY' : 'TEXT PRIMARY KEY';
    const currentTimestamp = isPostgreSQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';
    
    // Create tables with proper syntax for both databases
    const createTables = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id ${primaryKeyType},
        username ${textType} UNIQUE NOT NULL,
        email ${textType} UNIQUE NOT NULL,
        password_hash ${textType} NOT NULL,
        display_name ${textType} NOT NULL,
        avatar ${textType},
        role ${textType} DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        last_active ${timestampType} DEFAULT ${currentTimestamp},
        is_online ${booleanType} DEFAULT FALSE
      );

      -- Workspaces table
      CREATE TABLE IF NOT EXISTS workspaces (
        id ${primaryKeyType},
        name ${textType} NOT NULL,
        description ${textType},
        color ${textType} NOT NULL,
        owner_id ${textType} NOT NULL,
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        updated_at ${timestampType} DEFAULT ${currentTimestamp},
        is_public ${booleanType} DEFAULT FALSE,
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Workspace members table
      CREATE TABLE IF NOT EXISTS workspace_members (
        id ${primaryKeyType},
        workspace_id ${textType} NOT NULL,
        user_id ${textType} NOT NULL,
        role ${textType} DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        joined_at ${timestampType} DEFAULT ${currentTimestamp},
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(workspace_id, user_id)
      );

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id ${primaryKeyType},
        title ${textType} NOT NULL,
        content ${textType} NOT NULL,
        type ${textType} DEFAULT 'text' CHECK (type IN ('text', 'rich', 'code', 'canvas')),
        workspace_id ${textType} NOT NULL,
        author_id ${textType} NOT NULL,
        position_x ${realType} DEFAULT 0,
        position_y ${realType} DEFAULT 0,
        width ${realType} DEFAULT 300,
        height ${realType} DEFAULT 200,
        color ${textType} NOT NULL,
        tags ${textType}, -- JSON array as string
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        updated_at ${timestampType} DEFAULT ${currentTimestamp},
        is_public ${booleanType} DEFAULT FALSE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Chat messages table
      CREATE TABLE IF NOT EXISTS chat_messages (
        id ${primaryKeyType},
        content ${textType} NOT NULL,
        author_id ${textType} NOT NULL,
        channel_id ${textType},
        reply_to_id ${textType},
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        edited_at ${timestampType},
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id) REFERENCES chat_messages (id) ON DELETE SET NULL
      );

      -- Message reactions table
      CREATE TABLE IF NOT EXISTS message_reactions (
        id ${primaryKeyType},
        message_id ${textType} NOT NULL,
        user_id ${textType} NOT NULL,
        emoji ${textType} NOT NULL,
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        FOREIGN KEY (message_id) REFERENCES chat_messages (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(message_id, user_id, emoji)
      );

      -- Files table
      CREATE TABLE IF NOT EXISTS files (
        id ${primaryKeyType},
        name ${textType} NOT NULL,
        original_name ${textType} NOT NULL,
        type ${textType} NOT NULL,
        size ${integerType} NOT NULL,
        path ${textType} NOT NULL,
        uploader_id ${textType} NOT NULL,
        workspace_id ${textType},
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        is_public ${booleanType} DEFAULT FALSE,
        FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE SET NULL
      );

      -- Announcements table
      CREATE TABLE IF NOT EXISTS announcements (
        id ${primaryKeyType},
        title ${textType} NOT NULL,
        content ${textType} NOT NULL,
        author_id ${textType} NOT NULL,
        priority ${textType} DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        expires_at ${timestampType},
        is_active ${booleanType} DEFAULT TRUE,
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Audit logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id ${primaryKeyType},
        action ${textType} NOT NULL,
        user_id ${textType} NOT NULL,
        target_type ${textType} NOT NULL,
        target_id ${textType} NOT NULL,
        details ${textType}, -- JSON as string
        ip_address ${textType},
        user_agent ${textType},
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Sessions table for proper session management
      CREATE TABLE IF NOT EXISTS sessions (
        id ${primaryKeyType},
        user_id ${textType} NOT NULL,
        token_hash ${textType} NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        ip_address ${textType},
        user_agent ${textType},
        is_active ${booleanType} DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Two-factor authentication table
      CREATE TABLE IF NOT EXISTS user_2fa (
        id ${primaryKeyType},
        user_id ${textType} NOT NULL,
        secret ${textType} NOT NULL,
        backup_codes ${textType}, -- JSON array as string
        is_enabled ${booleanType} DEFAULT FALSE,
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        last_used ${timestampType},
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- OAuth providers table
      CREATE TABLE IF NOT EXISTS oauth_accounts (
        id ${primaryKeyType},
        user_id ${textType} NOT NULL,
        provider ${textType} NOT NULL CHECK (provider IN ('google', 'github', 'discord')),
        provider_user_id ${textType} NOT NULL,
        provider_username ${textType},
        provider_email ${textType},
        access_token ${textType},
        refresh_token ${textType},
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        updated_at ${timestampType} DEFAULT ${currentTimestamp},
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(provider, provider_user_id)
      );

      -- Email verification table
      CREATE TABLE IF NOT EXISTS email_verifications (
        id ${primaryKeyType},
        user_id ${textType} NOT NULL,
        email ${textType} NOT NULL,
        token ${textType} NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        verified_at ${timestampType},
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Password reset table
      CREATE TABLE IF NOT EXISTS password_resets (
        id ${primaryKeyType},
        user_id ${textType} NOT NULL,
        token ${textType} NOT NULL,
        expires_at ${timestampType} NOT NULL,
        created_at ${timestampType} DEFAULT ${currentTimestamp},
        used_at ${timestampType},
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `;

    // Create indexes for better performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_author_id ON chat_messages(author_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id);
    `;

    const executeQueries = async () => {
      try {
        if (isPostgreSQL) {
          // For PostgreSQL, execute each statement separately
          const statements = createTables.split(';').filter(stmt => stmt.trim());
          const indexStatements = createIndexes.split(';').filter(stmt => stmt.trim());
          
          for (const statement of statements) {
            if (statement.trim()) {
              await db.query(statement);
            }
          }
          
          for (const statement of indexStatements) {
            if (statement.trim()) {
              await db.query(statement);
            }
          }
        } else {
          // For SQLite, use exec
          await new Promise((resolve, reject) => {
            db.exec(createTables + createIndexes, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        console.log('Database tables created successfully');

        // Insert default admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminId = 'admin-' + Date.now();
        
        const insertAdminQuery = `
          INSERT INTO users (id, username, email, password_hash, display_name, role)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (username) DO NOTHING
        `;
        
        if (isPostgreSQL) {
          await db.query(insertAdminQuery, [adminId, 'admin', 'admin@notevault.com', adminPassword, 'Administrator', 'admin']);
        } else {
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, role)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [adminId, 'admin', 'admin@notevault.com', adminPassword, 'Administrator', 'admin'], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        console.log('Default admin user created (username: admin, password: admin123)');

        // Insert demo user
        const demoPassword = await bcrypt.hash('demo123', 10);
        const demoId = 'demo-' + Date.now();
        
        if (isPostgreSQL) {
          await db.query(insertAdminQuery, [demoId, 'demo', 'demo@notevault.com', demoPassword, 'Demo User', 'user']);
        } else {
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, role)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [demoId, 'demo', 'demo@notevault.com', demoPassword, 'Demo User', 'user'], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        console.log('Demo user created (username: demo, password: demo123)');

        resolve();
      } catch (err) {
        console.error('Error creating database:', err);
        reject(err);
      }
    };

    executeQueries();
  });
};

// Run initialization if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}

export default initDatabase;