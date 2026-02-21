# Hound - Implementation Checklist

## Phase 1: Project Foundation
- [ ] Initialize Next.js 15 with TypeScript, Tailwind, App Router
- [ ] Set up Prisma with PostgreSQL schema
- [ ] Add NextAuth.js with credentials provider
- [ ] Build dashboard layout (sidebar, topbar) with shadcn/ui
- [ ] Build project CRUD (create, list, view, settings)

## Phase 2: Test Authoring
- [ ] Build test list page with create/edit/delete
- [ ] Build test editor with step palette
- [ ] Add drag-and-drop step ordering
- [ ] Build step configuration forms per step type
- [ ] Natural language input for AI steps
- [ ] API routes for test and step CRUD

## Phase 3: Execution Engine
- [ ] Build executor.ts — core orchestrator
- [ ] Build step handlers for each StepType
- [ ] Build screenshot capture system
- [ ] Build SSE streaming endpoint
- [ ] Build run viewer UI (step timeline, screenshots, logs)
- [ ] Real-time execution updates in UI

## Phase 4: AI Agent Layer
- [ ] Build Locator Agent (element targeting via Claude)
- [ ] Build Assertion Agent (AI-powered assertions)
- [ ] Build Failure Analysis Agent
- [ ] Implement step caching
- [ ] Integrate agents into execution engine

## Phase 5: Dashboard & Polish
- [ ] Run history page with filters
- [ ] Test health indicators (pass rate, flakiness)
- [ ] Screenshot comparison (visual diff)
- [ ] Environment/variable management
- [ ] Bulk test operations
