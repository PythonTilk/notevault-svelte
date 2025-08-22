# API Reference

The NoteVault API provides programmatic access to all platform features through a RESTful interface with real-time WebSocket connections for live collaboration.

## 📋 API Overview

### Base Information

- **Base URL**: `https://your-domain.com/api`
- **Version**: v1
- **Protocol**: HTTPS (HTTP/2 supported)
- **Authentication**: JWT Bearer tokens
- **Content Type**: `application/json`
- **Rate Limiting**: 100 requests per 15 minutes per user

### API Principles

- **RESTful Design**: Standard HTTP methods and status codes
- **Consistent Responses**: Standardized response formats
- **Comprehensive Errors**: Detailed error messages with codes
- **Pagination**: Cursor-based pagination for large datasets
- **Filtering**: Query parameters for filtering and sorting
- **Real-time**: WebSocket integration for live updates

## 🔐 Authentication

### JWT Bearer Token Authentication

All API requests require authentication using JWT Bearer tokens in the Authorization header.

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authentication Flow

#### 1. User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email for verification.",
  "userId": "uuid-user-id"
}
```

#### 2. Email Verification

```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "email-verification-token"
}
```

#### 3. User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-here",
  "expiresIn": 86400,
  "user": {
    "id": "uuid-user-id",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "emailVerified": true,
    "createdAt": "2025-08-15T10:00:00Z"
  }
}
```

#### 4. Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token-here"
}
```

#### 5. Logout

```http
POST /api/auth/logout
Authorization: Bearer {access-token}
```

### Error Responses

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "timestamp": "2025-08-15T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

## 👤 User Management

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "uuid-user-id",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "emailVerified": true,
  "preferences": {
    "theme": "light",
    "notifications": {
      "email": true,
      "push": true,
      "mentions": true
    }
  },
  "createdAt": "2025-08-15T10:00:00Z",
  "updatedAt": "2025-08-15T12:00:00Z"
}
```

### Update User Profile

```http
PUT /api/auth/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "displayName": "John Smith",
  "preferences": {
    "theme": "dark",
    "notifications": {
      "email": false,
      "push": true,
      "mentions": true
    }
  }
}
```

### Upload Avatar

```http
POST /api/auth/me/avatar
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "avatar": <file>
}
```

## 🏢 Workspaces

### List User Workspaces

