# Hound AI Platform — Progress Tracker

**Last Updated:** February 22, 2026
**Current Phase:** Phase 10 — Next-Generation Testing Experience
**Current Task:** Phase 10.1 DONE — Live Browser View
**Branch:** `main`

---

## How to Use This File

This file tracks every task completed, in progress, or blocked. When resuming work, share this file and `ROADMAP.md` with the session. The AI will pick up from the last completed task.

**Status Legend:**
- `DONE` — Completed and tested
- `IN PROGRESS` — Currently being worked on
- `BLOCKED` — Waiting on something
- `SKIPPED` — Intentionally deferred
- `NOT STARTED` — Queued

---

## Pre-Phase 6: Completed Work (Before This Roadmap)

### Phase 1: Project Foundation — DONE
- [x] Next.js 15 + TypeScript + Tailwind CSS + App Router
- [x] Prisma ORM with SQLite
- [x] NextAuth.js credentials authentication
- [x] Dashboard layout (sidebar, topbar, shadcn/ui)
- [x] Project CRUD

### Phase 2: Test Authoring — DONE
- [x] Test list page with search, create, edit, delete
- [x] Test editor with step palette (17 step types)
- [x] Step reordering (move up/down)
- [x] Step configuration forms for each type
- [x] Natural language input for AI steps
- [x] API routes for test and step CRUD

### Phase 3: Execution Engine — DONE
- [x] Core executor (`src/lib/engine/executor.ts`)
- [x] Step handlers for all StepTypes (`src/lib/engine/step-handlers.ts`)
- [x] Screenshot capture (`src/lib/engine/screenshot.ts`)
- [x] SSE streaming (`src/app/api/runs/[runId]/stream/route.ts`)
- [x] Run viewer UI (timeline, screenshots, logs)
- [x] Real-time updates via EventSource

### Phase 4: AI Agent Layer — DONE
- [x] Locator Agent (`src/lib/ai/locator-agent.ts`)
- [x] Assertion Agent (`src/lib/ai/assertion-agent.ts`)
- [x] Failure Analysis Agent (`src/lib/ai/failure-agent.ts`)
- [x] Step caching schema (StepCache model)
- [x] AI agents integrated into engine

### Phase 5: Dashboard & Polish — DONE
- [x] Run history page with status filters
- [x] Test health indicators (pass rate, flakiness)
- [x] Screenshot comparison (visual diff with pixelmatch)
- [x] Environment/variable management
- [x] Bulk test operations
- [x] User settings page (profile, API keys, password change)

---

## Phase 6: Production Hardening — DONE

### 6.1 — PostgreSQL Migration
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Update schema.prisma for PostgreSQL | DONE | Feb 22, 2026 | Provider already set to postgresql |
| Fix all @prisma/client imports to @/generated/prisma | DONE | Feb 22, 2026 | 3 files fixed: db.ts, tests/route.ts, tests/[testId]/route.ts |
| Add docker-compose.yml | DONE | Feb 22, 2026 | PostgreSQL 16 + MinIO services |
| Create .env.example | DONE | Feb 22, 2026 | All env vars documented |
| Generate Prisma client | DONE | Feb 22, 2026 | v6.19.2 generated successfully |

### 6.2 — S3/MinIO Artifact Storage
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create artifact-store.ts abstraction | DONE | Feb 22, 2026 | Interface: upload, download, getUrl, delete, list, cleanup |
| Local filesystem backend | DONE | Feb 22, 2026 | `src/lib/storage/local-store.ts` — stores in data/artifacts/ |
| S3-compatible backend | DONE | Feb 22, 2026 | `src/lib/storage/s3-store.ts` — works with AWS S3 and MinIO |
| Factory with env-based switching | DONE | Feb 22, 2026 | `src/lib/storage/index.ts` — STORAGE_PROVIDER env var |
| Migrate screenshot storage | DONE | Feb 22, 2026 | screenshot.ts now uses artifact store |
| Artifact serving API | DONE | Feb 22, 2026 | `/api/artifacts/[...path]` route |
| Cleanup policy | DONE | Feb 22, 2026 | Configurable retention days in both backends |

### 6.3 — Step Cache Enhancement
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Branch-aware cache keys | DONE | Feb 22, 2026 | StepCache model has branch, cacheKey, projectId + index |
| TTL with auto-cleanup | DONE | Feb 22, 2026 | 90-day default, cleanupExpiredCache() function |
| Cache hit/miss tracking | DONE | Feb 22, 2026 | cacheHit field on StepResult, tracked in executor |
| Main branch cache warming | DONE | Feb 22, 2026 | warmFromBranch() copies entries between branches |
| Persistent DB caching | DONE | Feb 22, 2026 | 3-tier lookup: in-memory → DB cache → AI resolution |
| Cache management API | DONE | Feb 22, 2026 | `/api/projects/[projectId]/cache` — GET stats, DELETE clear |

### 6.4 — Failure Retry & Recovery
| Task | Status | Date | Notes |
|------|--------|------|-------|
| maxRetries field on TestStep | DONE | Feb 22, 2026 | Int, default 0 |
| continueOnFailure flag on Test | DONE | Feb 22, 2026 | Boolean, default false |
| retryCount on StepResult | DONE | Feb 22, 2026 | Int, default 0 |
| Retry logic in executor | DONE | Feb 22, 2026 | Exponential backoff (1s, 2s, 4s), configurable per step |
| AI Recovery Agent | DONE | Feb 22, 2026 | `src/lib/ai/recovery-agent.ts` — 6 recovery actions |
| Recovery execution | DONE | Feb 22, 2026 | dismiss_modal, wait_for_element, scroll_into_view, refresh, close_popup |
| step_retry event type | DONE | Feb 22, 2026 | Added to RunEvent type |
| Run viewer retry display | DONE | Feb 22, 2026 | Orange "Retried ×N" badge on steps |

