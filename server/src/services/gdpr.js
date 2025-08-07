import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GDPRComplianceService {
  constructor() {
    this.exportPath = process.env.GDPR_EXPORT_PATH || path.join(__dirname, '../../exports');
    this.retentionPeriods = {
      // Default retention periods in days
      user_data: parseInt(process.env.GDPR_USER_RETENTION) || 2555, // 7 years
      analytics: parseInt(process.env.GDPR_ANALYTICS_RETENTION) || 1095, // 3 years
      logs: parseInt(process.env.GDPR_LOGS_RETENTION) || 365, // 1 year
      backup: parseInt(process.env.GDPR_BACKUP_RETENTION) || 2555, // 7 years
      audit: parseInt(process.env.GDPR_AUDIT_RETENTION) || 2555 // 7 years
    };
    
    // Data processing purposes
    this.processingPurposes = {
      service_provision: 'Providing and maintaining the NoteVault service',
      communication: 'Communicating with users about the service',
      analytics: 'Analyzing usage patterns to improve the service',
      security: 'Ensuring security and preventing fraud',
      legal_compliance: 'Complying with legal obligations',
      marketing: 'Marketing communications (with consent)'
    };
    
    // Legal bases for processing
    this.legalBases = {
      contract: 'Performance of a contract',
      consent: 'User consent',
      legitimate_interest: 'Legitimate interests',
      legal_obligation: 'Legal obligation',
      vital_interests: 'Vital interests',
      public_task: 'Public task'
    };
    
    this.ensureExportDirectory();
  }

  /**
   * Ensure export directory exists
   */
  async ensureExportDirectory() {
    try {
      await fs.mkdir(this.exportPath, { recursive: true });
      console.log(`📋 GDPR export directory initialized: ${this.exportPath}`);
    } catch (error) {
      console.error('Failed to create GDPR export directory:', error);
    }
  }

  /**
   * Export all user data (GDPR Article 20 - Right to data portability)
   * @param {string} userId - User ID
   * @param {string} format - Export format ('json', 'csv', 'xml')
   * @param {Object} options - Export options
   * @returns {Object} Export result with download link
   */
  async exportUserData(userId, format = 'json', options = {}) {
    const startTime = Date.now();
    const exportId = `user-export-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    try {
      console.log(`📋 Starting GDPR data export for user: ${userId}`);
      
      // Gather all user data
      const userData = await this.gatherUserData(userId, options);
      
      // Create export package
      const exportResult = await this.createExportPackage(userData, exportId, format);
      
      // Log the export request
      await this.logDataExport(userId, exportId, format, 'completed');
      
      const result = {
        exportId,
        userId,
        format,
        status: 'completed',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        downloadUrl: `/api/gdpr/download/${exportId}`,
        fileSize: exportResult.size,
        recordCount: exportResult.recordCount,
        duration: Date.now() - startTime,
        includes: Object.keys(userData).filter(key => userData[key] && userData[key].length > 0)
      };
      
      console.log(`✅ GDPR data export completed: ${exportId}`);
      return result;
      
    } catch (error) {
      console.error('GDPR data export failed:', error);
      await this.logDataExport(userId, exportId, format, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Gather all user data from various sources
   * @param {string} userId - User ID
   * @param {Object} options - Gathering options
   * @returns {Object} Gathered user data
   */
  async gatherUserData(userId, options = {}) {
    const userData = {
      user_profile: [],
      notes: [],
      workspaces: [],
      files: [],
      chat_messages: [],
      oauth_accounts: [],
      sessions: [],
      audit_logs: [],
      analytics_events: [],
      two_factor_auth: [],
      email_verifications: [],
      password_resets: []
    };

    // Note: These queries would need to be implemented based on your actual database setup
    // This is a template showing the structure

    try {
      // User profile data
      userData.user_profile = await this.getUserProfile(userId);
      
      // User's notes
      if (!options.excludeContent) {
        userData.notes = await this.getUserNotes(userId);
      }
      
      // User's workspaces
      userData.workspaces = await this.getUserWorkspaces(userId);
      
      // User's files
      if (!options.excludeFiles) {
        userData.files = await this.getUserFiles(userId);
      }
      
      // User's chat messages
      if (!options.excludeMessages) {
        userData.chat_messages = await this.getUserChatMessages(userId);
      }
      
      // OAuth accounts
      userData.oauth_accounts = await this.getUserOAuthAccounts(userId);
      
      // Sessions (recent only)
      userData.sessions = await this.getUserSessions(userId);
      
      // Audit logs
      if (!options.excludeAuditLogs) {
        userData.audit_logs = await this.getUserAuditLogs(userId);
      }
      
      // Analytics events (anonymized)
      if (!options.excludeAnalytics) {
        userData.analytics_events = await this.getUserAnalyticsEvents(userId);
      }
      
      // Two-factor authentication data
      userData.two_factor_auth = await this.getUserTwoFactorAuth(userId);
      
      // Email verifications
      userData.email_verifications = await this.getUserEmailVerifications(userId);
      
      // Password reset requests
      userData.password_resets = await this.getUserPasswordResets(userId);
      
    } catch (error) {
      console.error('Error gathering user data:', error);
      // Continue with partial data rather than failing completely
    }

    return userData;
  }

  /**
   * Create export package in requested format
   * @param {Object} userData - User data
   * @param {string} exportId - Export ID
   * @param {string} format - Export format
   * @returns {Object} Export result
   */
  async createExportPackage(userData, exportId, format) {
    const exportDir = path.join(this.exportPath, exportId);
    await fs.mkdir(exportDir, { recursive: true });
    
    let totalRecords = 0;
    
    // Create data explanation file
    await this.createDataExplanation(exportDir, userData);
    
    // Process each data category
    for (const [category, data] of Object.entries(userData)) {
      if (!data || data.length === 0) continue;
      
      totalRecords += Array.isArray(data) ? data.length : 1;
      
      switch (format) {
        case 'json':
          await this.exportAsJSON(exportDir, category, data);
          break;
        case 'csv':
          await this.exportAsCSV(exportDir, category, data);
          break;
        case 'xml':
          await this.exportAsXML(exportDir, category, data);
          break;
        default:
          await this.exportAsJSON(exportDir, category, data);
      }
    }
    
    // Create archive
    const archivePath = path.join(this.exportPath, `${exportId}.zip`);
    await this.createArchive(exportDir, archivePath);
    
    // Get archive size
    const stats = await fs.stat(archivePath);
    
    // Clean up temporary directory
    await fs.rm(exportDir, { recursive: true, force: true });
    
    return {
      size: stats.size,
      recordCount: totalRecords,
      archivePath
    };
  }

  /**
   * Create data explanation file
   * @param {string} exportDir - Export directory
   * @param {Object} userData - User data
   */
  async createDataExplanation(exportDir, userData) {
    const explanation = {
      export_info: {
        created_at: new Date().toISOString(),
        format_version: '1.0',
        service: 'NoteVault',
        gdpr_rights: [
          'Right to access (Article 15)',
          'Right to data portability (Article 20)',
          'Right to rectification (Article 16)',
          'Right to erasure (Article 17)',
          'Right to restrict processing (Article 18)',
          'Right to object (Article 21)'
        ]
      },
      data_categories: {},
      processing_purposes: this.processingPurposes,
      legal_bases: this.legalBases,
      retention_periods: this.retentionPeriods,
      data_protection_contact: {
        email: process.env.DPO_EMAIL || 'privacy@notevault.com',
        address: process.env.DPO_ADDRESS || 'NoteVault Privacy Office'
      }
    };
    
    // Document each data category
    for (const [category, data] of Object.entries(userData)) {
      if (!data || data.length === 0) continue;
      
      explanation.data_categories[category] = {
        description: this.getDataCategoryDescription(category),
        record_count: Array.isArray(data) ? data.length : 1,
        processing_purpose: this.getProcessingPurpose(category),
        legal_basis: this.getLegalBasis(category),
        retention_period_days: this.retentionPeriods[category] || this.retentionPeriods.user_data,
        fields: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : []
      };
    }
    
    await fs.writeFile(
      path.join(exportDir, 'README.json'),
      JSON.stringify(explanation, null, 2)
    );
    
    // Also create human-readable README
    const readmeText = this.generateHumanReadableExplanation(explanation);
    await fs.writeFile(
      path.join(exportDir, 'README.txt'),
      readmeText
    );
  }

  /**
   * Export data as JSON
   * @param {string} exportDir - Export directory
   * @param {string} category - Data category
   * @param {Object|Array} data - Data to export
   */
  async exportAsJSON(exportDir, category, data) {
    const filePath = path.join(exportDir, `${category}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Export data as CSV
   * @param {string} exportDir - Export directory
   * @param {string} category - Data category
   * @param {Object|Array} data - Data to export
   */
  async exportAsCSV(exportDir, category, data) {
    if (!Array.isArray(data) || data.length === 0) return;
    
    const filePath = path.join(exportDir, `${category}.csv`);
    
    // Get all unique keys from all objects
    const allKeys = [...new Set(data.flatMap(Object.keys))];
    
    // Create CSV header
    const csvLines = [allKeys.join(',')];
    
    // Create CSV rows
    for (const item of data) {
      const row = allKeys.map(key => {
        const value = item[key] || '';
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(row.join(','));
    }
    
    await fs.writeFile(filePath, csvLines.join('\n'));
  }

  /**
   * Export data as XML
   * @param {string} exportDir - Export directory
   * @param {string} category - Data category
   * @param {Object|Array} data - Data to export
   */
  async exportAsXML(exportDir, category, data) {
    const filePath = path.join(exportDir, `${category}.xml`);
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<${category}>\n`;
    
    if (Array.isArray(data)) {
      for (const item of data) {
        xml += '  <record>\n';
        for (const [key, value] of Object.entries(item)) {
          xml += `    <${key}>${this.escapeXML(String(value))}</${key}>\n`;
        }
        xml += '  </record>\n';
      }
    } else {
      for (const [key, value] of Object.entries(data)) {
        xml += `  <${key}>${this.escapeXML(String(value))}</${key}>\n`;
      }
    }
    
    xml += `</${category}>\n`;
    
    await fs.writeFile(filePath, xml);
  }

  /**
   * Create archive from directory
   * @param {string} sourceDir - Source directory
   * @param {string} outputPath - Output archive path
   */
  async createArchive(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Delete user data (GDPR Article 17 - Right to erasure)
   * @param {string} userId - User ID
   * @param {Object} options - Deletion options
   * @returns {Object} Deletion result
   */
  async deleteUserData(userId, options = {}) {
    const startTime = Date.now();
    const deletionId = `user-deletion-${userId}-${Date.now()}`;
    
    try {
      console.log(`🗑️  Starting GDPR data deletion for user: ${userId}`);
      
      const deletionResult = {
        deletionId,
        userId,
        startTime,
        status: 'in_progress',
        deleted: {
          user_profile: false,
          notes: false,
          workspaces: false,
          files: false,
          chat_messages: false,
          oauth_accounts: false,
          sessions: false,
          audit_logs: false,
          analytics_events: false,
          two_factor_auth: false
        },
        errors: []
      };
      
      // Delete user profile (this should be last)
      if (!options.keepProfile) {
        try {
          await this.deleteUserProfile(userId);
          deletionResult.deleted.user_profile = true;
        } catch (error) {
          deletionResult.errors.push(`User profile deletion failed: ${error.message}`);
        }
      }
      
      // Delete user's notes
      if (!options.keepNotes) {
        try {
          await this.deleteUserNotes(userId);
          deletionResult.deleted.notes = true;
        } catch (error) {
          deletionResult.errors.push(`Notes deletion failed: ${error.message}`);
        }
      }
      
      // Delete user's workspaces
      if (!options.keepWorkspaces) {
        try {
          await this.deleteUserWorkspaces(userId);
          deletionResult.deleted.workspaces = true;
        } catch (error) {
          deletionResult.errors.push(`Workspaces deletion failed: ${error.message}`);
        }
      }
      
      // Delete user's files
      if (!options.keepFiles) {
        try {
          await this.deleteUserFiles(userId);
          deletionResult.deleted.files = true;
        } catch (error) {
          deletionResult.errors.push(`Files deletion failed: ${error.message}`);
        }
      }
      
      // Delete user's chat messages
      if (!options.keepMessages) {
        try {
          await this.deleteUserChatMessages(userId);
          deletionResult.deleted.chat_messages = true;
        } catch (error) {
          deletionResult.errors.push(`Chat messages deletion failed: ${error.message}`);
        }
      }
      
      // Delete OAuth accounts
      try {
        await this.deleteUserOAuthAccounts(userId);
        deletionResult.deleted.oauth_accounts = true;
      } catch (error) {
        deletionResult.errors.push(`OAuth accounts deletion failed: ${error.message}`);
      }
      
      // Delete sessions
      try {
        await this.deleteUserSessions(userId);
        deletionResult.deleted.sessions = true;
      } catch (error) {
        deletionResult.errors.push(`Sessions deletion failed: ${error.message}`);
      }
      
      // Anonymize audit logs (don't delete for legal compliance)
      if (!options.keepAuditLogs) {
        try {
          await this.anonymizeUserAuditLogs(userId);
          deletionResult.deleted.audit_logs = true;
        } catch (error) {
          deletionResult.errors.push(`Audit logs anonymization failed: ${error.message}`);
        }
      }
      
      // Anonymize analytics events
      if (!options.keepAnalytics) {
        try {
          await this.anonymizeUserAnalyticsEvents(userId);
          deletionResult.deleted.analytics_events = true;
        } catch (error) {
          deletionResult.errors.push(`Analytics events anonymization failed: ${error.message}`);
        }
      }
      
      // Delete two-factor authentication
      try {
        await this.deleteUserTwoFactorAuth(userId);
        deletionResult.deleted.two_factor_auth = true;
      } catch (error) {
        deletionResult.errors.push(`2FA deletion failed: ${error.message}`);
      }
      
      // Log the deletion
      await this.logDataDeletion(userId, deletionId, deletionResult);
      
      const result = {
        ...deletionResult,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        status: deletionResult.errors.length === 0 ? 'completed' : 'completed_with_errors'
      };
      
      console.log(`✅ GDPR data deletion completed: ${deletionId}`);
      return result;
      
    } catch (error) {
      console.error('GDPR data deletion failed:', error);
      await this.logDataDeletion(userId, deletionId, { status: 'failed', error: error.message });
      throw error;
    }
  }

  /**
   * Get data processing information
   * @param {string} userId - User ID
   * @returns {Object} Data processing information
   */
  async getDataProcessingInfo(userId) {
    const userData = await this.gatherUserData(userId, { excludeContent: true });
    
    const processingInfo = {
      user_id: userId,
      generated_at: new Date().toISOString(),
      data_categories: {},
      processing_purposes: this.processingPurposes,
      legal_bases: this.legalBases,
      retention_periods: this.retentionPeriods,
      third_party_sharing: {
        cloud_storage: process.env.STORAGE_TYPE !== 'local',
        email_service: !!process.env.SMTP_HOST,
        analytics: false, // We don't share with third-party analytics
        oauth_providers: []
      },
      user_rights: [
        'Right to access your data',
        'Right to rectify incorrect data',
        'Right to erase your data',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object to processing',
        'Right to withdraw consent'
      ],
      contact_info: {
        dpo_email: process.env.DPO_EMAIL || 'privacy@notevault.com',
        support_email: process.env.SUPPORT_EMAIL || 'support@notevault.com'
      }
    };
    
    // Document what data we have for this user
    for (const [category, data] of Object.entries(userData)) {
      if (!data || data.length === 0) continue;
      
      processingInfo.data_categories[category] = {
        description: this.getDataCategoryDescription(category),
        record_count: Array.isArray(data) ? data.length : 1,
        processing_purpose: this.getProcessingPurpose(category),
        legal_basis: this.getLegalBasis(category),
        retention_period_days: this.retentionPeriods[category] || this.retentionPeriods.user_data,
        can_be_deleted: this.canBeDeleted(category),
        automated_processing: this.hasAutomatedProcessing(category)
      };
    }
    
    return processingInfo;
  }

  /**
   * Log data export request
   * @param {string} userId - User ID
   * @param {string} exportId - Export ID
   * @param {string} format - Export format
   * @param {string} status - Export status
   * @param {string} error - Error message (if any)
   */
  async logDataExport(userId, exportId, format, status, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'gdpr_export',
      user_id: userId,
      export_id: exportId,
      format,
      status,
      error,
      ip_address: null, // Would be populated from request context
      user_agent: null  // Would be populated from request context
    };
    
    // Implementation would depend on your audit logging system
    console.log('GDPR Export Log:', logEntry);
  }

  /**
   * Log data deletion request
   * @param {string} userId - User ID
   * @param {string} deletionId - Deletion ID
   * @param {Object} result - Deletion result
   */
  async logDataDeletion(userId, deletionId, result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'gdpr_deletion',
      user_id: userId,
      deletion_id: deletionId,
      result,
      ip_address: null, // Would be populated from request context
      user_agent: null  // Would be populated from request context
    };
    
    // Implementation would depend on your audit logging system
    console.log('GDPR Deletion Log:', logEntry);
  }

  // Helper methods for data description and classification
  getDataCategoryDescription(category) {
    const descriptions = {
      user_profile: 'Basic user account information including username, email, and preferences',
      notes: 'User-created notes and their content',
      workspaces: 'Workspace information and user memberships',
      files: 'Uploaded files and attachments',
      chat_messages: 'Messages sent in public and workspace chats',
      oauth_accounts: 'Connected social media and OAuth provider accounts',
      sessions: 'Login session information',
      audit_logs: 'System access and activity logs',
      analytics_events: 'Usage analytics and interaction data',
      two_factor_auth: 'Two-factor authentication settings and backup codes'
    };
    
    return descriptions[category] || 'User data';
  }

  getProcessingPurpose(category) {
    const purposes = {
      user_profile: 'service_provision',
      notes: 'service_provision',
      workspaces: 'service_provision',
      files: 'service_provision',
      chat_messages: 'service_provision',
      oauth_accounts: 'service_provision',
      sessions: 'security',
      audit_logs: 'security',
      analytics_events: 'analytics',
      two_factor_auth: 'security'
    };
    
    return purposes[category] || 'service_provision';
  }

  getLegalBasis(category) {
    const bases = {
      user_profile: 'contract',
      notes: 'contract',
      workspaces: 'contract',
      files: 'contract',
      chat_messages: 'contract',
      oauth_accounts: 'consent',
      sessions: 'legitimate_interest',
      audit_logs: 'legal_obligation',
      analytics_events: 'legitimate_interest',
      two_factor_auth: 'consent'
    };
    
    return bases[category] || 'contract';
  }

  canBeDeleted(category) {
    const deletable = {
      user_profile: true,
      notes: true,
      workspaces: true,
      files: true,
      chat_messages: true,
      oauth_accounts: true,
      sessions: true,
      audit_logs: false, // Keep for legal compliance, but anonymize
      analytics_events: false, // Anonymize instead of delete
      two_factor_auth: true
    };
    
    return deletable[category] !== false;
  }

  hasAutomatedProcessing(category) {
    const automated = {
      user_profile: false,
      notes: false,
      workspaces: false,
      files: false,
      chat_messages: false,
      oauth_accounts: false,
      sessions: true,
      audit_logs: true,
      analytics_events: true,
      two_factor_auth: false
    };
    
    return automated[category] === true;
  }

  escapeXML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  generateHumanReadableExplanation(explanation) {
    let text = 'GDPR DATA EXPORT - NOTEVAULT\n';
    text += '================================\n\n';
    text += `Export created: ${explanation.export_info.created_at}\n`;
    text += `Format version: ${explanation.export_info.format_version}\n\n`;
    
    text += 'YOUR RIGHTS UNDER GDPR:\n';
    for (const right of explanation.export_info.gdpr_rights) {
      text += `- ${right}\n`;
    }
    text += '\n';
    
    text += 'DATA CATEGORIES INCLUDED:\n';
    for (const [category, info] of Object.entries(explanation.data_categories)) {
      text += `\n${category.toUpperCase()}:\n`;
      text += `  Description: ${info.description}\n`;
      text += `  Records: ${info.record_count}\n`;
      text += `  Purpose: ${explanation.processing_purposes[info.processing_purpose]}\n`;
      text += `  Legal Basis: ${explanation.legal_bases[info.legal_basis]}\n`;
      text += `  Retention: ${info.retention_period_days} days\n`;
    }
    
    text += '\nCONTACT INFORMATION:\n';
    text += `Data Protection Officer: ${explanation.data_protection_contact.email}\n`;
    text += `Address: ${explanation.data_protection_contact.address}\n`;
    
    return text;
  }

  // Placeholder methods for database operations
  // These would need to be implemented based on your actual database setup
  
  async getUserProfile(userId) { return []; }
  async getUserNotes(userId) { return []; }
  async getUserWorkspaces(userId) { return []; }
  async getUserFiles(userId) { return []; }
  async getUserChatMessages(userId) { return []; }
  async getUserOAuthAccounts(userId) { return []; }
  async getUserSessions(userId) { return []; }
  async getUserAuditLogs(userId) { return []; }
  async getUserAnalyticsEvents(userId) { return []; }
  async getUserTwoFactorAuth(userId) { return []; }
  async getUserEmailVerifications(userId) { return []; }
  async getUserPasswordResets(userId) { return []; }
  
  async deleteUserProfile(userId) { console.log(`Delete user profile: ${userId}`); }
  async deleteUserNotes(userId) { console.log(`Delete user notes: ${userId}`); }
  async deleteUserWorkspaces(userId) { console.log(`Delete user workspaces: ${userId}`); }
  async deleteUserFiles(userId) { console.log(`Delete user files: ${userId}`); }
  async deleteUserChatMessages(userId) { console.log(`Delete user chat messages: ${userId}`); }
  async deleteUserOAuthAccounts(userId) { console.log(`Delete user OAuth accounts: ${userId}`); }
  async deleteUserSessions(userId) { console.log(`Delete user sessions: ${userId}`); }
  async anonymizeUserAuditLogs(userId) { console.log(`Anonymize user audit logs: ${userId}`); }
  async anonymizeUserAnalyticsEvents(userId) { console.log(`Anonymize user analytics events: ${userId}`); }
  async deleteUserTwoFactorAuth(userId) { console.log(`Delete user 2FA: ${userId}`); }
}

// Export singleton instance
export default new GDPRComplianceService();