import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get notes for a workspace
router.get('/workspace/:workspaceId', optionalAuth, (req, res) => {
  const workspaceId = req.params.workspaceId;

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

    // Get notes
    const notesQuery = `
      SELECT n.*, u.display_name as author_name, u.avatar as author_avatar
      FROM notes n
      JOIN users u ON n.author_id = u.id
      WHERE n.workspace_id = ? AND (n.is_public = TRUE OR ? IS NOT NULL)
      ORDER BY n.updated_at DESC
    `;

    db.all(notesQuery, [workspaceId, req.user?.id], (err, notes) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const formattedNotes = notes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        workspaceId: note.workspace_id,
        authorId: note.author_id,
        authorName: note.author_name,
        authorAvatar: note.author_avatar,
        position: { x: note.position_x, y: note.position_y },
        size: { width: note.width, height: note.height },
        color: note.color,
        tags: note.tags ? JSON.parse(note.tags) : [],
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        isPublic: note.is_public
      }));

      res.json(formattedNotes);
    });
  });
});

// Get single note
router.get('/:id', optionalAuth, (req, res) => {
  const noteId = req.params.id;

  const query = `
    SELECT n.*, u.display_name as author_name, u.avatar as author_avatar,
           w.is_public as workspace_public, wm.role as user_role
    FROM notes n
    JOIN users u ON n.author_id = u.id
    JOIN workspaces w ON n.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    WHERE n.id = ? AND (n.is_public = TRUE OR w.is_public = TRUE OR wm.user_id = ?)
  `;

  db.get(query, [req.user?.id, noteId, req.user?.id], (err, note) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!note) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    res.json({
      id: note.id,
      title: note.title,
      content: note.content,
      type: note.type,
      workspaceId: note.workspace_id,
      authorId: note.author_id,
      authorName: note.author_name,
      authorAvatar: note.author_avatar,
      position: { x: note.position_x, y: note.position_y },
      size: { width: note.width, height: note.height },
      color: note.color,
      tags: note.tags ? JSON.parse(note.tags) : [],
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      isPublic: note.is_public,
      userRole: note.user_role
    });
  });
});

// Create new note
router.post('/', authenticateToken, [
  body('title').isLength({ min: 1 }).trim().escape(),
  body('content').optional().trim(),
  body('type').optional().isIn(['text', 'rich', 'code', 'canvas']),
  body('workspaceId').isUUID(),
  body('position.x').optional().isNumeric(),
  body('position.y').optional().isNumeric(),
  body('size.width').optional().isNumeric(),
  body('size.height').optional().isNumeric(),
  body('color').matches(/^#[0-9A-F]{6}$/i),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    content = '',
    type = 'text',
    workspaceId,
    position = { x: 0, y: 0 },
    size = { width: 300, height: 200 },
    color,
    tags = [],
    isPublic = false
  } = req.body;

  // Check if user has access to workspace
  db.get(`
    SELECT wm.role FROM workspace_members wm
    WHERE wm.workspace_id = ? AND wm.user_id = ?
  `, [workspaceId, req.user.id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!member) {
      return res.status(403).json({ error: 'Access denied to workspace' });
    }

    const noteId = uuidv4();

    db.run(`
      INSERT INTO notes (
        id, title, content, type, workspace_id, author_id,
        position_x, position_y, width, height, color, tags, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      noteId, title, content, type, workspaceId, req.user.id,
      position.x, position.y, size.width, size.height, color,
      JSON.stringify(tags), isPublic
    ], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create note' });
      }

      res.status(201).json({
        id: noteId,
        title,
        content,
        type,
        workspaceId,
        authorId: req.user.id,
        position,
        size,
        color,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic
      });
    });
  });
});

// Update note
router.put('/:id', authenticateToken, [
  body('title').optional().isLength({ min: 1 }).trim().escape(),
  body('content').optional().trim(),
  body('type').optional().isIn(['text', 'rich', 'code', 'canvas']),
  body('position.x').optional().isNumeric(),
  body('position.y').optional().isNumeric(),
  body('size.width').optional().isNumeric(),
  body('size.height').optional().isNumeric(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const noteId = req.params.id;
  const { title, content, type, position, size, color, tags, isPublic } = req.body;

  // Check if user can edit this note
  const accessQuery = `
    SELECT n.author_id, wm.role
    FROM notes n
    JOIN workspace_members wm ON n.workspace_id = wm.workspace_id
    WHERE n.id = ? AND wm.user_id = ?
  `;

  db.get(accessQuery, [noteId, req.user.id], (err, access) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only author or workspace admin/owner can edit
    if (access.author_id !== req.user.id && !['owner', 'admin'].includes(access.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }

    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }

    if (position !== undefined) {
      updates.push('position_x = ?', 'position_y = ?');
      values.push(position.x, position.y);
    }

    if (size !== undefined) {
      updates.push('width = ?', 'height = ?');
      values.push(size.width, size.height);
    }

    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(tags));
    }

    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      values.push(isPublic);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(noteId);

    db.run(`
      UPDATE notes 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, values, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update note' });
      }

      // Get updated note
      const query = `
        SELECT n.*, u.display_name as author_name, u.avatar as author_avatar
        FROM notes n
        JOIN users u ON n.author_id = u.id
        WHERE n.id = ?
      `;

      db.get(query, [noteId], (err, note) => {
        if (err || !note) {
          return res.status(500).json({ error: 'Failed to fetch updated note' });
        }

        res.json({
          id: note.id,
          title: note.title,
          content: note.content,
          type: note.type,
          workspaceId: note.workspace_id,
          authorId: note.author_id,
          authorName: note.author_name,
          authorAvatar: note.author_avatar,
          position: { x: note.position_x, y: note.position_y },
          size: { width: note.width, height: note.height },
          color: note.color,
          tags: note.tags ? JSON.parse(note.tags) : [],
          createdAt: note.created_at,
          updatedAt: note.updated_at,
          isPublic: note.is_public
        });
      });
    });
  });
});

// Delete note
router.delete('/:id', authenticateToken, (req, res) => {
  const noteId = req.params.id;

  // Check if user can delete this note
  const accessQuery = `
    SELECT n.author_id, wm.role
    FROM notes n
    JOIN workspace_members wm ON n.workspace_id = wm.workspace_id
    WHERE n.id = ? AND wm.user_id = ?
  `;

  db.get(accessQuery, [noteId, req.user.id], (err, access) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only author or workspace admin/owner can delete
    if (access.author_id !== req.user.id && !['owner', 'admin'].includes(access.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    db.run('DELETE FROM notes WHERE id = ?', [noteId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete note' });
      }

      res.json({ success: true, message: 'Note deleted successfully' });
    });
  });
});

export default router;