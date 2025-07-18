# NoteVault - Collaborative Workspace Platform

A modern, feature-rich collaborative workspace platform built with SvelteKit, inspired by Rugplay.com's sleek design. Create, organize, and share notes with advanced features like canvas-based drag & drop, real-time chat, and comprehensive file management.

## ✨ Features

### 🎯 Core Features (Implemented)
- ✅ **Full collaborative workspace platform**
- ✅ **Canvas notes with drag & drop functionality**
- ✅ **Public chat system with role indicators**
- ✅ **File management with upload/organize features**
- ✅ **Admin dashboard with real-time monitoring**
- ✅ **User management with role assignment**
- ✅ **Comprehensive security and audit logging**
- ✅ **Announcement features for admins and moderators**

### 📱 Pages & Routes
- **Main Dashboard (/)** - Workspace overview with grid/list view, chat preview, and latest announcements
- **Workspace Canvas (/workspaces/[id])** - Full drag & drop note system with infinite canvas
- **Public Chat (/chat)** - Community-wide messaging with role indicators and reactions
- **File Management (/files)** - Upload, organize, search, and share files with grid/list views
- **Admin Dashboard (/admin)** - Real-time system monitoring and controls
- **User Management (/admin/users)** - Role assignment and user control

### 🎨 Design Features
- **Rugplay-inspired dark theme** with modern UI components
- **Responsive design** that works on desktop, tablet, and mobile
- **Smooth animations** and transitions throughout the interface
- **Role-based UI** with different indicators for admins, moderators, and users
- **Real-time updates** with WebSocket simulation

## 🚀 Quick Start

### Option 1: Docker (Recommended)

#### Prerequisites
- Docker and Docker Compose installed on your system

#### Running with Docker

```bash
# Clone the repository
git clone https://github.com/PythonTilk/notevault-svelte.git
cd notevault-svelte

# Start the application with Docker Compose
docker-compose up --build
```

**Access the application:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Full Application (via Nginx)**: http://localhost:80

#### Default Users
- **Admin User**: Username: `admin`, Password: `admin123`
- **Demo User**: Username: `demo123`, Password: `demo123`

### Option 2: Local Development

#### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn package manager

#### Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Initialize database
npm run init-db

# Start backend server
npm run dev
```

#### Frontend Setup

```bash
# Navigate to root directory (in a new terminal)
cd ..

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start frontend server
npm run dev
```

**Access the application:**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 🐳 Docker Commands

### Basic Commands
```bash
# Build and start all services
docker-compose up --build

# Start services in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
```

### Development Commands
```bash
# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Access container shell
docker-compose exec backend sh
docker-compose exec frontend sh

# Reset database (remove volume)
docker-compose down
docker volume rm notevault-svelte_backend_data
docker-compose up --build
```

### Environment Variables

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

#### Backend (server/.env)
```env
NODE_ENV=development
PORT=3001
DB_PATH=./database/notevault.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## 🛠️ Technology Stack

### Frontend
- **Framework:** SvelteKit 2.0, TypeScript
- **Styling:** Tailwind CSS with custom dark theme
- **Icons:** Lucide Svelte
- **State Management:** Svelte stores
- **Build Tool:** Vite
- **Package Manager:** npm

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** SQLite (with migration path to PostgreSQL)
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** Socket.IO
- **File Upload:** Multer
- **Security:** Helmet, CORS, Rate Limiting

### DevOps
- **Containerization:** Docker & Docker Compose
- **Reverse Proxy:** Nginx
- **Environment:** Multi-stage Docker builds
- **Data Persistence:** Docker volumes

## 📋 TODO List

### 🔧 Backend & APIs
- [x] **Implement real backend API** with Node.js/Express
- [x] **Set up SQLite database** with proper schema
- [x] **Implement JWT-based authentication** system
- [x] **Add real-time WebSocket server** for chat and live updates
- [x] **Create file upload service** with local storage
- [ ] **Migrate to PostgreSQL/MySQL** for production
- [ ] **Add cloud storage** integration (AWS S3/Cloudinary)
- [ ] **Implement email service** for invitations and notifications