### 6.5 — Auth State Save/Load
| Task | Status | Date | Notes |
|------|--------|------|-------|
| SAVE_AUTH step type | DONE | Feb 22, 2026 | Saves browser storageState to DB |
| LOAD_AUTH step type | DONE | Feb 22, 2026 | Loads cookies + localStorage from saved state |
| AuthState model | DONE | Feb 22, 2026 | With projectId, name unique constraint, expiry |
| Auth state management API | DONE | Feb 22, 2026 | `/api/projects/[projectId]/auth-states` — GET, POST, DELETE |
| Step type labels & categories | DONE | Feb 22, 2026 | Added to STEP_TYPE_LABELS and STEP_TYPE_CATEGORIES |
| Auto-expiry | DONE | Feb 22, 2026 | 24-hour default TTL |

### 6.6 — Video Recording
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Enable Playwright recordVideo | DONE | Feb 22, 2026 | Conditional in executor based on recordVideo flag |
| Store in artifact store | DONE | Feb 22, 2026 | Saved as videos/{runId}/recording.webm |
| videoUrl field on TestRun | DONE | Feb 22, 2026 | Updated after recording saved |
| recordVideo flag on API | DONE | Feb 22, 2026 | Accepted in POST /api/runs |
| Video player in run viewer | DONE | Feb 22, 2026 | Video tab with HTML5 player, conditional display |

### 6.7 — HAR Network Capture
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Enable recordHar | DONE | Feb 22, 2026 | Conditional in executor based on recordHar flag |
| Store HAR in artifact store | DONE | Feb 22, 2026 | Saved as har/{runId}/network.har |
| harUrl field on TestRun | DONE | Feb 22, 2026 | Updated after HAR saved |
| HAR serving API | DONE | Feb 22, 2026 | `/api/runs/[runId]/har` route |
| Network waterfall viewer | DONE | Feb 22, 2026 | Table with method, URL, status, type, size, duration |
| Slow/failed request flagging | DONE | Feb 22, 2026 | >1s requests highlighted with warning icon |

---

## Phase 7: Developer Experience — DONE

### 7.1 — CLI Runner
| Task | Status | Date | Notes |
|------|--------|------|-------|
| CLI package structure | DONE | Feb 22, 2026 | `packages/cli/` with TypeScript, commander |
| `hound run` command | DONE | Feb 22, 2026 | Runs tests, polls for results, exit codes |
| `hound list` command | DONE | Feb 22, 2026 | List projects and tests |
| `hound login` command | DONE | Feb 22, 2026 | Interactive or --url/--key flags |
| JUnit XML reporter | DONE | Feb 22, 2026 | `--reporter=junit` output |
| JSON reporter | DONE | Feb 22, 2026 | `--reporter=json` output |
| Terminal progress output | DONE | Feb 22, 2026 | Step-by-step status with icons |
| npm publish setup | DONE | Feb 22, 2026 | package.json with @hound-ai/cli |

### 7.2 — Test Export (Playwright)
| Task | Status | Date | Notes |
|------|--------|------|-------|
| playwright-exporter.ts | DONE | Feb 22, 2026 | `src/lib/export/playwright-exporter.ts` |
| Map all 23 step types | DONE | Feb 22, 2026 | All mapped including new types |
| Export API route | DONE | Feb 22, 2026 | GET `/api/tests/[testId]/export` |
| Bulk export | DONE | Feb 22, 2026 | Via API route per test |

### 7.3 — Test Import (Playwright)
| Task | Status | Date | Notes |
|------|--------|------|-------|
| playwright-importer.ts | DONE | Feb 22, 2026 | `src/lib/import/playwright-importer.ts` |
| Parse .spec.ts files | DONE | Feb 22, 2026 | 18 Playwright patterns recognized |
| Import API route | DONE | Feb 22, 2026 | POST `/api/tests/import` |
| Clipboard import | DONE | Feb 22, 2026 | Accepts code string in POST body |

### 7.4 — GitHub Actions Integration
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Workflow template YAML | DONE | Feb 22, 2026 | `.github/workflows/hound-tests.yml` |
| Artifact upload | DONE | Feb 22, 2026 | JUnit XML results uploaded |

### 7.5 — Request Mocking
| Task | Status | Date | Notes |
|------|--------|------|-------|
| MOCK_ROUTE step type schema | DONE | Feb 22, 2026 | Added to StepType enum |
| page.route() implementation | DONE | Feb 22, 2026 | With method filtering, status, headers, body |
| REMOVE_MOCK step type | DONE | Feb 22, 2026 | Uses page.unroute() |
| Mock config fields | DONE | Feb 22, 2026 | mockUrlPattern, mockMethod, mockStatusCode, etc. |

### 7.6 — Conditional Steps
| Task | Status | Date | Notes |
|------|--------|------|-------|
| CONDITIONAL step type | DONE | Feb 22, 2026 | 4 condition types: element_exists, text_contains, url_matches, variable_equals |
| Condition evaluators | DONE | Feb 22, 2026 | Returns conditionMet + thenSteps/elseSteps |
| SKIP_IF shorthand | DONE | Feb 22, 2026 | Returns skipped signal for executor |

### 7.7 — Parallel Execution
| Task | Status | Date | Notes |
|------|--------|------|-------|
| parallel-executor.ts | DONE | Feb 22, 2026 | Worker-pool pattern with shared queue |
| Configurable concurrency | DONE | Feb 22, 2026 | Default 4, max 10 via API |
| Result aggregation | DONE | Feb 22, 2026 | Collects status/duration per run |
| Bulk run API | DONE | Feb 22, 2026 | POST `/api/runs/bulk` with parallel execution |

---

## Phase 8: The Differentiators

### 8.1 — Accessibility Testing
| Task | Status | Date | Notes |
|------|--------|------|-------|
| axe-core integration | DONE | Feb 22, 2026 | CDN injection into Playwright page |
| Per-step/per-test audit config | DONE | Feb 22, 2026 | wcagLevel, failOnA11y, impactThreshold |
| AccessibilityResult model | DONE | Feb 22, 2026 | Linked to StepResult and TestRun |
| ASSERT_ACCESSIBLE step type | DONE | Feb 22, 2026 | Step handler with dynamic import |
| Accessibility score (0-100) | DONE | Feb 22, 2026 | Stored on TestRun |
| AI remediation suggestions | DONE | Feb 22, 2026 | `a11y-remediation.ts` with Claude |
| WCAG AA/AAA support | DONE | Feb 22, 2026 | Configurable per project and step |
| Accessibility API | DONE | Feb 22, 2026 | GET `/api/runs/[runId]/accessibility` |

