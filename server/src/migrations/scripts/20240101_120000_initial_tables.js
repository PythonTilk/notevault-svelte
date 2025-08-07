/**
 * Migration: Initial Tables
 * Created: 2024-01-01T12:00:00.000Z
 */

/**
 * Run the migration
 * @param {Object} db - Database connection
 * @param {boolean} isPostgreSQL - Whether using PostgreSQL
 */
export async function up(db, isPostgreSQL) {
  console.log('Creating initial database tables...');
  
  const timestampType = isPostgreSQL ? 'TIMESTAMP' : 'DATETIME';
  const booleanType = isPostgreSQL ? 'BOOLEAN' : 'BOOLEAN';
  const textType = isPostgreSQL ? 'TEXT' : 'TEXT';
  const integerType = isPostgreSQL ? 'INTEGER' : 'INTEGER';
  const realType = isPostgreSQL ? 'REAL' : 'REAL';
  const primaryKeyType = isPostgreSQL ? 'TEXT PRIMARY KEY' : 'TEXT PRIMARY KEY';
  const currentTimestamp = isPostgreSQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
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
    )`,

    // Workspaces table
    `CREATE TABLE IF NOT EXISTS workspaces (
      id ${primaryKeyType},
      name ${textType} NOT NULL,
      description ${textType},
      color ${textType} NOT NULL,
      owner_id ${textType} NOT NULL,
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      updated_at ${timestampType} DEFAULT ${currentTimestamp},
      is_public ${booleanType} DEFAULT FALSE,
      FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Workspace members table
    `CREATE TABLE IF NOT EXISTS workspace_members (
      id ${primaryKeyType},
      workspace_id ${textType} NOT NULL,
      user_id ${textType} NOT NULL,
      role ${textType} DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
      joined_at ${timestampType} DEFAULT ${currentTimestamp},
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(workspace_id, user_id)
    )`,

    // Notes table
    `CREATE TABLE IF NOT EXISTS notes (
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
      tags ${textType},
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      updated_at ${timestampType} DEFAULT ${currentTimestamp},
      is_public ${booleanType} DEFAULT FALSE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Chat messages table
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id ${primaryKeyType},
      content ${textType} NOT NULL,
      author_id ${textType} NOT NULL,
      channel_id ${textType},
      reply_to_id ${textType},
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      edited_at ${timestampType},
      FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (reply_to_id) REFERENCES chat_messages (id) ON DELETE SET NULL
    )`,

    // Message reactions table
    `CREATE TABLE IF NOT EXISTS message_reactions (
      id ${primaryKeyType},
      message_id ${textType} NOT NULL,
      user_id ${textType} NOT NULL,
      emoji ${textType} NOT NULL,
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      FOREIGN KEY (message_id) REFERENCES chat_messages (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id, emoji)
    )`,

    // Files table
    `CREATE TABLE IF NOT EXISTS files (
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
    )`,

    // Announcements table
    `CREATE TABLE IF NOT EXISTS announcements (
      id ${primaryKeyType},
      title ${textType} NOT NULL,
      content ${textType} NOT NULL,
      author_id ${textType} NOT NULL,
      priority ${textType} DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      expires_at ${timestampType},
      is_active ${booleanType} DEFAULT TRUE,
      FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Audit logs table
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id ${primaryKeyType},
      action ${textType} NOT NULL,
      user_id ${textType} NOT NULL,
      target_type ${textType} NOT NULL,
      target_id ${textType} NOT NULL,
      details ${textType},
      ip_address ${textType},
      user_agent ${textType},
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`
  ];

  for (const tableSQL of tables) {
    if (isPostgreSQL) {
      await db.query(tableSQL);
    } else {
      await new Promise((resolve, reject) => {
        db.run(tableSQL, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  console.log('Initial tables created successfully');
}

/**
 * Rollback the migration
 * @param {Object} db - Database connection
 * @param {boolean} isPostgreSQL - Whether using PostgreSQL
 */
export async function down(db, isPostgreSQL) {
  console.log('Dropping initial database tables...');
  
  const tables = [
    'audit_logs',
    'announcements', 
    'files',
    'message_reactions',
    'chat_messages',
    'notes',
    'workspace_members',
    'workspaces',
    'users'
  ];

  for (const table of tables) {
    const dropSQL = `DROP TABLE IF EXISTS ${table}`;
    
    if (isPostgreSQL) {
      await db.query(dropSQL);
    } else {
      await new Promise((resolve, reject) => {
        db.run(dropSQL, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  console.log('Initial tables dropped successfully');
}