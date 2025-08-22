# Developer Guide

Welcome to the NoteVault developer guide! This comprehensive documentation will help you set up your development environment, understand the codebase architecture, and contribute effectively to the project.

## 🚀 Quick Start

### Development Environment Setup

#### Prerequisites
```bash
# Required software
Node.js: 20+ (LTS recommended)
npm: 10+ (or yarn 4+)
Git: 2.40+
VS Code: Latest (recommended IDE)

# Optional but recommended
Docker: 24+ (for containerized development)
PostgreSQL: 15+ (for local database)
Redis: 7+ (for caching and sessions)
```

#### Initial Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-org/notevault-svelte.git
cd notevault-svelte

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Initialize database
npm run db:setup

# 5. Start development server
npm run dev

# 6. Open in browser
# Navigate to http://localhost:3001
```

#### Environment Configuration
```bash
# .env.local - Development Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# JWT Secrets (development only)
JWT_SECRET="dev-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"

# Optional: Redis for caching
REDIS_URL="redis://localhost:6379"

# File uploads
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760" # 10MB

# Development flags
DEBUG="notevault:*"
LOG_LEVEL="debug"
ENABLE_HOT_RELOAD=true
```

## 🏗️ Project Architecture

### Directory Structure
```
notevault-svelte/
├── src/                          # Source code
│   ├── app.html                  # HTML template
│   ├── app.d.ts                  # Global type definitions
│   ├── hooks.client.ts           # Client-side hooks
│   ├── hooks.server.ts           # Server-side hooks
│   ├── routes/                   # SvelteKit routes
│   │   ├── +layout.svelte        # Root layout
│   │   ├── +layout.ts            # Layout data loading
│   │   ├── +page.svelte          # Homepage
│   │   ├── login/                # Authentication routes
│   │   ├── workspaces/           # Workspace routes
│   │   │   └── [id]/             # Dynamic workspace pages
│   │   ├── files/                # File management
│   │   ├── search/               # Search functionality
│   │   ├── chat/                 # Chat interface
│   │   ├── calendar/             # Calendar integration
│   │   ├── admin/                # Admin dashboard
│   │   └── api/                  # API endpoints
│   ├── lib/                      # Shared libraries
│   │   ├── components/           # Reusable components
│   │   │   ├── ui/               # Base UI components
│   │   │   ├── workspace/        # Workspace-specific components
│   │   │   ├── notes/            # Note-related components
│   │   │   └── forms/            # Form components
│   │   ├── stores/               # Svelte stores
│   │   │   ├── auth.ts           # Authentication state
│   │   │   ├── workspaces.ts     # Workspace data
│   │   │   ├── notifications.ts  # Notification system
│   │   │   └── ui.ts             # UI state
│   │   ├── utils/                # Utility functions
│   │   │   ├── api.ts            # API client
│   │   │   ├── auth.ts           # Authentication helpers
│   │   │   ├── validation.ts     # Input validation
│   │   │   └── performance.ts    # Performance utilities
│   │   ├── types/                # TypeScript definitions
│   │   │   ├── api.ts            # API types
│   │   │   ├── workspace.ts      # Workspace types
│   │   │   └── user.ts           # User types
│   │   └── constants/            # Application constants
│   └── static/                   # Static assets
│       ├── favicon.ico
│       ├── images/
│       └── fonts/
├── server/                       # Backend server (if separate)
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
├── docs/                         # Documentation
├── scripts/                      # Build and utility scripts
├── docker/                       # Docker configurations
├── .github/                      # GitHub workflows
├── package.json                  # Dependencies and scripts
├── vite.config.ts               # Vite configuration
├── svelte.config.js             # Svelte configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Project overview
```

### Technology Stack

#### Frontend
```typescript
// Core Technologies
SvelteKit: 2.0+        // Full-stack framework
Svelte: 5.0+           // Component framework
TypeScript: 5.0+       // Type safety
Vite: 5.0+             // Build tool and dev server

// Styling
Tailwind CSS: 3.4+     // Utility-first CSS
PostCSS: 8.4+          // CSS processing
Autoprefixer: 10.4+    // Browser prefixes

