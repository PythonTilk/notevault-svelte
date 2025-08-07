import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

class TwoFactorAuthService {
  constructor() {
    this.serviceName = 'NoteVault';
  }

  /**
   * Generate a secret for 2FA setup
   * @param {string} userEmail - User's email
   * @param {string} userName - User's name
   * @returns {Object} Secret data with QR code
   */
  async generateSecret(userEmail, userName) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${userEmail})`,
        account: userEmail,
        issuer: this.serviceName,
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url,
        backupCodes,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      console.error('2FA secret generation error:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify a TOTP token
   * @param {string} token - The 6-digit token from authenticator app
   * @param {string} secret - User's 2FA secret
   * @param {number} window - Time window for validation (default: 1)
   * @returns {boolean} Whether token is valid
   */
  verifyToken(token, secret, window = 1) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window
      });

      return verified;
    } catch (error) {
      console.error('2FA token verification error:', error);
      return false;
    }
  }

  /**
   * Verify a backup code
   * @param {string} code - Backup code to verify
   * @param {Array} backupCodes - Array of valid backup codes
   * @returns {Object} Result with validity and remaining codes
   */
  verifyBackupCode(code, backupCodes) {
    try {
      const normalizedCode = code.replace(/\s/g, '').toUpperCase();
      const codeIndex = backupCodes.findIndex(backupCode => 
        backupCode.code === normalizedCode && !backupCode.used
      );

      if (codeIndex === -1) {
        return {
          valid: false,
          remainingCodes: backupCodes.filter(bc => !bc.used).length
        };
      }

      // Mark the code as used
      backupCodes[codeIndex].used = true;
      backupCodes[codeIndex].usedAt = new Date().toISOString();

      return {
        valid: true,
        remainingCodes: backupCodes.filter(bc => !bc.used).length,
        updatedBackupCodes: backupCodes
      };
    } catch (error) {
      console.error('Backup code verification error:', error);
      return {
        valid: false,
        remainingCodes: 0
      };
    }
  }

  /**
   * Generate backup codes
   * @param {number} count - Number of backup codes to generate
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      // Format as XXXX-XXXX for better readability
      const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
      
      codes.push({
        code: formattedCode,
        used: false,
        createdAt: new Date().toISOString()
      });
    }
    
    return codes;
  }

  /**
   * Generate new backup codes (when user runs out)
   * @returns {Array} Array of new backup codes
   */
  regenerateBackupCodes() {
    return this.generateBackupCodes();
  }

  /**
   * Validate setup token during 2FA enrollment
   * @param {string} token - Token from user's authenticator app
   * @param {string} secret - Generated secret
   * @returns {boolean} Whether the setup is valid
   */
  validateSetup(token, secret) {
    return this.verifyToken(token, secret, 2); // Slightly larger window for setup
  }

  /**
   * Generate a temporary bypass code for emergencies
   * @returns {string} Temporary bypass code
   */
  generateBypassCode() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Check if 2FA is required for the user based on their settings
   * @param {Object} user - User object
   * @returns {boolean} Whether 2FA is required
   */
  isRequired(user) {
    // 2FA is required if:
    // 1. User has it enabled
    // 2. Admin has enforced it for their role
    // 3. Account has sensitive permissions
    
    if (user.twofa_enabled) {
      return true;
    }

    // Force 2FA for admin accounts
    if (user.role === 'admin') {
      return true;
    }

    return false;
  }

  /**
   * Generate recovery information for user
   * @param {string} secret - User's 2FA secret
   * @param {Array} backupCodes - User's backup codes
   * @returns {Object} Recovery information
   */
  generateRecoveryInfo(secret, backupCodes) {
    const unusedCodes = backupCodes.filter(code => !code.used);
    
    return {
      backupCodesRemaining: unusedCodes.length,
      backupCodes: unusedCodes.map(code => code.code),
      recoveryInstructions: [
        'Keep these backup codes in a safe place',
        'Each code can only be used once',
        'Use these codes if you lose access to your authenticator app',
        'You can generate new codes from your security settings'
      ]
    };
  }

  /**
   * Validate 2FA input format
   * @param {string} input - User input (token or backup code)
   * @returns {Object} Validation result
   */
  validateInput(input) {
    if (!input) {
      return {
        valid: false,
        type: null,
        error: 'No input provided'
      };
    }

    const cleanInput = input.replace(/\s/g, '');

    // Check if it's a 6-digit TOTP token
    if (/^\d{6}$/.test(cleanInput)) {
      return {
        valid: true,
        type: 'totp',
        value: cleanInput
      };
    }

    // Check if it's a backup code format (XXXX-XXXX or XXXXXXXX)
    if (/^[A-F0-9]{4}-?[A-F0-9]{4}$/i.test(cleanInput)) {
      const formattedCode = cleanInput.length === 8 ? 
        `${cleanInput.slice(0, 4)}-${cleanInput.slice(4, 8)}` : 
        cleanInput;
      
      return {
        valid: true,
        type: 'backup',
        value: formattedCode.toUpperCase()
      };
    }

    return {
      valid: false,
      type: null,
      error: 'Invalid format. Use 6-digit code or backup code (XXXX-XXXX)'
    };
  }

  /**
   * Get 2FA status for user
   * @param {Object} user - User object with 2FA data
   * @returns {Object} Status information
   */
  getStatus(user) {
    if (!user.twofa_enabled) {
      return {
        enabled: false,
        status: 'disabled',
        backupCodesRemaining: 0
      };
    }

    const backupCodes = user.backup_codes ? JSON.parse(user.backup_codes) : [];
    const unusedCodes = backupCodes.filter(code => !code.used);

    return {
      enabled: true,
      status: 'enabled',
      backupCodesRemaining: unusedCodes.length,
      lastUsed: user.twofa_last_used,
      warningLowBackupCodes: unusedCodes.length <= 2
    };
  }
}

// Export singleton instance
export default new TwoFactorAuthService();