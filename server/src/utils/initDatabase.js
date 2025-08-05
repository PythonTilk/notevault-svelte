import db from '../config/database.js';
import bcrypt from 'bcryptjs';

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Create tables
    const createTables = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_online BOOLEAN DEFAULT FALSE,
        force_password_change BOOLEAN DEFAULT FALSE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        workspace_invites BOOLEAN DEFAULT TRUE,
        chat_mentions BOOLEAN DEFAULT TRUE,
        theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'auto')),
        language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'de')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Workspaces table
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_public BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Workspace members table
      CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(workspace_id, user_id)
      );

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text' CHECK (type IN ('text', 'rich', 'code', 'canvas')),
        workspace_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        position_x REAL DEFAULT 0,
        position_y REAL DEFAULT 0,
        width REAL DEFAULT 300,
        height REAL DEFAULT 200,
        color TEXT NOT NULL,
        tags TEXT, -- JSON array as string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_public BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Chat messages table
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        author_id TEXT NOT NULL,
        channel_id TEXT,
        reply_to_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME,
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (reply_to_id) REFERENCES chat_messages (id) ON DELETE SET NULL
      );

      -- Message reactions table
      CREATE TABLE IF NOT EXISTS message_reactions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES chat_messages (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(message_id, user_id, emoji)
      );

      -- Files table
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        uploader_id TEXT NOT NULL,
        workspace_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_public BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE SET NULL
      );

      -- Announcements table
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id TEXT NOT NULL,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
      );

      -- Audit logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        user_id TEXT,
        target_type TEXT,
        target_id TEXT,
        details TEXT, -- JSON as string
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_author_id ON chat_messages(author_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id);

      -- Critical performance indexes (Phase 4)
      -- User authentication (highest priority - called on every login)
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      
      -- Workspace access patterns (high priority - used in most operations)
      CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
      CREATE INDEX IF NOT EXISTS idx_workspaces_is_public ON workspaces(is_public);
      CREATE INDEX IF NOT EXISTS idx_workspace_members_composite ON workspace_members(workspace_id, user_id);
      
      -- Chat system optimization (high priority)
      CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
      CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
      CREATE INDEX IF NOT EXISTS idx_message_reactions_composite ON message_reactions(message_id, user_id, emoji);
      
      -- File access optimization (medium priority)
      CREATE INDEX IF NOT EXISTS idx_files_is_public ON files(is_public);
      
      -- Admin and content management (medium priority)
      CREATE INDEX IF NOT EXISTS idx_announcements_author_id ON announcements(author_id);
      CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
      CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
      
      -- Time-based sorting optimization (medium priority)
      CREATE INDEX IF NOT EXISTS idx_workspaces_updated_at ON workspaces(updated_at);
      CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
      
      -- User status tracking (lower priority but useful)
      CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
      
      -- Audit logging optimization (lower priority - admin features)
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `;

    db.exec(createTables, async (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
        return;
      }

      console.log('Database tables created successfully');

      // Add new columns for existing databases (migration)
      const migrations = [
        "ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN push_notifications BOOLEAN DEFAULT TRUE", 
        "ALTER TABLE users ADD COLUMN workspace_invites BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN chat_mentions BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'",
        "ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'",
        "ALTER TABLE users ADD COLUMN updated_at DATETIME"
      ];

      // Run migrations (ignore errors for columns that already exist)
      for (const migration of migrations) {
        try {
          await new Promise((resolve, reject) => {
            db.run(migration, (err) => {
              if (err && !err.message.includes('duplicate column name')) {
                console.error('Migration error:', err.message);
              }
              resolve();
            });
          });
        } catch (err) {
          // Ignore errors for existing columns
        }
      }

      console.log('Database migrations completed');

      // Insert default admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      const adminId = 'admin-' + Date.now();
      
      // Hash demo password outside callback
      const demoPassword = await bcrypt.hash('demo123', 10);
      const demoId = 'demo-' + Date.now();
      
      db.run(`
        INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, role, force_password_change)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [adminId, 'admin', 'admin@notevault.com', adminPassword, 'Administrator', 'admin', true], (err) => {
        if (err) {
          console.error('Error creating admin user:', err);
          resolve();
          return;
        } else {
          console.log('Default admin user created (username: admin, password: admin123)');
        }

        // Insert demo user
        db.run(`
          INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, role, force_password_change)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [demoId, 'demo', 'demo@notevault.com', demoPassword, 'Demo User', 'user', true], (err) => {
          if (err) {
            console.error('Error creating demo user:', err);
          } else {
            console.log('Demo user created (username: demo, password: demo123)');
          }

          // Skip announcements for now to avoid foreign key issues during initialization
          console.log('Skipping announcements creation to avoid FK constraint issues');
          resolve();
        });
      });
    });
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