// UI Components
Lucide Svelte: 0.400+  // Icon library
HeadlessUI: Custom     // Accessible UI primitives
Floating UI: 1.6+      // Positioning engine

// Real-time
Socket.IO Client: 4.7+ // WebSocket client
EventSource: Native    // Server-sent events

// Utilities
Date-fns: 3.6+         // Date manipulation
Zod: 3.22+             // Schema validation
Fuse.js: 7.0+          // Fuzzy search
```

#### Backend
```typescript
// Core Technologies
Node.js: 20+           // JavaScript runtime
Express.js: 4.19+      // Web framework
TypeScript: 5.0+       // Type safety

// Database
PostgreSQL: 15+        // Primary database
Prisma: 5.17+          // ORM and migrations
SQLite: 3.46+          // Development database

// Caching & Sessions
Redis: 7+              // Caching and sessions
ioredis: 5.4+          // Redis client

// Authentication
jsonwebtoken: 9.0+     // JWT handling
bcryptjs: 2.4+         // Password hashing
passport: 0.7+         // Authentication middleware

// Real-time
Socket.IO: 4.7+        // WebSocket server
ws: 8.18+              // WebSocket implementation

// File Handling
multer: 1.4+           // File upload middleware
sharp: 0.33+           // Image processing
mime-types: 2.1+       // MIME type detection

// Validation
zod: 3.22+             // Schema validation
validator: 13.12+      // String validation

// Utilities
lodash: 4.17+          // Utility functions
dayjs: 1.11+           // Date manipulation
```

## 🔧 Development Workflow

### Code Organization

#### Component Structure
```svelte
<!-- Component Template: src/lib/components/Example.svelte -->
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import type { ComponentProps } from './types';
  
  // 2. Props (with TypeScript)
  interface Props {
    title: string;
    optional?: boolean;
  }
  
  let { title, optional = false }: Props = $props();
  
  // 3. State
  let isLoading = $state(false);
  let data = $state<any[]>([]);
  
  // 4. Derived state
  let filteredData = $derived(
    data.filter(item => item.visible)
  );
  
  // 5. Functions
  async function loadData() {
    isLoading = true;
    try {
      // Load data logic
    } finally {
      isLoading = false;
    }
  }
  
  // 6. Lifecycle
  onMount(() => {
    loadData();
  });
</script>

<!-- 7. Styles (scoped) -->
<style>
  .container {
    @apply p-4 bg-white rounded-lg shadow;
  }
</style>