### 8.2 — Performance Metrics
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Core Web Vitals capture | DONE | Feb 22, 2026 | LCP, CLS, INP, FCP, TTFB |
| PerformanceMetric model | DONE | Feb 22, 2026 | Linked to StepResult and TestRun |
| Performance budgets | DONE | Feb 22, 2026 | Per-project configurable thresholds |
| Fail on budget exceeded | DONE | Feb 22, 2026 | overBudget flag on metrics |
| Performance trends API | DONE | Feb 22, 2026 | GET `/api/projects/[id]/performance` |
| Network timing per step | DONE | Feb 22, 2026 | DNS, TCP, TLS, TTFB, Download |
| Budget management API | DONE | Feb 22, 2026 | PUT `/api/projects/[id]/performance` |

### 8.3 — Security Scanning
| Task | Status | Date | Notes |
|------|--------|------|-------|
| SECURITY_SCAN step type | DONE | Feb 22, 2026 | Step handler with dynamic import |
| XSS detection | DONE | Feb 22, 2026 | Inline handlers + unsafe DOM ops |
| CSRF check | DONE | Feb 22, 2026 | POST/PUT/DELETE forms without tokens |
| Security header analysis | DONE | Feb 22, 2026 | CSP, HSTS, X-Frame, X-Content-Type, Referrer |
| Cookie security audit | DONE | Feb 22, 2026 | Secure, HttpOnly, SameSite flags |
| Mixed content detection | DONE | Feb 22, 2026 | HTTP resources on HTTPS pages |
| SecurityFinding model | DONE | Feb 22, 2026 | Linked to TestRun and Project |
| Security score (A-F) | DONE | Feb 22, 2026 | Grade based on severity counts |
| Security API | DONE | Feb 22, 2026 | GET `/api/runs/[runId]/security` |

### 8.4 — AI Test Generation
| Task | Status | Date | Notes |
|------|--------|------|-------|
| test-generator.ts | DONE | Feb 22, 2026 | Claude-powered generation |
| Multi-step generation | DONE | Feb 22, 2026 | NL → structured test steps |
| Generate from URL | DONE | Feb 22, 2026 | Analyzes page content → multiple tests |
| Refinement loop | DONE | Feb 22, 2026 | Iterative feedback-based refinement |
| Generate API | DONE | Feb 22, 2026 | POST `/api/tests/generate` (3 modes) |

### 8.5 — Code-Level Analysis
| Task | Status | Date | Notes |
|------|--------|------|-------|
| failure-correlator.ts | DONE | Feb 22, 2026 | AI traces failures to code changes |
| Git diff analysis on failure | DONE | Feb 22, 2026 | Accepts diff, returns probable cause |
| Correlation API | DONE | Feb 22, 2026 | POST `/api/runs/[runId]/correlate` |

---

## Phase 9: Platform Scale

### 9.1 — Scheduled Monitoring
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Schedule model | DONE | Feb 22, 2026 | Cron, timezone, testIds, region |
| Cron parser | DONE | Feb 22, 2026 | Custom parser with next-run calculation |
| Scheduler service | DONE | Feb 22, 2026 | checkAndRunSchedules(), auto-advance |
| Schedule API | DONE | Feb 22, 2026 | CRUD at `/api/projects/[id]/schedules` |

### 9.2 — Alerting & Notifications
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Webhook integration | DONE | Feb 22, 2026 | HMAC-SHA256 signed, event filtering |
| Webhook API | DONE | Feb 22, 2026 | CRUD at `/api/projects/[id]/webhooks` |
| Run completion notifications | DONE | Feb 22, 2026 | run_passed/run_failed/run_error events |

### 9.3 — Multi-Region Execution
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Region definitions | DONE | Feb 22, 2026 | 6 regions (US, EU, APAC) |
| Region selection | DONE | Feb 22, 2026 | Per schedule, API endpoint |
| Regions API | DONE | Feb 22, 2026 | GET `/api/regions` |

### 9.4 — Team Collaboration
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Comments system | DONE | Feb 22, 2026 | Any target type, owner-only edit/delete |
| Failure assignment | DONE | Feb 22, 2026 | POST `/api/runs/[id]/assign` |
| Activity feed | DONE | Feb 22, 2026 | Cursor-based pagination |
| Activity logging | DONE | Feb 22, 2026 | Reusable logActivity() helper |

### 9.5 — Browser Extension Recorder
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Chrome extension | DEFERRED | | Requires dedicated browser extension project |

### 9.6 — Plugin Architecture
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Plugin API definition | DONE | Feb 22, 2026 | HoundPlugin interface (steps, reporters, analyzers) |
| Plugin registry | DONE | Feb 22, 2026 | Dynamic loading, caching, hook dispatch |
| Built-in: Slack | DONE | Feb 22, 2026 | Webhook notifications with attachments |
| Built-in: GitHub | DONE | Feb 22, 2026 | PR comments with step table |
| Built-in: Jira | DONE | Feb 22, 2026 | Bug ticket creation on failures |
| Built-in: Linear | DONE | Feb 22, 2026 | Issue creation via GraphQL API |
| Plugin management API | DONE | Feb 22, 2026 | CRUD for definitions and project installs |

### 9.7 — Pricing & Billing
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Usage tracking | DONE | Feb 22, 2026 | Monthly run counts, per-user |
| Tier system | DONE | Feb 22, 2026 | Free/Pro/Enterprise with limits |
| Run quota checking | DONE | Feb 22, 2026 | checkRunQuota() gate |
| Usage API | DONE | Feb 22, 2026 | GET `/api/usage` |

---

## Session Log

Track what was done in each work session for easy resume.

