/**
 * Migration: Add Security Tables
 * Created: 2024-01-02T12:00:00.000Z
 */

/**
 * Run the migration
 * @param {Object} db - Database connection
 * @param {boolean} isPostgreSQL - Whether using PostgreSQL
 */
export async function up(db, isPostgreSQL) {
  console.log('Adding security-related tables...');
  
  const timestampType = isPostgreSQL ? 'TIMESTAMP' : 'DATETIME';
  const booleanType = isPostgreSQL ? 'BOOLEAN' : 'BOOLEAN';
  const textType = isPostgreSQL ? 'TEXT' : 'TEXT';
  const primaryKeyType = isPostgreSQL ? 'TEXT PRIMARY KEY' : 'TEXT PRIMARY KEY';
  const currentTimestamp = isPostgreSQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

  const tables = [
    // Sessions table for proper session management
    `CREATE TABLE IF NOT EXISTS sessions (
      id ${primaryKeyType},
      user_id ${textType} NOT NULL,
      token_hash ${textType} NOT NULL,
      expires_at ${timestampType} NOT NULL,
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      ip_address ${textType},
      user_agent ${textType},
      is_active ${booleanType} DEFAULT TRUE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Two-factor authentication table
    `CREATE TABLE IF NOT EXISTS user_2fa (
      id ${primaryKeyType},
      user_id ${textType} NOT NULL,
      secret ${textType} NOT NULL,
      backup_codes ${textType},
      is_enabled ${booleanType} DEFAULT FALSE,
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      last_used ${timestampType},
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // OAuth providers table
    `CREATE TABLE IF NOT EXISTS oauth_accounts (
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
    )`,

    // Email verification table
    `CREATE TABLE IF NOT EXISTS email_verifications (
      id ${primaryKeyType},
      user_id ${textType} NOT NULL,
      email ${textType} NOT NULL,
      token ${textType} NOT NULL,
      expires_at ${timestampType} NOT NULL,
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      verified_at ${timestampType},
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Password reset table
    `CREATE TABLE IF NOT EXISTS password_resets (
      id ${primaryKeyType},
      user_id ${textType} NOT NULL,
      token ${textType} NOT NULL,
      expires_at ${timestampType} NOT NULL,
      created_at ${timestampType} DEFAULT ${currentTimestamp},
      used_at ${timestampType},
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

  console.log('Security tables created successfully');
}

/**
 * Rollback the migration
 * @param {Object} db - Database connection
 * @param {boolean} isPostgreSQL - Whether using PostgreSQL
 */
export async function down(db, isPostgreSQL) {
  console.log('Dropping security tables...');
  
  const tables = [
    'password_resets',
    'email_verifications',
    'oauth_accounts',
    'user_2fa',
    'sessions'
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

  console.log('Security tables dropped successfully');
}