<!-- 8. Template -->
<div class="container">
  <h2 class="text-xl font-semibold">{title}</h2>
  
  {#if isLoading}
    <div class="loading">Loading...</div>
  {:else}
    {#each filteredData as item (item.id)}
      <div class="item">{item.name}</div>
    {/each}
  {/if}
</div>
```

#### Store Patterns
```typescript
// src/lib/stores/example.ts
import { writable, derived } from 'svelte/store';
import type { Workspace } from '$lib/types';

// 1. Store creation with proper typing
function createWorkspaceStore() {
  const { subscribe, set, update } = writable<Workspace[]>([]);
  
  return {
    subscribe,
    
    // Actions
    load: async () => {
      const workspaces = await api.getWorkspaces();
      set(workspaces);
    },
    
    add: (workspace: Workspace) => {
      update(workspaces => [...workspaces, workspace]);
    },
    
    update: (id: string, updates: Partial<Workspace>) => {
      update(workspaces => 
        workspaces.map(ws => 
          ws.id === id ? { ...ws, ...updates } : ws
        )
      );
    },
    
    remove: (id: string) => {
      update(workspaces => workspaces.filter(ws => ws.id !== id));
    }
  };
}

// 2. Export store instance
export const workspaces = createWorkspaceStore();

// 3. Derived stores
export const activeWorkspaces = derived(
  workspaces,
  $workspaces => $workspaces.filter(ws => ws.isActive)
);

// 4. Store utilities
export function getWorkspaceById(id: string) {
  return derived(
    workspaces,
    $workspaces => $workspaces.find(ws => ws.id === id)
  );
}
```

#### API Route Patterns
```typescript
// src/routes/api/workspaces/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/database';
import { authenticate } from '$lib/server/auth';

export const GET: RequestHandler = async ({ request, url }) => {
  try {
    // 1. Authentication
    const user = await authenticate(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Query parameters
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // 3. Database query
    const workspaces = await db.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id }
        }
      },
      include: {
        members: {
          include: { user: true }
        },
        _count: {
          select: { notes: true, files: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset
    });
    
    // 4. Response
    return json({
      workspaces,
      pagination: {
        limit,
        offset,
        total: workspaces.length
      }
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = await authenticate(request);
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Validate input
    const validatedData = WorkspaceSchema.parse(data);
    
    // Create workspace
    const workspace = await db.workspace.create({
      data: {
        ...validatedData,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner'
          }
        }
      },
      include: {
        members: {
          include: { user: true }
        }
      }
    });
    
    return json(workspace, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating workspace:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
```

### Development Scripts

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite dev --host",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "svelte-kit sync && tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "db:seed": "tsx scripts/seed.ts",
    "db:studio": "prisma studio",
    "docker:dev": "docker-compose -f docker-compose.dev.yml up",
    "docker:prod": "docker-compose up",
    "analyze": "npx vite-bundle-analyzer",
    "prepare": "husky install"
  }
}
```

#### Custom Development Scripts
```typescript
// scripts/dev-setup.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function setupDevelopment() {
  console.log('🚀 Setting up development environment...');
  
  try {
    // 1. Check prerequisites
    await checkPrerequisites();
    
    // 2. Install dependencies
    console.log('📦 Installing dependencies...');
    await execAsync('npm install');
    
    // 3. Setup environment file
    await setupEnvironment();
    
    // 4. Initialize database
    console.log('🗄️ Setting up database...');
    await execAsync('npm run db:push');
    await execAsync('npm run db:seed');
    
    // 5. Generate types
    console.log('📝 Generating types...');
    await execAsync('npm run db:generate');
    await execAsync('npm run typecheck');
    
    console.log('✅ Development environment ready!');
    console.log('🌐 Run "npm run dev" to start the development server');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

async function checkPrerequisites() {
  const requirements = [
    { command: 'node --version', version: 'v20' },
    { command: 'npm --version', version: '10' }
  ];
  
  for (const req of requirements) {
    try {
      const { stdout } = await execAsync(req.command);
      console.log(`✅ ${req.command}: ${stdout.trim()}`);
    } catch (error) {
      throw new Error(`Missing requirement: ${req.command}`);
    }
  }
}

async function setupEnvironment() {
  const envExample = path.join(process.cwd(), '.env.example');
  const envLocal = path.join(process.cwd(), '.env.local');
  
  try {
    await fs.access(envLocal);
    console.log('📄 .env.local already exists');
  } catch {
    console.log('📄 Creating .env.local from .env.example');
    await fs.copyFile(envExample, envLocal);
  }
}

if (require.main === module) {
  setupDevelopment();
}
```

## 🧪 Testing Strategy

### Testing Framework Setup

#### Vitest Configuration
```typescript
// vitest.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

#### Test Setup
```typescript
// src/tests/setup.ts
import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
  browser: false,
  dev: true,
  building: false,
  version: '1.0.0'
}));

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn(() => vi.fn())
  },
  updated: {
    subscribe: vi.fn(() => vi.fn())
  }
}));

