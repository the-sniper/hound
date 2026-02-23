# Hound AI Platform — Master Roadmap

**Created:** February 22, 2026
**Goal:** Transform Hound into the gold-standard testing platform — unified code analysis, UI testing, security scanning, accessibility auditing, and performance monitoring in one AI-powered workflow.

**Positioning:** The first platform that makes Momentic look narrow. They do E2E/UI. We do everything from static analysis to production monitoring.

---

## Phase 6: Production Hardening

> Make the existing engine robust, scalable, and CI-ready.

### 6.1 — PostgreSQL Migration
- [ ] Update `prisma/schema.prisma` to use PostgreSQL provider
- [ ] Add `docker-compose.yml` with PostgreSQL service
- [ ] Update `.env.example` with PostgreSQL connection string
- [ ] Run migration, verify all models work
- [ ] Keep SQLite as a fallback for local dev (env-based provider switching)

### 6.2 — S3/MinIO Artifact Storage
- [ ] Create `src/lib/storage/artifact-store.ts` abstraction
- [ ] Support local filesystem (dev) and S3-compatible (prod) backends
- [ ] Migrate screenshot storage from `public/screenshots/` to artifact store
- [ ] Store video recordings, HAR files, and diff images in artifact store
- [ ] Add cleanup policy (configurable retention days)

### 6.3 — Step Cache Enhancement
- [ ] Add branch-aware cache keys: `projectId + branch + stepHash`
- [ ] Add TTL (90-day default) with automatic cleanup job
- [ ] Add cache hit/miss tracking per run (new fields on `StepResult`)
- [ ] Warm cache from main branch when running on feature branches
- [ ] Show cache hit rate in run viewer UI
- [ ] Add cache management page (view, clear, configure TTL)

### 6.4 — Failure Retry & Recovery
- [ ] Add `retryCount` and `maxRetries` fields to `TestStep` model
- [ ] Implement retry logic in executor (configurable per-step, default 0)
- [ ] Add AI recovery mode: on failure, ask Claude to generate a recovery step
- [ ] Add `continueOnFailure` flag to `Test` model
- [ ] Update run viewer to show retry attempts and recovery steps
- [ ] Recovery step types: dismiss modal, wait for element, scroll into view, refresh

### 6.5 — Auth State Save/Load
- [ ] Add `SAVE_AUTH` step type — calls `context.storageState()`, saves to artifact store
- [ ] Add `LOAD_AUTH` step type — loads saved state into new browser context
- [ ] Add auth state management UI (list saved states, delete, rename)
- [ ] Support auth state sharing across tests in same project
- [ ] Auto-expire auth states after configurable duration

### 6.6 — Video Recording
- [ ] Enable Playwright `recordVideo` option in executor
- [ ] Store video files in artifact store
- [ ] Add video player to run viewer UI
- [ ] Make recording optional (per-run toggle, default off in CI for speed)
- [ ] Add `recordVideo` flag to run creation API

### 6.7 — HAR Network Capture
- [ ] Enable `recordHar` in Playwright context options
- [ ] Store HAR files in artifact store
- [ ] Add network waterfall viewer in run viewer UI
- [ ] Filter by request type, status code, duration
- [ ] Flag slow requests (>1s) and failed requests (4xx/5xx)

---

## Phase 7: Developer Experience

> Make Hound usable in CI/CD pipelines and developer workflows.

### 7.1 — CLI Runner
- [ ] Create `packages/cli/` with a standalone Node.js CLI
- [ ] Commands: `hound run`, `hound list`, `hound login`, `hound init`
- [ ] `hound run --project=X --test=Y --parallel=N --reporter=junit`
- [ ] Exit codes: 0 = all passed, 1 = failures, 2 = errors
- [ ] Support `HOUND_API_KEY` env var for authentication
- [ ] JSON and JUnit XML reporter output
- [ ] Progress output with step-by-step status in terminal
- [ ] Publish to npm as `@hound-ai/cli`

### 7.2 — Test Export as Playwright Scripts
- [ ] Create `src/lib/export/playwright-exporter.ts`
- [ ] Convert each test + steps into a valid `.spec.ts` Playwright file
- [ ] Map all 17 step types to Playwright API calls
- [ ] Include comments with original step descriptions
- [ ] Add "Export" button to test editor UI
- [ ] Bulk export all tests in a project

### 7.3 — Test Import from Playwright
- [ ] Create `src/lib/import/playwright-importer.ts`
- [ ] Parse `.spec.ts` files and extract actions
- [ ] Map Playwright calls back to Hound step types
- [ ] Add "Import" option to test creation flow
- [ ] Support importing from clipboard (paste Playwright code)

### 7.4 — GitHub Actions Integration
- [ ] Create `.github/workflows/hound-tests.yml` template
- [ ] Support PR comments with test results summary
- [ ] GitHub Check Runs integration (pass/fail status on PRs)
- [ ] Artifact upload for screenshots and videos
- [ ] Documentation page for CI setup

