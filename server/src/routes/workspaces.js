import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Get all workspaces for current user
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT w.*, 
           COUNT(wm.user_id) as member_count,
           wm.role as user_role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    LEFT JOIN workspace_members user_member ON w.id = user_member.workspace_id AND user_member.user_id = ?
    WHERE w.is_public = TRUE OR user_member.user_id = ?
    GROUP BY w.id, wm.role
    ORDER BY w.updated_at DESC
  `;

  db.all(query, [req.user.id, req.user.id], (err, workspaces) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    const formattedWorkspaces = workspaces.map(workspace => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      color: workspace.color,
      ownerId: workspace.owner_id,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
      isPublic: workspace.is_public,
      memberCount: workspace.member_count,
      userRole: workspace.user_role
    }));

    res.json(formattedWorkspaces);
  });
});

// Get workspace by ID
router.get('/:id', optionalAuth, (req, res) => {
  const workspaceId = req.params.id;

  // First check if workspace exists and if user has access
  const accessQuery = `
    SELECT w.*, 
           wm.role as user_role,
           u.display_name as owner_name
    FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
    LEFT JOIN users u ON w.owner_id = u.id
    WHERE w.id = ? AND (w.is_public = TRUE OR wm.user_id = ?)
  `;

  db.get(accessQuery, [req.user?.id, workspaceId, req.user?.id], (err, workspace) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }

    // Get workspace members
    const membersQuery = `
      SELECT wm.*, u.display_name, u.avatar, u.username
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ?
      ORDER BY wm.joined_at ASC
    `;

    db.all(membersQuery, [workspaceId], (err, members) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const formattedMembers = members.map(member => ({
        userId: member.user_id,
        role: member.role,
        joinedAt: member.joined_at,
        displayName: member.display_name,
        avatar: member.avatar,
        username: member.username
      }));

      res.json({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        color: workspace.color,
        ownerId: workspace.owner_id,
        ownerName: workspace.owner_name,
        createdAt: workspace.created_at,
        updatedAt: workspace.updated_at,
        isPublic: workspace.is_public,
        userRole: workspace.user_role,
        members: formattedMembers
      });
    });
  });
});

// Create new workspace
router.post('/', authenticateToken, [
  body('name').isLength({ min: 1 }).trim().escape(),
  body('description').optional().trim().escape(),
  body('color').matches(/^#[0-9A-F]{6}$/i),
  body('isPublic').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, color, isPublic = false } = req.body;
  const workspaceId = uuidv4();
  const memberId = uuidv4();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Create workspace
    db.run(`
      INSERT INTO workspaces (id, name, description, color, owner_id, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [workspaceId, name, description, color, req.user.id, isPublic], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to create workspace' });
      }

      // Add owner as member
      db.run(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role)
        VALUES (?, ?, ?, ?)
      `, [memberId, workspaceId, req.user.id, 'owner'], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to add owner as member' });
        }

        db.run('COMMIT');

        // Create notification for workspace creation
        notificationService.notifyWorkspaceCreated(req.user.id, name, workspaceId)
          .catch(err => console.error('Failed to create workspace notification:', err));

        res.status(201).json({
          id: workspaceId,
          name,
          description,
          color,
          ownerId: req.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublic,
          members: [{
            userId: req.user.id,
            role: 'owner',
            joinedAt: new Date().toISOString()
          }]
        });
      });
    });
  });
});

// Update workspace
router.put('/:id', authenticateToken, [
  body('name').optional().isLength({ min: 1 }).trim().escape(),
  body('description').optional().trim().escape(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('isPublic').optional().isBoolean()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const workspaceId = req.params.id;
  const { name, description, color, isPublic } = req.body;

  // Check if user has admin access
  db.get(`
    SELECT wm.role FROM workspace_members wm
    WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.role IN ('owner', 'admin')
  `, [workspaceId, req.user.id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!member) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }

    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      values.push(isPublic);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(workspaceId);

    db.run(`
      UPDATE workspaces 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, values, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update workspace' });
      }

      // Get updated workspace
      db.get('SELECT * FROM workspaces WHERE id = ?', [workspaceId], (err, workspace) => {
        if (err || !workspace) {
          return res.status(500).json({ error: 'Failed to fetch updated workspace' });
        }

        res.json({
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          color: workspace.color,
          ownerId: workspace.owner_id,
          createdAt: workspace.created_at,
          updatedAt: workspace.updated_at,
          isPublic: workspace.is_public
        });
      });
    });
  });
});

