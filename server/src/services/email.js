import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.templateCache = new Map();
    
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Skip email configuration in development if not provided
    if (process.env.NODE_ENV === 'development' && (!process.env.SMTP_HOST || !process.env.SMTP_USER)) {
      console.log('📧 Email service not configured - running in development mode');
      return;
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️  Email service not fully configured. Please set SMTP environment variables.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates in development
        }
      });

      this.isConfigured = true;
      console.log('📧 Email service configured successfully');
    } catch (error) {
      console.error('❌ Failed to configure email service:', error.message);
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @param {string} options.template - Template name (optional)
   * @param {Object} options.templateData - Data for template (optional)
   * @returns {Promise<boolean>}
   */
  async sendEmail({ to, subject, text, html, template, templateData = {} }) {
    if (!this.isConfigured) {
      console.log('📧 Email service not configured - skipping email send');
      return process.env.NODE_ENV === 'development'; // Return true in dev to not break flows
    }

    try {
      let emailHtml = html;
      let emailText = text;

      // Use template if provided
      if (template) {
        const templateContent = await this.renderTemplate(template, templateData);
        emailHtml = templateContent.html;
        emailText = emailText || templateContent.text;
      }

      const mailOptions = {
        from: `${process.env.FROM_NAME || 'NoteVault'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        text: emailText,
        html: emailHtml,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return false;
    }
  }

  /**
   * Send verification email
   * @param {string} to - Recipient email
   * @param {string} username - Username
   * @param {string} verificationToken - Verification token
   * @returns {Promise<boolean>}
   */
  async sendVerificationEmail(to, username, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    return await this.sendEmail({
      to,
      subject: 'Verify your NoteVault account',
      template: 'verification',
      templateData: {
        username,
        verificationUrl,
        supportEmail: process.env.FROM_EMAIL || 'support@notevault.com'
      }
    });
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} username - Username
   * @param {string} resetToken - Reset token
   * @returns {Promise<boolean>}
   */
  async sendPasswordResetEmail(to, username, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    return await this.sendEmail({
      to,
      subject: 'Reset your NoteVault password',
      template: 'password-reset',
      templateData: {
        username,
        resetUrl,
        supportEmail: process.env.FROM_EMAIL || 'support@notevault.com'
      }
    });
  }

  /**
   * Send workspace invitation email
   * @param {string} to - Recipient email
   * @param {string} inviterName - Name of person sending invitation
   * @param {string} workspaceName - Workspace name
   * @param {string} invitationToken - Invitation token
   * @returns {Promise<boolean>}
   */
  async sendWorkspaceInvitation(to, inviterName, workspaceName, invitationToken) {
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite?token=${invitationToken}`;
    
    return await this.sendEmail({
      to,
      subject: `Invitation to join "${workspaceName}" on NoteVault`,
      template: 'workspace-invitation',
      templateData: {
        inviterName,
        workspaceName,
        invitationUrl,
        supportEmail: process.env.FROM_EMAIL || 'support@notevault.com'
      }
    });
  }

  /**
   * Send notification email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} actionUrl - Optional action URL
   * @param {string} actionText - Optional action button text
   * @returns {Promise<boolean>}
   */
  async sendNotification(to, subject, title, message, actionUrl = null, actionText = null) {
    return await this.sendEmail({
      to,
      subject,
      template: 'notification',
      templateData: {
        title,
        message,
        actionUrl,
        actionText,
        supportEmail: process.env.FROM_EMAIL || 'support@notevault.com'
      }
    });
  }

  /**
   * Render email template
   * @param {string} templateName - Template name
   * @param {Object} data - Template data
   * @returns {Promise<{html: string, text: string}>}
   */
  async renderTemplate(templateName, data) {
    try {
      // Check cache first
      const cacheKey = `${templateName}-${JSON.stringify(data)}`;
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey);
      }

      const template = this.getEmailTemplate(templateName);
      const rendered = this.interpolateTemplate(template, data);
      
      // Cache the result
      this.templateCache.set(cacheKey, rendered);
      
      return rendered;
    } catch (error) {
      console.error('Template rendering error:', error);
      throw error;
    }
  }

  /**
   * Get email template
   * @param {string} templateName - Template name
   * @returns {Object} Template object with html and text
   */
  getEmailTemplate(templateName) {
    const templates = {
      verification: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to NoteVault!</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi {{username}},</p>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Thank you for signing up for NoteVault. To complete your registration, please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{verificationUrl}}" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="color: #4CAF50; font-size: 14px; word-break: break-all;">{{verificationUrl}}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">If you didn't create an account, please ignore this email or contact us at {{supportEmail}}.</p>
            </div>
          </div>
        `,
        text: `
Welcome to NoteVault!

Hi {{username}},

Thank you for signing up for NoteVault. To complete your registration, please verify your email address by visiting:

{{verificationUrl}}

If you didn't create an account, please ignore this email or contact us at {{supportEmail}}.

Best regards,
The NoteVault Team
        `
      },
      'password-reset': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Reset Your Password</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi {{username}},</p>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">We received a request to reset your password for your NoteVault account. Click the button below to reset it:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" style="background-color: #ff6b35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="color: #ff6b35; font-size: 14px; word-break: break-all;">{{resetUrl}}</p>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">This link will expire in 1 hour for security reasons.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request a password reset, please ignore this email or contact us at {{supportEmail}}.</p>
            </div>
          </div>
        `,
        text: `
Reset Your Password

Hi {{username}},

We received a request to reset your password for your NoteVault account. Visit this link to reset it:

{{resetUrl}}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email or contact us at {{supportEmail}}.

Best regards,
The NoteVault Team
        `
      },
      'workspace-invitation': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #333; text-align: center; margin-bottom: 30px;">You're Invited!</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi there,</p>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">{{inviterName}} has invited you to join the workspace "{{workspaceName}}" on NoteVault.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{invitationUrl}}" style="background-color: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Join Workspace</a>
              </div>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="color: #2196f3; font-size: 14px; word-break: break-all;">{{invitationUrl}}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">If you don't want to join this workspace, you can safely ignore this email.</p>
            </div>
          </div>
        `,
        text: `
You're Invited!

Hi there,

{{inviterName}} has invited you to join the workspace "{{workspaceName}}" on NoteVault.

Join the workspace by visiting: {{invitationUrl}}

If you don't want to join this workspace, you can safely ignore this email.

Best regards,
The NoteVault Team
        `
      },
      notification: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #333; text-align: center; margin-bottom: 30px;">{{title}}</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">{{message}}</p>
              {{#actionUrl}}
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{actionUrl}}" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">{{actionText}}</a>
              </div>
              {{/actionUrl}}
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">This is an automated notification from NoteVault. If you have questions, contact us at {{supportEmail}}.</p>
            </div>
          </div>
        `,
        text: `
{{title}}

{{message}}

{{#actionUrl}}
{{actionText}}: {{actionUrl}}
{{/actionUrl}}

This is an automated notification from NoteVault. If you have questions, contact us at {{supportEmail}}.
        `
      }
    };

    if (!templates[templateName]) {
      throw new Error(`Template "${templateName}" not found`);
    }

    return templates[templateName];
  }

  /**
   * Simple template interpolation
   * @param {Object} template - Template object
   * @param {Object} data - Data to interpolate
   * @returns {Object} Interpolated template
   */
  interpolateTemplate(template, data) {
    const interpolate = (str) => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
      });
    };

    return {
      html: interpolate(template.html),
      text: interpolate(template.text)
    };
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('📧 Email service connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Email service connection test failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export default new EmailService();