# NoteVault - Full Stack Application

This branch contains a fully functional backend for the NoteVault application, integrated with the existing Svelte frontend.

## Features

### Backend Features
- **Authentication**: JWT-based authentication with user registration and login
- **Database**: SQLite database with proper schema and relationships
- **API Routes**: RESTful API for all application features
- **Real-time Chat**: Socket.IO integration for real-time messaging
- **File Upload**: Multer-based file upload with proper access control
- **Admin Panel**: Admin-only routes for user and system management
- **Security**: Helmet, CORS, rate limiting, and input validation

### Frontend Integration
- **API Client**: Centralized API client for all backend communication
- **Real-time Updates**: Socket.IO integration for live chat and notifications
- **Authentication Flow**: Complete login/logout with token management
- **Error Handling**: Proper error handling and user feedback

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 2. Initialize Database

```bash
npm run init:backend
```

This creates the SQLite database and adds default users:
- **Admin**: admin@notevault.com / admin123
- **Demo User**: demo@notevault.com / demo123

### 3. Start the Application

```bash
# Start both backend and frontend
npm run dev:full
```

Or start them separately:

```bash
# Terminal 1 - Backend (port 3001)
npm run dev:backend

# Terminal 2 - Frontend (port 50063)
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:50063
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `PUT /api/auth/profile` - Update user profile

### Workspaces
- `GET /api/workspaces` - Get user workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `POST /api/workspaces` - Create workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/members` - Add member
- `DELETE /api/workspaces/:id/members/:userId` - Remove member

### Notes
- `GET /api/notes/workspace/:workspaceId` - Get workspace notes
- `GET /api/notes/:id` - Get single note
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Chat
- `GET /api/chat/messages` - Get chat messages
- `POST /api/chat/messages` - Send message
- `PUT /api/chat/messages/:id` - Edit message
- `DELETE /api/chat/messages/:id` - Delete message
- `POST /api/chat/messages/:id/reactions` - Add reaction
- `DELETE /api/chat/messages/:id/reactions/:emoji` - Remove reaction

### Files
- `GET /api/files` - Get files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Get file info
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### Admin (Admin only)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/workspaces` - Get all workspaces
- `DELETE /api/admin/workspaces/:id` - Delete workspace
- `GET /api/admin/announcements` - Get announcements
- `POST /api/admin/announcements` - Create announcement
- `PUT /api/admin/announcements/:id` - Update announcement
- `DELETE /api/admin/announcements/:id` - Delete announcement
- `GET /api/admin/audit-logs` - Get audit logs

## Database Schema

The application uses SQLite with the following main tables:

- **users** - User accounts and profiles
- **workspaces** - Workspace information
- **workspace_members** - Workspace membership
- **notes** - Notes and their content
- **chat_messages** - Chat messages
- **message_reactions** - Message reactions
- **files** - File uploads
- **announcements** - System announcements
- **audit_logs** - System audit trail

## Real-time Features

The application includes Socket.IO for real-time features:

- **Live Chat**: Real-time messaging with typing indicators
- **User Presence**: Online/offline status
- **Note Collaboration**: Real-time note updates (foundation)
- **Notifications**: Real-time system notifications

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: express-validator for API input validation
- **Rate Limiting**: Protection against abuse
- **CORS**: Proper cross-origin resource sharing
- **Helmet**: Security headers
- **SQL Injection Protection**: Parameterized queries

## Environment Configuration

Backend environment variables (server/.env):

```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_PATH=./database/notevault.db
UPLOAD_DIR=./uploads
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:50063,http://localhost:56770
```

## Development

### Backend Development

```bash
cd server
npm run dev  # Start with nodemon for auto-reload
```

### Frontend Development

```bash
npm run dev  # Start Svelte dev server
```

### Database Management

```bash
# Reinitialize database (WARNING: This will delete all data)
npm run init:backend
```

## Production Deployment

1. Set proper environment variables
2. Change JWT_SECRET to a secure random string
3. Configure proper CORS origins
4. Set NODE_ENV=production
5. Use a production database (PostgreSQL/MySQL recommended)
6. Set up proper file storage (AWS S3, etc.)
7. Configure reverse proxy (nginx)
8. Set up SSL certificates

## Testing

The application includes demo data and users for testing:

- **Admin User**: Full system access
- **Demo User**: Regular user access
- **Sample Workspaces**: Pre-created workspaces with notes
- **Chat Messages**: Sample chat history

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3001 and 50063 are available
2. **Database errors**: Delete `server/database/notevault.db` and run `npm run init:backend`
3. **CORS errors**: Check that backend is running on port 3001
4. **Socket.IO connection**: Ensure both frontend and backend are running

### Logs

- Backend logs are displayed in the terminal
- Frontend logs are in the browser console
- Check network tab for API request/response details

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Update API documentation
5. Test with both demo users
6. Ensure real-time features work properly

## License

This project is for demonstration purposes.