### Session 1 — February 22, 2026
- **Duration:** ~1 hour
- **What was done:**
  - Full codebase exploration and understanding
  - Competitive analysis (Momentic.ai deep dive + 10 competitors)
  - Market gap analysis (7 major gaps identified)
  - Created ROADMAP.md (this roadmap) with 4 phases, 25 feature areas
  - Created PROGRESS.md (this tracker)
  - Identified 6 USPs that differentiate Hound from all competitors
- **What to do next:**
  - Start Phase 6.1 (PostgreSQL migration) OR
  - Start Phase 6.3 (Step cache enhancement) if staying on SQLite for now OR
  - Start Phase 6.4 (Failure retry & recovery) for immediate engine improvements
- **Branch:** `new-feat`
- **Key files created:** `ROADMAP.md`, `PROGRESS.md`

### Session 2 — February 22, 2026
- **Duration:** ~45 minutes
- **What was done:**
  - Completed ALL of Phase 6 (Production Hardening) — 7 sub-tasks, 40+ items
  - **6.1 PostgreSQL Migration:** Fixed Prisma imports (3 files), created docker-compose.yml (PostgreSQL 16 + MinIO), created .env.example, regenerated Prisma client
  - **6.2 S3/MinIO Artifact Storage:** Created full storage abstraction layer (interface, local backend, S3 backend, factory), migrated screenshot storage, added artifact serving API route
  - **6.3 Step Cache Enhancement:** Created step-cache.ts service with 3-tier lookup (in-memory → DB → AI), branch-aware caching, TTL, cache warming, cache stats API, integrated into executor and step handlers
  - **6.4 Failure Retry & Recovery:** Implemented retry loop with exponential backoff in executor, created AI recovery agent (6 recovery actions), added continueOnFailure support, step_retry events
  - **6.5 Auth State Save/Load:** Added SAVE_AUTH/LOAD_AUTH step types, AuthState model, step handlers using Playwright storageState, auth state management API
  - **6.6 Video Recording:** Enabled Playwright recordVideo, artifact storage for videos, videoUrl on TestRun, Video tab with HTML5 player in run viewer
  - **6.7 HAR Network Capture:** Enabled Playwright recordHar, HAR storage, network waterfall viewer in run viewer with request table, slow request flagging
  - **UI Updates:** Cache hit badges, retry indicators, Video tab, Network tab in run viewer
  - **Schema Changes:** 19 step types (added SAVE_AUTH, LOAD_AUTH), new AuthState model, new fields on Test, TestStep, TestRun, StepResult, StepCache
- **Key files created:**
  - `docker-compose.yml`, `.env.example`
  - `src/lib/storage/artifact-store.ts`, `src/lib/storage/local-store.ts`, `src/lib/storage/s3-store.ts`, `src/lib/storage/index.ts`
  - `src/lib/engine/step-cache.ts`
  - `src/lib/ai/recovery-agent.ts`
  - `src/app/api/artifacts/[...path]/route.ts`
  - `src/app/api/projects/[projectId]/cache/route.ts`
  - `src/app/api/projects/[projectId]/auth-states/route.ts`
  - `src/app/api/projects/[projectId]/auth-states/[stateId]/route.ts`
  - `src/app/api/runs/[runId]/har/route.ts`
  - `src/types/modules.d.ts`
- **Key files modified:**
  - `prisma/schema.prisma` — all Phase 6 schema changes
  - `src/lib/db.ts` — fixed import
  - `src/lib/engine/executor.ts` — retry/recovery, video, HAR, cache integration
  - `src/lib/engine/step-handlers.ts` — persistent cache, SAVE_AUTH, LOAD_AUTH
  - `src/lib/engine/screenshot.ts` — artifact store migration
  - `src/types/test.ts` — new step types, config fields
  - `src/types/run.ts` — new event types, result fields
  - `src/app/api/runs/route.ts` — recordVideo, recordHar flags
  - `src/app/api/runs/[runId]/route.ts` — new fields in query
  - `src/app/api/tests/route.ts` — fixed import
  - `src/app/api/tests/[testId]/route.ts` — fixed import
  - Run viewer page — cache badges, retry badges, Video tab, Network tab
- **Branch:** `new-feat`
- **TypeScript status:** All new code compiles cleanly. Pre-existing errors remain in variables routes and compare route.

### Session 3 — Phase 7: Developer Experience (Feb 22, 2026)
- **Scope:** All 7 sub-tasks of Phase 7
- **Work done:**
  - **7.1 CLI Runner:** Created `packages/cli/` with commander-based CLI. Commands: `hound run` (with polling, JUnit/JSON/text reporters), `hound list` (projects/tests), `hound login` (interactive or flags). HTTP client reads from `~/.hound/config.json` or env vars.
  - **7.2 Test Export:** Created `src/lib/export/playwright-exporter.ts` mapping all 23 step types to Playwright API calls. Export API route at `GET /api/tests/[testId]/export` returns downloadable `.spec.ts` file.
  - **7.3 Test Import:** Created `src/lib/import/playwright-importer.ts` with regex-based parsing recognizing 18 Playwright patterns. Import API route at `POST /api/tests/import` returns extracted steps.
  - **7.4 GitHub Actions:** Created `.github/workflows/hound-tests.yml` workflow template with Node.js setup, CLI install, test execution, and JUnit artifact upload.
  - **7.5 Request Mocking:** Added MOCK_ROUTE and REMOVE_MOCK step types to schema. Implemented `page.route()`/`page.unroute()` handlers with method filtering, status code, headers, and body config.
  - **7.6 Conditional Steps:** Added CONDITIONAL and SKIP_IF step types. Four condition evaluators: element_exists, text_contains, url_matches, variable_equals. Returns branching metadata for executor.
  - **7.7 Parallel Execution:** Created `src/lib/engine/parallel-executor.ts` with worker-pool pattern. Configurable concurrency (default 4, max 10). Bulk run API at `POST /api/runs/bulk`.
  - **Schema Changes:** 23 step types total (added MOCK_ROUTE, REMOVE_MOCK, CONDITIONAL, SKIP_IF).