```http
GET /api/workspaces
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of workspaces to return (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `sort` (optional): Sort order (`name`, `updated`, `created`)
- `filter` (optional): Filter by role (`owner`, `admin`, `member`, `viewer`)

**Response:**
```json
{
  "workspaces": [
    {
      "id": "uuid-workspace-id",
      "name": "Project Apollo",
      "description": "Mission planning workspace",
      "icon": "🚀",
      "color": "#3b82f6",
      "privacy": "private",
      "role": "owner",
      "memberCount": 5,
      "notesCount": 23,
      "filesCount": 12,
      "createdAt": "2025-08-15T10:00:00Z",
      "updatedAt": "2025-08-15T14:30:00Z",
      "lastActivity": "2025-08-15T14:30:00Z"
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null,
    "total": 1
  }
}
```

### Create Workspace

```http
POST /api/workspaces
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Project",
  "description": "A new collaborative workspace",
  "icon": "📝",
  "color": "#10b981",
  "privacy": "private"
}
```

**Response:**
```json
{
  "id": "uuid-workspace-id",
  "name": "New Project",
  "description": "A new collaborative workspace",
  "icon": "📝",
  "color": "#10b981",
  "privacy": "private",
  "role": "owner",
  "memberCount": 1,
  "createdAt": "2025-08-15T15:00:00Z",
  "updatedAt": "2025-08-15T15:00:00Z"
}
```

### Get Workspace Details

```http
GET /api/workspaces/{workspaceId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "uuid-workspace-id",
  "name": "Project Apollo",
  "description": "Mission planning workspace",
  "icon": "🚀",
  "color": "#3b82f6",
  "privacy": "private",
  "role": "owner",
  "owner": {
    "id": "uuid-user-id",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "members": [
    {
      "id": "uuid-user-id",
      "displayName": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "owner",
      "joinedAt": "2025-08-15T10:00:00Z",
      "lastActive": "2025-08-15T14:30:00Z",
      "isOnline": true
    }
  ],
  "settings": {
    "allowGuestAccess": false,
    "defaultMemberRole": "member",
    "fileUploadLimit": 10485760,
    "allowedFileTypes": ["image/*", "application/pdf", "text/*"]
  },
  "statistics": {
    "notesCount": 23,
    "filesCount": 12,
    "commentsCount": 45,
    "collaborationTime": 1440
  },
  "createdAt": "2025-08-15T10:00:00Z",
  "updatedAt": "2025-08-15T14:30:00Z"
}
```

### Update Workspace

```http
PUT /api/workspaces/{workspaceId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description",
  "icon": "🎯",
  "color": "#ef4444",
  "settings": {
    "allowGuestAccess": true,
    "defaultMemberRole": "viewer"
  }
}
```

### Delete Workspace

```http
DELETE /api/workspaces/{workspaceId}
Authorization: Bearer {token}
```

## 👥 Workspace Members

### List Workspace Members

```http
GET /api/workspaces/{workspaceId}/members
Authorization: Bearer {token}
```

**Query Parameters:**
- `role` (optional): Filter by role
- `status` (optional): Filter by online status (`online`, `offline`)
- `limit` (optional): Number of members to return

**Response:**
```json
{
  "members": [
    {
      "id": "uuid-user-id",
      "displayName": "John Doe",
      "email": "john@example.com",
      "avatarUrl": "https://example.com/avatar.jpg",
      "role": "owner",
      "joinedAt": "2025-08-15T10:00:00Z",
      "lastActive": "2025-08-15T14:30:00Z",
      "isOnline": true,
      "permissions": ["*"]
    },
    {
      "id": "uuid-user-id-2",
      "displayName": "Jane Smith",
      "email": "jane@example.com",
      "avatarUrl": "https://example.com/avatar2.jpg",
      "role": "admin",
      "joinedAt": "2025-08-15T11:00:00Z",
      "lastActive": "2025-08-15T14:00:00Z",
      "isOnline": false,
      "permissions": ["workspace:read", "workspace:update", "members:invite"]
    }
  ],
  "pagination": {
    "total": 5,
    "hasMore": false
  }
}
```

### Invite Member

```http
POST /api/workspaces/{workspaceId}/members
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "member",
  "message": "Welcome to our project workspace!"
}
```

**Response:**
```json
{
  "invitationId": "uuid-invitation-id",
  "email": "newmember@example.com",
  "role": "member",
  "invitedBy": "uuid-user-id",
  "expiresAt": "2025-08-22T10:00:00Z",
  "status": "sent"
}
```

### Update Member Role

```http
PUT /api/workspaces/{workspaceId}/members/{userId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "admin"
}
```

### Remove Member

```http
DELETE /api/workspaces/{workspaceId}/members/{userId}
Authorization: Bearer {token}
```

### Generate Share Link

```http
POST /api/workspaces/{workspaceId}/share-links
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "viewer",
  "expiresAt": "2025-08-22T10:00:00Z",
  "maxUses": 10
}
```

**Response:**
```json
{
  "id": "uuid-link-id",
  "url": "https://notevault.com/invite/abc123def456",
  "role": "viewer",
  "expiresAt": "2025-08-22T10:00:00Z",
  "maxUses": 10,
  "currentUses": 0,
  "createdAt": "2025-08-15T15:00:00Z"
}
```

## 📝 Notes

### List Workspace Notes

```http
GET /api/workspaces/{workspaceId}/notes
Authorization: Bearer {token}
```

**Query Parameters:**
- `limit` (optional): Number of notes (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `sort` (optional): Sort order (`updated`, `created`, `title`)
- `tags` (optional): Filter by tags (comma-separated)
- `collection` (optional): Filter by collection ID
- `search` (optional): Search in title and content

**Response:**
```json
{
  "notes": [
    {
      "id": "uuid-note-id",
      "title": "Project Requirements",
      "content": "# Project Requirements\n\nDetailed requirements...",
      "excerpt": "Detailed requirements for the Apollo project...",
      "author": {
        "id": "uuid-user-id",
        "displayName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "collection": {
        "id": "uuid-collection-id",
        "name": "Planning Documents"
      },
      "tags": ["planning", "requirements", "phase-1"],
      "position": { "x": 100, "y": 200 },
      "collaborators": [
        {
          "id": "uuid-user-id-2",
          "displayName": "Jane Smith",
          "isEditing": true,
          "cursor": { "x": 150, "y": 250 }
        }
      ],
      "commentsCount": 3,
      "createdAt": "2025-08-15T10:00:00Z",
      "updatedAt": "2025-08-15T14:30:00Z"
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null,
    "total": 23
  }
}
```

### Create Note

```http
POST /api/workspaces/{workspaceId}/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "New Meeting Notes",
  "content": "# Meeting Notes\n\n## Attendees\n- John\n- Jane",
  "tags": ["meeting", "team"],
  "collectionId": "uuid-collection-id",
  "position": { "x": 300, "y": 400 }
}
```

**Response:**
```json
{
  "id": "uuid-note-id",
  "title": "New Meeting Notes",
  "content": "# Meeting Notes\n\n## Attendees\n- John\n- Jane",
  "author": {
    "id": "uuid-user-id",
    "displayName": "John Doe"
  },
  "tags": ["meeting", "team"],
  "collection": {
    "id": "uuid-collection-id",
    "name": "Meeting Notes"
  },
  "position": { "x": 300, "y": 400 },
  "createdAt": "2025-08-15T15:00:00Z",
  "updatedAt": "2025-08-15T15:00:00Z"
}
```

### Get Note Details

```http
GET /api/notes/{noteId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "uuid-note-id",
  "title": "Project Requirements",
  "content": "# Project Requirements\n\nDetailed requirements...",
  "author": {
    "id": "uuid-user-id",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "workspace": {
    "id": "uuid-workspace-id",
    "name": "Project Apollo"
  },
  "collection": {
    "id": "uuid-collection-id",
    "name": "Planning Documents"
  },
  "tags": ["planning", "requirements", "phase-1"],
  "position": { "x": 100, "y": 200 },
  "version": 5,
  "history": [
    {
      "version": 4,
      "author": "Jane Smith",
      "changes": "Updated requirements section",
      "timestamp": "2025-08-15T13:00:00Z"
    }
  ],
  "comments": [
    {
      "id": "uuid-comment-id",
      "content": "Should we add more details here?",
      "author": {
        "id": "uuid-user-id-2",
        "displayName": "Jane Smith"
      },
      "createdAt": "2025-08-15T12:00:00Z"
    }
  ],
  "createdAt": "2025-08-15T10:00:00Z",
  "updatedAt": "2025-08-15T14:30:00Z"
}
```

### Update Note

```http
PUT /api/notes/{noteId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["planning", "requirements", "phase-1", "updated"],
  "position": { "x": 150, "y": 250 }
}
```

### Delete Note

```http
DELETE /api/notes/{noteId}
Authorization: Bearer {token}
```

### Duplicate Note

```http
POST /api/notes/{noteId}/duplicate
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Copy of Original Note",
  "position": { "x": 200, "y": 300 }
}
```

### Export Note

```http
GET /api/notes/{noteId}/export
Authorization: Bearer {token}
```

**Query Parameters:**
- `format`: Export format (`markdown`, `pdf`, `html`)

## 📁 Files

### List Files

```http
GET /api/files
Authorization: Bearer {token}
```

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace
- `type` (optional): Filter by MIME type
- `limit` (optional): Number of files (default: 20)
- `cursor` (optional): Pagination cursor
- `sort` (optional): Sort order (`name`, `size`, `created`, `updated`)
- `search` (optional): Search in filename

**Response:**
```json
{
  "files": [
    {
      "id": "uuid-file-id",
      "filename": "project-diagram.png",
      "originalName": "Project Workflow Diagram.png",
      "mimeType": "image/png",
      "size": 2048576,
      "url": "https://example.com/files/uuid-file-id",
      "thumbnailUrl": "https://example.com/files/uuid-file-id/thumbnail",
      "workspace": {
        "id": "uuid-workspace-id",
        "name": "Project Apollo"
      },
      "uploader": {
        "id": "uuid-user-id",
        "displayName": "John Doe"
      },
      "metadata": {
        "width": 1920,
        "height": 1080,
        "colorSpace": "sRGB"
      },
      "downloadCount": 5,
      "isShared": true,
      "createdAt": "2025-08-15T10:00:00Z",
      "updatedAt": "2025-08-15T10:00:00Z"
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null,
    "total": 12
  }
}
```

### Upload File

```http
POST /api/files/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
  "file": <file>,
  "workspaceId": "uuid-workspace-id",
  "folderId": "uuid-folder-id" // optional
}
```

**Response:**
```json
{
  "id": "uuid-file-id",
  "filename": "document.pdf",
  "originalName": "Important Document.pdf",
  "mimeType": "application/pdf",
  "size": 1048576,
  "url": "https://example.com/files/uuid-file-id",
  "thumbnailUrl": "https://example.com/files/uuid-file-id/thumbnail",
  "metadata": {
    "pages": 5,
    "title": "Important Document",
    "author": "John Doe"
  },
  "createdAt": "2025-08-15T15:00:00Z"
}
```

### Get File Details

```http
GET /api/files/{fileId}
Authorization: Bearer {token}
```

### Download File

```http
GET /api/files/{fileId}/download
Authorization: Bearer {token}
```

**Response Headers:**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="document.pdf"
Content-Length: 1048576
```

