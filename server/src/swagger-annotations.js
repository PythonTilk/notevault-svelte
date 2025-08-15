/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and session management
 *   - name: Users
 *     description: User management and profiles
 *   - name: Workspaces
 *     description: Workspace management and collaboration
 *   - name: Notes
 *     description: Note creation and management
 *   - name: Chat
 *     description: Real-time messaging and communication
 *   - name: Files
 *     description: File upload and management
 *   - name: Admin
 *     description: Administrative functions (admin only)
 *   - name: Analytics
 *     description: Usage analytics and monitoring (admin only)
 *   - name: Backup
 *     description: Backup and restore operations (admin only)
 *   - name: GDPR
 *     description: GDPR compliance and data export
 *   - name: System
 *     description: System health and monitoring
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     description: Create a new user account with email verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - displayName
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 example: 'john_doe'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'john@example.com'
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: 'Must contain uppercase, lowercase, number, and special character'
 *                 example: 'SecurePass123!'
 *               displayName:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'John Doe'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Registration successful. Please check your email to verify your account.'
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user with username/password and optional 2FA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: 'john_doe'
 *               password:
 *                 type: string
 *                 example: 'SecurePass123!'
 *               twoFactorCode:
 *                 type: string
 *                 description: '6-digit TOTP code or backup code (if 2FA enabled)'
 *                 example: '123456'
 *     responses:
 *       200:
 *         description: Login successful or 2FA required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 'Login successful'
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     requiresTwoFactor:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: 'Two-factor authentication required'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: End user session and clear authentication cookies
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Logout successful'
 */

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     tags: [Authentication]
 *     summary: Setup two-factor authentication
 *     description: Generate 2FA secret and QR code for authenticator app setup
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 *                   description: 'Base64 QR code image'
 *                 manualEntryKey:
 *                   type: string
 *                   description: 'Manual entry key for authenticator apps'
 *                   example: 'JBSWY3DPEHPK3PXP'
 *                 backupCodes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: 'Emergency backup codes'
 *                   example: ['A1B2-C3D4', 'E5F6-G7H8']
 *       400:
 *         description: 2FA already enabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get user's workspaces
 *     description: Retrieve all workspaces the user has access to
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/OffsetParam'
 *     responses:
 *       200:
 *         description: List of workspaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 limit:
 *                   type: integer
 *                   example: 50
 *                 offset:
 *                   type: integer
 *                   example: 0
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     tags: [Workspaces]
 *     summary: Create a new workspace
 *     description: Create a new collaborative workspace
 *     security:
 *       - sessionAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - color
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: 'My Project'
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: 'A collaborative workspace for our team project'
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 example: '#3B82F6'
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   get:
 *     tags: [Workspaces]
 *     summary: Get workspace details
 *     description: Retrieve detailed information about a specific workspace
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceIdParam'
 *     responses:
 *       200:
 *         description: Workspace details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     tags: [Workspaces]
 *     summary: Update workspace
 *     description: Update workspace details (owner/admin only)
 *     security:
 *       - sessionAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workspace'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     tags: [Workspaces]
 *     summary: Delete workspace
 *     description: Delete a workspace and all its contents (owner only)
 *     security:
 *       - sessionAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/WorkspaceIdParam'
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Workspace deleted successfully'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/notes:
 *   get:
 *     tags: [Notes]
 *     summary: Get user's notes
 *     description: Retrieve notes with filtering and pagination
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: workspaceId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by workspace ID
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search in note title and content
 *       - name: tags
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/OffsetParam'
 *     responses:
 *       200:
 *         description: List of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Note'
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     tags: [Notes]
 *     summary: Create a new note
 *     description: Create a new note in a workspace
 *     security:
 *       - sessionAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - workspaceId
 *               - color
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: 'Meeting Notes'
 *               content:
 *                 type: string
 *                 example: 'Discussion about project timeline...'
 *               type:
 *                 type: string
 *                 enum: ['text', 'rich', 'code', 'canvas']
 *                 default: 'text'
 *               workspaceId:
 *                 type: string
 *                 example: 'workspace-123456789'
 *               position:
 *                 type: object
 *                 properties:
 *                   x:
 *                     type: number
 *                     default: 0
 *                   y:
 *                     type: number
 *                     default: 0
 *               size:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: number
 *                     default: 300
 *                   height:
 *                     type: number
 *                     default: 200
 *               color:
 *                 type: string
 *                 example: '#FEF3C7'
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['meeting', 'important']
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Note'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get analytics dashboard data
 *     description: Retrieve comprehensive analytics data for admin dashboard (admin only)
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TimeRangeParam'
 *       - name: filters
 *         in: query
 *         schema:
 *           type: string
 *         description: 'JSON string of additional filters'
 *         example: '{"includeInactive": false}'
 *     responses:
 *       200:
 *         description: Analytics dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AnalyticsData'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/analytics/health:
 *   get:
 *     tags: [Analytics]
 *     summary: Get system health status
 *     description: Retrieve current system health and active alerts (admin only)
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: ['healthy', 'warning', 'critical']
 *                           example: 'healthy'
 *                         message:
 *                           type: string
 *                           example: 'All systems operational'
 *                         uptime:
 *                           type: number
 *                           example: 86400
 *                         memory:
 *                           type: object
 *                           properties:
 *                             used:
 *                               type: number
 *                             percentage:
 *                               type: number
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           level:
 *                             type: string
 *                             enum: ['info', 'warning', 'critical']
 *                           message:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/files:
 *   post:
 *     tags: [Files]
 *     summary: Upload a file
 *     description: Upload a file to the system with optional workspace association
 *     security:
 *       - sessionAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 'File to upload (max 10MB)'
 *               workspaceId:
 *                 type: string
 *                 description: 'Optional workspace ID to associate file with'
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: 'Whether file should be publicly accessible'
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/File'
 *       400:
 *         description: Invalid file or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check endpoint
 *     description: Check if the API is running and get basic system information
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'ok'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: 'Server uptime in seconds'
 *                   example: 86400
 *                 environment:
 *                   type: string
 *                   example: 'development'
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: boolean
 *                       example: true
 *                     email:
 *                       type: boolean
 *                       example: true
 *                     storage:
 *                       type: string
 *                       example: 'local'
 *                     oauth:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ['google', 'github']
 */