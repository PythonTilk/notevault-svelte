import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import passport from 'passport';
import crypto from 'crypto';

// Services
import emailService from '../services/email.js';
import twoFAService from '../services/twofa.js';
import oauthService from '../services/oauth.js';

// Middleware
import { 
  authLimiter, 
  strictLimiter, 
  csrfProtection, 
  generateCSRFToken 
} from '../middleware/security.js';
import { 
  sessionMiddleware, 
  requireAuth, 
  requireAdmin,
  generateCSRFToken as sessionCSRF,
  csrfTokenEndpoint
} from '../middleware/session.js';

// You'll need to import your database - adjust this import based on your setup
// import db from '../config/database.js'; // or database-postgres.js for production

const router = express.Router();

// Apply session middleware to all auth routes
router.use(sessionMiddleware);

// CSRF token endpoint
router.get('/csrf-token', csrfTokenEndpoint);

// Registration with enhanced validation
router.post('/register', 
  authLimiter,
  [
    body('username')
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    body('displayName')
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name is required and must be less than 100 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { username, email, password, displayName } = req.body;

      // Check if user already exists
      // Note: You'll need to adjust these database calls based on your database setup
      const existingUser = await checkUserExists(username, email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          field: existingUser.field
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create user
      const userId = uuidv4();
      const user = await createUser({
        id: userId,
        username,
        email,
        passwordHash,
        displayName,
        role: 'user'
      });

      // Generate email verification token
      const verificationToken = crypto.randomUUID();
      await saveEmailVerification(userId, email, verificationToken);

      // Send verification email
      await emailService.sendVerificationEmail(email, username, verificationToken);

      // Create session
      req.session.userId = userId;
      req.session.userRole = 'user';
      req.session.emailVerified = false;

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: userId,
          username,
          email,
          displayName,
          emailVerified: false
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login with 2FA support
router.post('/login',
  authLimiter,
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('twoFactorCode').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { username, password, twoFactorCode } = req.body;

      // Find user
      const user = await findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if 2FA is required
      if (twoFAService.isRequired(user)) {
        if (!twoFactorCode) {
          return res.status(200).json({
            requiresTwoFactor: true,
            message: 'Two-factor authentication required'
          });
        }

        // Verify 2FA code
        const twoFactorValid = await verify2FA(user, twoFactorCode);
        if (!twoFactorValid) {
          return res.status(401).json({ error: 'Invalid two-factor code' });
        }
      }

      // Update last login
      await updateUserLastLogin(user.id);

      // Create session
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.emailVerified = user.email_verified || false;

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          avatar: user.avatar
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.clearCookie('notevault.sid');
    res.json({ message: 'Logout successful' });
  });
});

// 2FA Setup
router.post('/2fa/setup',
  requireAuth,
  strictLimiter,
  async (req, res) => {
    try {
      const user = await findUserById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.twofa_enabled) {
        return res.status(400).json({ error: '2FA is already enabled' });
      }

      const secretData = await twoFAService.generateSecret(user.email, user.username);
      
      // Store temporary secret in session for verification
      req.session.tempTwoFASecret = secretData.secret;

      res.json({
        qrCode: secretData.qrCode,
        manualEntryKey: secretData.manualEntryKey,
        backupCodes: secretData.backupCodes
      });

    } catch (error) {
      console.error('2FA setup error:', error);
      res.status(500).json({ error: '2FA setup failed' });
    }
  }
);