### Delete File

```http
DELETE /api/files/{fileId}
Authorization: Bearer {token}
```

### Share File

```http
POST /api/files/{fileId}/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "permissions": "read", // "read" or "write"
  "expiresAt": "2025-08-22T10:00:00Z",
  "password": "optional-password"
}
```

**Response:**
```json
{
  "shareId": "uuid-share-id",
  "url": "https://notevault.com/share/file/abc123def456",
  "permissions": "read",
  "expiresAt": "2025-08-22T10:00:00Z",
  "protected": true
}
```

## 🔍 Search

### Global Search

```http
GET /api/search
Authorization: Bearer {token}
```

**Query Parameters:**
- `q`: Search query (required)
- `type`: Content type (`notes`, `files`, `workspaces`, `users`)
- `workspace`: Workspace ID to search within
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "query": "project requirements",
  "results": {
    "notes": [
      {
        "id": "uuid-note-id",
        "title": "Project Requirements",
        "excerpt": "Detailed <mark>requirements</mark> for the Apollo <mark>project</mark>...",
        "workspace": {
          "id": "uuid-workspace-id",
          "name": "Project Apollo"
        },
        "highlights": [
          {
            "field": "title",
            "fragment": "<mark>Project</mark> <mark>Requirements</mark>"
          },
          {
            "field": "content",
            "fragment": "...detailed <mark>requirements</mark> for the..."
          }
        ],
        "score": 0.95,
        "updatedAt": "2025-08-15T14:30:00Z"
      }
    ],
    "files": [],
    "workspaces": [],
    "users": []
  },
  "facets": {
    "types": {
      "notes": 5,
      "files": 2,
      "workspaces": 1
    },
    "workspaces": {
      "uuid-workspace-1": 3,
      "uuid-workspace-2": 5
    }
  },
  "pagination": {
    "total": 8,
    "hasMore": false
  },
  "searchTime": 45
}
```

### Save Search

```http
POST /api/search/saved
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Recent Project Updates",
  "query": "project requirements updated",
  "filters": {
    "type": "notes",
    "workspace": "uuid-workspace-id"
  }
}
```

### List Saved Searches

```http
GET /api/search/saved
Authorization: Bearer {token}
```

**Response:**
```json
{
  "searches": [
    {
      "id": "uuid-search-id",
      "name": "Recent Project Updates",
      "query": "project requirements updated",
      "filters": {
        "type": "notes",
        "workspace": "uuid-workspace-id"
      },
      "resultCount": 5,
      "createdAt": "2025-08-15T10:00:00Z",
      "lastUsed": "2025-08-15T14:00:00Z"
    }
  ]
}
```

## 🔔 Notifications

### List Notifications

```http
GET /api/notifications
Authorization: Bearer {token}
```

**Query Parameters:**
- `read`: Filter by read status (`true`, `false`)
- `type`: Filter by notification type
- `limit`: Number of notifications (default: 20)
- `cursor`: Pagination cursor

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid-notification-id",
      "type": "mention",
      "title": "You were mentioned in a note",
      "message": "Jane Smith mentioned you in 'Project Requirements'",
      "data": {
        "noteId": "uuid-note-id",
        "workspaceId": "uuid-workspace-id",
        "mentionedBy": "uuid-user-id-2"
      },
      "read": false,
      "actionUrl": "/workspaces/uuid-workspace-id/notes/uuid-note-id",
      "createdAt": "2025-08-15T14:30:00Z"
    },
    {
      "id": "uuid-notification-id-2",
      "type": "workspace_invite",
      "title": "Workspace invitation",
      "message": "You've been invited to join 'Marketing Team'",
      "data": {
        "workspaceId": "uuid-workspace-id-2",
        "invitedBy": "uuid-user-id-3"
      },
      "read": true,
      "actionUrl": "/workspaces/uuid-workspace-id-2",
      "createdAt": "2025-08-15T12:00:00Z"
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "cursor-abc123"
  },
  "summary": {
    "total": 15,
    "unread": 3
  }
}
```