// Delete workspace
router.delete('/:id', authenticateToken, (req, res) => {
  const workspaceId = req.params.id;

  // Check if user is owner
  db.get(`
    SELECT wm.role FROM workspace_members wm
    WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.role = 'owner'
  `, [workspaceId, req.user.id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!member) {
      return res.status(403).json({ error: 'Only workspace owner can delete workspace' });
    }

    db.run('DELETE FROM workspaces WHERE id = ?', [workspaceId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete workspace' });
      }

      res.json({ success: true, message: 'Workspace deleted successfully' });
    });
  });
});

// Get workspace members
router.get('/:id/members', authenticateToken, (req, res) => {
  const workspaceId = req.params.id;

  // Check if user has access to this workspace
  const accessQuery = `
    SELECT wm.role as user_role
    FROM workspace_members wm
    WHERE wm.workspace_id = ? AND wm.user_id = ?
  `;

  db.get(accessQuery, [workspaceId, req.user.id], (err, access) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!access) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }

    // Get workspace members
    const membersQuery = `
      SELECT wm.*, u.display_name, u.avatar, u.username, u.email
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ?
      ORDER BY wm.role, wm.joined_at ASC
    `;

    db.all(membersQuery, [workspaceId], (err, members) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const formattedMembers = members.map(member => ({
        userId: member.user_id,
        username: member.username,
        displayName: member.display_name,
        email: member.email,
        avatar: member.avatar,
        role: member.role,
        joinedAt: member.joined_at
      }));

      res.json(formattedMembers);
    });
  });
});

// Add member to workspace
router.post('/:id/members', authenticateToken, [
  body('userId').isUUID(),
  body('role').optional().isIn(['admin', 'member', 'viewer'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const workspaceId = req.params.id;
  const { userId, role = 'member' } = req.body;

  // Check if user has admin access
  db.get(`
    SELECT wm.role FROM workspace_members wm
    WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.role IN ('owner', 'admin')
  `, [workspaceId, req.user.id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!member) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if user exists
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const memberId = uuidv4();

      db.run(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role)
        VALUES (?, ?, ?, ?)
      `, [memberId, workspaceId, userId, role], function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'User is already a member of this workspace' });
          }
          return res.status(500).json({ error: 'Failed to add member' });
        }

        res.status(201).json({
          success: true,
          message: 'Member added successfully'
        });
      });
    });
  });
});

// Remove member from workspace
router.delete('/:id/members/:userId', authenticateToken, (req, res) => {
  const workspaceId = req.params.id;
  const userId = req.params.userId;

  // Check if user has admin access or is removing themselves
  db.get(`
    SELECT wm.role FROM workspace_members wm
    WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.role IN ('owner', 'admin')
  `, [workspaceId, req.user.id], (err, member) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!member && req.user.id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Don't allow removing the owner
    db.get(`
      SELECT role FROM workspace_members 
      WHERE workspace_id = ? AND user_id = ? AND role = 'owner'
    `, [workspaceId, userId], (err, ownerMember) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (ownerMember) {
        return res.status(400).json({ error: 'Cannot remove workspace owner' });
      }

      db.run(`
        DELETE FROM workspace_members 
        WHERE workspace_id = ? AND user_id = ?
      `, [workspaceId, userId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to remove member' });
        }

        res.json({ success: true, message: 'Member removed successfully' });
      });
    });
  });
});

export default router;