- **Key files created:**
  - `packages/cli/package.json`, `packages/cli/tsconfig.json`, `packages/cli/src/index.ts`, `packages/cli/src/client.ts`, `packages/cli/src/reporters.ts`
  - `packages/cli/src/commands/login.ts`, `packages/cli/src/commands/list.ts`, `packages/cli/src/commands/run.ts`
  - `src/lib/export/playwright-exporter.ts`, `src/lib/import/playwright-importer.ts`
  - `src/lib/engine/parallel-executor.ts`
  - `src/app/api/tests/[testId]/export/route.ts`, `src/app/api/tests/import/route.ts`, `src/app/api/runs/bulk/route.ts`
  - `.github/workflows/hound-tests.yml`
- **Key files modified:**
  - `prisma/schema.prisma` — added MOCK_ROUTE, REMOVE_MOCK, CONDITIONAL, SKIP_IF to StepType enum
  - `src/types/test.ts` — new config fields for mocking/conditionals, new labels/categories
  - `src/lib/engine/step-handlers.ts` — 4 new handlers
- **Branch:** `new-feat`
- **TypeScript status:** All new code compiles cleanly. Pre-existing errors remain.

### Session 4 — Phase 8: The Differentiators (Feb 22, 2026)
- **Scope:** All 5 sub-tasks of Phase 8
- **Work done:**
  - **8.1 Accessibility Testing:** Created `src/lib/engine/accessibility.ts` with axe-core CDN injection, WCAG A/AA/AAA audit support, score calculation. Added `ASSERT_ACCESSIBLE` step handler. Created `src/lib/ai/a11y-remediation.ts` for AI-powered fix suggestions. API at `GET /api/runs/[runId]/accessibility`.
  - **8.2 Performance Metrics:** Created `src/lib/engine/performance.ts` capturing Core Web Vitals (LCP, CLS, INP, FCP, TTFB) and network timing (DNS, TCP, TLS). Performance budgets configurable per project. APIs for run metrics and project trends.
  - **8.3 Security Scanning:** Created `src/lib/engine/security.ts` with 5 scan types: security headers, cookie audit, mixed content, CSRF detection, XSS vectors. A-F grade system. Added `SECURITY_SCAN` step handler. API at `GET /api/runs/[runId]/security`.
  - **8.4 AI Test Generation:** Created `src/lib/ai/test-generator.ts` with 3 modes: generate from description, generate from URL, iterative refinement. API at `POST /api/tests/generate`.
  - **8.5 Code-Level Analysis:** Created `src/lib/analysis/failure-correlator.ts` for AI-powered git diff → failure correlation. API at `POST /api/runs/[runId]/correlate`.
  - **Schema Changes:** 25 step types total (added ASSERT_ACCESSIBLE, SECURITY_SCAN). New models: AccessibilityResult, PerformanceMetric, SecurityFinding. New fields on Project (perf budgets, wcagLevel) and TestRun (accessibilityScore, securityGrade).
- **Key files created:**
  - `src/lib/engine/accessibility.ts`, `src/lib/engine/performance.ts`, `src/lib/engine/security.ts`
  - `src/lib/ai/a11y-remediation.ts`, `src/lib/ai/test-generator.ts`
  - `src/lib/analysis/failure-correlator.ts`
  - `src/app/api/runs/[runId]/accessibility/route.ts`, `src/app/api/runs/[runId]/performance/route.ts`, `src/app/api/runs/[runId]/security/route.ts`, `src/app/api/runs/[runId]/correlate/route.ts`
  - `src/app/api/projects/[projectId]/performance/route.ts`
  - `src/app/api/tests/generate/route.ts`
- **Key files modified:**
  - `prisma/schema.prisma` — new models, step types, project fields
  - `src/types/test.ts` — new config fields, labels, categories
  - `src/lib/engine/step-handlers.ts` — ASSERT_ACCESSIBLE, SECURITY_SCAN handlers, runId in StepContext
  - `src/lib/engine/executor.ts` — pass runId to step context
- **Branch:** `new-feat`
- **TypeScript status:** All new code compiles cleanly. Pre-existing errors remain.

### Session 5 — Phase 9: Platform Scale (Feb 22, 2026)
- **Scope:** 7 sub-tasks of Phase 9 (6 completed, 1 deferred)
- **Work done:**
  - **9.1 Scheduled Monitoring:** Created `src/lib/scheduler/cron-parser.ts` (custom 5-field parser, next-run calc, presets) and `src/lib/scheduler/scheduler.ts` (check due schedules, trigger runs, advance nextRunAt). CRUD API for schedules.
  - **9.2 Alerting & Notifications:** Created `src/lib/notifications/webhook.ts` with HMAC-SHA256 signed webhooks, event filtering, 10s timeout. CRUD API for webhooks. `notifyRunCompleted()` convenience function.
  - **9.3 Multi-Region:** Created `src/lib/regions.ts` with 6 static region definitions. GET `/api/regions` endpoint.
  - **9.4 Team Collaboration:** Created `src/lib/activity.ts` logging helper. Comments API (any target type, owner-only edit/delete). Activity feed with cursor-based pagination. Run failure assignment endpoint.
  - **9.5 Browser Extension:** Deferred — requires dedicated Chrome extension project.
  - **9.6 Plugin Architecture:** Created `src/lib/plugins/plugin-api.ts` (HoundPlugin interface with steps/reporters/analyzers), `plugin-registry.ts` (dynamic loading, caching, hook dispatch). 4 built-in plugins: Slack, GitHub, Jira, Linear. Full plugin management API.
  - **9.7 Pricing & Billing:** Created `src/lib/usage.ts` with 3 tiers (free/pro/enterprise), monthly usage tracking, quota checking. Usage API endpoint.
  - **Schema Changes:** 6 new models: Schedule, Webhook, Comment, ActivityLog, PluginDefinition, ProjectPlugin. New relations on User and Project.
- **Key files created:**
  - `src/lib/scheduler/cron-parser.ts`, `src/lib/scheduler/scheduler.ts`
  - `src/lib/notifications/webhook.ts`
  - `src/lib/regions.ts`, `src/lib/usage.ts`, `src/lib/activity.ts`
  - `src/lib/plugins/plugin-api.ts`, `src/lib/plugins/plugin-registry.ts`
  - `src/lib/plugins/built-in/slack.ts`, `github.ts`, `jira.ts`, `linear.ts`
  - 10 new API route files (schedules, webhooks, comments, activity, assign, regions, usage, plugins)
