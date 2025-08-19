import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DatabaseWrapper } from './errorHandler.js';
import { auditLogger, SECURITY_EVENTS } from './logger.js';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Secure Secret Management System
 * 
 * Provides functionality for:
 * - JWT secret rotation
 * - API key management
 * - Encryption key rotation
 * - Secure secret storage
 */

class SecretManager {
  constructor() {
    this.dbWrapper = new DatabaseWrapper(db);
    this.secretsPath = path.join(__dirname, '../../../secrets');
    this.ensureSecretsDirectory();
  }

  /**
   * Ensure secrets directory exists with proper permissions
   */
  ensureSecretsDirectory() {
    if (!fs.existsSync(this.secretsPath)) {
      fs.mkdirSync(this.secretsPath, { recursive: true, mode: 0o700 });
    }
    
    // Set restrictive permissions
    try {
      fs.chmodSync(this.secretsPath, 0o700);
    } catch (error) {
      console.warn('Could not set restrictive permissions on secrets directory');
    }
  }

  /**
   * Generate a cryptographically secure secret
   */
  generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure JWT secret
   */
  generateJWTSecret() {
    // Use a longer secret for JWT
    return this.generateSecret(32); // 64 characters hex (256 bits)
  }

  /**
   * Generate API key with metadata
   */
  generateAPIKey(name, permissions = []) {
    const keyId = crypto.randomUUID();
    const secret = this.generateSecret(24); // 48 characters hex
    const apiKey = `nvault_${keyId.replace(/-/g, '').substring(0, 8)}_${secret}`;
    
    return {
      keyId,
      apiKey,
      name,
      permissions,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      active: true
    };
  }

  /**
   * Store encrypted secret in database
   */
  async storeSecret(name, secret, metadata = {}) {
    try {
      const secretId = crypto.randomUUID();
      const encryptionKey = this.getEncryptionKey();
      const encryptedSecret = this.encrypt(secret, encryptionKey);
      
      await this.dbWrapper.run(`
        INSERT OR REPLACE INTO secrets (
          id, name, encrypted_value, metadata, created_at, updated_at, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        secretId,
        name,
        encryptedSecret,
        JSON.stringify(metadata),
        new Date().toISOString(),
        new Date().toISOString(),
        true
      ]);

      // Log secret creation
      await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
        action: 'secret_created',
        secretName: name,
        secretId
      });

      return secretId;
    } catch (error) {
      console.error('Failed to store secret:', error);
      throw new Error('Secret storage failed');
    }
  }

  /**
   * Retrieve and decrypt secret from database
   */
  async getSecret(name) {
    try {
      const result = await this.dbWrapper.get(`
        SELECT encrypted_value, metadata 
        FROM secrets 
        WHERE name = ? AND active = true
        ORDER BY created_at DESC 
        LIMIT 1
      `, [name]);

      if (!result) {
        return null;
      }

      const encryptionKey = this.getEncryptionKey();
      const decryptedSecret = this.decrypt(result.encrypted_value, encryptionKey);
      
      return {
        secret: decryptedSecret,
        metadata: JSON.parse(result.metadata || '{}')
      };
    } catch (error) {
      console.error('Failed to retrieve secret:', error);
      throw new Error('Secret retrieval failed');
    }
  }

  /**
   * Rotate JWT secret
   */
  async rotateJWTSecret(userId) {
    try {
      const newSecret = this.generateJWTSecret();
      const oldSecretInfo = await this.getSecret('JWT_SECRET');
      
      // Store new secret
      await this.storeSecret('JWT_SECRET', newSecret, {
        rotatedBy: userId,
        previousVersion: oldSecretInfo?.metadata?.version || 1,
        version: (oldSecretInfo?.metadata?.version || 1) + 1
      });

      // Deactivate old secret (keep for audit trail)
      await this.dbWrapper.run(`
        UPDATE secrets 
        SET active = false, updated_at = ? 
        WHERE name = 'JWT_SECRET' AND encrypted_value != ?
      `, [new Date().toISOString(), this.encrypt(newSecret, this.getEncryptionKey())]);

      // Update environment variable (if using file-based config)
      await this.updateEnvironmentSecret('JWT_SECRET', newSecret);

      // Log secret rotation
      await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
        action: 'jwt_secret_rotated',
        rotatedBy: userId,
        newVersion: (oldSecretInfo?.metadata?.version || 1) + 1
      });

      return {
        success: true,
        message: 'JWT secret rotated successfully',
        newVersion: (oldSecretInfo?.metadata?.version || 1) + 1
      };
    } catch (error) {
      console.error('JWT secret rotation failed:', error);
      throw new Error('JWT secret rotation failed');
    }
  }

  /**
   * Create new API key
   */
  async createAPIKey(name, permissions, userId) {
    try {
      const keyData = this.generateAPIKey(name, permissions);
      
      // Store API key metadata
      await this.dbWrapper.run(`
        INSERT INTO api_keys (
          id, key_hash, name, permissions, created_by, created_at, last_used, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        keyData.keyId,
        this.hashAPIKey(keyData.apiKey),
        keyData.name,
        JSON.stringify(keyData.permissions),
        userId,
        keyData.createdAt,
        null,
        true
      ]);

      // Log API key creation
      await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
        action: 'api_key_created',
        keyId: keyData.keyId,
        keyName: name,
        permissions,
        createdBy: userId
      });

