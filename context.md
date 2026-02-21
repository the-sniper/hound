# Hound AI Test Automation Platform - Context

**Last Updated:** February 21, 2026
**Current Branch:** `main`
**Status:** Core platform complete, Phase 5 features remaining

---

## What Has Been Completed

### Phase 1: Project Foundation ✅
- [x] Next.js 15 with TypeScript, Tailwind CSS, App Router
- [x] Prisma ORM with SQLite database
- [x] NextAuth.js authentication with credentials provider
- [x] Dashboard layout with sidebar, topbar using shadcn/ui
- [x] Project CRUD (create, list, view, settings pages)

### Phase 2: Test Authoring ✅
- [x] Test list page with search, create, edit, delete
- [x] Test editor with step palette (13 step types)
- [x] Step reordering (move up/down buttons)
- [x] Step configuration forms for each step type
- [x] Natural language input for AI-powered steps
- [x] API routes for test and step CRUD operations

### Phase 3: Execution Engine ✅
- [x] Core executor (`src/lib/engine/executor.ts`)
- [x] Step handlers for all StepTypes (`src/lib/engine/step-handlers.ts`)
- [x] Screenshot capture system (`src/lib/engine/screenshot.ts`)
- [x] SSE streaming endpoint (`src/app/api/runs/[runId]/stream/route.ts`)
- [x] Run viewer UI with step timeline, screenshots, logs
- [x] Real-time execution updates via EventSource

### Phase 4: AI Agent Layer ✅
- [x] Locator Agent (`src/lib/ai/locator-agent.ts`) - AI-powered element targeting
- [x] Assertion Agent (`src/lib/ai/assertion-agent.ts`) - AI-powered assertions
- [x] Failure Analysis Agent (`src/lib/ai/failure-agent.ts`) - Automatic failure diagnosis
- [x] Step caching schema (`StepCache` model in Prisma)
- [x] AI agents integrated into execution engine

### Phase 5: Dashboard & Polish (Partial)
- [x] Run history page with status filters
- [ ] Test health indicators (pass rate, flakiness score)
- [ ] Screenshot comparison (visual diff)
- [ ] Environment/variable management
- [ ] Bulk test operations

---

## Project Structure

```
/Users/areefsyed/Desktop/Code/hound/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, Signup pages
│   │   ├── (dashboard)/       # Dashboard layout + pages
│   │   │   ├── projects/
│   │   │   │   ├── [projectId]/
│   │   │   │   │   ├── page.tsx          # Project detail
│   │   │   │   │   ├── runs/page.tsx     # Run history
│   │   │   │   │   ├── settings/page.tsx # Project settings
│   │   │   │   │   └── tests/
│   │   │   │   │       ├── page.tsx              # Test list
│   │   │   │   │       └── [testId]/
│   │   │   │   │           ├── page.tsx          # Test editor
│   │   │   │   │           └── runs/[runId]/
│   │   │   │   │               └── page.tsx      # Run viewer
│   │   │   │   └── page.tsx  # Projects list
│   │   └── api/               # API routes
│   │       ├── auth/          # NextAuth + signup
│   │       ├── projects/      # Project CRUD
│   │       ├── tests/         # Test CRUD
│   │       └── runs/          # Run execution + streaming
│   ├── components/
│   │   ├── layout/            # DashboardShell, Sidebar, Topbar
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── ai/                # AI agents (locator, assertion, failure)
│   │   ├── engine/            # Execution engine
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client
│   │   └── utils.ts           # Utilities
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── dev.db                 # SQLite database
├── .env                       # Environment variables
└── package.json
```

---

## Database Schema

### Models
- **User** - Authentication
- **Project** - Test projects with baseUrl
- **ProjectMember** - Team membership
- **Test** - Test cases with steps
- **TestStep** - Individual test steps (13 types)
- **StepCache** - AI element caching
- **TestRun** - Test execution runs
- **StepResult** - Step execution results

### Step Types Supported
1. `NAVIGATE` - Navigate to URL
2. `CLICK` - Click element
3. `TYPE` - Type text
4. `WAIT` - Wait for duration
5. `WAIT_FOR_URL` - Wait for URL change
6. `ASSERT_TEXT` - Assert text content
7. `ASSERT_ELEMENT` - Assert element presence
8. `ASSERT_VISUAL` - Visual regression
9. `AI_CHECK` - AI-powered assertion
10. `AI_EXTRACT` - AI-powered data extraction
11. `AI_ACTION` - AI-powered action
12. `JAVASCRIPT` - Execute JavaScript
13. `SCREENSHOT` - Capture screenshot
14. `HOVER` - Hover over element
15. `SELECT` - Select dropdown option
16. `PRESS_KEY` - Press keyboard key
17. `SCROLL` - Scroll page/element