### 7.5 — Request Mocking Step Type
- [ ] Add `MOCK_ROUTE` step type to schema
- [ ] Implement using Playwright `page.route()` API
- [ ] Config: `{ urlPattern, method, statusCode, responseBody, headers }`
- [ ] Add `REMOVE_MOCK` step type to clear mocks
- [ ] Support "passthrough with modification" (intercept, modify, forward)
- [ ] Add mock configuration UI in step editor

### 7.6 — Conditional Steps
- [ ] Add `CONDITIONAL` step type with `if/then/else` semantics
- [ ] Conditions: element exists, element contains text, URL matches, variable equals
- [ ] Config: `{ condition, thenSteps[], elseSteps[] }` (nested step groups)
- [ ] Add conditional step UI with visual branching in step editor
- [ ] Support `SKIP_IF` shorthand for common "skip this step if..." patterns

### 7.7 — Parallel Test Execution
- [ ] Create `src/lib/engine/parallel-executor.ts`
- [ ] Use worker threads or child processes for isolation
- [ ] Configurable concurrency limit (default 4)
- [ ] Resource-aware scaling (check available memory)
- [ ] Aggregate results from parallel runs
- [ ] Update bulk run API to support parallelism
- [ ] Show parallel execution status in UI

---

## Phase 8: The Differentiators (USPs)

> Features that make Hound unique in the market. No competitor does all of these.

### 8.1 — Accessibility Testing (WCAG Auditing)
- [ ] Integrate `axe-core` into the execution engine
- [ ] Run accessibility audit after every step (or configurable: per-step, end-of-test)
- [ ] New `AccessibilityResult` model: violations, impact level, WCAG criteria, element
- [ ] Add `ASSERT_ACCESSIBLE` step type — fail if critical violations found
- [ ] Accessibility score per run (0-100 based on violation count/severity)
- [ ] Accessibility trends dashboard (score over time per project)
- [ ] AI-powered remediation: Claude suggests exact code fixes for violations
- [ ] Generate accessibility report (PDF/HTML export)
- [ ] Support WCAG 2.1 AA and AAA levels
- [ ] Contrast ratio checking integrated into visual diff

### 8.2 — Performance Metrics (Core Web Vitals)
- [ ] Capture LCP, FID/INP, CLS, TTFB, FCP via `PerformanceObserver`
- [ ] New `PerformanceMetric` model linked to `StepResult`
- [ ] Performance budgets: configurable thresholds per project
- [ ] Fail test if performance budget exceeded (optional)
- [ ] Performance trends dashboard (metrics over time)
- [ ] Network timing per step (DNS, TCP, TLS, TTFB, download)
- [ ] Bundle size tracking (capture JS/CSS payload sizes)
- [ ] Lighthouse score integration (run full Lighthouse audit per test)
- [ ] Performance comparison between runs (regression detection)

### 8.3 — Security Scanning
- [ ] Add `SECURITY_SCAN` step type
- [ ] XSS detection: inject common payloads into form inputs during TYPE steps
- [ ] CSRF check: verify presence and validity of CSRF tokens
- [ ] Open redirect detection: check navigation targets
- [ ] Security header analysis: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] Cookie security audit: Secure, HttpOnly, SameSite flags
- [ ] Mixed content detection (HTTP resources on HTTPS pages)
- [ ] New `SecurityFinding` model: type, severity, location, evidence, remediation
- [ ] Security score per run (A/B/C/D/F grade)
- [ ] AI-powered exploit generation: Claude generates context-aware test payloads
- [ ] OWASP Top 10 checklist per project
- [ ] Dependency vulnerability scanning (scan `package.json` for known CVEs)

### 8.4 — AI Test Generation
- [ ] "Describe a test" input — user writes natural language, AI generates full test
- [ ] Create `src/lib/ai/test-generator.ts`
- [ ] Multi-step generation: AI breaks user story into individual test steps
- [ ] Smart defaults: auto-detect assertions, wait conditions, scroll needs
- [ ] Generate from URL: AI crawls the page and suggests tests for visible flows
- [ ] Generate from user stories: paste Jira/Linear ticket, AI creates test suite
- [ ] Bulk generation: "Generate smoke tests for this project" creates N tests
- [ ] Refinement loop: user reviews generated test, asks AI to modify

### 8.5 — Code-Level Analysis Integration
- [ ] Create `src/lib/analysis/static-analyzer.ts`
- [ ] Integrate ESLint programmatic API for JS/TS analysis
- [ ] Add custom rules for common web app issues (unused event listeners, memory leaks, etc.)
- [ ] TypeScript compiler API integration for type error detection
- [ ] **Code-to-test correlation**: when an E2E test fails, AI traces back to the code change
  - [ ] Accept git repo path or GitHub URL in project settings
  - [ ] On failure, run `git diff` between last passing and current commit
  - [ ] AI analyzes diff + failure context to identify likely culprit file/line
  - [ ] Show "Probable Cause" section in failure analysis with file:line links
- [ ] **"Prove it in browser"**: when static analysis finds a vulnerability, auto-generate E2E test
- [ ] Unified report: code issues + UI test results + security + accessibility in one view

---

## Phase 9: Platform Scale

> Transform from a tool into a platform with monitoring, collaboration, and ecosystem.

