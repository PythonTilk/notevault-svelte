import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration based on environment
const config = {
  development: {
    type: 'sqlite',
    path: process.env.DB_PATH || join(__dirname, '../../database/notevault.db')
  },
  production: {
    type: 'postgresql',
    connectionString: process.env.DATABASE_URL,
    config: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'notevault',
      user: process.env.DB_USER || 'notevault',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  }
};

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let db;

if (dbConfig.type === 'postgresql') {
  // PostgreSQL connection
  if (dbConfig.connectionString) {
    db = new Pool({
      connectionString: dbConfig.connectionString,
      ssl: dbConfig.config.ssl
    });
  } else {
    db = new Pool(dbConfig.config);
  }

  // Test connection
  db.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to PostgreSQL:', err.message);
    } else {
      console.log('Connected to PostgreSQL database');
      release();
    }
  });
} else {
  // SQLite connection (fallback for development)
  const sqlite3 = await import('sqlite3');
  const dbPath = dbConfig.path;
  
  // Ensure database directory exists
  const dbDir = dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new sqlite3.default.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database');
    }
  });

  // Enable foreign keys for SQLite
  db.run('PRAGMA foreign_keys = ON');
}

export default db;
export { dbConfig };