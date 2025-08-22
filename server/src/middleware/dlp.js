/**
 * Data Loss Prevention (DLP) Middleware
 * 
 * Automatically scans content for sensitive data and enforces DLP policies
 * on note creation, updates, chat messages, and file uploads.
 */

import dlpService from '../services/dlp.js';
import { SECURITY_EVENTS, logSecurityEvent } from '../utils/logger.js';

/**
 * Middleware to scan note content for sensitive data
 */
export const dlpScanNote = async (req, res, next) => {
  try {
    const { title, content, workspaceId } = req.body;
    
    if (!content || typeof content !== 'string') {
      return next();
    }

    // Combine title and content for scanning
    const fullContent = `${title || ''}\n${content}`.trim();
    
    const context = {
      userId: req.user.id,
      workspaceId,
      contentType: 'note',
      action: req.method === 'POST' ? 'create' : 'update',
      endpoint: req.path
    };

    const scanResult = await dlpService.scanContent(fullContent, context);
    
    // Check if content should be blocked
    if (scanResult.policyResults.blocked) {
      return res.status(403).json({
        success: false,
        error: 'Content blocked by DLP policy',
        message: 'Your content contains sensitive information that violates data protection policies.',
        scanResult: {
          findingsCount: scanResult.findings.length,
          classification: scanResult.classification.levelName,
          violations: scanResult.policyResults.violations.map(v => ({
            policy: v.policyName,
            dataType: v.finding.dataType,
            severity: v.severity
          }))
        }
      });
    }

    // Apply content modifications (redactions)
    if (scanResult.policyResults.modifiedContent !== fullContent) {
      // Split back into title and content
      const lines = scanResult.policyResults.modifiedContent.split('\n');
      if (title) {
        req.body.title = lines[0];
        req.body.content = lines.slice(1).join('\n');
      } else {
        req.body.content = scanResult.policyResults.modifiedContent;
      }

      // Add redaction notice
      req.dlpRedacted = true;
      req.dlpScanResult = scanResult;
    }

    // Add scan metadata to request for audit logging
    req.dlpScanned = true;
    req.dlpScanResult = scanResult;

    next();

  } catch (error) {
    console.error('DLP scan error:', error);
    
    // Log error but don't block request
    await logSecurityEvent(SECURITY_EVENTS.DLP_SCAN_FAILED, {
      userId: req.user?.id,
      error: error.message,
      endpoint: req.path
    });

    next();
  }
};

/**
 * Middleware to scan chat messages for sensitive data
 */
export const dlpScanChatMessage = async (req, res, next) => {
  try {
    const { content, channelId } = req.body;
    
    if (!content || typeof content !== 'string') {
      return next();
    }

    const context = {
      userId: req.user.id,
      channelId,
      contentType: 'chat_message',
      action: 'send',
      endpoint: req.path
    };

    const scanResult = await dlpService.scanContent(content, context);
    
    // Check if message should be blocked
    if (scanResult.policyResults.blocked) {
      return res.status(403).json({
        success: false,
        error: 'Message blocked by DLP policy',
        message: 'Your message contains sensitive information that cannot be shared in chat.',
        scanResult: {
          findingsCount: scanResult.findings.length,
          classification: scanResult.classification.levelName
        }
      });
    }

    // Apply content modifications (redactions)
    if (scanResult.policyResults.modifiedContent !== content) {
      req.body.content = scanResult.policyResults.modifiedContent;
      req.dlpRedacted = true;
    }

    req.dlpScanned = true;
    req.dlpScanResult = scanResult;

    next();

  } catch (error) {
    console.error('DLP chat scan error:', error);
    
    await logSecurityEvent(SECURITY_EVENTS.DLP_SCAN_FAILED, {
      userId: req.user?.id,
      error: error.message,
      endpoint: req.path,
      contentType: 'chat_message'
    });

    next();
  }
};

/**
 * Middleware to scan file content for sensitive data
 * (For text files only)
 */
export const dlpScanFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const { originalname, mimetype, buffer, size } = req.file;
    
    // Only scan text-based files
    const textMimeTypes = [
      'text/plain',
      'text/csv',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml',
      'text/xml'
    ];

    if (!textMimeTypes.includes(mimetype)) {
      return next();
    }

    // Skip large files (>1MB) to avoid performance issues
    if (size > 1024 * 1024) {
      return next();
    }

    const content = buffer.toString('utf8');
    
    const context = {
      userId: req.user.id,
      workspaceId: req.body.workspaceId,
      contentType: 'file',
      fileName: originalname,
      fileSize: size,
      mimeType: mimetype,
      action: 'upload',
      endpoint: req.path
    };

    const scanResult = await dlpService.scanContent(content, context);
    
    // Check if file upload should be blocked
    if (scanResult.policyResults.blocked) {
      return res.status(403).json({
        success: false,
        error: 'File upload blocked by DLP policy',
        message: `File "${originalname}" contains sensitive information that cannot be uploaded.`,
        scanResult: {
          findingsCount: scanResult.findings.length,
          classification: scanResult.classification.levelName,
          fileName: originalname
        }
      });
    }

    // Check if file should be quarantined
    if (scanResult.policyResults.quarantined) {
      req.dlpQuarantined = true;
      req.quarantineReason = 'Contains sensitive data requiring review';
    }

    req.dlpScanned = true;
    req.dlpScanResult = scanResult;

    next();

  } catch (error) {
    console.error('DLP file scan error:', error);
    
    await logSecurityEvent(SECURITY_EVENTS.DLP_SCAN_FAILED, {
      userId: req.user?.id,
      error: error.message,
      endpoint: req.path,
      contentType: 'file',
      fileName: req.file?.originalname
    });

    next();
  }
};

/**
 * Middleware to log successful operations after DLP scanning
 */
export const dlpAuditLog = async (req, res, next) => {
  // Store original send function
  const originalSend = res.send;
  
  // Override send function to capture response
  res.send = function(data) {
    // Only log if DLP scan occurred and operation was successful
    if (req.dlpScanned && res.statusCode < 400) {
      const scanResult = req.dlpScanResult;
      
      logSecurityEvent(SECURITY_EVENTS.DLP_CONTENT_PROCESSED, {
        userId: req.user?.id,
        contentType: scanResult.context.contentType,
        findingsCount: scanResult.findings.length,
        classification: scanResult.classification.levelName,
        redacted: !!req.dlpRedacted,
        quarantined: !!req.dlpQuarantined,
        violations: scanResult.policyResults.violations.length,
        endpoint: req.path,
        timestamp: Date.now()
      }).catch(error => {
        console.error('DLP audit log error:', error);
      });
    }

    // Call original send function
    originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware to handle DLP policy violations in responses
 */
export const dlpResponseHandler = (req, res, next) => {
  if (req.dlpRedacted) {
    // Add redaction notice to successful responses
    const originalJson = res.json;
    
    res.json = function(data) {
      if (res.statusCode < 400 && typeof data === 'object') {
        data.dlpNotice = {
          redacted: true,
          message: 'Some content has been automatically redacted to protect sensitive information.',
          findingsCount: req.dlpScanResult?.findings?.length || 0
        };
      }
      
      originalJson.call(this, data);
    };
  }

  next();
};

/**
 * Combined DLP middleware for easy application to routes
 */
export const dlpMiddleware = {
  scanNote: [dlpScanNote, dlpResponseHandler, dlpAuditLog],
  scanChat: [dlpScanChatMessage, dlpResponseHandler, dlpAuditLog],
  scanFile: [dlpScanFile, dlpResponseHandler, dlpAuditLog]
};