import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get system stats
router.get('/stats', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as totalUsers FROM users',
    'SELECT COUNT(*) as activeUsers FROM users WHERE is_online = TRUE',
    'SELECT COUNT(*) as totalWorkspaces FROM workspaces',
    'SELECT COUNT(*) as totalNotes FROM notes',
    'SELECT COUNT(*) as totalFiles FROM files',
    'SELECT COALESCE(SUM(size), 0) as storageUsed FROM files'
  ];

  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.get(query, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    })
  )).then(results => {
    res.json({
      totalUsers: results[0].totalUsers,
      activeUsers: results[1].activeUsers,
      totalWorkspaces: results[2].totalWorkspaces,
      totalNotes: results[3].totalNotes,
      totalFiles: results[4].totalFiles,
      storageUsed: results[5].storageUsed,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user
    });
  }).catch(err => {
    res.status(500).json({ error: 'Failed to fetch stats' });
  });
});

// Get all users
router.get('/users', (req, res) => {
  const { limit = 50, offset = 0, search } = req.query;

  let query = 'SELECT id, username, email, display_name, avatar, role, created_at, last_active, is_online FROM users';
  const params = [];

  if (search) {
    query += ' WHERE username LIKE ? OR email LIKE ? OR display_name LIKE ?';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.created_at,
      lastActive: user.last_active,
      isOnline: user.is_online
    })));
  });
});

// Update user role
router.put('/users/:id/role', [
  body('role').isIn(['admin', 'moderator', 'user'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.params.id;
  const { role } = req.body;

  // Don't allow changing own role
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User role updated successfully' });
  });
});

// Delete user
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  // Don't allow deleting own account
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  });
});

// Invite user
router.post('/invite', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'moderator', 'user']).withMessage('Valid role is required'),
  body('message').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, role, message } = req.body;
  const inviterId = req.user.id;
  const inviteToken = uuidv4();

  try {
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if invitation already exists
    const existingInvite = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM user_invitations WHERE email = ? AND status = "pending"', [email], (err, invite) => {
        if (err) reject(err);
        else resolve(invite);
      });
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already sent to this email' });
    }

    // Create invitation record
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO user_invitations (id, email, role, token, inviter_id, message, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `, [
        uuidv4(),
        email,
        role,
        inviteToken,
        inviterId,
        message || null,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
        new Date().toISOString()
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    // Get inviter name for email
    const inviter = await new Promise((resolve, reject) => {
      db.get('SELECT display_name, email FROM users WHERE id = ?', [inviterId], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });

    // Send invitation email (you would implement this with your email service)
    try {
      // This would be implemented with your email service
      // await emailService.sendUserInvitation(email, inviter.display_name, inviteToken, role, message);
      console.log(`Invitation email would be sent to ${email} with token ${inviteToken}`);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        email,
        role,
        token: inviteToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Invitation error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Get pending invitations
router.get('/invitations', (req, res) => {
  const query = `
    SELECT 
      ui.*,
      u.display_name as inviter_name,
      u.email as inviter_email
    FROM user_invitations ui
    LEFT JOIN users u ON ui.inviter_id = u.id
    WHERE ui.status = 'pending' AND ui.expires_at > ?
    ORDER BY ui.created_at DESC
  `;

  db.all(query, [new Date().toISOString()], (err, invitations) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      message: inv.message,
      inviterName: inv.inviter_name,
      inviterEmail: inv.inviter_email,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at
    })));
  });
});

// Cancel invitation
router.delete('/invitations/:id', (req, res) => {
  const invitationId = req.params.id;

  db.run('UPDATE user_invitations SET status = "cancelled" WHERE id = ? AND status = "pending"', [invitationId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to cancel invitation' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }

    res.json({ success: true, message: 'Invitation cancelled successfully' });
  });
});

// Get all workspaces
router.get('/workspaces', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  // First get workspaces with their owners and member counts
  const query = `
    SELECT w.*, 
           u.id as owner_user_id, u.username as owner_username, u.display_name as owner_display_name, u.avatar as owner_avatar,
           COUNT(wm.user_id) as member_count
    FROM workspaces w
    JOIN users u ON w.owner_id = u.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    GROUP BY w.id, u.id, u.username, u.display_name, u.avatar
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [parseInt(limit), parseInt(offset)], (err, workspaces) => {
    if (err) {
      console.error('Database error loading workspaces:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get note and file counts for each workspace
    const workspacePromises = workspaces.map(workspace => {
      return new Promise((resolve) => {
        const countQueries = `
          SELECT 
            (SELECT COUNT(*) FROM notes WHERE workspace_id = ?) as note_count,
            (SELECT COUNT(*) FROM files WHERE workspace_id = ?) as file_count
        `;
        
        db.get(countQueries, [workspace.id, workspace.id], (err, counts) => {
          resolve({
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            color: workspace.color,
            ownerId: workspace.owner_id,
            owner: {
              id: workspace.owner_user_id,
              username: workspace.owner_username,
              displayName: workspace.owner_display_name,
              avatar: workspace.owner_avatar
            },
            memberCount: workspace.member_count || 0,
            noteCount: counts?.note_count || 0,
            fileCount: counts?.file_count || 0,
            createdAt: workspace.created_at,
            updatedAt: workspace.updated_at,
            isPublic: workspace.is_public
          });
        });
      });
    });

    Promise.all(workspacePromises).then(formattedWorkspaces => {
      res.json(formattedWorkspaces);
    });
  });
});