- **Key files modified:**
  - `prisma/schema.prisma` — 6 new models, new relations on User and Project
  - `src/lib/activity.ts` — fixed Prisma Json type cast
- **All roadmap phases complete (6-9). The platform is feature-complete.**
- **Branch:** `new-feat`
- **TypeScript status:** All new code compiles cleanly. Pre-existing errors remain.

---

## Phase 10: Next-Generation Testing Experience

### 10.1 — Live Browser View (Foundation) — DONE
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create `src/lib/engine/screencast.ts` — CDP screencast manager | DONE | Feb 22, 2026 | ScreencastManager class with start/stop, frame callbacks, JPEG quality 65, configurable FPS (default 15, max 30) via everyNthFrame |
| Create `src/lib/ws/server.ts` — WebSocket frame streaming server | DONE | Feb 22, 2026 | Room-based connections keyed by runId, binary frame transmission, 30s heartbeat, auto-cleanup on disconnect |
| Create `src/lib/ws/types.ts` — WebSocket message protocol | DONE | Feb 22, 2026 | Message types: frame, cursor_move, click_indicator, element_highlight, step_info, error, connection_ack, heartbeat, screencast_started/stopped. Binary header protocol (12 bytes) |
| Create `src/lib/engine/live-frame-bus.ts` — frame event bus | DONE | Feb 22, 2026 | EventEmitter-based bus bridging screencast to WS and SSE consumers. emitFrame/onFrame, emitOverlay/onOverlay, cleanupRun |
| Modify executor.ts — integrate screencast into test execution | DONE | Feb 22, 2026 | Start screencast when `liveView: true`, emit element highlights before CLICK/TYPE/HOVER/SELECT/PRESS_KEY/SCROLL, emit click indicators, emit step info |
| Modify types/run.ts — add live view event types | DONE | Feb 22, 2026 | Added screencast_started, screencast_stopped, element_highlight to RunEvent type |
| Create `LiveBrowserView.tsx` — canvas-based viewer component | DONE | Feb 22, 2026 | Canvas rendering via createImageBitmap, WebSocket binary frames, SSE fallback, connection status, FPS counter, reconnection logic |
| Create `BrowserOverlay.tsx` — cursor trail, click indicators, highlights | DONE | Feb 22, 2026 | Framer Motion animations: cursor dot with ping, expanding click ripples, element bounding boxes with labels, step info badge |
| Create `BrowserToolbar.tsx` — zoom, FPS, screenshot controls | DONE | Feb 22, 2026 | Zoom in/out/reset, FPS display, screenshot capture, fullscreen toggle, connection status badge |
| Add `liveView` flag to POST /api/runs | DONE | Feb 22, 2026 | Added to zod schema and passed to executeTestRun |
| Create WebSocket server via instrumentation hook | DONE | Feb 22, 2026 | src/instrumentation.ts starts WS server on port 3001 when Next.js boots (Node.js runtime) |
| Integrate into run viewer page as "Live" tab | DONE | Feb 22, 2026 | New "Live" tab with Monitor icon, visible when run is RUNNING/PENDING, contains LiveBrowserView + BrowserOverlay + BrowserToolbar |
| Add SSE fallback for base64 JPEG frames | DONE | Feb 22, 2026 | GET /api/runs/[runId]/live streams frames + overlay events over SSE with 10min timeout |

### 10.2 — Interactive Recording (Record from Live View)
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create `src/lib/engine/recorder.ts` — recording session manager | NOT STARTED | | Start/stop sessions, action dedup, session state |
| Create `src/lib/engine/input-forwarder.ts` — user input → browser | NOT STARTED | | CDP Input.dispatchMouseEvent/KeyEvent, coordinate translation |
| Create `src/lib/engine/action-recognizer.ts` — raw events → steps | NOT STARTED | | Click/type/navigate/select/scroll/hover/keypress recognition |
| Create `src/lib/ai/step-refiner.ts` — AI post-processing | NOT STARTED | | Optimize selectors, add waits/assertions, merge steps, generate descriptions |
| Create `POST /api/recorder/start` — start recording session | NOT STARTED | | Launch browser, navigate, start screencast |
| Create `POST /api/recorder/action` — forward user actions | NOT STARTED | | Forward to browser via CDP, return recognized step |
| Create `POST /api/recorder/stop` — stop and save test | NOT STARTED | | Finalize steps, AI refinement, save to DB |
| Create `GET /api/recorder/session/[sessionId]` — session state | NOT STARTED | | Current steps, browser status |
| Create `RecorderPanel.tsx` — main recording UI | NOT STARTED | | Split layout: browser + step list, controls |
| Create `StepPreview.tsx` — step card in recorder | NOT STARTED | | Inline edit, delete, reorder |
| Create `RecorderToolbar.tsx` — recording controls | NOT STARTED | | Record/pause/stop, timer, step count, quick-add buttons |
| Wire up recorder page at `/projects/[id]/tests/record` | NOT STARTED | | Full page with URL input and recording UI |

### 10.3 — Pause & Inspect Debug Mode
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Modify executor.ts — add ExecutionController (pause/resume/abort/skip) | NOT STARTED | | Promise gate pattern, global map by runId |
| Create `POST /api/runs/[runId]/control` — execution control API | NOT STARTED | | pause, resume, abort, skip, inject actions |
| Create `GET /api/runs/[runId]/inspect` — page inspection API | NOT STARTED | | a11y tree, DOM, console, network, storage, screenshot |
| Create `DebugPanel.tsx` — debug tools sidebar | NOT STARTED | | DOM inspector, a11y tree, console, network, storage tabs |
| Create `DebugToolbar.tsx` — execution controls | NOT STARTED | | Pause/resume/abort/skip/step-over/inject buttons |
| Add keyboard shortcuts (Space, N, S) | NOT STARTED | | Pause/resume, next step, skip |