// 2FA Verification during setup
router.post('/2fa/verify-setup',
  requireAuth,
  strictLimiter,
  [body('token').isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits')],
  async (req, res) => {
    try {
      const { token } = req.body;
      const secret = req.session.tempTwoFASecret;

      if (!secret) {
        return res.status(400).json({ error: 'No 2FA setup in progress' });
      }

      const isValid = twoFAService.validateSetup(token, secret);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Enable 2FA for user
      const backupCodes = twoFAService.generateBackupCodes();
      await enable2FA(req.session.userId, secret, backupCodes);

      // Clear temporary secret
      delete req.session.tempTwoFASecret;

      res.json({
        message: '2FA enabled successfully',
        backupCodes: backupCodes.map(code => code.code)
      });

    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({ error: '2FA verification failed' });
    }
  }
);

// OAuth Routes
router.get('/providers', (req, res) => {
  res.json({
    providers: oauthService.getProviderConfig(),
    enabled: oauthService.getEnabledProviders()
  });
});

// Google OAuth
if (oauthService.isProviderEnabled('google')) {
  router.get('/google', 
    (req, res, next) => {
      const state = oauthService.generateState();
      req.session.oauthState = state;
      next();
    },
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    async (req, res) => {
      await handleOAuthCallback(req, res, 'google');
    }
  );
}

// GitHub OAuth
if (oauthService.isProviderEnabled('github')) {
  router.get('/github',
    (req, res, next) => {
      const state = oauthService.generateState();
      req.session.oauthState = state;
      next();
    },
    passport.authenticate('github', { scope: ['user:email'] })
  );

  router.get('/github/callback',
    passport.authenticate('github', { session: false }),
    async (req, res) => {
      await handleOAuthCallback(req, res, 'github');
    }
  );
}

// Discord OAuth
if (oauthService.isProviderEnabled('discord')) {
  router.get('/discord',
    (req, res, next) => {
      const state = oauthService.generateState();
      req.session.oauthState = state;
      next();
    },
    passport.authenticate('discord', { scope: ['identify', 'email'] })
  );

  router.get('/discord/callback',
    passport.authenticate('discord', { session: false }),
    async (req, res) => {
      await handleOAuthCallback(req, res, 'discord');
    }
  );
}

// Password Reset Request
router.post('/password-reset',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await findUserByEmail(email);
      if (user) {
        const resetToken = crypto.randomUUID();
        await savePasswordReset(user.id, resetToken);
        await emailService.sendPasswordResetEmail(email, user.username, resetToken);
      }

      // Always return success to prevent email enumeration
      res.json({ message: 'If the email exists, a password reset link has been sent.' });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
);

// Helper functions (you'll need to implement these based on your database)
async function checkUserExists(username, email) {
  // Implementation depends on your database setup
  // Return { exists: true, field: 'username'|'email' } or null
}

async function createUser(userData) {
  // Implementation depends on your database setup
}

async function findUserByUsername(username) {
  // Implementation depends on your database setup
}

async function findUserById(id) {
  // Implementation depends on your database setup
}

async function findUserByEmail(email) {
  // Implementation depends on your database setup
}

async function verify2FA(user, code) {
  // Implementation for 2FA verification
  const validation = twoFAService.validateInput(code);
  if (!validation.valid) return false;

  if (validation.type === 'totp') {
    return twoFAService.verifyToken(code, user.twofa_secret);
  } else if (validation.type === 'backup') {
    const backupCodes = JSON.parse(user.backup_codes || '[]');
    const result = twoFAService.verifyBackupCode(code, backupCodes);
    if (result.valid) {
      // Update backup codes in database
      await updateUserBackupCodes(user.id, result.updatedBackupCodes);
    }
    return result.valid;
  }
  
  return false;
}

async function updateUserLastLogin(userId) {
  // Implementation depends on your database setup
}

async function saveEmailVerification(userId, email, token) {
  // Implementation depends on your database setup
}

async function enable2FA(userId, secret, backupCodes) {
  // Implementation depends on your database setup
}

async function savePasswordReset(userId, token) {
  // Implementation depends on your database setup
}

async function updateUserBackupCodes(userId, backupCodes) {
  // Implementation depends on your database setup
}

async function handleOAuthCallback(req, res, provider) {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    const oauthUser = oauthService.processUserData(req.user);
    
    // Check if user exists with this OAuth account
    let existingUser = await findUserByOAuth(provider, oauthUser.providerId);
    
    if (existingUser) {
      // Login existing user
      req.session.userId = existingUser.id;
      req.session.userRole = existingUser.role;
      req.session.emailVerified = true; // OAuth emails are pre-verified
    } else {
      // Check if user exists with same email
      existingUser = await findUserByEmail(oauthUser.email);
      
      if (existingUser) {
        // Link OAuth account to existing user
        await linkOAuthAccount(existingUser.id, oauthUser);
        req.session.userId = existingUser.id;
        req.session.userRole = existingUser.role;
      } else {
        // Create new user
        const newUser = await createUserFromOAuth(oauthUser);
        req.session.userId = newUser.id;
        req.session.userRole = newUser.role;
      }
      
      req.session.emailVerified = true;
    }

    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_error`);
  }
}

async function findUserByOAuth(provider, providerId) {
  // Implementation depends on your database setup
}

async function linkOAuthAccount(userId, oauthData) {
  // Implementation depends on your database setup
}

async function createUserFromOAuth(oauthData) {
  // Implementation depends on your database setup
}

export default router;