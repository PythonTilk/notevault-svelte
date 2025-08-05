import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { secretManager } from '../utils/secretManager.js';
import { logSecurityEvent, SECURITY_EVENTS } from '../utils/logger.js';
import { 
  asyncHandler, 
  ValidationError, 
  AuthorizationError,
  NotFoundError 
} from '../utils/errorHandler.js';

const router = express.Router();

// Middleware to check admin role
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    await logSecurityEvent(SECURITY_EVENTS.ACCESS_DENIED, {
      userId: req.user.id,
      action: 'secrets_access_attempt',
      resource: req.url,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    throw new AuthorizationError('Admin access required for secret management');
  }
  next();
});

// Rotate JWT secret
router.post('/rotate-jwt', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const result = await secretManager.rotateJWTSecret(req.user.id);
  
  res.json({
    success: true,
    message: result.message,
    version: result.newVersion,
    rotatedAt: new Date().toISOString(),
    warning: 'All users will need to re-authenticate after this change takes effect'
  });
}));

// Create API key
router.post('/api-keys', authenticateToken, requireAdmin, [
  body('name').isLength({ min: 1, max: 100 }).trim(),
  body('permissions').isArray().optional(),
  body('permissions.*').isString().isLength({ min: 1 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { name, permissions = [] } = req.body;
  
  // Validate permissions
  const validPermissions = [
    'read', 'write', 'delete', 'admin',
    'workspaces:read', 'workspaces:write', 'workspaces:delete',
    'notes:read', 'notes:write', 'notes:delete',
    'files:read', 'files:write', 'files:delete',
    'users:read', 'users:write',
    'chat:read', 'chat:write'
  ];
  
  const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
  if (invalidPerms.length > 0) {
    throw new ValidationError(`Invalid permissions: ${invalidPerms.join(', ')}`);
  }
  
  const apiKey = await secretManager.createAPIKey(name, permissions, req.user.id);
  
  res.status(201).json({
    success: true,
    message: 'API key created successfully',
    apiKey: {
      keyId: apiKey.keyId,
      name: apiKey.name,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt,
      apiKey: apiKey.apiKey // This is the only time the full key is returned
    },
    warning: 'Save this API key securely. It will not be shown again.'
  });
}));

// List API keys
router.get('/api-keys', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const apiKeys = await secretManager.listAPIKeys();
  
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'view_api_keys',
    keyCount: apiKeys.length,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    apiKeys
  });
}));

// Revoke API key
router.delete('/api-keys/:keyId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { keyId } = req.params;
  
  if (!keyId) {
    throw new ValidationError('Key ID is required');
  }
  
  const result = await secretManager.revokeAPIKey(keyId, req.user.id);
  
  res.json({
    success: true,
    message: result.message,
    revokedAt: new Date().toISOString()
  });
}));

// Generate backup codes
router.post('/backup-codes', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { count = 10 } = req.body;
  
  if (count < 1 || count > 20) {
    throw new ValidationError('Backup code count must be between 1 and 20');
  }
  
  const codes = secretManager.generateBackupCodes(count);
  
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'generate_backup_codes',
    codeCount: count,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: 'Backup codes generated successfully',
    codes,
    warning: 'Store these codes securely. They can be used for account recovery.'
  });
}));

// Generate new encryption key (dangerous operation)
router.post('/rotate-encryption-key', authenticateToken, requireAdmin, [
  body('confirmation').equals('I understand this will invalidate all stored secrets')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('You must confirm understanding of the consequences');
  }
  
  await logSecurityEvent(SECURITY_EVENTS.SECURITY_CONFIG_CHANGE, {
    userId: req.user.id,
    action: 'encryption_key_rotation_requested',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: false,
    message: 'Encryption key rotation is not yet implemented',
    warning: 'This operation would invalidate all stored secrets and require manual intervention'
  });
}));

// Get secret management status
router.get('/status', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  // Get counts and basic info without exposing secrets
  const apiKeys = await secretManager.listAPIKeys();
  
  res.json({
    success: true,
    status: {
      activeAPIKeys: apiKeys.length,
      secretsConfigured: {
        jwtSecret: !!process.env.JWT_SECRET,
        encryptionKey: !!process.env.ENCRYPTION_KEY
      },
      lastRotation: {
        // This would come from audit logs in a real implementation
        jwtSecret: null,
        encryptionKey: null
      },
      recommendations: [
        'Rotate JWT secret monthly',
        'Monitor API key usage regularly',
        'Use strong encryption keys',
        'Enable secret rotation alerts'
      ]
    }
  });
}));

// Security health check
router.get('/health', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const health = {
    score: 100,
    issues: [],
    recommendations: []
  };
  
  // Check JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    health.issues.push('JWT_SECRET not configured');
    health.score -= 30;
  } else if (jwtSecret.length < 32) {
    health.issues.push('JWT_SECRET too short');
    health.score -= 20;
  } else if (jwtSecret === 'your-secret-key' || jwtSecret === 'changeme') {
    health.issues.push('JWT_SECRET using default value');
    health.score -= 25;
  }
  
  // Check encryption key
  if (!process.env.ENCRYPTION_KEY) {
    health.recommendations.push('Configure dedicated ENCRYPTION_KEY');
    health.score -= 10;
  }
  
  // Check API key count
  const apiKeys = await secretManager.listAPIKeys();
  if (apiKeys.length === 0) {
    health.recommendations.push('Consider creating API keys for service integration');
  } else if (apiKeys.length > 10) {
    health.recommendations.push('Review and revoke unused API keys');
    health.score -= 5;
  }
  
  // Log health check
  await logSecurityEvent(SECURITY_EVENTS.ADMIN_ACTION, {
    userId: req.user.id,
    action: 'secrets_health_check',
    healthScore: health.score,
    issueCount: health.issues.length,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    health: {
      ...health,
      status: health.score >= 80 ? 'healthy' : health.score >= 60 ? 'warning' : 'critical',
      checkedAt: new Date().toISOString()
    }
  });
}));

export default router;