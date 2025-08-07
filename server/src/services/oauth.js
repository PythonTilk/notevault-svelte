import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as DiscordStrategy } from 'passport-discord';
import crypto from 'crypto';

class OAuthService {
  constructor() {
    this.initialized = false;
    this.enabledProviders = [];
    this.initializeStrategies();
  }

  initializeStrategies() {
    // Check which providers are configured
    const providers = {
      google: {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        strategy: GoogleStrategy
      },
      github: {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        strategy: GitHubStrategy
      },
      discord: {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        strategy: DiscordStrategy
      }
    };

    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

    // Configure Google OAuth
    if (providers.google.clientID && providers.google.clientSecret) {
      passport.use(new GoogleStrategy({
        clientID: providers.google.clientID,
        clientSecret: providers.google.clientSecret,
        callbackURL: `${baseUrl}/api/auth/google/callback`,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userData = {
            provider: 'google',
            providerId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            avatar: profile.photos[0]?.value,
            accessToken,
            refreshToken
          };
          return done(null, userData);
        } catch (error) {
          return done(error, null);
        }
      }));
      
      this.enabledProviders.push('google');
      console.log('✅ Google OAuth strategy configured');
    }

    // Configure GitHub OAuth
    if (providers.github.clientID && providers.github.clientSecret) {
      passport.use(new GitHubStrategy({
        clientID: providers.github.clientID,
        clientSecret: providers.github.clientSecret,
        callbackURL: `${baseUrl}/api/auth/github/callback`,
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userData = {
            provider: 'github',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
            name: profile.displayName || profile.username,
            username: profile.username,
            avatar: profile.photos[0]?.value,
            accessToken,
            refreshToken
          };
          return done(null, userData);
        } catch (error) {
          return done(error, null);
        }
      }));
      