// Delete workspace
router.delete('/workspaces/:id', (req, res) => {
  const workspaceId = req.params.id;

  db.run('DELETE FROM workspaces WHERE id = ?', [workspaceId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete workspace' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json({ success: true, message: 'Workspace deleted successfully' });
  });
});

// Get announcements
router.get('/announcements', (req, res) => {
  const query = `
    SELECT a.*, u.display_name as author_name, u.avatar as author_avatar
    FROM announcements a
    JOIN users u ON a.author_id = u.id
    ORDER BY a.created_at DESC
  `;

  db.all(query, (err, announcements) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      authorId: announcement.author_id,
      author: {
        id: announcement.author_id,
        displayName: announcement.author_name,
        avatar: announcement.author_avatar
      },
      priority: announcement.priority,
      createdAt: announcement.created_at,
      expiresAt: announcement.expires_at,
      isActive: announcement.is_active
    })));
  });
});

// Create announcement
router.post('/announcements', [
  body('title').isLength({ min: 1 }).trim().escape(),
  body('content').isLength({ min: 1 }).trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('expiresAt').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, priority = 'medium', expiresAt } = req.body;
  const announcementId = uuidv4();

  db.run(`
    INSERT INTO announcements (id, title, content, author_id, priority, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [announcementId, title, content, req.user.id, priority, expiresAt], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create announcement' });
    }

    // Send notification to all users about the new announcement
    notificationService.notifyAnnouncementCreated(announcementId, title, content, priority)
      .catch(err => console.error('Failed to send announcement notifications:', err));

    res.status(201).json({
      id: announcementId,
      title,
      content,
      authorId: req.user.id,
      priority,
      createdAt: new Date().toISOString(),
      expiresAt,
      isActive: true
    });
  });
});

// Update announcement
router.put('/announcements/:id', [
  body('title').optional().isLength({ min: 1 }).trim().escape(),
  body('content').optional().isLength({ min: 1 }).trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('isActive').optional().isBoolean(),
  body('expiresAt').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const announcementId = req.params.id;
  const { title, content, priority, isActive, expiresAt } = req.body;

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

  if (priority !== undefined) {
    updates.push('priority = ?');
    values.push(priority);
  }

  if (isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(isActive);
  }

  if (expiresAt !== undefined) {
    updates.push('expires_at = ?');
    values.push(expiresAt);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(announcementId);

  db.run(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update announcement' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement updated successfully' });
  });
});

// Delete announcement
router.delete('/announcements/:id', (req, res) => {
  const announcementId = req.params.id;

  db.run('DELETE FROM announcements WHERE id = ?', [announcementId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete announcement' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted successfully' });
  });
});

// Get audit logs
router.get('/audit-logs', (req, res) => {
  const { limit = 100, offset = 0, action, userId } = req.query;

  let query = `
    SELECT al.*, u.display_name as user_name, u.avatar as user_avatar
    FROM audit_logs al
    JOIN users u ON al.user_id = u.id
  `;
  
  const params = [];
  const conditions = [];

  if (action) {
    conditions.push('al.action = ?');
    params.push(action);
  }

  if (userId) {
    conditions.push('al.user_id = ?');
    params.push(userId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(logs.map(log => ({
      id: log.id,
      action: log.action,
      userId: log.user_id,
      user: {
        id: log.user_id,
        displayName: log.user_name,
        avatar: log.user_avatar
      },
      targetType: log.target_type,
      targetId: log.target_id,
      details: log.details ? JSON.parse(log.details) : {},
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      createdAt: log.created_at
    })));
  });
});

// Create demo data (for testing and development)
router.post('/create-demo-data', (req, res) => {
  // Check if demo data already exists
  db.get('SELECT COUNT(*) as count FROM workspaces', (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Demo data already exists. Use reset-demo-data to recreate.' });
    }
    
    // Get demo user ID
    db.get('SELECT id FROM users WHERE username = ?', ['demo'], (err, demoUser) => {
      if (err || !demoUser) {
        return res.status(500).json({ error: 'Demo user not found' });
      }
      
      const demoWorkspaceId = uuidv4();
      const demoWorkspaceMemberId = uuidv4();
      
      // Create demo workspace
      db.run(`
        INSERT INTO workspaces (id, name, description, color, owner_id, is_public)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [demoWorkspaceId, 'Welcome to NoteVault', 'Your first workspace for getting started with collaborative notes', '#3b82f6', demoUser.id, true], function(err) {
        if (err) {
          console.error('Error creating demo workspace:', err);
          return res.status(500).json({ error: 'Failed to create demo workspace' });
        }
        
        // Add demo user as owner of the workspace
        db.run(`
          INSERT INTO workspace_members (id, workspace_id, user_id, role)
          VALUES (?, ?, ?, ?)
        `, [demoWorkspaceMemberId, demoWorkspaceId, demoUser.id, 'owner'], function(err) {
          if (err) {
            console.error('Error adding demo user to workspace:', err);
            return res.status(500).json({ error: 'Failed to add demo user to workspace' });
          }
          
          // Create demo notes
          const note1Id = uuidv4();
          const note2Id = uuidv4();
          const note3Id = uuidv4();
          
          const notes = [
            [note1Id, 'Welcome Note', 'Welcome to NoteVault! This is your first note. You can drag it around, edit it, and create more notes by clicking the + button.', 'text', demoWorkspaceId, demoUser.id, 100, 100, 300, 200, '#fbbf24', true],
            [note2Id, 'Getting Started', 'Here are some tips:\\n• Click on any note to edit it\\n• Drag notes to move them around\\n• Use the Collections sidebar to organize notes\\n• Invite team members to collaborate', 'text', demoWorkspaceId, demoUser.id, 450, 150, 320, 220, '#10b981', true],
            [note3Id, 'Code Example', '// Here\'s a JavaScript code example\\nfunction greetUser(name) {\\n  return `Hello, ${name}! Welcome to NoteVault.`;\\n}\\n\\nconst message = greetUser("Developer");\\nconsole.log(message);', 'code', demoWorkspaceId, demoUser.id, 200, 350, 350, 250, '#8b5cf6', true]
          ];
          
          let notesCreated = 0;
          const totalNotes = notes.length;
          
          notes.forEach(([id, title, content, type, workspaceId, authorId, x, y, width, height, color, isPublic]) => {
            db.run(`
              INSERT INTO notes (id, title, content, type, workspace_id, author_id, position_x, position_y, width, height, color, is_public)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [id, title, content, type, workspaceId, authorId, x, y, width, height, color, isPublic], function(err) {
              if (err) {
                console.error(`Error creating demo note ${id}:`, err);
              } else {
                console.log(`Demo note ${title} created`);
              }
              
              notesCreated++;
              if (notesCreated === totalNotes) {
                res.json({
                  success: true,
                  message: 'Demo data created successfully',
                  workspace: {
                    id: demoWorkspaceId,
                    name: 'Welcome to NoteVault',
                    notesCreated: totalNotes
                  }
                });
              }
            });
          });
        });
      });
    });
  });
});

export default router;