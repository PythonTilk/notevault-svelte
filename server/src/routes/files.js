import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { logSecurityEvent, logUserAction, SECURITY_EVENTS } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt|md|zip|rar)$/i;
    const allowedMimeTypes = /^(image\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/|application\/zip|application\/x-rar-compressed).*$/i;
    
    const extname = allowedExtensions.test(file.originalname);
    const mimetype = allowedMimeTypes.test(file.mimetype);

    console.log(`File upload check: ${file.originalname}, mime: ${file.mimetype}, ext: ${extname}, mime: ${mimetype}`);

    if (mimetype || extname) { // Allow if either check passes (more permissive)
      return cb(null, true);
    } else {
      console.log(`File rejected: ${file.originalname} (${file.mimetype})`);
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

// Get files
router.get('/', optionalAuth, (req, res) => {
  const { workspaceId, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT f.*, u.display_name as uploader_name, u.avatar as uploader_avatar
    FROM files f
    JOIN users u ON f.uploader_id = u.id
  `;
  
  const params = [];

  if (workspaceId) {
    // Check if user has access to workspace
    const accessQuery = `
      SELECT w.is_public, wm.role
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
      WHERE w.id = ? AND (w.is_public = TRUE OR wm.user_id = ?)
    `;

    db.get(accessQuery, [req.user?.id, workspaceId, req.user?.id], (err, access) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!access) {
        return res.status(403).json({ error: 'Access denied to workspace' });
      }

      query += ' WHERE f.workspace_id = ? AND (f.is_public = TRUE OR ? IS NOT NULL)';
      params.push(workspaceId, req.user?.id);

      executeQuery();
    });
  } else {
    query += ' WHERE f.is_public = TRUE OR (? IS NOT NULL AND f.uploader_id = ?)';
    params.push(req.user?.id, req.user?.id);
    executeQuery();
  }

  function executeQuery() {
    query += ' ORDER BY f.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const formattedFiles = files.map(file => ({
        id: file.id,
        name: file.name,
        originalName: file.original_name,
        type: file.type,
        size: file.size,
        url: `/api/files/${file.id}/download`,
        uploaderId: file.uploader_id,
        uploaderName: file.uploader_name,
        uploaderAvatar: file.uploader_avatar,
        workspaceId: file.workspace_id,
        createdAt: file.created_at,
        isPublic: file.is_public
      }));

      res.json(formattedFiles);
    });
  }
});

// Test upload route
router.post('/test-upload', authenticateToken, (req, res) => {
  res.json({ message: 'Upload route accessible', user: req.user?.id });
});

// Upload file
router.post('/upload', authenticateToken, (req, res) => {
  try {
    console.log('File upload request received from user:', req.user?.id);
    upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large (max 10MB)' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded successfully:', req.file);

    const { workspaceId, isPublic = false } = req.body;
    const fileId = uuidv4();

    // If workspaceId is provided, check access
    if (workspaceId) {
    db.get(`
      SELECT wm.role FROM workspace_members wm
      WHERE wm.workspace_id = ? AND wm.user_id = ?
    `, [workspaceId, req.user.id], (err, member) => {
      if (err) {
        // Clean up uploaded file safely
        try {
          if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupErr) {
          console.error('Failed to clean up uploaded file:', cleanupErr);
        }
        return res.status(500).json({ error: 'Database error' });
      }

      if (!member) {
        // Clean up uploaded file safely
        try {
          if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
          }
        } catch (cleanupErr) {
          console.error('Failed to clean up uploaded file:', cleanupErr);
        }
        return res.status(403).json({ error: 'Access denied to workspace' });
      }

      saveFile();
    });
  } else {
    saveFile();
  }

  function saveFile() {
    console.log('Attempting to save file to database:', {
      fileId,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      userId: req.user.id,
      workspaceId
    });
    db.run(`
      INSERT INTO files (id, name, original_name, type, size, path, uploader_id, workspace_id, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fileId,
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.file.path,
      req.user.id,
      workspaceId || null,
      isPublic
    ], async function(err) {
      if (err) {
        console.error('File upload database error:', err);
        // Clean up uploaded file
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to clean up file:', unlinkErr);
        }
        return res.status(500).json({ error: 'Failed to save file record' });
      }

      // Log successful file upload
      await logSecurityEvent(SECURITY_EVENTS.FILE_UPLOAD, {
        userId: req.user.id,
        fileId,
        filename: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        workspaceId: workspaceId || null,
        isPublic,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        id: fileId,
        name: req.file.filename,
        originalName: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: `/api/files/${fileId}/download`,
        uploaderId: req.user.id,
        workspaceId: workspaceId || null,
        createdAt: new Date().toISOString(),
        isPublic
      });
    });
  }
  });
  } catch (error) {
    console.error('Unexpected error in file upload:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Download file
router.get('/:id/download', optionalAuth, async (req, res) => {
  const fileId = req.params.id;

  const query = `
    SELECT f.*, w.is_public as workspace_public, wm.role as user_role
    FROM files f
    LEFT JOIN workspaces w ON f.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE f.id = ?
  `;

  db.get(query, [req.user?.id, fileId], async (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access permissions
    const hasAccess = file.is_public || 
                     file.uploader_id === req.user?.id ||
                     (file.workspace_id && (file.workspace_public || file.user_role));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate file path to prevent directory traversal
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    const resolvedUploadDir = path.resolve(uploadDir);
    const resolvedFilePath = path.resolve(file.path);
    
    // Ensure the file path is within the upload directory
    if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
      console.error(`Directory traversal attempt: ${file.path} -> ${resolvedFilePath}`);
      return res.status(403).json({ error: 'Access denied - invalid file path' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Log file download
    await logSecurityEvent(SECURITY_EVENTS.FILE_DOWNLOAD, {
      userId: req.user?.id || null,
      fileId: file.id,
      filename: file.original_name,
      fileSize: file.size,
      fileType: file.type,
      workspaceId: file.workspace_id,
      isPublic: file.is_public,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Sanitize filename for Content-Disposition header
    const safeFilename = file.original_name.replace(/[^\w\s.-]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', file.type);
    res.sendFile(resolvedFilePath);
  });
});

// Delete file
router.delete('/:id', authenticateToken, (req, res) => {
  const fileId = req.params.id;

  const query = `
    SELECT f.*, wm.role as user_role
    FROM files f
    LEFT JOIN workspace_members wm ON f.workspace_id = wm.workspace_id AND wm.user_id = ?
    WHERE f.id = ?
  `;

  db.get(query, [req.user.id, fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user can delete (owner, uploader, or workspace admin/owner)
    const canDelete = file.uploader_id === req.user.id ||
                     req.user.role === 'admin' ||
                     (file.workspace_id && ['owner', 'admin'].includes(file.user_role));

    if (!canDelete) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    db.run('DELETE FROM files WHERE id = ?', [fileId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete file record' });
      }

      // Delete file from disk with path validation
      const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
      const resolvedUploadDir = path.resolve(uploadDir);
      const resolvedFilePath = path.resolve(file.path);
      
      // Ensure the file path is within the upload directory
      if (!resolvedFilePath.startsWith(resolvedUploadDir)) {
        console.error(`Directory traversal attempt during delete: ${file.path} -> ${resolvedFilePath}`);
        return res.status(500).json({ error: 'Failed to delete file - invalid path' });
      }

      if (fs.existsSync(resolvedFilePath)) {
        try {
          fs.unlinkSync(resolvedFilePath);
        } catch (error) {
          console.error('Failed to delete file from disk:', error);
        }
      }

      res.json({ success: true, message: 'File deleted successfully' });
    });
  });
});

// Get file info
router.get('/:id', optionalAuth, (req, res) => {
  const fileId = req.params.id;

  const query = `
    SELECT f.*, u.display_name as uploader_name, u.avatar as uploader_avatar,
           w.is_public as workspace_public, wm.role as user_role
    FROM files f
    JOIN users u ON f.uploader_id = u.id
    LEFT JOIN workspaces w ON f.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE f.id = ?
  `;

  db.get(query, [req.user?.id, fileId], (err, file) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access permissions
    const hasAccess = file.is_public || 
                     file.uploader_id === req.user?.id ||
                     (file.workspace_id && (file.workspace_public || file.user_role));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: file.id,
      name: file.name,
      originalName: file.original_name,
      type: file.type,
      size: file.size,
      url: `/api/files/${file.id}/download`,
      uploaderId: file.uploader_id,
      uploaderName: file.uploader_name,
      uploaderAvatar: file.uploader_avatar,
      workspaceId: file.workspace_id,
      createdAt: file.created_at,
      isPublic: file.is_public,
      userRole: file.user_role
    });
  });
});

export default router;