// Global test utilities
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});
```

### Testing Patterns

#### Component Testing
```typescript
// src/lib/components/Button.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button.svelte';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(Button, { props: { children: 'Click me' } });
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(Button, { 
      props: { 
        children: 'Click me',
        onclick: handleClick
      }
    });

    await fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct CSS classes', () => {
    render(Button, { 
      props: { 
        children: 'Click me',
        variant: 'primary'
      }
    });

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-primary');
  });

  it('handles disabled state', () => {
    render(Button, { 
      props: { 
        children: 'Click me',
        disabled: true
      }
    });

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

#### Store Testing
```typescript
// src/lib/stores/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { auth } from './auth';

// Mock API
vi.mock('$lib/utils/api', () => ({
  api: {
    login: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn()
  }
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    auth.logout();
  });

  it('initializes with null user', () => {
    const state = get(auth);
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('handles successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    const mockToken = 'mock-jwt-token';
    
    vi.mocked(api.login).mockResolvedValue({
      user: mockUser,
      token: mockToken
    });

    await auth.login('test@example.com', 'password');

    const state = get(auth);
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('handles login failure', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      auth.login('test@example.com', 'wrong-password')
    ).rejects.toThrow('Invalid credentials');

    const state = get(auth);
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
```

#### API Testing
```typescript
// src/routes/api/workspaces/+server.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from './+server';
import { db } from '$lib/server/database';

// Mock database
vi.mock('$lib/server/database', () => ({
  db: {
    workspace: {
      findMany: vi.fn(),
      create: vi.fn()
    }
  }
}));

// Mock authentication
vi.mock('$lib/server/auth', () => ({
  authenticate: vi.fn()
}));

describe('/api/workspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns workspaces for authenticated user', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockWorkspaces = [
        { id: '1', name: 'Test Workspace' }
      ];

      vi.mocked(authenticate).mockResolvedValue(mockUser);
      vi.mocked(db.workspace.findMany).mockResolvedValue(mockWorkspaces);

      const request = new Request('http://localhost/api/workspaces');
      const response = await GET({ request, url: new URL(request.url) });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.workspaces).toEqual(mockWorkspaces);
    });

    it('returns 401 for unauthenticated user', async () => {
      vi.mocked(authenticate).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces');
      const response = await GET({ request, url: new URL(request.url) });
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST', () => {
    it('creates workspace for authenticated user', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const workspaceData = { name: 'New Workspace' };
      const mockWorkspace = { id: '1', ...workspaceData };

      vi.mocked(authenticate).mockResolvedValue(mockUser);
      vi.mocked(db.workspace.create).mockResolvedValue(mockWorkspace);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspaceData)
      });

      const response = await POST({ request });
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toEqual(mockWorkspace);
    });
  });
});
```

#### E2E Testing
```typescript
// tests/e2e/workspace.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('creates new workspace', async ({ page }) => {
    // Click new workspace button
    await page.click('[data-testid=new-workspace-button]');
    
    // Fill workspace form
    await page.fill('[data-testid=workspace-name]', 'Test Workspace');
    await page.fill('[data-testid=workspace-description]', 'Test Description');
    
    // Submit form
    await page.click('[data-testid=create-workspace-button]');
    
    // Verify redirect to new workspace
    await expect(page).toHaveURL(/\/workspaces\/.+/);
    
    // Verify workspace name in header
    await expect(page.locator('[data-testid=workspace-title]'))
      .toHaveText('Test Workspace');
  });

  test('invites member to workspace', async ({ page }) => {
    // Navigate to workspace
    await page.goto('/workspaces/test-workspace-id');
    
    // Open member management
    await page.click('[data-testid=manage-members-button]');
    
    // Fill invitation form
    await page.fill('[data-testid=invite-email]', 'newuser@example.com');
    await page.selectOption('[data-testid=member-role]', 'member');
    
    // Send invitation
    await page.click('[data-testid=send-invite-button]');
    
    // Verify success message
    await expect(page.locator('[data-testid=success-message]'))
      .toBeVisible();
    
    // Verify member appears in list
    await expect(page.locator('[data-testid=member-list]'))
      .toContainText('newuser@example.com');
  });

  test('real-time collaboration works', async ({ browser }) => {
    // Create two browser contexts for different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Login both users
    await loginUser(page1, 'user1@example.com');
    await loginUser(page2, 'user2@example.com');
    
    // Both navigate to same workspace
    const workspaceUrl = '/workspaces/shared-workspace-id';
    await page1.goto(workspaceUrl);
    await page2.goto(workspaceUrl);
    
    // User 1 creates a note
    await page1.click('[data-testid=new-note-button]');
    await page1.fill('[data-testid=note-title]', 'Collaborative Note');
    await page1.press('[data-testid=note-title]', 'Enter');
    
    // User 2 should see the new note
    await expect(page2.locator('[data-testid=note-list]'))
      .toContainText('Collaborative Note');
    
    // User 2 opens the note
    await page2.click('text=Collaborative Note');
    
    // User 1 edits the note
    await page1.click('[data-testid=note-content]');
    await page1.type('[data-testid=note-content]', 'Hello from User 1!');
    
    // User 2 should see the changes in real-time
    await expect(page2.locator('[data-testid=note-content]'))
      .toContainText('Hello from User 1!');
  });
});

async function loginUser(page, email: string) {
  await page.goto('/login');
  await page.fill('[data-testid=email]', email);
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=login-button]');
  await expect(page).toHaveURL('/dashboard');
}
```

## 🎨 Code Style & Standards

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:svelte/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2020,
    "extraFileExtensions": [".svelte"]
  },
  "env": {
    "browser": true,
    "es2017": true,
    "node": true
  },
  "overrides": [
    {
      "files": ["*.svelte"],
      "parser": "svelte-eslint-parser",
      "parserOptions": {
        "parser": "@typescript-eslint/parser"
      }
    }
  ],
  "rules": {
    // TypeScript
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    
    // Svelte
    "svelte/no-unused-svelte-ignore": "error",
    "svelte/prefer-class-directive": "error",
    "svelte/prefer-style-directive": "error",
    
    // General
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "useTabs": false,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "es5",
  "semi": true,
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [
    {
      "files": "*.svelte",
      "options": {
        "parser": "svelte"
      }
    }
  ]
}
```

### TypeScript Configuration
```json
// tsconfig.json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "module": "ESNext",
    "target": "ES2022",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    
    // Path mapping
    "baseUrl": ".",
    "paths": {
      "$lib": ["src/lib"],
      "$lib/*": ["src/lib/*"],
      "$types": ["src/lib/types"],
      "$types/*": ["src/lib/types/*"],
      "$components": ["src/lib/components"],
      "$components/*": ["src/lib/components/*"],
      "$stores": ["src/lib/stores"],
      "$stores/*": ["src/lib/stores/*"],
      "$utils": ["src/lib/utils"],
      "$utils/*": ["src/lib/utils/*"]
    }
  },
  "include": [
    "src/**/*.d.ts",
    "src/**/*.ts",
    "src/**/*.js",
    "src/**/*.svelte"
  ],
  "exclude": [
    "node_modules/**",
    ".svelte-kit/**"
  ]
}
```

### Code Style Guidelines

#### Naming Conventions
```typescript
// Files and Folders
// Use kebab-case for files and folders
src/lib/components/user-profile.svelte
src/lib/utils/date-helpers.ts
src/routes/workspace-settings/+page.svelte