### 🛡️ Security & Authentication
- [ ] Add proper password hashing (bcrypt)
- [ ] Implement rate limiting for API endpoints
- [ ] Add CSRF protection
- [ ] Set up proper session management
- [ ] Implement 2FA (Two-Factor Authentication)
- [ ] Add OAuth providers (Google, GitHub, Discord)

### 🎯 Advanced Features
- [ ] **Real-time collaboration** on canvas notes (like Figma)
- [ ] **Version history** for notes with diff visualization
- [ ] **Advanced search** with full-text search and filters
- [ ] **Workspace templates** for quick setup
- [ ] **Note linking** and backlinking system
- [ ] **Markdown editor** with live preview
- [ ] **Code syntax highlighting** for code notes
- [ ] **Export functionality** (PDF, Markdown, JSON)

### 🤖 AI & Automation Features (Inspired by Hyprnote)
- [ ] **AI-powered note enhancement** and summarization
- [ ] **Meeting transcription** with audio/video upload
- [ ] **Smart tagging** suggestions based on content
- [ ] **Content extraction** from uploaded documents
- [ ] **AI chat assistant** for workspace help
- [ ] **Automated note organization** suggestions
- [ ] **Voice-to-text** note creation
- [ ] **Plugin system** for extensibility

### 📱 Mobile & PWA
- [ ] **Progressive Web App** (PWA) support
- [ ] **Mobile-optimized** touch interactions for canvas
- [ ] **Offline support** with service workers
- [ ] **Push notifications** for mentions and updates
- [ ] **Mobile app** with React Native or Flutter

### 🔍 Analytics & Monitoring
- [ ] **Usage analytics** dashboard for admins
- [ ] **Performance monitoring** with error tracking
- [ ] **User activity tracking** and insights
- [ ] **System health monitoring** with alerts
- [ ] **Backup and restore** functionality
- [ ] **Data export** for compliance (GDPR)

### 🎨 UI/UX Enhancements
- [ ] **Themes system** with multiple color schemes
- [ ] **Customizable workspace** layouts
- [ ] **Keyboard shortcuts** for power users
- [ ] **Accessibility improvements** (WCAG compliance)
- [ ] **Internationalization** (i18n) support
- [ ] **Advanced animations** and micro-interactions

### 🔗 Integrations
- [ ] **Slack/Discord** bot integration
- [ ] **Calendar integration** (Google Calendar, Outlook)
- [ ] **Cloud storage** sync (Google Drive, Dropbox)
- [ ] **Git integration** for code notes
- [ ] **Zapier/IFTTT** webhooks
- [ ] **API documentation** with Swagger/OpenAPI

### 🧪 Testing & Quality
- [ ] **Unit tests** with Vitest
- [ ] **Integration tests** for API endpoints
- [ ] **E2E tests** with Playwright
- [ ] **Component testing** with Testing Library
- [ ] **Performance testing** and optimization
- [ ] **Security testing** and vulnerability scanning

### 📦 DevOps & Deployment
- [x] **Docker containerization** with multi-service setup
- [x] **Docker Compose** for easy development and deployment
- [ ] **CI/CD pipeline** with GitHub Actions
- [ ] **Environment management** (dev/staging/prod)
- [ ] **Database migrations** system
- [ ] **Monitoring and logging** setup
- [ ] **CDN setup** for static assets

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/          # Reusable Svelte components
│   ├── stores/             # Svelte stores for state management
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── routes/
│   ├── admin/              # Admin dashboard routes
│   ├── chat/               # Chat functionality
│   ├── files/              # File management
│   ├── workspaces/         # Workspace canvas
│   └── +layout.svelte      # Main layout component
├── app.html                # HTML template
└── app.css                 # Global styles
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Rugplay.com** for design inspiration
- **Hyprnote** for AI-powered features inspiration
- **SvelteKit** team for the amazing framework
- **Tailwind CSS** for the utility-first CSS framework

---

**Built with ❤️ using SvelteKit and modern web technologies**