### 9.1 — Scheduled Monitoring Runs
- [ ] Add `Schedule` model: cron expression, project, test(s), environment
- [ ] Cron-based scheduler (node-cron or BullMQ repeatable jobs)
- [ ] Run tests on schedule against production URLs
- [ ] Monitoring dashboard: uptime %, response times, last check status
- [ ] Support multiple schedules per project (hourly, daily, weekly)

### 9.2 — Alerting & Notifications
- [ ] Webhook integration (configurable URL, POST on failure/recovery)
- [ ] Slack integration (bot sends failure notifications to channel)
- [ ] PagerDuty integration (trigger incidents on critical failures)
- [ ] Email notifications (test results digest)
- [ ] Configurable alert rules (alert on N consecutive failures, alert on flakiness spike)

### 9.3 — Multi-Region Execution
- [ ] Deploy runner nodes in multiple regions (US, EU, APAC)
- [ ] Region selection per schedule/run
- [ ] Latency comparison across regions
- [ ] Geographic availability dashboard

### 9.4 — Team Collaboration
- [ ] Real-time presence (who's viewing/editing a test)
- [ ] Comments on test steps and run results
- [ ] Assign test failures to team members
- [ ] Activity feed per project
- [ ] Role-based permissions (viewer, editor, admin)

### 9.5 — Browser Extension Recorder
- [ ] Chrome extension that records user actions
- [ ] Convert recorded actions to Hound test steps
- [ ] Smart recording: merge redundant actions, add smart waits
- [ ] One-click "Record a test" from the dashboard

### 9.6 — Plugin Architecture
- [ ] Define plugin API: custom step types, custom reporters, custom analyzers
- [ ] Plugin registry (community contributions)
- [ ] Built-in plugins: Slack, GitHub, Jira, Linear
- [ ] Plugin SDK with documentation

### 9.7 — Transparent Pricing & Billing
- [ ] Free tier: unlimited local runs, 100 cloud runs/month
- [ ] Pro tier: unlimited cloud runs, parallel execution, monitoring, team features
- [ ] Enterprise tier: SSO, audit logs, SLA, dedicated support
- [ ] Usage tracking and billing integration (Stripe)
- [ ] Public pricing page (no "contact sales" wall)

---

## Phase 10: Next-Generation Testing Experience

> The features that make Hound feel like magic. No competitor has any of these. This phase transforms Hound from a testing tool into an interactive testing IDE with real-time browser streaming, AI co-piloting, and intelligent test creation.

### 10.1 — Live Browser View (Foundation)

> **Priority: HIGHEST** — This is the foundation that 10.2, 10.3, 10.4, and 10.9 build on top of. Must be built first.

**What:** Stream the actual browser viewport to the user in real-time during test execution. Not just step status updates — the actual pixels, mouse movements, clicks, typing, all visible live.

**Technical Approach:**
- Use Playwright's CDP (Chrome DevTools Protocol) access via `page.context().newCDPSession(page)` to call `Page.startScreencast`
- CDP Screencast delivers JPEG/PNG frames at configurable FPS (target 15fps for balance of quality/bandwidth)
- Stream frames over WebSocket to the frontend (SSE is too high-overhead for binary frame data)
- Render frames on a `<canvas>` element with overlay layers for step info, cursor trail, and element highlights

**Implementation Tasks:**
- [ ] Create `src/lib/engine/screencast.ts` — CDP screencast manager
  - Start/stop screencast on a Playwright Page via CDP session
  - Frame callback with JPEG compression (quality 60-80%)
  - Configurable FPS (default 15, max 30)
  - Acknowledge frames to CDP to control flow
- [ ] Create `src/lib/ws/server.ts` — WebSocket server for frame streaming
  - Integrate with Next.js custom server or run alongside on separate port
  - Room-based connections keyed by `runId` or `sessionId`
  - Binary frame transmission (ArrayBuffer, not base64)
  - Heartbeat/keepalive for connection health
  - Auto-cleanup on disconnect
- [ ] Create `src/lib/ws/types.ts` — WebSocket message protocol
  - Message types: `frame`, `cursor_move`, `click_indicator`, `element_highlight`, `step_info`, `error`
  - Frame message: `{ type: 'frame', data: ArrayBuffer, width: number, height: number, timestamp: number }`
  - Overlay message: `{ type: 'overlay', cursor: {x,y}, highlights: BoundingBox[], stepName: string }`
- [ ] Modify `src/lib/engine/executor.ts` — integrate screencast into test execution
  - Start screencast after page creation (when `liveView: true` option is set)
  - Emit cursor position from Playwright mouse events
  - Emit element bounding boxes before click/type actions (via `element.boundingBox()`)
  - Stop screencast on run completion
- [ ] Modify `src/lib/engine/events.ts` — add live view event types
  - New events: `screencast_frame`, `cursor_move`, `element_highlight`
  - Separate high-frequency channel from step events
- [ ] Create `src/components/live-browser/LiveBrowserView.tsx` — main viewer component
  - `<canvas>` element sized to browser viewport (1280x720, responsive scaling)
  - Frame rendering loop using `requestAnimationFrame`
  - WebSocket connection management (connect, reconnect, disconnect)
  - Loading state, connection status indicator, FPS counter
- [ ] Create `src/components/live-browser/BrowserOverlay.tsx` — overlay layer
  - Cursor trail animation (shows where AI is moving/clicking)
  - Click indicator (expanding circle animation on click events)
  - Element highlight (bounding box with label around target elements)
  - Current step name/description badge
  - Typing indicator (shows what text is being entered)
- [ ] Create `src/components/live-browser/BrowserToolbar.tsx` — viewer controls
  - Zoom controls (fit, 100%, custom)
  - FPS selector (5/15/30)
  - Screenshot capture button (save current frame)
  - Picture-in-picture mode toggle
  - Full-screen toggle
- [ ] Add `liveView` flag to `POST /api/runs` — enable live browser streaming
- [ ] Create `src/app/api/ws/route.ts` — WebSocket upgrade endpoint
- [ ] Integrate LiveBrowserView into the run viewer page as a new "Live" tab
- [ ] Add fallback: if WebSocket unavailable, use SSE with base64 JPEG frames (higher latency but works everywhere)

**Dependencies:** None (foundation feature)
**New packages:** `ws` (WebSocket server)

---

### 10.2 — Interactive Recording (Record from Live View)

> **Priority: HIGH** — Replaces the deferred Browser Extension Recorder (Phase 9.5) with a superior in-app experience. Users interact with a live browser inside Hound to build tests — no extension installation needed.

**What:** User clicks "Record a Test", enters a URL, and a real browser launches inside the Hound dashboard. The user clicks, types, and navigates normally. Every action is captured, recognized by AI, and converted into structured test steps in real-time. The user sees steps appearing in a sidebar as they interact.

**Technical Approach:**
- Launch a dedicated Playwright browser session (not a test run) with screencast streaming (reuses 10.1)
- Forward mouse/keyboard events from the frontend `<canvas>` to the real browser via CDP `Input.dispatchMouseEvent` and `Input.dispatchKeyEvent`
- Capture browser-side events (navigation, clicks, form input changes) via CDP listeners and page event handlers
- Use AI (Claude) to convert raw DOM events into clean, resilient test steps with smart selectors
- Real-time step list in sidebar updates as user interacts

**Implementation Tasks:**
- [ ] Create `src/lib/engine/recorder.ts` — recording session manager
  - `startRecording(url, projectId)` → launches browser, starts screencast, returns sessionId
  - `stopRecording(sessionId)` → finalizes steps, saves test, closes browser
  - `getSession(sessionId)` → returns session state (steps, browser status)
  - Maintains list of captured actions per session
  - Deduplication: merge rapid keystrokes into single TYPE step, ignore redundant clicks
- [ ] Create `src/lib/engine/input-forwarder.ts` — user input → browser forwarding
  - Forward mouse events: `Input.dispatchMouseEvent` (mousePressed, mouseReleased, mouseMoved)
  - Forward keyboard events: `Input.dispatchKeyEvent` (keyDown, keyUp, char)
  - Forward scroll events: `Input.dispatchMouseEvent` with scroll delta
  - Coordinate translation: scale canvas coordinates to browser viewport coordinates
  - Handle modifier keys (shift, ctrl, alt, meta)
- [ ] Create `src/lib/engine/action-recognizer.ts` — raw events → structured steps
  - **Click recognition:** mousedown+mouseup within threshold → CLICK step
    - Capture clicked element's selector, text content, role, bounding box
    - Use AI to generate resilient selector (not brittle CSS path)
  - **Type recognition:** collect keystrokes between focus/blur events → TYPE step
    - Buffer keystrokes, flush on blur/tab/enter
    - Capture target input's selector and final value
  - **Navigation recognition:** page URL change → NAVIGATE step
    - Distinguish user-initiated navigation from redirects
    - Capture full URL with variable substitution hints
  - **Select recognition:** `<select>` change event → SELECT step
  - **Scroll recognition:** significant scroll delta → SCROLL step (optional, can be omitted)
  - **Hover recognition:** mousemove + pause on element → HOVER step (optional)
  - **Key press recognition:** special keys (Enter, Escape, Tab) → PRESS_KEY step
- [ ] Create `src/lib/ai/step-refiner.ts` — AI post-processing of recorded steps
  - Optimize selectors: convert raw CSS selectors to resilient AI selectors
  - Add smart waits: detect where WAIT steps should be inserted
  - Add assertions: suggest ASSERT_TEXT / ASSERT_ELEMENT steps at natural checkpoints
  - Merge redundant steps: combine click-then-type into efficient sequence
  - Generate step descriptions from actions (e.g., "Click the 'Add to Cart' button")
  - Suggest test name based on the recorded flow
- [ ] Create `src/app/api/recorder/start/route.ts` — start recording session
  - Input: `{ projectId, url, viewportWidth?, viewportHeight? }`
  - Output: `{ sessionId, wsUrl }` (WebSocket URL for live view)
  - Launches browser, navigates to URL, starts screencast
- [ ] Create `src/app/api/recorder/action/route.ts` — forward user actions
  - Input: `{ sessionId, action: MouseEvent | KeyboardEvent | ScrollEvent }`
  - Forwards to browser via CDP, captures resulting DOM changes
  - Returns recognized step (if any) in response
- [ ] Create `src/app/api/recorder/stop/route.ts` — stop and save
  - Input: `{ sessionId, testName?, refineWithAI?: boolean }`
  - Stops recording, optionally runs AI refinement
  - Creates Test + TestSteps in database
  - Returns created test ID
- [ ] Create `src/app/api/recorder/session/[sessionId]/route.ts` — get session state
  - Returns current steps, browser status, screenshot
- [ ] Create `src/components/recorder/RecorderPanel.tsx` — recording UI
  - "Record a Test" button on tests list page
  - URL input with project baseUrl prefilled
  - Split layout: live browser view (left 70%) + step list (right 30%)
  - Live step list showing recognized steps as they happen
  - Each step: icon, description, selector, editable
  - "Add Assertion" button to manually insert checkpoints
  - Recording controls: pause, resume, undo last step, clear all
  - "Stop & Save" button with test name input and AI refinement toggle
- [ ] Create `src/components/recorder/StepPreview.tsx` — individual step card in recorder
  - Shows step type icon, description, selector
  - Inline edit for description and selector
  - Delete button to remove unwanted steps
  - Drag handle for reordering
- [ ] Create `src/components/recorder/RecorderToolbar.tsx` — recording controls bar
  - Record/Pause/Stop buttons
  - Timer showing recording duration
  - Step count
  - "Add Assertion" quick-add
  - "Add Wait" quick-add
  - Browser navigation controls (back, forward, refresh)
- [ ] Add RecordingSession model to Prisma schema (optional, for session persistence)
  - Fields: id, projectId, userId, url, status (recording/paused/stopped), steps (JSON), createdAt
- [ ] Wire up the recorder page at `/projects/[id]/tests/record`

**Dependencies:** 10.1 (Live Browser View)
**New packages:** None (reuses Playwright CDP, `ws` from 10.1)

---

### 10.3 — Pause & Inspect Debug Mode

> **Priority: HIGH** — Turns Hound into an interactive testing debugger. Users can pause a running test, inspect live page state, inject ad-hoc actions, modify variables, and resume.

**What:** While watching a test run in the live browser view, the user can hit "Pause". The test execution freezes at the current step. The user can then inspect the page (DOM, accessibility tree, console, network), run ad-hoc commands ("click that button", "check if the modal is visible"), modify environment variables, skip steps, and then resume.

**Implementation Tasks:**
- [ ] Modify `src/lib/engine/executor.ts` — add pause/resume control
  - Add `ExecutionController` class with `pause()`, `resume()`, `abort()`, `skipStep()` methods
  - Pause implemented via a `Promise` gate that blocks the step loop
  - Controller stored in a global map keyed by `runId`
  - Expose current page reference when paused (for inspection)
- [ ] Create `src/app/api/runs/[runId]/control/route.ts` — execution control API
  - `POST { action: 'pause' }` — pause execution
  - `POST { action: 'resume' }` — resume execution
  - `POST { action: 'abort' }` — abort execution
  - `POST { action: 'skip' }` — skip current step
  - `POST { action: 'inject', command: string }` — execute ad-hoc action
  - `GET` — return current execution state (paused/running, current step, page URL)
- [ ] Create `src/app/api/runs/[runId]/inspect/route.ts` — page inspection API
  - `GET ?type=accessibility` — return accessibility tree snapshot
  - `GET ?type=dom&selector=...` — return DOM subtree
  - `GET ?type=console` — return console log buffer
  - `GET ?type=network` — return recent network requests
  - `GET ?type=storage` — return cookies, localStorage, sessionStorage
  - `GET ?type=screenshot` — return current screenshot
- [ ] Create `src/components/live-browser/DebugPanel.tsx` — debug tools sidebar
  - Tabs: DOM Inspector, Accessibility Tree, Console, Network, Storage
  - DOM tree view with element selection → highlights in live view
  - Console log viewer (captured via CDP `Runtime.consoleAPICalled`)
  - Network request list with timing
  - Variable editor (modify environment variables mid-run)
- [ ] Create `src/components/live-browser/DebugToolbar.tsx` — execution controls
  - Pause/Resume/Abort buttons
  - "Skip Step" button
  - "Step Over" button (execute one step, then pause again)
  - "Inject Action" input (natural language → AI executes on page)
  - Current step indicator with step list navigation
- [ ] Add new event types: `execution_paused`, `execution_resumed`, `step_skipped`, `action_injected`
- [ ] Modify LiveBrowserView to show debug controls when paused
- [ ] Add keyboard shortcuts: Space = pause/resume, N = next step, S = skip

**Dependencies:** 10.1 (Live Browser View)

---

### 10.4 — AI Co-Pilot Chat

> **Priority: MEDIUM** — A chat sidebar alongside the live browser view where users can converse with AI about the current test, page state, and debugging strategies.

**What:** While a test runs (or is paused), the user can chat with Claude in a sidebar. The AI has full context: current page URL, accessibility tree, screenshot, console logs, test steps, and execution history. Users can ask questions ("why did it click there?"), give commands ("try clicking the other button"), or request analysis ("what's wrong with this page?").

**Implementation Tasks:**
- [ ] Create `src/lib/ai/copilot-agent.ts` — AI co-pilot with page context
  - Accepts: user message + page context (URL, a11y tree, screenshot, console, step history)
  - Returns: response + optional action (click, type, assert, screenshot)
  - Supports conversation history (multi-turn)
  - Action types: inspect element, click, type, navigate, assert, explain
- [ ] Create `src/app/api/runs/[runId]/copilot/route.ts` — co-pilot chat API
  - `POST { message: string }` — send message, get AI response
  - AI response includes: `{ text: string, action?: { type, params }, screenshot?: string }`
  - If action is present, execute it on the page (if user confirms)
- [ ] Create `src/components/live-browser/CopilotChat.tsx` — chat sidebar
  - Message list with user/AI message bubbles
  - Input field with send button
  - Action cards: when AI suggests an action, show a card with "Execute" button
  - Context indicators: shows what the AI can see (page URL, step context)
  - Quick action buttons: "Why did it fail?", "What's on the page?", "Suggest next step"
- [ ] Integrate chat with debug mode (10.3) — when paused, AI can inspect and act
- [ ] Add conversation persistence per run (save chat history to DB)

**Dependencies:** 10.1 (Live Browser View), 10.3 (Pause & Inspect) for action execution

---

### 10.5 — Test Impact Analysis

> **Priority: HIGH** — Given a code change (PR/commit), automatically determine which tests are affected and run only those. Saves time and CI costs.

**What:** When a PR is opened or code is pushed, Hound analyzes the git diff, maps changed files to components/pages, maps those to tests via historical execution data, and runs only the affected tests. Shows a visual dependency graph.

**Implementation Tasks:**
- [ ] Create `src/lib/analysis/impact-analyzer.ts` — core impact analysis engine
  - Parse git diff to extract changed files and functions
  - Build file → component → page → URL mapping using:
    - Static import analysis (follow import chains)
    - Route file analysis (Next.js pages/app router convention)
    - Historical test execution data (which tests visited which URLs)
  - Score tests by impact likelihood (direct change, transitive dependency, URL overlap)
  - Return ranked list of affected tests with confidence scores
- [ ] Create `src/app/api/projects/[projectId]/impact/route.ts` — impact analysis API
  - `POST { diff: string }` or `POST { commitSha: string, baseSha: string }`
  - Returns: `{ affectedTests: [{ testId, name, confidence, reason }], graph: DependencyGraph }`
- [ ] Create `src/app/api/projects/[projectId]/impact/run/route.ts` — run affected tests
  - `POST { diff: string, minConfidence?: number }` — analyze and run in one call
  - Returns bulk run ID
- [ ] Add GitHub webhook handler for PR events
  - On `pull_request.opened` / `pull_request.synchronize`: run impact analysis
  - Post PR comment with affected tests and run results
- [ ] Create `src/components/impact/ImpactGraph.tsx` — visual dependency graph
  - Shows: changed files → components → pages → tests
  - Interactive: click nodes to see details
  - Color coding: red (high impact), yellow (medium), green (low)
- [ ] Store test → URL mapping from historical runs (build over time)
- [ ] Add project settings for git repo integration (repo URL, access token)

**Dependencies:** 8.5 (Code-Level Analysis) for git diff parsing

---

### 10.6 — Chaos & Resilience Testing

> **Priority: MEDIUM** — Inject controlled failures during test execution to verify graceful degradation.

**What:** New step types that simulate real-world failures: throttle network to 3G/offline, block specific API endpoints, inject latency, simulate server errors. Then assert the app handles them gracefully (shows error states, loading indicators, offline banners).

**Implementation Tasks:**
- [ ] Add new step types to schema:
  - `THROTTLE_NETWORK` — simulate slow/offline network
  - `BLOCK_REQUEST` — block specific URLs/patterns
  - `INJECT_LATENCY` — add delay to matching requests
  - `SIMULATE_ERROR` — return error status codes for matching requests
  - `RESTORE_NETWORK` — clear all chaos modifications
- [ ] Create `src/lib/engine/chaos.ts` — chaos injection engine
  - Network throttling via CDP `Network.emulateNetworkConditions` (3G, slow 3G, offline presets)
  - Request blocking via Playwright `page.route()` with abort
  - Latency injection via `page.route()` with `setTimeout` before fulfill
  - Error simulation via `page.route()` with custom status codes (500, 503, 429)
  - Preset profiles: "Slow Network", "Offline", "Flaky API", "Server Down"
- [ ] Add step handlers for all chaos step types
- [ ] Create chaos step configuration UI in step editor
  - Network condition selector (preset or custom upload/download/latency)
  - URL pattern input with method filter
  - Error code selector
  - Duration control
- [ ] Create `src/components/chaos/ChaosPresets.tsx` — preset selector
  - Pre-built scenarios: "Mobile 3G", "Offline Mode", "API Failure", "High Latency"
  - Custom scenario builder
- [ ] Add "Resilience Report" section to run results
  - Shows which chaos conditions were active during each step
  - Grades app resilience (error handling, loading states, fallback content)

**Dependencies:** None (standalone feature, uses existing step handler pattern)

---

### 10.7 — Production Error → Test Generation

> **Priority: MEDIUM** — Connect to error monitoring tools (Sentry, Datadog, LogRocket). When a production error occurs, AI automatically generates a test that reproduces the user flow that caused it.

**What:** Hound receives a webhook from Sentry/Datadog when a production error occurs. AI reads the error stacktrace, user session data, and breadcrumbs. It generates a test that reproduces the exact user flow, runs it to confirm the bug, and optionally opens a GitHub issue with the failing test.

**Implementation Tasks:**
- [ ] Create `src/lib/integrations/sentry.ts` — Sentry webhook handler
  - Parse Sentry event payload (stacktrace, breadcrumbs, user, tags, URL)
  - Extract user flow from breadcrumbs (navigation, clicks, XHR calls)
  - Map to Hound step types
- [ ] Create `src/lib/integrations/datadog.ts` — Datadog webhook handler
  - Parse Datadog event payload
  - Extract session replay data if available
- [ ] Create `src/lib/ai/error-to-test-generator.ts` — AI error → test generation
  - Input: error context (stacktrace, breadcrumbs, page URL, user actions)
  - Output: structured test steps that reproduce the flow
  - AI analyzes the error to determine: what page, what actions, what assertion (error should/shouldn't appear)
- [ ] Create `src/app/api/integrations/sentry/route.ts` — Sentry webhook endpoint
  - Validates Sentry signature
  - Creates draft test from error
  - Optionally auto-runs the test to confirm reproduction
- [ ] Create `src/app/api/integrations/datadog/route.ts` — Datadog webhook endpoint
- [ ] Create `src/components/integrations/ErrorTestQueue.tsx` — queue of generated tests from errors
  - Shows pending error-generated tests for review
  - User can approve, edit, or dismiss
  - Link to original error in Sentry/Datadog
- [ ] Add project settings for error monitoring integration (Sentry DSN, Datadog API key)
- [ ] Create GitHub issue on confirmed reproduction (via existing GitHub plugin)

**Dependencies:** 8.4 (AI Test Generation), 9.6 (Plugin Architecture)

---

### 10.8 — Test Coverage Heatmap

> **Priority: MEDIUM** — Visual overlay showing which parts of your app are well-tested vs. untested.

**What:** After running your test suite, Hound generates a visual heatmap overlay on your app. Green = well-tested elements, yellow = partially tested, red = untested. Click any element to see which tests cover it. Shows overall coverage percentage per page.

**Implementation Tasks:**
- [ ] Create `src/lib/analysis/coverage-tracker.ts` — element interaction tracker
  - During test execution, record every element interaction (click, type, hover, assert)
  - Store: `{ pageUrl, selector, elementType, interactionType, testId, timestamp }`
  - Aggregate across all tests: interaction count per element per page
- [ ] Add CoverageData model to Prisma schema
  - Fields: projectId, pageUrl, selector, elementTag, interactionCount, testIds (JSON array), lastTestedAt
- [ ] Create `src/app/api/projects/[projectId]/coverage/route.ts` — coverage data API
  - `GET ?page=url` — return coverage data for a specific page
  - `GET /summary` — return per-page coverage summary
  - `POST /generate` — trigger coverage analysis across all recent runs
- [ ] Create `src/components/coverage/CoverageHeatmap.tsx` — visual heatmap viewer
  - Renders page screenshot with colored overlay boxes on elements
  - Color scale: red (0 tests) → yellow (1-2 tests) → green (3+ tests)
  - Click element → tooltip showing test names and last tested date
  - Coverage percentage per page
- [ ] Create `src/components/coverage/CoverageReport.tsx` — summary dashboard
  - Per-page coverage bars
  - Most/least tested elements
  - Untested interactive elements (buttons, links, inputs with 0 coverage)
  - Coverage trend over time
- [ ] Modify executor to emit coverage events during execution
- [ ] Add "Coverage" tab to project dashboard

**Dependencies:** None (uses existing execution data)

---

### 10.9 — Multi-Browser Split View

> **Priority: LOW** — Run the same test simultaneously on Chrome, Firefox, and Safari. Show side-by-side live views. Highlight cross-browser rendering differences.

**Implementation Tasks:**
- [ ] Modify `src/lib/engine/browser-pool.ts` — support multiple browser engines
  - Add `getFirefoxBrowser()`, `getWebkitBrowser()` in addition to existing `getBrowser()` (Chromium)
  - Engine selection parameter
- [ ] Create `src/lib/engine/cross-browser-executor.ts` — parallel cross-browser execution
  - Run same test on N browsers simultaneously
  - Sync execution: steps execute in lockstep across browsers
  - Capture screenshots from all browsers at each step
  - Compare screenshots across browsers using pixelmatch
- [ ] Create `src/components/live-browser/SplitBrowserView.tsx` — side-by-side viewer
  - 2-3 browser views arranged horizontally
  - Sync scrolling across views
  - Diff overlay toggle (highlight rendering differences)
  - Browser labels (Chrome, Firefox, Safari)
- [ ] Create cross-browser comparison report
  - Per-step screenshot comparison across browsers
  - Flag layout shifts, missing elements, font rendering differences
  - Summary: "98% consistent across Chrome/Firefox, 3 differences found"
- [ ] Add `browsers` option to run creation API: `{ browsers: ['chromium', 'firefox', 'webkit'] }`

**Dependencies:** 10.1 (Live Browser View)

---

### 10.10 — Collaborative Live Sessions

> **Priority: LOW** — Multiple team members can watch and interact with the same test session. Shared cursors, annotations, and integrated chat.

**Implementation Tasks:**
- [ ] Extend WebSocket server (10.1) with room management
  - Multiple users can join the same `runId` or `sessionId` room
  - Broadcast frames to all participants
  - Per-user cursor tracking (each user's cursor visible to others)
- [ ] Create `src/lib/ws/collaboration.ts` — collaboration layer
  - User presence tracking (who's in the session)
  - Cursor sharing (user name + position)
  - Annotations: click anywhere to pin a comment
  - Session permissions (owner can control, viewers can only watch)
- [ ] Create `src/components/live-browser/CollaborationOverlay.tsx`
  - Other users' cursors with name labels (different colors)
  - Pinned annotations with user avatars
  - Participant list sidebar
- [ ] Create `src/components/live-browser/SessionChat.tsx` — in-session chat
  - Text messages alongside the browser view
  - Screenshot sharing (capture and annotate)
  - @mention team members
- [ ] Add shareable session links (`/session/[id]?token=...`)
- [ ] Integrate with team collaboration (9.4) for notifications

**Dependencies:** 10.1 (Live Browser View), 9.4 (Team Collaboration)

---

## Phase 10 Implementation Order

```
10.1 Live Browser View (FOUNDATION — build first)
  ├── 10.2 Interactive Recording (builds on live view + input forwarding)
  ├── 10.3 Pause & Inspect Debug (builds on live view + execution control)
  │   └── 10.4 AI Co-Pilot Chat (builds on debug mode)
  ├── 10.9 Multi-Browser Split View (builds on live view)
  └── 10.10 Collaborative Sessions (builds on live view WebSocket)

10.5 Test Impact Analysis (independent)
10.6 Chaos Testing (independent)
10.7 Error → Test Generation (independent)
10.8 Coverage Heatmap (independent)
```

**Recommended execution order:**
1. **10.1** → 10.2 → 10.3 → 10.4 (the "live experience" track)
2. **10.5** and **10.6** (can be done in parallel with track 1)
3. **10.8** (moderate effort, high value)
4. **10.7** (requires external integrations)
5. **10.9** and **10.10** (lower priority, do last)

---

## Architecture Decisions

### Database Strategy
- **Development:** SQLite (zero setup, fast iteration)
- **Production:** PostgreSQL (concurrent writes, full-text search, JSON operators)
- **Cache layer:** Redis (step cache, session storage, rate limiting, job queues)
- **Artifact storage:** S3-compatible (MinIO for self-hosted, AWS S3 for cloud)

### AI Model Strategy
- **Primary:** Anthropic Claude (Sonnet 4 for speed, Opus for complex analysis)
- **Fallback:** OpenAI GPT-4o
- **Future:** Gemini, local models via Ollama for air-gapped deployments
- **Vision:** Claude vision for visual assertions and page understanding

### Execution Architecture
- **Local:** Single-process, Playwright in-process
- **CI:** CLI with configurable parallelism via worker threads
- **Cloud:** Queue-based (BullMQ) with worker pool, horizontal scaling
- **Monitoring:** Dedicated scheduler service with health checks

---

## Competitive Moat Summary

| Feature | Momentic | Playwright | BrowserStack | Hound (Target) |
|---------|----------|------------|--------------|-----------------|
| AI test authoring | Yes | No | Partial | Yes |
| Self-healing | Yes | No | No | Yes |
| Visual diff | Yes | Screenshot comparison | Percy | Yes + AI analysis |
| Security scanning | No | No | No | **Yes** |
| Accessibility | Basic | No | New agent | **Deep WCAG + AI remediation** |
| Performance | No | No | Partial | **Core Web Vitals per run** |
| Code analysis | No | No | No | **Yes + code-to-test correlation** |
| Production monitoring | No | No | Partial | **Yes** |
| Open source | No | Yes | No | **Yes (core)** |
| Transparent pricing | No (sales-only) | Free | Enterprise | **Yes** |
| Test export | Proprietary YAML | Native | N/A | **Playwright scripts** |
| CLI | Yes | Yes | Yes | **Yes** |
| **Live browser view** | No | No | No | **Yes — real-time CDP streaming** |
| **In-app test recording** | Chrome ext only | Codegen CLI | No | **Yes — record inside dashboard** |
| **Interactive debugging** | No | No | No | **Yes — pause, inspect, inject** |
| **AI co-pilot chat** | No | No | No | **Yes — chat during test runs** |
| **Test impact analysis** | No | No | No | **Yes — git diff → affected tests** |
| **Chaos/resilience testing** | No | No | No | **Yes — network/error injection** |
| **Error → test generation** | No | No | No | **Yes — Sentry/Datadog integration** |
| **Coverage heatmap** | No | No | No | **Yes — visual element coverage** |
| **Multi-browser live view** | No | No | Partial | **Yes — side-by-side streaming** |
| **Collaborative sessions** | No | No | No | **Yes — shared live sessions** |