// Components
// Use PascalCase for component names
export default UserProfile;
import UserProfile from './UserProfile.svelte';

// Variables and Functions
// Use camelCase
const userName = 'john_doe';
function getUserData() { }
const handleButtonClick = () => { };

// Constants
// Use SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Types and Interfaces
// Use PascalCase
interface UserProfile {
  id: string;
  name: string;
}

type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

// Enums
// Use PascalCase for enum name, SCREAMING_SNAKE_CASE for values
enum NotificationType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP'
}
```

#### Component Patterns
```svelte
<!-- Good Component Structure -->
<script lang="ts">
  // 1. Imports (grouped and sorted)
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { User } from '$types/user';
  import Button from '$components/ui/Button.svelte';
  import { userStore } from '$stores/auth';
  
  // 2. Props with proper typing
  interface Props {
    user: User;
    showActions?: boolean;
    onEdit?: (user: User) => void;
  }
  
  let { user, showActions = true, onEdit }: Props = $props();
  
  // 3. Local state
  let isEditing = $state(false);
  let isLoading = $state(false);
  
  // 4. Derived state
  let displayName = $derived(
    user.displayName || user.email.split('@')[0]
  );
  
  // 5. Functions (grouped by purpose)
  function handleEdit() {
    isEditing = true;
  }
  
  function handleSave() {
    onEdit?.(user);
    isEditing = false;
  }
  
  async function handleDelete() {
    if (!confirm('Are you sure?')) return;
    
    isLoading = true;
    try {
      await deleteUser(user.id);
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // 6. Lifecycle hooks
  onMount(() => {
    // Initialization logic
  });
</script>

<!-- Template with proper structure -->
<div class="user-card" data-testid="user-card">
  <div class="user-info">
    <img src={user.avatarUrl} alt="{displayName}'s avatar" class="avatar" />
    <div class="details">
      <h3 class="name">{displayName}</h3>
      <p class="email">{user.email}</p>
    </div>
  </div>
  
  {#if showActions && !isLoading}
    <div class="actions">
      <Button variant="outline" onclick={handleEdit}>
        Edit
      </Button>
      <Button variant="destructive" onclick={handleDelete}>
        Delete
      </Button>
    </div>
  {/if}
  
  {#if isLoading}
    <div class="loading" aria-label="Loading">
      <span class="spinner"></span>
    </div>
  {/if}
</div>

<style>
  .user-card {
    @apply flex items-center justify-between p-4 border rounded-lg;
  }
  
  .user-info {
    @apply flex items-center gap-3;
  }
  
  .avatar {
    @apply w-10 h-10 rounded-full object-cover;
  }
  
  .name {
    @apply font-semibold text-gray-900;
  }
  
  .email {
    @apply text-sm text-gray-600;
  }
  
  .actions {
    @apply flex gap-2;
  }
  
  .loading {
    @apply flex items-center justify-center;
  }
  
  .spinner {
    @apply w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin;
  }
</style>
```

## 🔧 Development Tools

### VS Code Configuration

#### Recommended Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "svelte.svelte-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-playwright.playwright",
    "vitest.explorer",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker"
  ]
}
```

#### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "svelte.enable-ts-plugin": true,
  "tailwindCSS.includeLanguages": {
    "svelte": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "svelte": "html"
  }
}
```

#### Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug SvelteKit App",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--", "--inspect"],
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test", "--", "--inspect-brk"],
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"]
    }
  ]
}
```

### Git Hooks

#### Husky Configuration
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
      "pre-push": "npm run typecheck && npm run test"
    }
  },
  "lint-staged": {
    "*.{js,ts,svelte}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

#### Commit Message Convention
```bash
# Conventional Commits format
type(scope): description

# Types:
feat: new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code refactoring
test: adding or updating tests
chore: updating build tasks, package manager configs, etc.

# Examples:
feat(auth): add OAuth2 integration
fix(workspace): resolve real-time sync issue
docs(api): update endpoint documentation
test(components): add Button component tests
refactor(stores): simplify auth store logic
chore(deps): update dependencies to latest versions
```

## 📚 Resources & References

### Documentation Links
- **SvelteKit**: https://kit.svelte.dev/docs
- **Svelte**: https://svelte.dev/docs
- **TypeScript**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vitest**: https://vitest.dev/guide
- **Playwright**: https://playwright.dev/docs

### Learning Resources
- **Svelte Tutorial**: https://svelte.dev/tutorial
- **SvelteKit Tutorial**: https://learn.svelte.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook
- **Testing Library**: https://testing-library.com/docs

### Community
- **Discord**: Join the Svelte Discord server
- **GitHub Discussions**: Participate in project discussions
- **Stack Overflow**: Tag questions with `svelte` and `sveltekit`

---

## Contributing Guidelines

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the code style guidelines
4. Write tests for new functionality
5. Ensure all tests pass: `npm run test`
6. Commit using conventional commit format
7. Push to your fork: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Pull Request Process
1. **Description**: Provide clear description of changes
2. **Testing**: Include test coverage for new features
3. **Documentation**: Update documentation if needed
4. **Performance**: Consider performance impact
5. **Breaking Changes**: Clearly document any breaking changes

### Code Review Guidelines
- **Functionality**: Does the code work as intended?
- **Testing**: Are there adequate tests?
- **Performance**: Are there any performance concerns?
- **Security**: Are there any security implications?
- **Maintainability**: Is the code clean and well-documented?

---

*Last Updated: August 15, 2025*  
*Developer Guide Version: 2.0.0*  
*Next Review: November 15, 2025*