      return {
        keyId: keyData.keyId,
        apiKey: keyData.apiKey, // Only return this once
        name: keyData.name,
        permissions: keyData.permissions,
        createdAt: keyData.createdAt
      };
    } catch (error) {
      console.error('API key creation failed:', error);
      throw new Error('API key creation failed');
    }
  }

  /**
   * Revoke API key
   */
  async revokeAPIKey(keyId, userId) {
    try {
      const result = await this.dbWrapper.run(`
        UPDATE api_keys 
        SET active = false, updated_at = ? 
        WHERE id = ? AND active = true
      `, [new Date().toISOString(), keyId]);

      if (result.changes === 0) {
        throw new Error('API key not found or already revoked');
      }

      // Log API key revocation
      await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
        action: 'api_key_revoked',
        keyId,
        revokedBy: userId
      });

      return { success: true, message: 'API key revoked successfully' };
    } catch (error) {
      console.error('API key revocation failed:', error);
      throw new Error('API key revocation failed');
    }
  }

  /**
   * List active API keys
   */
  async listAPIKeys() {
    try {
      const keys = await this.dbWrapper.query(`
        SELECT id, name, permissions, created_by, created_at, last_used, active
        FROM api_keys 
        WHERE active = true
        ORDER BY created_at DESC
      `);

      return keys.map(key => ({
        ...key,
        permissions: JSON.parse(key.permissions || '[]'),
        keyPreview: `nvault_${key.id.substring(0, 8)}...` // Safe preview
      }));
    } catch (error) {
      console.error('Failed to list API keys:', error);
      throw new Error('API key listing failed');
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey) {
    try {
      const keyHash = this.hashAPIKey(apiKey);
      
      const key = await this.dbWrapper.get(`
        SELECT id, name, permissions, created_by, active
        FROM api_keys 
        WHERE key_hash = ? AND active = true
      `, [keyHash]);

      if (!key) {
        return null;
      }

      // Update last used timestamp
      await this.dbWrapper.run(`
        UPDATE api_keys 
        SET last_used = ? 
        WHERE id = ?
      `, [new Date().toISOString(), key.id]);

      return {
        ...key,
        permissions: JSON.parse(key.permissions || '[]')
      };
    } catch (error) {
      console.error('API key validation failed:', error);
      return null;
    }
  }

  /**
   * Get encryption key for secrets
   */
  getEncryptionKey() {
    // In production, this should come from a secure key management service
    const baseKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
    return crypto.scryptSync(baseKey, 'notevault-salt', 32);
  }

  /**
   * Encrypt data
   */
  encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from('notevault-secrets'));
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('base64'),
      encrypted,
      authTag: authTag.toString('base64')
    });
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData, key) {
    const data = JSON.parse(encryptedData);
    const iv = Buffer.from(data.iv, 'base64');
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from('notevault-secrets'));
    decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));
    
    let decrypted = decipher.update(data.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Hash API key for storage
   */
  hashAPIKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Update environment file with new secret
   */
  async updateEnvironmentSecret(name, value) {
    const envFiles = [
      path.join(__dirname, '../../../.env'),
      path.join(__dirname, '../../../.env.local'),
      path.join(__dirname, '../../.env')
    ];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        try {
          let content = fs.readFileSync(envFile, 'utf8');
          const regex = new RegExp(`^${name}=.*$`, 'm');
          
          if (regex.test(content)) {
            content = content.replace(regex, `${name}=${value}`);
          } else {
            content += `\n${name}=${value}\n`;
          }
          
          fs.writeFileSync(envFile, content, { mode: 0o600 });
          console.log(`Updated ${name} in ${envFile}`);
        } catch (error) {
          console.warn(`Could not update ${envFile}:`, error.message);
        }
      }
    }
  }

  /**
   * Generate secure backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase();
      const formatted = `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8)}`;
      codes.push(formatted);
    }
    return codes;
  }

  /**
   * Rotate encryption key - WARNING: This operation re-encrypts all stored secrets
   */
  async rotateEncryptionKey(userId = null) {
    try {
      // Log the start of key rotation
      await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
        action: 'encryption_key_rotation_start',
        userId,
        timestamp: new Date().toISOString()
      });

      // Step 1: Generate new encryption key
      const newEncryptionKey = crypto.randomBytes(32);
      const oldEncryptionKey = this.getEncryptionKey();

      // Step 2: Get all active secrets that need re-encryption
      const secrets = await this.dbWrapper.query(`
        SELECT id, name, encrypted_value, metadata, created_at
        FROM secrets 
        WHERE active = true
      `);

      if (secrets.length === 0) {
        await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
          action: 'encryption_key_rotation_skipped',
          reason: 'no_secrets_to_rotate',
          userId
        });
        return {
          success: true,
          message: 'No secrets to rotate',
          rotatedCount: 0
        };
      }

      // Step 3: Create backup of current secrets table
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await this.dbWrapper.run(`
        CREATE TABLE secrets_backup_${backupTimestamp.substring(0, 19)} AS 
        SELECT * FROM secrets WHERE active = true
      `);

      // Step 4: Begin transaction for re-encryption
      await this.dbWrapper.run('BEGIN TRANSACTION');

      let rotatedCount = 0;
      const failedSecrets = [];

      try {
        // Step 5: Re-encrypt each secret with new key
        for (const secret of secrets) {
          try {
            // Decrypt with old key
            const decryptedValue = this.decrypt(secret.encrypted_value, oldEncryptionKey);
            
            // Encrypt with new key
            const newEncryptedValue = this.encrypt(decryptedValue, newEncryptionKey);
            
            // Update the database record
            await this.dbWrapper.run(`
              UPDATE secrets 
              SET encrypted_value = ?, updated_at = ?
              WHERE id = ?
            `, [newEncryptedValue, new Date().toISOString(), secret.id]);

            rotatedCount++;

          } catch (error) {
            console.error(`Failed to rotate secret ${secret.name}:`, error);
            failedSecrets.push({
              id: secret.id,
              name: secret.name,
              error: error.message
            });
          }
        }

        // Step 6: If any secrets failed, rollback
        if (failedSecrets.length > 0) {
          await this.dbWrapper.run('ROLLBACK');
          
          await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
            action: 'encryption_key_rotation_failed',
            reason: 'secret_re_encryption_failed',
            failedSecrets: failedSecrets.length,
            userId,
            errors: failedSecrets
          });

          throw new Error(`Failed to rotate ${failedSecrets.length} secrets. Operation rolled back.`);
        }

        // Step 7: Generate and store new encryption key
        const newKeyBase64 = newEncryptionKey.toString('base64');
        
        // Store the new key metadata
        await this.dbWrapper.run(`
          INSERT INTO encryption_keys (
            id, key_version, created_at, active, rotated_by, secrets_count
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          crypto.randomUUID(),
          Date.now(), // Use timestamp as version
          new Date().toISOString(),
          true,
          userId,
          rotatedCount
        ]);

        // Deactivate old key version records (if any exist)
        await this.dbWrapper.run(`
          UPDATE encryption_keys 
          SET active = false, deactivated_at = ?
          WHERE active = true AND key_version < ?
        `, [new Date().toISOString(), Date.now()]);

        // Step 8: Update environment file with new key
        await this.updateEnvironmentSecret('ENCRYPTION_KEY', newKeyBase64);

        // Step 9: Commit transaction
        await this.dbWrapper.run('COMMIT');

        // Step 10: Verify rotation success by attempting to decrypt a test secret
        if (secrets.length > 0) {
          try {
            const testSecret = await this.getSecret(secrets[0].name);
            if (!testSecret) {
              throw new Error('Verification failed: Cannot decrypt test secret with new key');
            }
          } catch (verificationError) {
            console.error('Key rotation verification failed:', verificationError);
            throw new Error('Key rotation verification failed');
          }
        }

        // Step 11: Log successful completion
        await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
          action: 'encryption_key_rotation_completed',
          rotatedSecrets: rotatedCount,
          keyVersion: Date.now(),
          userId,
          duration: Date.now() - new Date().getTime()
        });

        return {
          success: true,
          message: `Successfully rotated encryption key and re-encrypted ${rotatedCount} secrets`,
          rotatedCount,
          keyVersion: Date.now(),
          backupTable: `secrets_backup_${backupTimestamp.substring(0, 19)}`
        };

      } catch (error) {
        // Rollback transaction on any error
        await this.dbWrapper.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Encryption key rotation failed:', error);
      
      // Log the failure
      await auditLogger.logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
        action: 'encryption_key_rotation_failed',
        error: error.message,
        userId
      });

      throw new Error(`Encryption key rotation failed: ${error.message}`);
    }
  }

  /**
   * Get encryption key rotation history
   */
  async getKeyRotationHistory() {
    try {
      const history = await this.dbWrapper.query(`
        SELECT 
          id,
          key_version,
          created_at,
          active,
          deactivated_at,
          rotated_by,
          secrets_count
        FROM encryption_keys 
        ORDER BY created_at DESC
        LIMIT 50
      `);

      return history;
    } catch (error) {
      console.error('Failed to get key rotation history:', error);
      return [];
    }
  }

  /**
   * Validate encryption system integrity
   */
  async validateEncryption() {
    try {
      // Get a sample of secrets to test
      const testSecrets = await this.dbWrapper.query(`
        SELECT name, encrypted_value 
        FROM secrets 
        WHERE active = true 
        LIMIT 5
      `);

      const results = {
        tested: testSecrets.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const secret of testSecrets) {
        try {
          const decrypted = await this.getSecret(secret.name);
          if (decrypted) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Failed to decrypt secret: ${secret.name}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error decrypting ${secret.name}: ${error.message}`);
        }
      }

      return {
        success: results.failed === 0,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initialize database tables for secret management
   */
  async initializeSecretTables() {
    try {
      await this.dbWrapper.run(`
        CREATE TABLE IF NOT EXISTS secrets (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          encrypted_value TEXT NOT NULL,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          active BOOLEAN DEFAULT TRUE
        )
      `);

      await this.dbWrapper.run(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          key_hash TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          permissions TEXT,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_used DATETIME,
          active BOOLEAN DEFAULT TRUE,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Create indexes
      await this.dbWrapper.run(`
        CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name)
      `);

      await this.dbWrapper.run(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)
      `);

      console.log('Secret management tables initialized');
    } catch (error) {
      console.error('Failed to initialize secret tables:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const secretManager = new SecretManager();

// Initialize on module load
secretManager.initializeSecretTables().catch(error => {
  console.error('Secret manager initialization failed:', error);
});

export default secretManager;