### 10.4 — AI Co-Pilot Chat
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create `src/lib/ai/copilot-agent.ts` — AI co-pilot with page context | NOT STARTED | | Multi-turn chat with page awareness, action suggestions |
| Create `POST /api/runs/[runId]/copilot` — co-pilot chat API | NOT STARTED | | Message → AI response with optional action |
| Create `CopilotChat.tsx` — chat sidebar component | NOT STARTED | | Messages, action cards, quick actions, context indicators |
| Add conversation persistence per run | NOT STARTED | | Save chat history to DB |

### 10.5 — Test Impact Analysis
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create `src/lib/analysis/impact-analyzer.ts` — impact analysis engine | NOT STARTED | | Diff parsing, import chain, route mapping, test scoring |
| Create `POST /api/projects/[projectId]/impact` — impact analysis API | NOT STARTED | | Diff/commit input → affected tests output |
| Create `POST /api/projects/[projectId]/impact/run` — analyze and run | NOT STARTED | | One-call impact analysis + execution |
| Add GitHub webhook handler for PR events | NOT STARTED | | Auto-run on PR open/sync, post PR comment |
| Create `ImpactGraph.tsx` — visual dependency graph | NOT STARTED | | Files → components → pages → tests, interactive |
| Add test → URL mapping from historical runs | NOT STARTED | | Build coverage map over time |
| Add project settings for git repo integration | NOT STARTED | | Repo URL, access token |

### 10.6 — Chaos & Resilience Testing
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Add chaos step types to schema | NOT STARTED | | THROTTLE_NETWORK, BLOCK_REQUEST, INJECT_LATENCY, SIMULATE_ERROR, RESTORE_NETWORK |
| Create `src/lib/engine/chaos.ts` — chaos injection engine | NOT STARTED | | CDP network emulation, route blocking, latency injection, error simulation |
| Add step handlers for chaos types | NOT STARTED | | 5 new handlers |
| Create chaos step config UI | NOT STARTED | | Condition/preset selector, URL pattern, error code |
| Create `ChaosPresets.tsx` — preset scenario selector | NOT STARTED | | Mobile 3G, Offline, API Failure, High Latency |
| Add "Resilience Report" to run results | NOT STARTED | | Chaos conditions per step, resilience grade |

### 10.7 — Production Error → Test Generation
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create `src/lib/integrations/sentry.ts` — Sentry webhook handler | NOT STARTED | | Parse event payload, extract breadcrumbs, map to steps |
| Create `src/lib/integrations/datadog.ts` — Datadog webhook handler | NOT STARTED | | Parse event payload, session replay extraction |
| Create `src/lib/ai/error-to-test-generator.ts` — AI error → test | NOT STARTED | | Error context → structured test steps |
| Create Sentry webhook endpoint | NOT STARTED | | POST /api/integrations/sentry |
| Create Datadog webhook endpoint | NOT STARTED | | POST /api/integrations/datadog |
| Create `ErrorTestQueue.tsx` — generated test review queue | NOT STARTED | | Approve, edit, dismiss error-generated tests |
| Add project settings for error monitoring integration | NOT STARTED | | Sentry DSN, Datadog API key |

### 10.8 — Test Coverage Heatmap
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create `src/lib/analysis/coverage-tracker.ts` — element tracker | NOT STARTED | | Record element interactions during execution |
| Add CoverageData model to Prisma schema | NOT STARTED | | projectId, pageUrl, selector, interactionCount, testIds |
| Create coverage data API | NOT STARTED | | GET per-page, GET summary, POST generate |
| Create `CoverageHeatmap.tsx` — visual overlay component | NOT STARTED | | Screenshot + colored overlay boxes, click tooltips |
| Create `CoverageReport.tsx` — summary dashboard | NOT STARTED | | Per-page bars, most/least tested, trends |
| Modify executor to emit coverage events | NOT STARTED | | Track element interactions per step |

### 10.9 — Multi-Browser Split View
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Modify browser-pool.ts — support Firefox/WebKit | NOT STARTED | | getFirefoxBrowser(), getWebkitBrowser() |
| Create `cross-browser-executor.ts` — parallel execution | NOT STARTED | | Lockstep execution, per-browser screenshots, comparison |
| Create `SplitBrowserView.tsx` — side-by-side viewer | NOT STARTED | | 2-3 live views, sync scroll, diff overlay |
| Create cross-browser comparison report | NOT STARTED | | Per-step screenshot diff, consistency score |
| Add `browsers` option to run creation API | NOT STARTED | | Array of browser engines |

### 10.10 — Collaborative Live Sessions
| Task | Status | Date | Notes |
|------|--------|------|-------|
| Extend WebSocket server with room management | NOT STARTED | | Multi-user rooms, per-user cursor tracking |
| Create `collaboration.ts` — collaboration layer | NOT STARTED | | Presence, cursors, annotations, permissions |
| Create `CollaborationOverlay.tsx` — multi-user cursors | NOT STARTED | | Colored cursors with name labels, pinned annotations |
| Create `SessionChat.tsx` — in-session chat | NOT STARTED | | Messages, screenshot sharing, @mentions |
| Add shareable session links | NOT STARTED | | Token-based session sharing |

---

### Session 6 — February 22, 2026 (Phase 10 Planning)
- **Duration:** ~30 minutes
- **What was done:**
  - Full codebase exploration and architecture review
  - Competitive analysis for next-generation features
  - Brainstormed 10 new features for Phase 10:
    1. **Live Browser View** — real-time CDP screencast streaming via WebSocket
    2. **Interactive Recording** — record tests by interacting with live browser in dashboard (replaces deferred Browser Extension)
    3. **Pause & Inspect Debug Mode** — interactive test debugger with page inspection
    4. **AI Co-Pilot Chat** — conversational AI alongside live test execution
    5. **Test Impact Analysis** — git diff → affected tests with dependency graph
    6. **Chaos & Resilience Testing** — network throttling, error injection, resilience grading
    7. **Production Error → Test Generation** — Sentry/Datadog webhook → auto-generated tests
    8. **Test Coverage Heatmap** — visual element coverage overlay
    9. **Multi-Browser Split View** — side-by-side cross-browser live streaming
    10. **Collaborative Live Sessions** — shared sessions with cursors and chat
  - Detailed technical architecture for each feature including:
    - CDP screencast for frame streaming
    - WebSocket server for binary frame transport
    - Input forwarding via CDP Input.dispatch* for recording
    - Action recognition engine (raw DOM events → structured test steps)
    - AI step refinement (selector optimization, assertion suggestion)
    - Execution controller pattern (pause/resume via Promise gate)
    - Impact analysis via import chain + route + historical URL mapping
  - Updated ROADMAP.md with complete Phase 10 (10 sub-phases, 100+ implementation tasks)
  - Updated PROGRESS.md with tracking tables for all Phase 10 tasks
  - Updated competitive moat table with 10 new differentiators
