# Hound - Implementation Checklist

## Phase 1: Project Foundation
- [x] Initialize Next.js 15 with TypeScript, Tailwind, App Router
- [x] Set up Prisma with SQLite schema
- [x] Add NextAuth.js with credentials provider
- [x] Build dashboard layout (sidebar, topbar) with shadcn/ui
- [x] Build project CRUD (create, list, view, settings)

## Phase 2: Test Authoring
- [x] Build test list page with create/edit/delete
- [x] Build test editor with step palette
- [x] Add step reordering (move up/down)
- [x] Build step configuration forms per step type
- [x] Natural language input for AI steps
- [x] API routes for test and step CRUD

## Phase 3: Execution Engine
- [x] Build executor.ts — core orchestrator
- [x] Build step handlers for each StepType
- [x] Build screenshot capture system
- [x] Build SSE streaming endpoint
- [x] Build run viewer UI (step timeline, screenshots, logs)
- [x] Real-time execution updates in UI

## Phase 4: AI Agent Layer
- [x] Build Locator Agent (element targeting via Claude)
- [x] Build Assertion Agent (AI-powered assertions)
- [x] Build Failure Analysis Agent
- [x] Implement step caching schema
- [x] Integrate agents into execution engine

## Phase 5: Dashboard & Polish
- [x] Run history page with filters
- [x] Test health indicators (pass rate, flakiness)
- [x] Screenshot comparison (visual diff)
- [x] Environment/variable management
- [x] Bulk test operations