### Mark Notification as Read

```http
PUT /api/notifications/{notificationId}/read
Authorization: Bearer {token}
```

### Mark All as Read

```http
PUT /api/notifications/mark-all-read
Authorization: Bearer {token}
```

### Delete Notification

```http
DELETE /api/notifications/{notificationId}
Authorization: Bearer {token}
```

## 💬 Chat

### List Chat Messages

```http
GET /api/chat/messages
Authorization: Bearer {token}
```

**Query Parameters:**
- `workspaceId`: Workspace ID (required)
- `limit`: Number of messages (default: 50, max: 200)
- `before`: Cursor for pagination (message ID)
- `after`: Cursor for pagination (message ID)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid-message-id",
      "content": "Great work on the requirements document! 👍",
      "author": {
        "id": "uuid-user-id",
        "displayName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "workspace": {
        "id": "uuid-workspace-id",
        "name": "Project Apollo"
      },
      "mentions": [],
      "reactions": [
        {
          "emoji": "👍",
          "count": 2,
          "users": ["uuid-user-id-2", "uuid-user-id-3"],
          "hasReacted": false
        }
      ],
      "edited": false,
      "createdAt": "2025-08-15T14:30:00Z",
      "updatedAt": "2025-08-15T14:30:00Z"
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "uuid-message-id-prev"
  }
}
```

### Send Message

```http
POST /api/chat/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "workspaceId": "uuid-workspace-id",
  "content": "Let's schedule a meeting to discuss the next phase",
  "mentions": ["uuid-user-id-2"]
}
```

**Response:**
```json
{
  "id": "uuid-message-id",
  "content": "Let's schedule a meeting to discuss the next phase",
  "author": {
    "id": "uuid-user-id",
    "displayName": "John Doe"
  },
  "mentions": [
    {
      "id": "uuid-user-id-2",
      "displayName": "Jane Smith"
    }
  ],
  "reactions": [],
  "createdAt": "2025-08-15T15:00:00Z"
}
```

### Add Reaction

```http
POST /api/chat/messages/{messageId}/reactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "emoji": "🎉"
}
```

### Remove Reaction

```http
DELETE /api/chat/messages/{messageId}/reactions/{emoji}
Authorization: Bearer {token}
```

## 📅 Calendar Integration

### List Connected Calendars

```http
GET /api/calendar/connections
Authorization: Bearer {token}
```

**Response:**
```json
{
  "connections": [
    {
      "id": "uuid-connection-id",
      "provider": "google",
      "email": "user@gmail.com",
      "displayName": "John's Google Calendar",
      "status": "connected",
      "permissions": ["read", "write"],
      "calendars": [
        {
          "id": "primary",
          "name": "Primary Calendar",
          "color": "#3788d8",
          "enabled": true
        },
        {
          "id": "work-calendar-id",
          "name": "Work Calendar",
          "color": "#d50000",
          "enabled": true
        }
      ],
      "lastSync": "2025-08-15T14:30:00Z",
      "createdAt": "2025-08-15T10:00:00Z"
    }
  ]
}
```

### Connect Calendar

```http
POST /api/calendar/connect
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "google",
  "authCode": "oauth-authorization-code"
}
```

### List Calendar Events

```http
GET /api/calendar/events
Authorization: Bearer {token}
```

**Query Parameters:**
- `start`: Start date (ISO 8601)
- `end`: End date (ISO 8601)
- `calendars`: Comma-separated calendar IDs
- `workspaceId`: Filter events related to workspace

**Response:**
```json
{
  "events": [
    {
      "id": "uuid-event-id",
      "title": "Project Planning Meeting",
      "description": "Discuss Q4 project roadmap",
      "start": "2025-08-16T10:00:00Z",
      "end": "2025-08-16T11:00:00Z",
      "location": "Conference Room A",
      "calendar": {
        "id": "primary",
        "name": "Primary Calendar",
        "provider": "google"
      },
      "attendees": [
        {
          "email": "jane@example.com",
          "name": "Jane Smith",
          "status": "accepted"
        }
      ],
      "workspace": {
        "id": "uuid-workspace-id",
        "name": "Project Apollo"
      },
      "meetingLink": "https://meet.google.com/abc-defg-hij",
      "createdAt": "2025-08-15T10:00:00Z"
    }
  ]
}
```

### Create Calendar Event

```http
POST /api/calendar/events
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Team Standup",
  "description": "Daily team synchronization",
  "start": "2025-08-16T09:00:00Z",
  "end": "2025-08-16T09:30:00Z",
  "calendarId": "primary",
  "workspaceId": "uuid-workspace-id",
  "attendees": ["jane@example.com", "bob@example.com"]
}
```

## 🔧 Admin APIs

*Note: Admin APIs require admin or owner privileges*

### System Health

```http
GET /api/admin/health
Authorization: Bearer {admin-token}
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "database": {
    "status": "connected",
    "latency": 5
  },
  "redis": {
    "status": "connected",
    "memory": "15.2MB"
  },
  "storage": {
    "used": "1.2GB",
    "available": "8.8GB"
  },
  "metrics": {
    "activeUsers": 234,
    "activeWorkspaces": 45,
    "requestsPerMinute": 1250
  }
}
```

### User Management

```http
GET /api/admin/users
Authorization: Bearer {admin-token}
```

**Query Parameters:**
- `status`: Filter by user status (`active`, `suspended`, `pending`)
- `role`: Filter by role
- `limit`: Number of users (default: 50)

### System Analytics

```http
GET /api/admin/analytics
Authorization: Bearer {admin-token}
```

**Query Parameters:**
- `period`: Time period (`day`, `week`, `month`, `year`)
- `start`: Start date
- `end`: End date

## 🌐 WebSocket API

### Connection

Connect to the WebSocket server for real-time features:

```javascript
const socket = io('wss://your-domain.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Client to Server Events

```javascript
// Join workspace for real-time updates
socket.emit('workspace:join', {
  workspaceId: 'uuid-workspace-id'
});

// Send chat message
socket.emit('chat:message', {
  workspaceId: 'uuid-workspace-id',
  content: 'Hello team!',
  mentions: ['uuid-user-id']
});

// Update cursor position
socket.emit('collaboration:cursor', {
  workspaceId: 'uuid-workspace-id',
  position: { x: 100, y: 200 }
});

// Typing indicator
socket.emit('chat:typing', {
  workspaceId: 'uuid-workspace-id',
  isTyping: true
});
```

#### Server to Client Events

```javascript
// Receive chat message
socket.on('chat:message', (data) => {
  console.log('New message:', data);
});

// Receive notification
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// User presence update
socket.on('user:presence', (data) => {
  console.log('User presence:', data);
});

// Collaboration cursor update
socket.on('collaboration:cursor', (data) => {
  console.log('Cursor update:', data);
});

// Workspace update
socket.on('workspace:update', (data) => {
  console.log('Workspace updated:', data);
});
```

## 📊 Rate Limiting

### Rate Limits

- **Authentication**: 5 requests per minute per IP
- **General API**: 100 requests per 15 minutes per user
- **File Upload**: 10 uploads per hour per user
- **Search**: 60 requests per minute per user
- **WebSocket**: 500 events per minute per connection

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692123600
X-RateLimit-Window: 900
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 300
  }
}
```

## 🔍 Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": "email",
      "constraint": "Invalid email format"
    },
    "timestamp": "2025-08-15T15:00:00Z",
    "requestId": "req_abc123",
    "documentation": "https://docs.notevault.com/api/errors"
  }
}
```

### Common Error Codes

- `INVALID_CREDENTIALS` - Authentication failed
- `ACCESS_DENIED` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `WORKSPACE_FULL` - Workspace member limit reached
- `FILE_TOO_LARGE` - File exceeds size limit
- `UNSUPPORTED_FILE_TYPE` - File type not allowed
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 📚 SDKs and Libraries

### Official SDKs

- **JavaScript/TypeScript**: `@notevault/js-sdk`
- **Python**: `notevault-python`
- **Go**: `github.com/notevault/go-sdk`

### Community Libraries

- **React Hooks**: `@notevault/react-hooks`
- **Vue Composables**: `@notevault/vue-composables`
- **Svelte Stores**: `@notevault/svelte-stores`

---

## Quick Reference

### Base URLs
- **Production**: `https://api.notevault.com`
- **Staging**: `https://api.staging.notevault.com`
- **WebSocket**: `wss://ws.notevault.com`

### Authentication
```http
Authorization: Bearer {jwt-token}
```

### Content Types
- Request: `application/json`
- File Upload: `multipart/form-data`
- Response: `application/json`

---

*Last Updated: August 15, 2025*  
*API Version: 1.0.0*  
*Need help? Check our [troubleshooting guide](../troubleshooting.md) or contact support.*