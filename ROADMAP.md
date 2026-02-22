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
