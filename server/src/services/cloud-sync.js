import { google } from 'googleapis';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

class CloudSyncService {
  constructor() {
    this.googleDriveConfig = {
      enabled: process.env.GOOGLE_DRIVE_ENABLED === 'true',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    };

    this.dropboxConfig = {
      enabled: process.env.DROPBOX_ENABLED === 'true',
      clientId: process.env.DROPBOX_CLIENT_ID,
      clientSecret: process.env.DROPBOX_CLIENT_SECRET,
      redirectUri: process.env.DROPBOX_REDIRECT_URI
    };

    this.userTokens = new Map(); // In production, store in database
    this.syncQueues = new Map(); // Track sync operations
  }

  /**
   * Get Google Drive authorization URL
   */
  getGoogleDriveAuthUrl(userId, state = null) {
    if (!this.googleDriveConfig.enabled) {
      throw new Error('Google Drive integration is disabled');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.googleDriveConfig.clientId,
      this.googleDriveConfig.clientSecret,
      this.googleDriveConfig.redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.googleDriveConfig.scopes,
      state: state || userId,
      prompt: 'consent'
    });

    return authUrl;
  }

  /**
   * Get Dropbox authorization URL
   */
  getDropboxAuthUrl(userId, state = null) {
    if (!this.dropboxConfig.enabled) {
      throw new Error('Dropbox integration is disabled');
    }

    const params = new URLSearchParams({
      client_id: this.dropboxConfig.clientId,
      response_type: 'code',
      redirect_uri: this.dropboxConfig.redirectUri,
      state: state || userId,
      token_access_type: 'offline'
    });

    return `https://www.dropbox.com/oauth2/authorize?${params}`;
  }

  /**
   * Exchange Google Drive authorization code for tokens
   */
  async exchangeGoogleDriveCode(code, userId) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.googleDriveConfig.clientId,
        this.googleDriveConfig.clientSecret,
        this.googleDriveConfig.redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);
      
      // Store tokens for user
      this.userTokens.set(`googledrive_${userId}`, tokens);
      
      return tokens;
    } catch (error) {
      console.error('Google Drive token exchange error:', error);
      throw new Error('Failed to exchange Google Drive authorization code');
    }
  }

  /**
   * Exchange Dropbox authorization code for tokens
   */
  async exchangeDropboxCode(code, userId) {
    try {
      const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.dropboxConfig.clientId,
          client_secret: this.dropboxConfig.clientSecret,
          code: code,
          redirect_uri: this.dropboxConfig.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokens = await response.json();
      
      if (!response.ok) {
        throw new Error(tokens.error_description || 'Token exchange failed');
      }

      // Store tokens for user
      this.userTokens.set(`dropbox_${userId}`, tokens);
      
      return tokens;
    } catch (error) {
      console.error('Dropbox token exchange error:', error);
      throw new Error('Failed to exchange Dropbox authorization code');
    }
  }

  /**
   * Get Google Drive client for user
   */
  getGoogleDriveClient(userId) {
    const tokens = this.userTokens.get(`googledrive_${userId}`);
    if (!tokens) {
      throw new Error('Google Drive not connected for this user');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.googleDriveConfig.clientId,
      this.googleDriveConfig.clientSecret,
      this.googleDriveConfig.redirectUri
    );

    oauth2Client.setCredentials(tokens);
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Get Dropbox API headers for user
   */
  getDropboxHeaders(userId) {
    const tokens = this.userTokens.get(`dropbox_${userId}`);
    if (!tokens) {
      throw new Error('Dropbox not connected for this user');
    }

    return {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Upload file to Google Drive
   */
  async uploadToGoogleDrive(userId, fileData, options = {}) {
    try {
      const drive = this.getGoogleDriveClient(userId);
      
      const {
        name = fileData.name || 'untitled',
        description = '',
        parents = [], // Folder IDs
        mimeType = 'application/octet-stream'
      } = options;

      const fileMetadata = {
        name,
        description,
        parents
      };

      const media = {
        mimeType,
        body: fileData.stream || fileData.buffer
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,size,createdTime,modifiedTime,webViewLink'
      });

      return this.formatGoogleDriveFile(response.data);
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  /**
   * Upload file to Dropbox
   */
  async uploadToDropbox(userId, fileData, options = {}) {
    try {
      const headers = this.getDropboxHeaders(userId);
      
      const {
        path: filePath = `/${fileData.name || 'untitled'}`,
        mode = 'add',
        autorename = true,
        mute = false
      } = options;

      headers['Dropbox-API-Arg'] = JSON.stringify({
        path: filePath,
        mode,
        autorename,
        mute
      });
      headers['Content-Type'] = 'application/octet-stream';

      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers,
        body: fileData.stream || fileData.buffer
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error_summary || 'Upload failed');
      }

      return this.formatDropboxFile(result);
    } catch (error) {
      console.error('Dropbox upload error:', error);
      throw new Error('Failed to upload file to Dropbox');
    }
  }

  /**
   * Download file from Google Drive
   */
  async downloadFromGoogleDrive(userId, fileId) {
    try {
      const drive = this.getGoogleDriveClient(userId);
      
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      return response.data;
    } catch (error) {
      console.error('Google Drive download error:', error);
      throw new Error('Failed to download file from Google Drive');
    }
  }

  /**
   * Download file from Dropbox
   */
  async downloadFromDropbox(userId, filePath) {
    try {
      const headers = this.getDropboxHeaders(userId);
      headers['Dropbox-API-Arg'] = JSON.stringify({ path: filePath });

      const response = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_summary || 'Download failed');
      }

      return response.body;
    } catch (error) {
      console.error('Dropbox download error:', error);
      throw new Error('Failed to download file from Dropbox');
    }
  }

  /**
   * List files from Google Drive
   */
  async listGoogleDriveFiles(userId, options = {}) {
    try {
      const drive = this.getGoogleDriveClient(userId);
      
      const {
        pageSize = 50,
        pageToken = null,
        q = null, // Query string
        orderBy = 'modifiedTime desc'
      } = options;

      const response = await drive.files.list({
        pageSize,
        pageToken,
        q,
        orderBy,
        fields: 'nextPageToken, files(id,name,size,createdTime,modifiedTime,webViewLink,mimeType)'
      });

      return {
        files: response.data.files.map(file => this.formatGoogleDriveFile(file)),
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('Google Drive list error:', error);
      throw new Error('Failed to list Google Drive files');
    }
  }

  /**
   * List files from Dropbox
   */
  async listDropboxFiles(userId, options = {}) {
    try {
      const headers = this.getDropboxHeaders(userId);
      
      const {
        path = '',
        recursive = false,
        include_media_info = false,
        include_deleted = false,
        include_has_explicit_shared_members = false,
        limit = 2000
      } = options;

      const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          path,
          recursive,
          include_media_info,
          include_deleted,
          include_has_explicit_shared_members,
          limit
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error_summary || 'List failed');
      }

      return {
        files: result.entries.map(file => this.formatDropboxFile(file)),
        cursor: result.cursor,
        hasMore: result.has_more
      };
    } catch (error) {
      console.error('Dropbox list error:', error);
      throw new Error('Failed to list Dropbox files');
    }
  }

  /**
   * Sync workspace to cloud storage
   */
  async syncWorkspaceToCloud(userId, workspaceId, provider = 'googledrive') {
    try {
      const syncId = crypto.randomUUID();
      this.syncQueues.set(syncId, { status: 'started', progress: 0 });

      // Mock workspace data - in real implementation, fetch from database
      const workspace = {
        id: workspaceId,
        name: 'Sample Workspace',
        notes: [
          { id: 'note1', title: 'Note 1', content: 'Content 1' },
          { id: 'note2', title: 'Note 2', content: 'Content 2' }
        ],
        files: [
          { id: 'file1', name: 'document.pdf', path: '/uploads/document.pdf' }
        ]
      };

      const syncResults = [];
      let progress = 0;
      const totalItems = workspace.notes.length + workspace.files.length;

      // Create workspace folder
      let folderInfo;
      if (provider === 'googledrive') {
        folderInfo = await this.createGoogleDriveFolder(userId, `NoteVault - ${workspace.name}`);
      } else if (provider === 'dropbox') {
        folderInfo = await this.createDropboxFolder(userId, `/NoteVault - ${workspace.name}`);
      }

      // Sync notes
      for (const note of workspace.notes) {
        try {
          const noteData = {
            name: `${note.title}.md`,
            buffer: Buffer.from(note.content, 'utf8')
          };

          let result;
          if (provider === 'googledrive') {
            result = await this.uploadToGoogleDrive(userId, noteData, {
              parents: [folderInfo.id],
              mimeType: 'text/markdown'
            });
          } else if (provider === 'dropbox') {
            result = await this.uploadToDropbox(userId, noteData, {
              path: `${folderInfo.path}/${noteData.name}`
            });
          }

          syncResults.push({ type: 'note', id: note.id, result, status: 'success' });
        } catch (error) {
          syncResults.push({ type: 'note', id: note.id, error: error.message, status: 'error' });
        }

        progress++;
        this.syncQueues.set(syncId, { 
          status: 'syncing', 
          progress: Math.round((progress / totalItems) * 100) 
        });
      }

      // Sync files
      for (const file of workspace.files) {
        try {
          // In real implementation, read file from storage
          const fileBuffer = Buffer.from('Mock file content', 'utf8');
          const fileData = {
            name: file.name,
            buffer: fileBuffer
          };

          let result;
          if (provider === 'googledrive') {
            result = await this.uploadToGoogleDrive(userId, fileData, {
              parents: [folderInfo.id]
            });
          } else if (provider === 'dropbox') {
            result = await this.uploadToDropbox(userId, fileData, {
              path: `${folderInfo.path}/${file.name}`
            });
          }

          syncResults.push({ type: 'file', id: file.id, result, status: 'success' });
        } catch (error) {
          syncResults.push({ type: 'file', id: file.id, error: error.message, status: 'error' });
        }

        progress++;
        this.syncQueues.set(syncId, { 
          status: 'syncing', 
          progress: Math.round((progress / totalItems) * 100) 
        });
      }

      this.syncQueues.set(syncId, { status: 'completed', progress: 100 });

      return {
        syncId,
        workspaceId,
        provider,
        folder: folderInfo,
        results: syncResults,
        summary: {
          total: totalItems,
          successful: syncResults.filter(r => r.status === 'success').length,
          failed: syncResults.filter(r => r.status === 'error').length
        }
      };
    } catch (error) {
      console.error('Workspace sync error:', error);
      throw new Error('Failed to sync workspace to cloud storage');
    }
  }

  /**
   * Create Google Drive folder
   */
  async createGoogleDriveFolder(userId, folderName) {
    try {
      const drive = this.getGoogleDriveClient(userId);
      
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        fields: 'id,name,webViewLink'
      });

      return {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        path: folderName
      };
    } catch (error) {
      console.error('Google Drive folder creation error:', error);
      throw new Error('Failed to create Google Drive folder');
    }
  }

  /**
   * Create Dropbox folder
   */
  async createDropboxFolder(userId, folderPath) {
    try {
      const headers = this.getDropboxHeaders(userId);
      
      const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: folderPath })
      });

      const result = await response.json();

      if (!response.ok) {
        // Folder might already exist
        if (result.error && result.error['.tag'] === 'path' && result.error.path['.tag'] === 'conflict') {
          return {
            path: folderPath,
            name: path.basename(folderPath),
            id: folderPath
          };
        }
        throw new Error(result.error_summary || 'Folder creation failed');
      }

      return {
        path: result.metadata.path_display,
        name: result.metadata.name,
        id: result.metadata.id
      };
    } catch (error) {
      console.error('Dropbox folder creation error:', error);
      throw new Error('Failed to create Dropbox folder');
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(syncId) {
    return this.syncQueues.get(syncId) || { status: 'not_found' };
  }

  /**
   * Format Google Drive file
   */
  formatGoogleDriveFile(file) {
    return {
      id: file.id,
      name: file.name,
      size: file.size ? parseInt(file.size) : null,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      mimeType: file.mimeType,
      provider: 'googledrive'
    };
  }

  /**
   * Format Dropbox file
   */
  formatDropboxFile(file) {
    return {
      id: file.id,
      name: file.name,
      size: file.size || null,
      createdTime: file.client_modified,
      modifiedTime: file.server_modified,
      path: file.path_display,
      provider: 'dropbox'
    };
  }

  /**
   * Check if user has cloud storage connected
   */
  hasCloudStorageConnected(userId, provider = null) {
    if (provider) {
      return this.userTokens.has(`${provider}_${userId}`);
    }
    
    return this.userTokens.has(`googledrive_${userId}`) || this.userTokens.has(`dropbox_${userId}`);
  }

  /**
   * Disconnect cloud storage for user
   */
  disconnectCloudStorage(userId, provider) {
    return this.userTokens.delete(`${provider}_${userId}`);
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      googledrive: {
        enabled: this.googleDriveConfig.enabled,
        configured: !!(this.googleDriveConfig.clientId && this.googleDriveConfig.clientSecret)
      },
      dropbox: {
        enabled: this.dropboxConfig.enabled,
        configured: !!(this.dropboxConfig.clientId && this.dropboxConfig.clientSecret)
      }
    };
  }

  /**
   * Auto-sync workspace (periodic sync)
   */
  async setupAutoSync(userId, workspaceId, provider, interval = 3600000) { // 1 hour default
    const syncInterval = setInterval(async () => {
      try {
        await this.syncWorkspaceToCloud(userId, workspaceId, provider);
        console.log(`Auto-sync completed for workspace ${workspaceId}`);
      } catch (error) {
        console.error(`Auto-sync failed for workspace ${workspaceId}:`, error);
      }
    }, interval);

    return syncInterval;
  }
}

export default new CloudSyncService();