      this.enabledProviders.push('github');
      console.log('✅ GitHub OAuth strategy configured');
    }

    // Configure Discord OAuth
    if (providers.discord.clientID && providers.discord.clientSecret) {
      passport.use(new DiscordStrategy({
        clientID: providers.discord.clientID,
        clientSecret: providers.discord.clientSecret,
        callbackURL: `${baseUrl}/api/auth/discord/callback`,
        scope: ['identify', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userData = {
            provider: 'discord',
            providerId: profile.id,
            email: profile.email,
            name: profile.username,
            avatar: profile.avatar ? 
              `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : 
              null,
            accessToken,
            refreshToken
          };
          return done(null, userData);
        } catch (error) {
          return done(error, null);
        }
      }));
      
      this.enabledProviders.push('discord');
      console.log('✅ Discord OAuth strategy configured');
    }

    // Configure passport serialization
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user);
    });

    if (this.enabledProviders.length === 0) {
      console.log('⚠️  No OAuth providers configured. Set client IDs and secrets in environment variables.');
    } else {
      console.log(`🔐 OAuth providers enabled: ${this.enabledProviders.join(', ')}`);
    }

    this.initialized = true;
  }

  /**
   * Get authentication URL for a provider
   * @param {string} provider - OAuth provider name
   * @param {string} state - State parameter for CSRF protection
   * @returns {string} Authentication URL
   */
  getAuthUrl(provider, state = null) {
    if (!this.enabledProviders.includes(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const stateParam = state ? `?state=${encodeURIComponent(state)}` : '';
    
    return `${baseUrl}/api/auth/${provider}${stateParam}`;
  }

  /**
   * Generate OAuth state parameter for CSRF protection
   * @returns {string} Random state string
   */
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate OAuth state parameter
   * @param {string} receivedState - State received from OAuth callback
   * @param {string} storedState - State stored in session
   * @returns {boolean} Whether state is valid
   */
  validateState(receivedState, storedState) {
    return receivedState && storedState && receivedState === storedState;
  }

  /**
   * Process OAuth user data and prepare for database storage
   * @param {Object} oauthUser - User data from OAuth provider
   * @returns {Object} Processed user data
   */
  processUserData(oauthUser) {
    const baseUserData = {
      providerId: oauthUser.providerId,
      provider: oauthUser.provider,
      email: oauthUser.email,
      name: oauthUser.name,
      avatar: oauthUser.avatar,
      username: oauthUser.username || this.generateUsername(oauthUser.name, oauthUser.provider),
      accessToken: oauthUser.accessToken,
      refreshToken: oauthUser.refreshToken
    };

    // Generate additional fields
    baseUserData.displayName = baseUserData.name;
    baseUserData.id = `${baseUserData.provider}-${baseUserData.providerId}`;

    return baseUserData;
  }

  /**
   * Generate a username from display name and provider
   * @param {string} displayName - User's display name
   * @param {string} provider - OAuth provider
   * @returns {string} Generated username
   */
  generateUsername(displayName, provider) {
    if (!displayName) {
      return `${provider}_user_${Date.now()}`;
    }

    // Clean and format the display name
    let username = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Ensure minimum length
    if (username.length < 3) {
      username = `${provider}_${username}`;
    }

    // Add timestamp to ensure uniqueness
    return `${username}_${Date.now().toString().slice(-6)}`;
  }

  /**
   * Get provider-specific scopes
   * @param {string} provider - OAuth provider name
   * @returns {Array} Array of scopes
   */
  getProviderScopes(provider) {
    const scopes = {
      google: ['profile', 'email'],
      github: ['user:email'],
      discord: ['identify', 'email']
    };

    return scopes[provider] || [];
  }

  /**
   * Check if a provider is enabled
   * @param {string} provider - Provider name
   * @returns {boolean} Whether provider is enabled
   */
  isProviderEnabled(provider) {
    return this.enabledProviders.includes(provider);
  }

  /**
   * Get list of enabled providers
   * @returns {Array} Array of enabled provider names
   */
  getEnabledProviders() {
    return [...this.enabledProviders];
  }

  /**
   * Get provider configuration for frontend
   * @returns {Object} Provider configuration
   */
  getProviderConfig() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    
    return this.enabledProviders.reduce((config, provider) => {
      config[provider] = {
        name: this.getProviderDisplayName(provider),
        authUrl: `${baseUrl}/api/auth/${provider}`,
        icon: this.getProviderIcon(provider),
        color: this.getProviderColor(provider)
      };
      return config;
    }, {});
  }

  /**
   * Get display name for provider
   * @param {string} provider - Provider name
   * @returns {string} Display name
   */
  getProviderDisplayName(provider) {
    const names = {
      google: 'Google',
      github: 'GitHub',
      discord: 'Discord'
    };
    return names[provider] || provider;
  }

  /**
   * Get icon class for provider
   * @param {string} provider - Provider name
   * @returns {string} Icon class
   */
  getProviderIcon(provider) {
    const icons = {
      google: 'fab fa-google',
      github: 'fab fa-github',
      discord: 'fab fa-discord'
    };
    return icons[provider] || 'fas fa-sign-in-alt';
  }

  /**
   * Get brand color for provider
   * @param {string} provider - Provider name
   * @returns {string} CSS color
   */
  getProviderColor(provider) {
    const colors = {
      google: '#4285f4',
      github: '#333',
      discord: '#5865f2'
    };
    return colors[provider] || '#666';
  }

  /**
   * Validate OAuth configuration
   * @returns {Object} Validation results
   */
  validateConfiguration() {
    const results = {
      configured: this.enabledProviders.length > 0,
      providers: {},
      warnings: []
    };

    const requiredEnvVars = {
      google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
      discord: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET']
    };

    for (const [provider, envVars] of Object.entries(requiredEnvVars)) {
      const hasAllVars = envVars.every(envVar => process.env[envVar]);
      results.providers[provider] = {
        configured: hasAllVars,
        missing: envVars.filter(envVar => !process.env[envVar])
      };

      if (!hasAllVars) {
        results.warnings.push(`${provider} OAuth not configured: missing ${results.providers[provider].missing.join(', ')}`);
      }
    }

    return results;
  }
}

// Export singleton instance
export default new OAuthService();