---

## What To Do Next

### Priority 1: Test Health Indicators
**Goal:** Show pass rate, flakiness score, and stability metrics for each test.

**Files to modify:**
- `src/app/(dashboard)/projects/[projectId]/tests/page.tsx` - Add health columns
- `src/app/(dashboard)/projects/[projectId]/tests/[testId]/page.tsx` - Show health stats
- `src/app/api/tests/route.ts` - Add health metrics endpoint

**Implementation:**
- Calculate pass rate from last N runs
- Detect flakiness (tests that flip between pass/fail)
- Show trend indicator (improving/stable/declining)

### Priority 2: Screenshot Comparison (Visual Diff)
**Goal:** Compare screenshots between runs to detect visual regressions.

**New files:**
- `src/lib/engine/visual-diff.ts` - Image comparison logic
- `src/app/api/runs/[runId]/compare/route.ts` - Comparison API
- New UI component for side-by-side diff view

**Implementation:**
- Store baseline screenshots
- Compare with pixelmatch or similar
- Highlight differences in run viewer

### Priority 3: Environment/Variable Management
**Goal:** Support multiple environments (dev, staging, prod) with variables.

**Files to modify:**
- `prisma/schema.prisma` - Add Environment model
- `src/app/(dashboard)/projects/[projectId]/settings/page.tsx` - Environment config
- `src/lib/engine/executor.ts` - Variable substitution

**Implementation:**
- Store environment variables per project
- Support variable syntax: `${variableName}`
- Switch environments when running tests

### Priority 4: Bulk Test Operations
**Goal:** Run multiple tests at once, delete multiple tests, etc.

**Files to modify:**
- `src/app/(dashboard)/projects/[projectId]/tests/page.tsx` - Bulk selection UI
- `src/app/api/tests/bulk/route.ts` - Bulk operations API
- `src/lib/engine/executor.ts` - Support batch execution

**Implementation:**
- Checkbox selection on test list
- Bulk run with parallel execution
- Bulk delete with confirmation

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/[...nextauth]` - Login/logout

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[projectId]` - Get project
- `PUT /api/projects/[projectId]` - Update project
- `DELETE /api/projects/[projectId]` - Delete project
- `GET /api/projects/[projectId]/runs` - Get project runs

### Tests
- `GET /api/tests?projectId=` - List tests
- `POST /api/tests` - Create test
- `GET /api/tests/[testId]` - Get test
- `PUT /api/tests/[testId]` - Update test
- `DELETE /api/tests/[testId]` - Delete test

### Test Steps
- `GET /api/tests/[testId]/steps` - List steps
- `POST /api/tests/[testId]/steps` - Create step
- `PUT /api/tests/[testId]/steps` - Bulk update/reorder
- `DELETE /api/tests/[testId]/steps` - Delete steps

### Runs
- `GET /api/runs?testId=` - List runs
- `POST /api/runs` - Create run (start execution)
- `GET /api/runs/[runId]` - Get run results
- `GET /api/runs/[runId]/stream` - SSE stream for real-time updates

---

## Configuration

### Environment Variables (.env)
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secret-key"
ANTHROPIC_API_KEY="your-anthropic-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Required for AI Features
- Anthropic API key is required for AI-powered steps

---

## Known Issues & Notes

1. **SQLite Database** - Currently using SQLite for simplicity. Can migrate to PostgreSQL for production.
2. **Config Field** - Step config stored as JSON string in SQLite (was changed from Json type for SQLite compatibility).
3. **Playwright Accessibility** - Using type assertion for `page.accessibility.snapshot()` due to TypeScript types.
4. **Node Version** - Some dependencies warn about Node version (requires 20+, currently on 18).

---

## Running the App

```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## Next Session TODO

When resuming work:

1. Check current branch: `git branch -v`
2. Pull latest if working remotely
3. Run `npm run dev` to start server
4. Pick one of the Phase 5 features to implement:
   - Test health indicators (recommended first)
   - Screenshot comparison
   - Environment/variable management
   - Bulk test operations

---

## Useful Commands

```bash
# Check git status
git status

# View branches
git branch -a

# Check worktrees
git worktree list

# Build the app
npm run build

# Run dev server
npm run dev

# Database operations
npx prisma studio
npx prisma migrate dev
npx prisma generate
```
