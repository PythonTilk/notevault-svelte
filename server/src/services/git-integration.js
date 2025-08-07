import { Octokit } from '@octokit/rest';
import fetch from 'node-fetch';
import crypto from 'crypto';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';

class GitIntegrationService {
  constructor() {
    this.githubConfig = {
      enabled: process.env.GITHUB_INTEGRATION_ENABLED === 'true',
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET
    };

    this.gitlabConfig = {
      enabled: process.env.GITLAB_INTEGRATION_ENABLED === 'true',
      clientId: process.env.GITLAB_CLIENT_ID,
      clientSecret: process.env.GITLAB_CLIENT_SECRET,
      baseUrl: process.env.GITLAB_BASE_URL || 'https://gitlab.com'
    };

    this.userTokens = new Map(); // In production, store in database
    this.repositories = new Map(); // Track synchronized repositories
  }

  /**
   * Get GitHub authorization URL
   */
  getGitHubAuthUrl(userId, scopes = ['repo', 'user:email']) {
    if (!this.githubConfig.enabled) {
      throw new Error('GitHub integration is disabled');
    }

    const params = new URLSearchParams({
      client_id: this.githubConfig.clientId,
      redirect_uri: `${process.env.BASE_URL}/api/git/callback/github`,
      scope: scopes.join(' '),
      state: userId,
      allow_signup: 'false'
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }

  /**
   * Get GitLab authorization URL
   */
  getGitLabAuthUrl(userId, scopes = ['api', 'read_user']) {
    if (!this.gitlabConfig.enabled) {
      throw new Error('GitLab integration is disabled');
    }

    const params = new URLSearchParams({
      client_id: this.gitlabConfig.clientId,
      redirect_uri: `${process.env.BASE_URL}/api/git/callback/gitlab`,
      response_type: 'code',
      scope: scopes.join(' '),
      state: userId
    });

    return `${this.gitlabConfig.baseUrl}/oauth/authorize?${params}`;
  }

  /**
   * Exchange GitHub authorization code for token
   */
  async exchangeGitHubCode(code, userId) {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.githubConfig.clientId,
          client_secret: this.githubConfig.clientSecret,
          code: code
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.userTokens.set(`github_${userId}`, data.access_token);
      return data;
    } catch (error) {
      console.error('GitHub token exchange error:', error);
      throw new Error('Failed to exchange GitHub authorization code');
    }
  }

  /**
   * Exchange GitLab authorization code for token
   */
  async exchangeGitLabCode(code, userId) {
    try {
      const response = await fetch(`${this.gitlabConfig.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.gitlabConfig.clientId,
          client_secret: this.gitlabConfig.clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.BASE_URL}/api/git/callback/gitlab`
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.userTokens.set(`gitlab_${userId}`, data.access_token);
      return data;
    } catch (error) {
      console.error('GitLab token exchange error:', error);
      throw new Error('Failed to exchange GitLab authorization code');
    }
  }

  /**
   * Get GitHub Octokit client for user
   */
  getGitHubClient(userId) {
    const token = this.userTokens.get(`github_${userId}`);
    if (!token) {
      throw new Error('GitHub not connected for this user');
    }

    return new Octokit({ auth: token });
  }

  /**
   * Get GitLab API headers for user
   */
  getGitLabHeaders(userId) {
    const token = this.userTokens.get(`gitlab_${userId}`);
    if (!token) {
      throw new Error('GitLab not connected for this user');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create GitHub repository for workspace
   */
  async createGitHubRepository(userId, workspaceId, repoData) {
    try {
      const octokit = this.getGitHubClient(userId);
      
      const {
        name = `notevault-workspace-${workspaceId}`,
        description = `NoteVault workspace: ${workspaceId}`,
        private: isPrivate = true,
        auto_init = true
      } = repoData;

      const response = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init
      });

      const repo = response.data;
      
      // Store repository mapping
      this.repositories.set(`${userId}_${workspaceId}`, {
        provider: 'github',
        repoId: repo.id,
        repoName: repo.full_name,
        cloneUrl: repo.clone_url,
        webUrl: repo.html_url
      });

      return this.formatGitHubRepo(repo);
    } catch (error) {
      console.error('GitHub repository creation error:', error);
      throw new Error('Failed to create GitHub repository');
    }
  }

  /**
   * Create GitLab repository for workspace
   */
  async createGitLabRepository(userId, workspaceId, repoData) {
    try {
      const headers = this.getGitLabHeaders(userId);
      
      const {
        name = `notevault-workspace-${workspaceId}`,
        description = `NoteVault workspace: ${workspaceId}`,
        visibility = 'private',
        initialize_with_readme = true
      } = repoData;

      const response = await fetch(`${this.gitlabConfig.baseUrl}/api/v4/projects`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          description,
          visibility,
          initialize_with_readme
        })
      });

      const repo = await response.json();

      if (!response.ok) {
        throw new Error(repo.message || 'Repository creation failed');
      }

      // Store repository mapping
      this.repositories.set(`${userId}_${workspaceId}`, {
        provider: 'gitlab',
        repoId: repo.id,
        repoName: repo.path_with_namespace,
        cloneUrl: repo.http_url_to_repo,
        webUrl: repo.web_url
      });

      return this.formatGitLabRepo(repo);
    } catch (error) {
      console.error('GitLab repository creation error:', error);
      throw new Error('Failed to create GitLab repository');
    }
  }

  /**
   * Sync workspace notes to Git repository
   */
  async syncWorkspaceToGit(userId, workspaceId, provider = 'github') {
    try {
      const repoInfo = this.repositories.get(`${userId}_${workspaceId}`);
      if (!repoInfo) {
        throw new Error('No Git repository configured for this workspace');
      }

      // Mock workspace data - in real implementation, fetch from database
      const workspace = {
        id: workspaceId,
        name: 'Sample Workspace',
        notes: [
          { 
            id: 'note1', 
            title: 'Meeting Notes', 
            content: '# Meeting Notes\n\nDiscussed project roadmap...',
            type: 'markdown'
          },
          { 
            id: 'note2', 
            title: 'Code Snippet', 
            content: 'console.log("Hello, World!");',
            type: 'javascript'
          }
        ]
      };

      const syncResults = [];

      // Create/update files in repository
      for (const note of workspace.notes) {
        try {
          const fileName = this.generateNoteFileName(note);
          const content = this.formatNoteContent(note);

          let result;
          if (provider === 'github') {
            result = await this.createOrUpdateGitHubFile(
              userId, 
              repoInfo.repoName, 
              fileName, 
              content,
              `Update ${note.title}`
            );
          } else if (provider === 'gitlab') {
            result = await this.createOrUpdateGitLabFile(
              userId,
              repoInfo.repoId,
              fileName,
              content,
              `Update ${note.title}`
            );
          }

          syncResults.push({
            noteId: note.id,
            fileName,
            status: 'success',
            result
          });
        } catch (error) {
          syncResults.push({
            noteId: note.id,
            status: 'error',
            error: error.message
          });
        }
      }

      return {
        workspaceId,
        provider,
        repository: repoInfo,
        results: syncResults,
        summary: {
          total: workspace.notes.length,
          successful: syncResults.filter(r => r.status === 'success').length,
          failed: syncResults.filter(r => r.status === 'error').length
        }
      };
    } catch (error) {
      console.error('Git sync error:', error);
      throw new Error('Failed to sync workspace to Git repository');
    }
  }

  /**
   * Create or update file in GitHub repository
   */
  async createOrUpdateGitHubFile(userId, repoName, filePath, content, commitMessage) {
    try {
      const octokit = this.getGitHubClient(userId);
      const [owner, repo] = repoName.split('/');

      // Check if file exists
      let sha = null;
      try {
        const existing = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath
        });
        sha = existing.data.sha;
      } catch (error) {
        // File doesn't exist, will create new
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        sha // Include sha if updating existing file
      });

      return response.data;
    } catch (error) {
      console.error('GitHub file update error:', error);
      throw new Error('Failed to update file in GitHub repository');
    }
  }

  /**
   * Create or update file in GitLab repository
   */
  async createOrUpdateGitLabFile(userId, projectId, filePath, content, commitMessage) {
    try {
      const headers = this.getGitLabHeaders(userId);

      // Check if file exists
      let fileExists = false;
      try {
        const checkResponse = await fetch(
          `${this.gitlabConfig.baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=main`,
          { headers }
        );
        fileExists = checkResponse.ok;
      } catch (error) {
        // File doesn't exist
      }

      const action = fileExists ? 'update' : 'create';
      const response = await fetch(
        `${this.gitlabConfig.baseUrl}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
        {
          method: fileExists ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify({
            branch: 'main',
            content: Buffer.from(content).toString('base64'),
            commit_message: commitMessage,
            encoding: 'base64'
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'File operation failed');
      }

      return result;
    } catch (error) {
      console.error('GitLab file update error:', error);
      throw new Error('Failed to update file in GitLab repository');
    }
  }

  /**
   * Get user repositories
   */
  async getUserRepositories(userId, provider = 'github') {
    try {
      if (provider === 'github') {
        const octokit = this.getGitHubClient(userId);
        const response = await octokit.rest.repos.listForAuthenticatedUser({
          sort: 'updated',
          per_page: 100
        });

        return response.data.map(repo => this.formatGitHubRepo(repo));
      } else if (provider === 'gitlab') {
        const headers = this.getGitLabHeaders(userId);
        const response = await fetch(`${this.gitlabConfig.baseUrl}/api/v4/projects?membership=true&sort=updated_at`, {
          headers
        });

        const repos = await response.json();
        return repos.map(repo => this.formatGitLabRepo(repo));
      }
    } catch (error) {
      console.error('Get repositories error:', error);
      throw new Error('Failed to fetch user repositories');
    }
  }

  /**
   * Generate note file name
   */
  generateNoteFileName(note) {
    const sanitizedTitle = note.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const extension = this.getFileExtension(note.type);
    return `notes/${sanitizedTitle}.${extension}`;
  }

  /**
   * Get file extension based on note type
   */
  getFileExtension(noteType) {
    const extensions = {
      markdown: 'md',
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yml',
      xml: 'xml',
      text: 'txt'
    };
    
    return extensions[noteType] || 'md';
  }

  /**
   * Format note content for Git
   */
  formatNoteContent(note) {
    if (note.type === 'markdown' || !note.type) {
      return note.content;
    }

    // For code notes, wrap in appropriate code blocks
    return `# ${note.title}\n\n\`\`\`${note.type}\n${note.content}\n\`\`\``;
  }

  /**
   * Format GitHub repository data
   */
  formatGitHubRepo(repo) {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      provider: 'github'
    };
  }

  /**
   * Format GitLab repository data
   */
  formatGitLabRepo(repo) {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.path_with_namespace,
      description: repo.description,
      private: repo.visibility === 'private',
      htmlUrl: repo.web_url,
      cloneUrl: repo.http_url_to_repo,
      defaultBranch: repo.default_branch,
      updatedAt: repo.last_activity_at,
      provider: 'gitlab'
    };
  }

  /**
   * Check if user has Git integration connected
   */
  hasGitConnected(userId, provider = null) {
    if (provider) {
      return this.userTokens.has(`${provider}_${userId}`);
    }
    
    return this.userTokens.has(`github_${userId}`) || this.userTokens.has(`gitlab_${userId}`);
  }

  /**
   * Disconnect Git integration for user
   */
  disconnectGit(userId, provider) {
    this.userTokens.delete(`${provider}_${userId}`);
    
    // Remove repository mappings for this provider
    for (const [key, repo] of this.repositories.entries()) {
      if (key.startsWith(`${userId}_`) && repo.provider === provider) {
        this.repositories.delete(key);
      }
    }
    
    return true;
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      github: {
        enabled: this.githubConfig.enabled,
        configured: !!(this.githubConfig.clientId && this.githubConfig.clientSecret)
      },
      gitlab: {
        enabled: this.gitlabConfig.enabled,
        configured: !!(this.gitlabConfig.clientId && this.gitlabConfig.clientSecret)
      }
    };
  }

  /**
   * Handle webhook from Git provider
   */
  async handleWebhook(provider, payload, signature) {
    try {
      if (provider === 'github') {
        // Verify GitHub webhook signature
        if (this.githubConfig.webhookSecret) {
          const expectedSignature = `sha256=${crypto
            .createHmac('sha256', this.githubConfig.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex')}`;
          
          if (signature !== expectedSignature) {
            throw new Error('Invalid webhook signature');
          }
        }

        // Handle different GitHub events
        switch (payload.action || 'push') {
          case 'push':
            return this.handleGitHubPush(payload);
          default:
            return { status: 'ignored', event: payload.action };
        }
      }
      
      return { status: 'unsupported_provider' };
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw new Error('Failed to handle webhook');
    }
  }

  /**
   * Handle GitHub push webhook
   */
  async handleGitHubPush(payload) {
    // This would typically trigger a sync back to NoteVault
    console.log(`Received push to ${payload.repository.full_name}`);
    
    return {
      status: 'processed',
      repository: payload.repository.full_name,
      commits: payload.commits?.length || 0
    };
  }
}

export default new GitIntegrationService();