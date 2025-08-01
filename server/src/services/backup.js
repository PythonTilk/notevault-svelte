import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import archiver from 'archiver';
import { extract } from 'tar-stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class BackupService {
  constructor() {
    this.backupPath = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.compressionLevel = 6; // 1-9, 6 is balanced
    
    // Backup schedule (cron-like)
    this.schedules = {
      full: process.env.FULL_BACKUP_SCHEDULE || '0 2 * * 0', // Weekly at 2 AM Sunday
      incremental: process.env.INCREMENTAL_BACKUP_SCHEDULE || '0 2 * * 1-6', // Daily at 2 AM Mon-Sat
      database: process.env.DATABASE_BACKUP_SCHEDULE || '0 */6 * * *' // Every 6 hours
    };
    
    this.isBackupRunning = false;
    this.lastBackup = null;
    this.backupHistory = [];
    
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
      console.log(`📦 Backup directory initialized: ${this.backupPath}`);
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Create a full system backup
   * @param {Object} options - Backup options
   * @returns {Object} Backup result
   */
  async createFullBackup(options = {}) {
    if (this.isBackupRunning) {
      throw new Error('Backup already in progress');
    }

    this.isBackupRunning = true;
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `full-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;
    
    try {
      console.log(`📦 Starting full backup: ${backupId}`);
      
      const backupInfo = {
        id: backupId,
        type: 'full',
        startTime,
        status: 'in_progress',
        size: 0,
        files: 0,
        errors: [],
        includes: options.includes || ['database', 'files', 'config', 'logs']
      };

      const backupDir = path.join(this.backupPath, backupId);
      await fs.mkdir(backupDir, { recursive: true });

      // Backup database
      if (backupInfo.includes.includes('database')) {
        console.log('📦 Backing up database...');
        const dbBackup = await this.backupDatabase(backupDir);
        backupInfo.size += dbBackup.size;
        backupInfo.files += dbBackup.files;
      }

      // Backup uploaded files
      if (backupInfo.includes.includes('files')) {
        console.log('📦 Backing up files...');
        const filesBackup = await this.backupFiles(backupDir);
        backupInfo.size += filesBackup.size;
        backupInfo.files += filesBackup.files;
      }

      // Backup configuration
      if (backupInfo.includes.includes('config')) {
        console.log('📦 Backing up configuration...');
        const configBackup = await this.backupConfiguration(backupDir);
        backupInfo.size += configBackup.size;
        backupInfo.files += configBackup.files;
      }

      // Backup logs
      if (backupInfo.includes.includes('logs')) {
        console.log('📦 Backing up logs...');
        const logsBackup = await this.backupLogs(backupDir);
        backupInfo.size += logsBackup.size;
        backupInfo.files += logsBackup.files;
      }

      // Create backup metadata
      const metadata = {
        ...backupInfo,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        status: 'completed',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform,
        hostname: require('os').hostname()
      };

      await fs.writeFile(
        path.join(backupDir, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress backup
      const archivePath = path.join(this.backupPath, `${backupId}.tar.gz`);
      await this.compressBackup(backupDir, archivePath);
      
      // Remove uncompressed backup directory
      await fs.rm(backupDir, { recursive: true, force: true });

      // Get final archive size
      const archiveStats = await fs.stat(archivePath);
      metadata.compressedSize = archiveStats.size;
      metadata.compressionRatio = (metadata.size / metadata.compressedSize).toFixed(2);

      // Update backup history
      this.backupHistory.push(metadata);
      this.lastBackup = metadata;

      console.log(`✅ Full backup completed: ${backupId} (${this.formatBytes(metadata.compressedSize)})`);
      
      return metadata;

    } catch (error) {
      console.error('Full backup failed:', error);
      throw error;
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Create an incremental backup
   * @param {Date} since - Backup changes since this date
   * @param {Object} options - Backup options
   * @returns {Object} Backup result
   */
  async createIncrementalBackup(since, options = {}) {
    if (this.isBackupRunning) {
      throw new Error('Backup already in progress');
    }

    this.isBackupRunning = true;
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `incremental-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;
    
    try {
      console.log(`📦 Starting incremental backup: ${backupId}`);
      
      const backupInfo = {
        id: backupId,
        type: 'incremental',
        since: since.toISOString(),
        startTime,
        status: 'in_progress',
        size: 0,
        files: 0,
        errors: []
      };

      const backupDir = path.join(this.backupPath, backupId);
      await fs.mkdir(backupDir, { recursive: true });

      // Backup only changed database records
      const dbBackup = await this.backupDatabaseIncremental(backupDir, since);
      backupInfo.size += dbBackup.size;
      backupInfo.files += dbBackup.files;

      // Backup only changed files
      const filesBackup = await this.backupFilesIncremental(backupDir, since);
      backupInfo.size += filesBackup.size;
      backupInfo.files += filesBackup.files;

      // Create backup metadata
      const metadata = {
        ...backupInfo,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        status: 'completed'
      };

      await fs.writeFile(
        path.join(backupDir, 'backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Compress backup
      const archivePath = path.join(this.backupPath, `${backupId}.tar.gz`);
      await this.compressBackup(backupDir, archivePath);
      
      // Remove uncompressed backup directory
      await fs.rm(backupDir, { recursive: true, force: true });

      // Get final archive size
      const archiveStats = await fs.stat(archivePath);
      metadata.compressedSize = archiveStats.size;

      this.backupHistory.push(metadata);
      this.lastBackup = metadata;

      console.log(`✅ Incremental backup completed: ${backupId} (${this.formatBytes(metadata.compressedSize)})`);
      
      return metadata;

    } catch (error) {
      console.error('Incremental backup failed:', error);
      throw error;
    } finally {
      this.isBackupRunning = false;
    }
  }

  /**
   * Backup database
   * @param {string} backupDir - Backup directory
   * @returns {Object} Backup stats
   */
  async backupDatabase(backupDir) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../database/notevault.db');
    const backupDbPath = path.join(backupDir, 'database.db');
    
    try {
      await fs.copyFile(dbPath, backupDbPath);
      const stats = await fs.stat(backupDbPath);
      
      // Also create a SQL dump for PostgreSQL
      if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
        await this.createSQLDump(backupDir);
      }
      
      return {
        size: stats.size,
        files: 1
      };
    } catch (error) {
      console.error('Database backup failed:', error);
      return { size: 0, files: 0, error: error.message };
    }
  }

  /**
   * Create SQL dump for PostgreSQL
   * @param {string} backupDir - Backup directory
   */
  async createSQLDump(backupDir) {
    const { spawn } = require('child_process');
    const dumpPath = path.join(backupDir, 'database-dump.sql');
    
    return new Promise((resolve, reject) => {
      const pg_dump = spawn('pg_dump', [process.env.DATABASE_URL], {
        stdio: ['inherit', 'pipe', 'pipe']
      });
      
      const writeStream = createWriteStream(dumpPath);
      pg_dump.stdout.pipe(writeStream);
      
      pg_dump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });
      
      pg_dump.on('error', reject);
    });
  }

  /**
   * Backup uploaded files
   * @param {string} backupDir - Backup directory
   * @returns {Object} Backup stats
   */
  async backupFiles(backupDir) {
    const uploadsPath = path.join(__dirname, '../../uploads');
    const backupFilesPath = path.join(backupDir, 'files');
    
    try {
      await fs.mkdir(backupFilesPath, { recursive: true });
      
      const stats = await this.copyDirectory(uploadsPath, backupFilesPath);
      return stats;
    } catch (error) {
      console.error('Files backup failed:', error);
      return { size: 0, files: 0, error: error.message };
    }
  }

  /**
   * Backup configuration files
   * @param {string} backupDir - Backup directory
   * @returns {Object} Backup stats
   */
  async backupConfiguration(backupDir) {
    const configPath = path.join(backupDir, 'config');
    await fs.mkdir(configPath, { recursive: true });
    
    let totalSize = 0;
    let totalFiles = 0;
    
    try {
      // Backup package.json files
      const packageFiles = [
        path.join(__dirname, '../../package.json'),
        path.join(__dirname, '../../../package.json')
      ];
      
      for (const file of packageFiles) {
        try {
          const stats = await fs.stat(file);
          await fs.copyFile(file, path.join(configPath, path.basename(file)));
          totalSize += stats.size;
          totalFiles++;
        } catch (error) {
          // File doesn't exist, skip
        }
      }
      
      // Backup environment example files
      const envFiles = [
        path.join(__dirname, '../.env.example'),
        path.join(__dirname, '../../.env.example')
      ];
      
      for (const file of envFiles) {
        try {
          const stats = await fs.stat(file);
          await fs.copyFile(file, path.join(configPath, path.basename(file)));
          totalSize += stats.size;
          totalFiles++;
        } catch (error) {
          // File doesn't exist, skip
        }
      }
      
      return { size: totalSize, files: totalFiles };
    } catch (error) {
      console.error('Configuration backup failed:', error);
      return { size: 0, files: 0, error: error.message };
    }
  }

  /**
   * Backup log files
   * @param {string} backupDir - Backup directory
   * @returns {Object} Backup stats
   */
  async backupLogs(backupDir) {
    const logsPath = path.join(__dirname, '../../logs');
    const backupLogsPath = path.join(backupDir, 'logs');
    
    try {
      await fs.mkdir(backupLogsPath, { recursive: true });
      
      // Only backup recent logs (last 7 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      const stats = await this.copyDirectory(logsPath, backupLogsPath, {
        filter: (filePath) => {
          const stat = require('fs').statSync(filePath);
          return stat.mtime > cutoffDate;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Logs backup failed:', error);
      return { size: 0, files: 0, error: error.message };
    }
  }

  /**
   * Backup database incrementally
   * @param {string} backupDir - Backup directory
   * @param {Date} since - Changes since this date
   * @returns {Object} Backup stats
   */
  async backupDatabaseIncremental(backupDir, since) {
    // Implementation would depend on your database setup
    // For SQLite, you might export changed records to JSON
    // For PostgreSQL, you could use logical replication or export changed data
    
    try {
      const incrementalData = {
        since: since.toISOString(),
        tables: {
          // This would contain changed records for each table
          users: [],
          notes: [],
          workspaces: [],
          // ... other tables
        }
      };
      
      const incrementalPath = path.join(backupDir, 'incremental-data.json');
      await fs.writeFile(incrementalPath, JSON.stringify(incrementalData, null, 2));
      
      const stats = await fs.stat(incrementalPath);
      return { size: stats.size, files: 1 };
    } catch (error) {
      console.error('Incremental database backup failed:', error);
      return { size: 0, files: 0, error: error.message };
    }
  }

  /**
   * Backup files incrementally
   * @param {string} backupDir - Backup directory
   * @param {Date} since - Changes since this date
   * @returns {Object} Backup stats
   */
  async backupFilesIncremental(backupDir, since) {
    const uploadsPath = path.join(__dirname, '../../uploads');
    const backupFilesPath = path.join(backupDir, 'files');
    
    try {
      await fs.mkdir(backupFilesPath, { recursive: true });
      
      const stats = await this.copyDirectory(uploadsPath, backupFilesPath, {
        filter: (filePath) => {
          const stat = require('fs').statSync(filePath);
          return stat.mtime > since;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Incremental files backup failed:', error);
      return { size: 0, files: 0, error: error.message };
    }
  }

  /**
   * Copy directory recursively
   * @param {string} source - Source directory
   * @param {string} destination - Destination directory
   * @param {Object} options - Copy options
   * @returns {Object} Copy stats
   */
  async copyDirectory(source, destination, options = {}) {
    let totalSize = 0;
    let totalFiles = 0;
    
    try {
      const entries = await fs.readdir(source, { withFileTypes: true });
      
      for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const destPath = path.join(destination, entry.name);
        
        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          const dirStats = await this.copyDirectory(sourcePath, destPath, options);
          totalSize += dirStats.size;
          totalFiles += dirStats.files;
        } else {
          // Apply filter if provided
          if (options.filter && !options.filter(sourcePath)) {
            continue;
          }
          
          await fs.copyFile(sourcePath, destPath);
          const stats = await fs.stat(sourcePath);
          totalSize += stats.size;
          totalFiles++;
        }
      }
    } catch (error) {
      // Source directory doesn't exist or other error
      console.warn(`Directory copy warning: ${error.message}`);
    }
    
    return { size: totalSize, files: totalFiles };
  }

  /**
   * Compress backup directory
   * @param {string} sourceDir - Source directory
   * @param {string} outputPath - Output archive path
   */
  async compressBackup(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: {
          level: this.compressionLevel
        }
      });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Restore from backup
   * @param {string} backupId - Backup ID to restore
   * @param {Object} options - Restore options
   * @returns {Object} Restore result
   */
  async restoreFromBackup(backupId, options = {}) {
    const startTime = Date.now();
    console.log(`🔄 Starting restore from backup: ${backupId}`);
    
    try {
      const backupPath = path.join(this.backupPath, `${backupId}.tar.gz`);
      
      // Check if backup exists
      await fs.access(backupPath);
      
      // Extract backup
      const extractDir = path.join(this.backupPath, `restore-${backupId}`);
      await this.extractBackup(backupPath, extractDir);
      
      // Read backup metadata
      const metadataPath = path.join(extractDir, 'backup-metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      
      const restoreInfo = {
        backupId,
        startTime,
        status: 'in_progress',
        restored: {
          database: false,
          files: false,
          config: false,
          logs: false
        },
        errors: []
      };
      
      // Restore database
      if (!options.skipDatabase && metadata.includes?.includes('database')) {
        console.log('🔄 Restoring database...');
        try {
          await this.restoreDatabase(extractDir);
          restoreInfo.restored.database = true;
        } catch (error) {
          restoreInfo.errors.push(`Database restore failed: ${error.message}`);
        }
      }
      
      // Restore files
      if (!options.skipFiles && metadata.includes?.includes('files')) {
        console.log('🔄 Restoring files...');
        try {
          await this.restoreFiles(extractDir);
          restoreInfo.restored.files = true;
        } catch (error) {
          restoreInfo.errors.push(`Files restore failed: ${error.message}`);
        }
      }
      
      // Clean up extraction directory
      await fs.rm(extractDir, { recursive: true, force: true });
      
      const result = {
        ...restoreInfo,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        status: restoreInfo.errors.length === 0 ? 'completed' : 'completed_with_errors'
      };
      
      console.log(`✅ Restore completed: ${backupId}`);
      return result;
      
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  /**
   * Extract backup archive
   * @param {string} archivePath - Archive path
   * @param {string} extractDir - Extract directory
   */
  async extractBackup(archivePath, extractDir) {
    await fs.mkdir(extractDir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(archivePath);
      const gunzip = createGunzip();
      const extractor = extract();
      
      extractor.on('entry', async (header, stream, next) => {
        const filePath = path.join(extractDir, header.name);
        
        if (header.type === 'directory') {
          await fs.mkdir(filePath, { recursive: true });
          next();
        } else {
          const writeStream = createWriteStream(filePath);
          stream.pipe(writeStream);
          stream.on('end', next);
        }
      });
      
      extractor.on('finish', resolve);
      extractor.on('error', reject);
      
      readStream.pipe(gunzip).pipe(extractor);
    });
  }

  /**
   * Restore database from backup
   * @param {string} extractDir - Extract directory
   */
  async restoreDatabase(extractDir) {
    const backupDbPath = path.join(extractDir, 'database.db');
    const currentDbPath = process.env.DB_PATH || path.join(__dirname, '../../database/notevault.db');
    
    // Backup current database first
    const backupCurrentPath = `${currentDbPath}.backup-${Date.now()}`;
    await fs.copyFile(currentDbPath, backupCurrentPath);
    
    try {
      // Restore database
      await fs.copyFile(backupDbPath, currentDbPath);
      console.log('✅ Database restored successfully');
    } catch (error) {
      // Restore original database on failure
      await fs.copyFile(backupCurrentPath, currentDbPath);
      throw error;
    }
  }

  /**
   * Restore files from backup
   * @param {string} extractDir - Extract directory
   */
  async restoreFiles(extractDir) {
    const backupFilesPath = path.join(extractDir, 'files');
    const currentFilesPath = path.join(__dirname, '../../uploads');
    
    // Backup current files first
    const backupCurrentPath = `${currentFilesPath}-backup-${Date.now()}`;
    
    try {
      await fs.cp(currentFilesPath, backupCurrentPath, { recursive: true });
    } catch (error) {
      // Current files directory might not exist
    }
    
    try {
      // Remove current files and restore from backup
      await fs.rm(currentFilesPath, { recursive: true, force: true });
      await fs.cp(backupFilesPath, currentFilesPath, { recursive: true });
      console.log('✅ Files restored successfully');
    } catch (error) {
      // Restore original files on failure
      if (await fs.access(backupCurrentPath).then(() => true).catch(() => false)) {
        await fs.cp(backupCurrentPath, currentFilesPath, { recursive: true });
      }
      throw error;
    }
  }

  /**
   * List available backups
   * @returns {Array} List of backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupPath);
      const backupFiles = files.filter(file => file.endsWith('.tar.gz'));
      
      const backups = [];
      
      for (const file of backupFiles) {
        const backupId = file.replace('.tar.gz', '');
        const filePath = path.join(this.backupPath, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          id: backupId,
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          type: backupId.startsWith('full-') ? 'full' : 'incremental'
        });
      }
      
      // Sort by creation date (newest first)
      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      const toDelete = backups.filter(backup => backup.created < cutoffDate);
      
      for (const backup of toDelete) {
        const filePath = path.join(this.backupPath, backup.filename);
        await fs.unlink(filePath);
        console.log(`🗑️  Deleted old backup: ${backup.id}`);
      }
      
      console.log(`🧹 Backup cleanup completed: ${toDelete.length} backups deleted`);
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Get backup statistics
   * @returns {Object} Backup statistics
   */
  async getBackupStats() {
    const backups = await this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    return {
      total: backups.length,
      totalSize,
      byType: {
        full: backups.filter(b => b.type === 'full').length,
        incremental: backups.filter(b => b.type === 'incremental').length
      },
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null,
      lastBackup: this.lastBackup,
      isRunning: this.isBackupRunning,
      retentionDays: this.retentionDays
    };
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Verify backup integrity
   * @param {string} backupId - Backup ID
   * @returns {Object} Verification result
   */
  async verifyBackup(backupId) {
    try {
      const backupPath = path.join(this.backupPath, `${backupId}.tar.gz`);
      
      // Check if file exists and is readable
      await fs.access(backupPath, fs.constants.R_OK);
      
      // Calculate checksum
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(backupPath);
      
      for await (const chunk of stream) {
        hash.update(chunk);
      }
      
      const checksum = hash.digest('hex');
      
      return {
        valid: true,
        checksum,
        verified: Date.now()
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        verified: Date.now()
      };
    }
  }
}

// Export singleton instance
export default new BackupService();