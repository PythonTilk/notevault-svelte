/**
 * Data Loss Prevention (DLP) Service
 * 
 * Provides content scanning, data classification, policy enforcement,
 * and compliance monitoring for sensitive data protection.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';

class DLPService extends EventEmitter {
  constructor() {
    super();
    
    // Content patterns for sensitive data detection
    this.sensitivePatterns = {
      // Credit card numbers (various formats)
      creditCard: [
        /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
      ],
      
      // Social Security Numbers
      ssn: [
        /\b\d{3}-?\d{2}-?\d{4}\b/g,
        /\b(?!000|666)[0-8]\d{2}-?(?!00)\d{2}-?(?!0000)\d{4}\b/g
      ],
      
      // Email addresses
      email: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      ],
      
      // Phone numbers
      phone: [
        /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
        /\b\d{3}-\d{3}-\d{4}\b/g
      ],
      
      // IP addresses
      ipAddress: [
        /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g
      ],
      
      // API keys and tokens
      apiKey: [
        /[A-Za-z0-9]{32,}/g, // Generic long alphanumeric strings
        /sk-[A-Za-z0-9]{48,}/g, // OpenAI style
        /xox[baprs]-[A-Za-z0-9\-]+/g, // Slack tokens
        /ghp_[A-Za-z0-9]{36}/g, // GitHub tokens
        /AIza[A-Za-z0-9_-]{35}/g // Google API keys
      ],
      
      // Database connection strings
      dbConnection: [
        /mongodb:\/\/[^\s]+/g,
        /postgres:\/\/[^\s]+/g,
        /mysql:\/\/[^\s]+/g,
        /redis:\/\/[^\s]+/g
      ],
      
      // AWS credentials
      awsCredentials: [
        /AKIA[0-9A-Z]{16}/g, // AWS Access Key ID
        /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/g
      ],
      
      // Private keys
      privateKey: [
        /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
        /-----BEGIN RSA PRIVATE KEY-----/g,
        /-----BEGIN EC PRIVATE KEY-----/g
      ]
    };

    // Classification levels
    this.classificationLevels = {
      PUBLIC: 0,
      INTERNAL: 1,
      CONFIDENTIAL: 2,
      RESTRICTED: 3,
      TOP_SECRET: 4
    };

    // Policy configuration
    this.policies = new Map();
    this.violations = [];
    this.quarantinedContent = new Map();
    
    // Initialize default policies
    this.initializeDefaultPolicies();
    
    console.log('DLP Service initialized');
  }

  /**
   * Initialize default DLP policies
   */
  initializeDefaultPolicies() {
    // Credit card protection policy
    this.addPolicy({
      id: 'credit-card-protection',
      name: 'Credit Card Protection',
      description: 'Prevent credit card numbers from being stored or shared',
      enabled: true,
      dataTypes: ['creditCard'],
      actions: ['block', 'redact', 'quarantine'],
      severity: 'high',
      notifications: ['admin', 'security_team'],
      exemptions: []
    });

    // PII protection policy
    this.addPolicy({
      id: 'pii-protection',
      name: 'Personal Information Protection', 
      description: 'Protect Social Security Numbers and personal data',
      enabled: true,
      dataTypes: ['ssn', 'phone'],
      actions: ['redact', 'audit'],
      severity: 'high',
      notifications: ['admin'],
      exemptions: []
    });

    // Credential protection policy
    this.addPolicy({
      id: 'credential-protection',
      name: 'Credential and API Key Protection',
      description: 'Prevent credentials and API keys from being exposed',
      enabled: true,
      dataTypes: ['apiKey', 'dbConnection', 'awsCredentials', 'privateKey'],
      actions: ['block', 'quarantine', 'alert'],
      severity: 'critical',
      notifications: ['admin', 'security_team', 'compliance'],
      exemptions: []
    });

    // Internal data policy
    this.addPolicy({
      id: 'internal-data-classification',
      name: 'Internal Data Classification',
      description: 'Classify and protect internal company data',
      enabled: true,
      dataTypes: ['email', 'ipAddress'],
      actions: ['classify', 'audit'],
      severity: 'medium',
      notifications: ['admin'],
      exemptions: ['@company.com'] // Allow company emails
    });
  }

  /**
   * Add a new DLP policy
   * @param {Object} policy - Policy configuration
   */
  addPolicy(policy) {
    if (!policy.id || !policy.name) {
      throw new Error('Policy must have id and name');
    }

    this.policies.set(policy.id, {
      ...policy,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    this.emit('policy_added', policy);
  }

  /**
   * Update an existing DLP policy
   * @param {string} policyId - Policy ID
   * @param {Object} updates - Policy updates
   */
  updatePolicy(policyId, updates) {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: Date.now()
    };

    this.policies.set(policyId, updatedPolicy);
    this.emit('policy_updated', updatedPolicy);
    
    return updatedPolicy;
  }

  /**
   * Scan content for sensitive data
   * @param {string} content - Content to scan
   * @param {Object} context - Context information (user, workspace, etc.)
   * @returns {Object} Scan results
   */
  async scanContent(content, context = {}) {
    const scanId = crypto.randomUUID();
    const findings = [];
    const classifications = [];

    try {
      // Scan for each sensitive data type
      for (const [dataType, patterns] of Object.entries(this.sensitivePatterns)) {
        for (const pattern of patterns) {
          const matches = [...content.matchAll(pattern)];
          
          for (const match of matches) {
            const finding = {
              id: crypto.randomUUID(),
              dataType,
              pattern: pattern.source,
              match: match[0],
              position: match.index,
              length: match[0].length,
              confidence: this.calculateConfidence(dataType, match[0]),
              context: {
                before: content.substring(Math.max(0, match.index - 20), match.index),
                after: content.substring(match.index + match[0].length, Math.min(content.length, match.index + match[0].length + 20))
              }
            };

            // Apply exemptions
            if (!this.isExempt(finding, context)) {
              findings.push(finding);
            }
          }
        }
      }

      // Apply policies to findings
      const policyResults = await this.applyPolicies(findings, content, context);
      
      // Classify content based on findings
      const contentClassification = this.classifyContent(findings);

      const scanResult = {
        scanId,
        timestamp: Date.now(),
        content: {
          length: content.length,
          hash: crypto.createHash('sha256').update(content).digest('hex').substring(0, 8)
        },
        findings,
        classification: contentClassification,
        policyResults,
        context,
        stats: {
          totalFindings: findings.length,
          criticalFindings: findings.filter(f => f.severity === 'critical').length,
          highFindings: findings.filter(f => f.severity === 'high').length,
          mediumFindings: findings.filter(f => f.severity === 'medium').length
        }
      };

      // Log scan results
      await logSecurityEvent(SECURITY_EVENTS.DLP_SCAN_COMPLETED, {
        scanId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        findingsCount: findings.length,
        classification: contentClassification,
        contentHash: scanResult.content.hash
      });

      return scanResult;

    } catch (error) {
      console.error('DLP scan error:', error);
      
      await logSecurityEvent(SECURITY_EVENTS.DLP_SCAN_FAILED, {
        scanId,
        error: error.message,
        context
      });

      throw error;
    }
  }

  /**
   * Calculate confidence score for a finding
   * @param {string} dataType - Type of sensitive data
   * @param {string} match - Matched string
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(dataType, match) {
    switch (dataType) {
      case 'creditCard':
        // Use Luhn algorithm for credit card validation
        return this.isValidCreditCard(match) ? 0.95 : 0.6;
      
      case 'ssn':
        // Check SSN format validity
        return this.isValidSSN(match) ? 0.9 : 0.7;
      
      case 'email':
        // Email regex is quite accurate
        return 0.9;
      
      case 'apiKey':
        // Length and character set checks
        return match.length >= 32 ? 0.8 : 0.6;
      
      case 'privateKey':
        // Private key headers are very specific
        return 0.95;
      
      default:
        return 0.7;
    }
  }

  /**
   * Validate credit card using Luhn algorithm
   * @param {string} cardNumber - Credit card number
   * @returns {boolean} Is valid credit card
   */
  isValidCreditCard(cardNumber) {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate SSN format
   * @param {string} ssn - Social Security Number
   * @returns {boolean} Is valid SSN format
   */
  isValidSSN(ssn) {
    const cleanSSN = ssn.replace(/\D/g, '');
    if (cleanSSN.length !== 9) return false;

    // Check for invalid SSN patterns
    const invalidPatterns = [
      '000', '666', // Invalid area numbers
      '00', // Invalid group numbers
      '0000' // Invalid serial numbers
    ];

    const area = cleanSSN.substring(0, 3);
    const group = cleanSSN.substring(3, 5);
    const serial = cleanSSN.substring(5, 9);

    return !invalidPatterns.includes(area) && 
           !invalidPatterns.includes(group) && 
           !invalidPatterns.includes(serial) &&
           area < '900'; // Area numbers 900-999 are invalid
  }

  /**
   * Check if finding is exempt based on policy exemptions
   * @param {Object} finding - DLP finding
   * @param {Object} context - Scan context
   * @returns {boolean} Is exempt
   */
  isExempt(finding, context) {
    for (const policy of this.policies.values()) {
      if (!policy.enabled || !policy.dataTypes.includes(finding.dataType)) {
        continue;
      }

      for (const exemption of policy.exemptions || []) {
        if (finding.match.includes(exemption)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Apply DLP policies to findings
   * @param {Array} findings - DLP findings
   * @param {string} content - Original content
   * @param {Object} context - Scan context
   * @returns {Object} Policy application results
   */
  async applyPolicies(findings, content, context) {
    const results = {
      actions: [],
      violations: [],
      modifiedContent: content,
      blocked: false,
      quarantined: false
    };

    for (const finding of findings) {
      for (const policy of this.policies.values()) {
        if (!policy.enabled || !policy.dataTypes.includes(finding.dataType)) {
          continue;
        }

        // Create violation record
        const violation = {
          id: crypto.randomUUID(),
          policyId: policy.id,
          policyName: policy.name,
          finding,
          severity: policy.severity,
          timestamp: Date.now(),
          context,
          resolved: false
        };

        this.violations.push(violation);
        results.violations.push(violation);

        // Apply policy actions
        for (const action of policy.actions) {
          await this.executeAction(action, finding, policy, context, results);
        }

        // Send notifications
        await this.sendNotifications(policy, violation, context);
      }
    }

    return results;
  }

  /**
   * Execute DLP policy action
   * @param {string} action - Action to execute
   * @param {Object} finding - DLP finding
   * @param {Object} policy - Policy configuration
   * @param {Object} context - Scan context
   * @param {Object} results - Results object to update
   */
  async executeAction(action, finding, policy, context, results) {
    switch (action) {
      case 'block':
        results.blocked = true;
        results.actions.push({ type: 'block', finding, policy: policy.id });
        break;

      case 'redact': {
        const redacted = '*'.repeat(finding.length);
        results.modifiedContent = results.modifiedContent.replace(finding.match, redacted);
        results.actions.push({ type: 'redact', finding, policy: policy.id });
        break;
      }

      case 'quarantine':
        results.quarantined = true;
        this.quarantineContent(finding, context);
        results.actions.push({ type: 'quarantine', finding, policy: policy.id });
        break;

      case 'alert':
        await this.sendAlert(finding, policy, context);
        results.actions.push({ type: 'alert', finding, policy: policy.id });
        break;

      case 'audit':
        await this.auditLog(finding, policy, context);
        results.actions.push({ type: 'audit', finding, policy: policy.id });
        break;

      case 'classify':
        // Classification is handled separately
        results.actions.push({ type: 'classify', finding, policy: policy.id });
        break;
    }
  }

  /**
   * Classify content based on findings
   * @param {Array} findings - DLP findings
   * @returns {Object} Content classification
   */
  classifyContent(findings) {
    let maxLevel = this.classificationLevels.PUBLIC;
    const reasons = [];

    for (const finding of findings) {
      let level = this.classificationLevels.INTERNAL;

      switch (finding.dataType) {
        case 'creditCard':
        case 'ssn':
        case 'privateKey':
        case 'awsCredentials':
          level = this.classificationLevels.RESTRICTED;
          break;
        
        case 'apiKey':
        case 'dbConnection':
          level = this.classificationLevels.CONFIDENTIAL;
          break;
        
        case 'email':
        case 'phone':
          level = this.classificationLevels.INTERNAL;
          break;
      }

      if (level > maxLevel) {
        maxLevel = level;
      }

      reasons.push({
        dataType: finding.dataType,
        level: Object.keys(this.classificationLevels)[level],
        confidence: finding.confidence
      });
    }

    return {
      level: maxLevel,
      levelName: Object.keys(this.classificationLevels)[maxLevel],
      reasons,
      timestamp: Date.now()
    };
  }

  /**
   * Quarantine suspicious content
   * @param {Object} finding - DLP finding
   * @param {Object} context - Scan context
   */
  quarantineContent(finding, context) {
    const quarantineId = crypto.randomUUID();
    
    this.quarantinedContent.set(quarantineId, {
      id: quarantineId,
      finding,
      context,
      timestamp: Date.now(),
      status: 'quarantined',
      reviewedBy: null,
      reviewedAt: null,
      decision: null
    });

    this.emit('content_quarantined', { quarantineId, finding, context });
  }

  /**
   * Send DLP alert
   * @param {Object} finding - DLP finding
   * @param {Object} policy - Policy configuration
   * @param {Object} context - Scan context
   */
  async sendAlert(finding, policy, context) {
    const alert = {
      id: crypto.randomUUID(),
      type: 'dlp_violation',
      severity: policy.severity,
      title: `DLP Policy Violation: ${policy.name}`,
      message: `Sensitive data detected: ${finding.dataType}`,
      finding,
      policy: policy.id,
      context,
      timestamp: Date.now()
    };

    // Emit alert event
    this.emit('alert', alert);

    // Log security event
    await logSecurityEvent(SECURITY_EVENTS.DLP_VIOLATION, alert);
  }

  /**
   * Log DLP audit event
   * @param {Object} finding - DLP finding
   * @param {Object} policy - Policy configuration
   * @param {Object} context - Scan context
   */
  async auditLog(finding, policy, context) {
    await logSecurityEvent(SECURITY_EVENTS.DLP_AUDIT, {
      policyId: policy.id,
      policyName: policy.name,
      dataType: finding.dataType,
      confidence: finding.confidence,
      context,
      timestamp: Date.now()
    });
  }

  /**
   * Send policy violation notifications
   * @param {Object} policy - Policy configuration
   * @param {Object} violation - Violation details
   * @param {Object} context - Scan context
   */
  async sendNotifications(policy, violation, context) {
    if (!policy.notifications || policy.notifications.length === 0) {
      return;
    }

    const notification = {
      type: 'dlp_violation',
      policy: policy.name,
      severity: policy.severity,
      dataType: violation.finding.dataType,
      userId: context.userId,
      workspaceId: context.workspaceId,
      timestamp: Date.now()
    };

    for (const recipient of policy.notifications) {
      this.emit('notification', {
        recipient,
        notification,
        violation
      });
    }
  }

  /**
   * Get all DLP policies
   * @returns {Array} List of policies
   */
  getPolicies() {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   * @param {string} policyId - Policy ID
   * @returns {Object|null} Policy or null if not found
   */
  getPolicy(policyId) {
    return this.policies.get(policyId) || null;
  }

  /**
   * Get DLP violations
   * @param {Object} filters - Filter options
   * @returns {Array} List of violations
   */
  getViolations(filters = {}) {
    let violations = [...this.violations];

    if (filters.severity) {
      violations = violations.filter(v => v.severity === filters.severity);
    }

    if (filters.dataType) {
      violations = violations.filter(v => v.finding.dataType === filters.dataType);
    }

    if (filters.resolved !== undefined) {
      violations = violations.filter(v => v.resolved === filters.resolved);
    }

    if (filters.timeRange) {
      const { start, end } = filters.timeRange;
      violations = violations.filter(v => v.timestamp >= start && v.timestamp <= end);
    }

    return violations.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get quarantined content
   * @returns {Array} List of quarantined items
   */
  getQuarantinedContent() {
    return Array.from(this.quarantinedContent.values());
  }

  /**
   * Review quarantined content
   * @param {string} quarantineId - Quarantine ID
   * @param {string} decision - Review decision ('approve', 'reject', 'modify')
   * @param {string} reviewerId - Reviewer user ID
   * @param {string} notes - Review notes
   */
  reviewQuarantinedContent(quarantineId, decision, reviewerId, notes = '') {
    const item = this.quarantinedContent.get(quarantineId);
    if (!item) {
      throw new Error(`Quarantined content ${quarantineId} not found`);
    }

    item.status = 'reviewed';
    item.decision = decision;
    item.reviewedBy = reviewerId;
    item.reviewedAt = Date.now();
    item.reviewNotes = notes;

    this.emit('quarantine_reviewed', { quarantineId, decision, reviewerId });

    return item;
  }

  /**
   * Get DLP statistics
   * @returns {Object} Statistics summary
   */
  getStatistics() {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const today = this.violations.filter(v => now - v.timestamp < dayMs);
    const thisWeek = this.violations.filter(v => now - v.timestamp < 7 * dayMs);
    const thisMonth = this.violations.filter(v => now - v.timestamp < 30 * dayMs);

    return {
      totalPolicies: this.policies.size,
      activePolicies: Array.from(this.policies.values()).filter(p => p.enabled).length,
      totalViolations: this.violations.length,
      unresolvedViolations: this.violations.filter(v => !v.resolved).length,
      quarantinedItems: this.quarantinedContent.size,
      violationsToday: today.length,
      violationsThisWeek: thisWeek.length,
      violationsThisMonth: thisMonth.length,
      severityBreakdown: {
        critical: this.violations.filter(v => v.severity === 'critical').length,
        high: this.violations.filter(v => v.severity === 'high').length,
        medium: this.violations.filter(v => v.severity === 'medium').length,
        low: this.violations.filter(v => v.severity === 'low').length
      },
      dataTypeBreakdown: this.getDataTypeBreakdown()
    };
  }

  /**
   * Get breakdown of violations by data type
   * @returns {Object} Data type statistics
   */
  getDataTypeBreakdown() {
    const breakdown = {};
    
    for (const violation of this.violations) {
      const dataType = violation.finding.dataType;
      breakdown[dataType] = (breakdown[dataType] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Export DLP data for compliance reporting
   * @param {Object} options - Export options
   * @returns {Object} Export data
   */
  exportComplianceData(options = {}) {
    const { timeRange, format = 'json' } = options;
    
    let violations = this.violations;
    if (timeRange) {
      violations = violations.filter(v => 
        v.timestamp >= timeRange.start && v.timestamp <= timeRange.end
      );
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      timeRange,
      summary: {
        totalViolations: violations.length,
        policies: Array.from(this.policies.values()).map(p => ({
          id: p.id,
          name: p.name,
          enabled: p.enabled,
          dataTypes: p.dataTypes,
          severity: p.severity
        }))
      },
      violations: violations.map(v => ({
        id: v.id,
        timestamp: new Date(v.timestamp).toISOString(),
        policyName: v.policyName,
        dataType: v.finding.dataType,
        severity: v.severity,
        resolved: v.resolved,
        context: {
          userId: v.context.userId,
          workspaceId: v.context.workspaceId
        }
      })),
      statistics: this.getStatistics()
    };

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Convert compliance data to CSV format
   * @param {Object} data - Export data
   * @returns {string} CSV formatted data
   */
  convertToCSV(data) {
    const csvLines = [];
    
    // Header
    csvLines.push('# NoteVault DLP Compliance Report');
    csvLines.push(`# Generated: ${data.exportDate}`);
    csvLines.push('');
    
    // Violations
    csvLines.push('Timestamp,Policy,Data Type,Severity,User ID,Workspace ID,Resolved');
    
    for (const violation of data.violations) {
      csvLines.push(
        `${violation.timestamp},"${violation.policyName}","${violation.dataType}","${violation.severity}","${violation.context.userId}","${violation.context.workspaceId}",${violation.resolved}`
      );
    }
    
    return csvLines.join('\n');
  }
}

// Export singleton instance
export default new DLPService();