- **What to do next:**
  - Start **10.1 Live Browser View** (foundation for 10.2, 10.3, 10.4, 10.9, 10.10)
  - Key first steps: `screencast.ts` (CDP manager) → `ws/server.ts` (WebSocket) → `LiveBrowserView.tsx` (canvas renderer)
  - Install `ws` package for WebSocket server
  - Independent features (10.5, 10.6, 10.7, 10.8) can be parallelized
- **Branch:** `main`
- **Key files modified:**
  - `ROADMAP.md` — Phase 10 added (10 sub-phases)
  - `PROGRESS.md` — Phase 10 tracking tables, session log

### Session 7 — February 22, 2026 (Phase 10.1: Live Browser View)
- **Duration:** ~45 minutes
- **What was done:**
  - Completed **Phase 10.1 — Live Browser View** (13 tasks, all DONE)
  - **Transport Layer:**
    - Created `src/lib/ws/types.ts` — Full WebSocket message protocol with 10 message types, binary frame header protocol (12 bytes: width, height, timestamp), client/server message unions
    - Created `src/lib/engine/live-frame-bus.ts` — EventEmitter-based bus bridging screencast frames to both WebSocket and SSE consumers, with per-run cleanup
    - Created `src/lib/ws/server.ts` — Room-based WebSocket server using `ws` package, binary frame broadcast, 30s heartbeat, auto-cleanup on disconnect, viewer count tracking
  - **Engine Integration:**
    - Created `src/lib/engine/screencast.ts` — `ScreencastManager` class wrapping CDP `Page.startScreencast`, configurable FPS/quality/resolution, overlay event emission (cursor, click, highlight, step info)
    - Modified `src/lib/engine/executor.ts` — Added `liveView` option, screencast start/stop lifecycle, element highlight emission before interactive steps (CLICK, TYPE, HOVER, SELECT, PRESS_KEY, SCROLL), click indicators after CLICK steps, step info overlay events
    - Modified `src/types/run.ts` — Added `screencast_started`, `screencast_stopped`, `element_highlight` to RunEvent type union
    - Modified `src/app/api/runs/route.ts` — Added `liveView` flag to zod schema, passed to executor
  - **Server Infrastructure:**
    - Created `src/instrumentation.ts` — Next.js instrumentation hook that starts WebSocket server on port 3001 when Node.js runtime boots
    - Modified `next.config.ts` — Enabled instrumentationHook, added `ws` to serverExternalPackages
    - Created `src/app/api/runs/[runId]/live/route.ts` — SSE fallback streaming base64 JPEG frames + overlay events when WebSocket unavailable
  - **Frontend Components:**
    - Created `src/components/live-browser/LiveBrowserView.tsx` — Canvas-based frame renderer with WebSocket binary frame support, SSE fallback, connection status, FPS counter, reconnection logic (max 10 attempts), frame capture API via forwardRef
    - Created `src/components/live-browser/BrowserOverlay.tsx` — Framer Motion animated overlays: cursor dot with ping animation, expanding click ripples, element bounding boxes with labels, step info badge with status colors
    - Created `src/components/live-browser/BrowserToolbar.tsx` — Zoom controls (25%-200%), FPS display, screenshot capture, fullscreen toggle, connection status badge with live indicator
  - **Run Viewer Integration:**
    - Added "Live" tab to run viewer page (visible when run is RUNNING/PENDING) with Monitor icon
    - Tab content renders LiveBrowserView + BrowserOverlay + BrowserToolbar with zoom transform
    - Screenshot capture downloads PNG, fullscreen toggle via Fullscreen API
  - **Dependencies Added:** `ws`, `@types/ws`, `tsx`
- **What to do next:**
  - Start **10.2 Interactive Recording** (builds on Live Browser View)
  - OR start independent features: **10.5 Test Impact Analysis**, **10.6 Chaos Testing**, **10.7 Error → Test Generation**, **10.8 Coverage Heatmap**
- **Branch:** `new-feat`
- **Key files created:**
  - `src/lib/ws/types.ts`, `src/lib/ws/server.ts`
  - `src/lib/engine/live-frame-bus.ts`, `src/lib/engine/screencast.ts`
  - `src/components/live-browser/LiveBrowserView.tsx`, `src/components/live-browser/BrowserOverlay.tsx`, `src/components/live-browser/BrowserToolbar.tsx`
  - `src/instrumentation.ts`
  - `src/app/api/runs/[runId]/live/route.ts`
- **Key files modified:**
  - `src/lib/engine/executor.ts` — liveView option, screencast lifecycle, overlay events
  - `src/app/api/runs/route.ts` — liveView flag
  - `src/types/run.ts` — new event types
  - `next.config.ts` — instrumentation + ws externals
  - `src/app/(dashboard)/projects/[projectId]/tests/[testId]/runs/[runId]/page.tsx` — Live tab
  - `package.json` — ws, @types/ws, tsx dependencies
  - `PROGRESS.md` — Phase 10.1 tasks marked DONE, session log
- **TypeScript status:** All new code compiles cleanly. No new linter errors introduced.

---

## Quick Resume Instructions

When starting a new session, tell the AI:

> Read `ROADMAP.md` and `PROGRESS.md` in my project root. Pick up where we left off. The last session log entry tells you what was done and what to do next.

The AI will:
1. Read both files
2. Check the session log for the last entry
3. Look at the "What to do next" section
4. Continue from there
