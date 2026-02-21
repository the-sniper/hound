# Technical Reconstruction of Momentic.ai

## Executive summary

Momentic.ai is an AI-native test automation platform designed to author, run, and manage end-to-end (E2E) tests in natural language across web and mobile surfaces, with two primary modes: a browser-based Cloud product and a developer-first local workflow via a Node.js CLI and “Local App” UI.

Its technical differentiation, as described in official documentation, concentrates in three reliability systems layered on top of conventional browser automation: step caching (persisting rich element targeting context to avoid repeated AI element resolution), “memory” (re-using prior successful AI completions and “traces” to keep AI decisions consistent across runs), and AI-assisted failure tooling (failure analysis and optional failure recovery that can generate and execute recovery steps for certain transient failures in CI).

On the execution side, Momentic explicitly treats each test as an isolated worker that behaves like a distinct user, and it operates headless browsers (Chromium, Google Chrome, Chrome for Testing) with opinionated overrides to stabilise runs (user agent, geolocation, disabling autoplay and onboarding flows).

From a stack and infrastructure standpoint, the most direct public evidence comes from Momentic’s own hiring materials, which state a web stack built around React, TypeScript, Next.js, Node.js, PostgreSQL, and deployment on Google Cloud with Kubernetes.

Security and compliance claims are unusually concrete for a devtools startup: Momentic states it is SOC 2 Type 2 certified, and lists key security capabilities for enterprise (encryption in transit and at rest, SAML/SCIM SSO, role-based access, immutable audit logs, redundant regions, deterministic runners, 99.99% uptime SLA).

A useful mental model is that Momentic is “Playwright-class automation plus an AI co-pilot plus a persistence layer for intent,” while still offering escape hatches for determinism (primitive steps, explicit assertions, reporters like JUnit and Allure JSON, request mocking, and JavaScript in a sandbox).

If Selenium is the bicycle of testing, Momentic is trying to be the self-driving car, with a very large “manual override” button.

Funding and traction signals, from Momentic and third-party reporting, indicate a $3.7M seed (March 2025) and a $15M Series A (November 24, 2025).

## Product reconstruction and architecture overview

### What the product ships, from a developer’s perspective

Momentic presents two primary workflows:

- **Cloud**: create and run tests in a hosted web UI, with analytics and management features, and Cloud-managed infrastructure. citeturn20view0turn22search7
- **CLI + Local App**: install an npm package, start a Local App (opened in a browser window), author tests stored as YAML files in your repository, run locally, and optionally upload results to Momentic Cloud. citeturn31view1turn28search0

The CLI workflow is anchored around:

- An API key (`MOMENTIC_API_KEY`) for authentication in CI and local runs. citeturn31view1turn10search4
- A test representation in YAML (`*.test.yaml`) and modules as YAML (`*.module.yaml`), discovered via `momentic.config.yaml` include globs. citeturn29view0turn21search3turn28search0
- A local desktop server used by the Local App and also exposed through MCP (Model Context Protocol) endpoints on `http://localhost:58888`, enabling IDE agents to read, create, and edit tests via dedicated tools rather than direct YAML editing. citeturn28search1

### Architectural building blocks implied by official docs

From the docs, you can reconstruct several core services and data flows:

- **Test authoring and storage**: YAML tests and modules, plus a Cloud-side project/test store for Cloud mode and for uploaded results. citeturn20view0turn31view1turn28search0
- **Execution orchestration**: tests run as separate “workers,” each representing a user, with configurable parallelism, sharding, retries, and timeouts. citeturn26view0turn28search0turn10search4
- **Browser automation engine**: headless browsers and browser behaviour overrides, plus collection of console logs and network logs unless disabled for performance. citeturn19view0turn29view0
- **AI agent layer**: dedicated agent types (locator, assertion, visual assertion, text extraction), selectable by version, plus special AI steps (AI check, AI extract, AI action beta). citeturn21search4turn31view0turn21search9turn20view1
- **Persistence for reliability**: step caching and memory, both stored on Momentic Cloud, scoped per organisation, with expiration windows stated in docs. citeturn15view0turn17view0
- **Debugging and recovery**: request mocking (with asynchronous, separate-process handling), failure analysis (AI narrative and RCA), and failure recovery (beta) that can propose and execute additional recovery steps in CI. citeturn16view2turn16view1turn31view2

### Technical architecture diagram

```mermaid
flowchart TB
  %% Users and entrypoints
  Dev[Developer / QA / CI] -->|CLI: npx momentic| CLI[Momentic CLI]
  Dev -->|Browser| CloudUI[Cloud Web App]
  Dev -->|Browser| LocalUI[Local App UI]

  %% Local app + MCP
  CLI --> LocalServer[Local Desktop Server]
  LocalUI --> LocalServer
  IDE[IDE Agent via MCP client] -->|HTTP/SSE/stdio MCP| LocalServer

  %% Cloud API
  CLI -->|HTTPS + API key| APIGW[api.momentic.ai (API Gateway)]
  CloudUI -->|HTTPS| APIGW
  LocalServer -->|Optional sync, AI config, cache, uploads| APIGW

  %% Core cloud services
  APIGW --> Auth[Auth/SSO Service]
  APIGW --> TestSvc[Test & Module Service]
  APIGW --> RunSvc[Run Orchestrator]
  APIGW --> CacheSvc[Cache & Memory Service]
  APIGW --> ArtifactSvc[Artifacts Service]
  APIGW --> NotifySvc[Notifications / Webhooks Service]

  %% Execution plane
  RunSvc --> RunnerPool[Execution Plane: Kubernetes Runner Fleet]
  RunnerPool --> Browser[Headless browsers (Chromium/Chrome)]
  RunnerPool --> NetMock[Network mocking subprocess]
  RunnerPool -->|Screenshots, logs, video| ArtifactSvc
  RunnerPool -->|Element context + AI traces| CacheSvc

  %% AI inference
  RunnerPool --> AILayer[AI Agent Layer]
  AILayer --> ModelRouter[Model Router / Provider Abstraction]
  ModelRouter --> LLM1[LLM/VLM Provider A]
  ModelRouter --> LLM2[LLM/VLM Provider B]
  ModelRouter --> LLM3[LLM/VLM Provider C]

  %% Data plane
  TestSvc --> DB[(Primary DB)]
  RunSvc --> DB
  CacheSvc --> DB
  ArtifactSvc --> Obj[(Object Storage)]
  CloudUI --> Telemetry[Analytics/Monitoring SDKs]

  %% Observability
  RunnerPool --> Obs[Logs/Metrics/Traces]
  APIGW --> Obs
  Obs --> Oncall[On-call + Dashboarding]
```

This diagram is a reconstruction, not a vendor-confirmed internal diagram. The existence of the API base URL, the local MCP server, the worker-per-test model, AI agent categories, and Cloud storage of caches/memory are directly documented. citeturn28search1turn26view0turn15view0turn17view0  
Specific internal service boundaries, database choices beyond PostgreSQL, and whether “AI agent layer” is a separate service vs in-runner library are inferred, and confidence is stated explicitly in the next section.

## Component-by-component technical analysis with evidence and confidence

### Evidence-grounded stack, org, and vendors

The following “who/what” items are explicitly stated in Momentic materials (high confidence):

- Momentic’s stated core web stack: React, TypeScript, Next.js, Node.js, PostgreSQL, deployed on Google Cloud and Kubernetes. citeturn34search1
- Subprocessors listed by Momentic for product/security operations: product analytics, monitoring, cloud hosting, billing, AI providers, and authentication. citeturn6view0
- SOC 2 Type 2 certification stated in docs, and enterprise-grade controls described on the enterprise page. citeturn6view0turn33view0

To keep the remainder of the report readable, the table below lists third parties (from Momentic’s own subprocessor list) and what subsystem they likely map to.

| Vendor (officially listed)                                            | Declared purpose   | Technical implication                                                                 | Confidence                                      |
| --------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| entity["company","Google Cloud Platform","cloud hosting provider"] | Cloud hosting      | Primary cloud provider, likely underlying compute, storage, networking                | High citeturn6view0turn34search1            |
| entity["company","WorkOS","enterprise auth platform"]              | Authentication     | Central identity layer for SSO and directory sync features (ties to SAML/SCIM claims) | High citeturn6view0turn33view0              |
| entity["company","OpenAI","ai model provider"]                     | AI                 | One of multiple model backends, implies provider abstraction / routing                | High citeturn6view0turn33view3              |
| entity["company","Anthropic","ai model provider"]                  | AI                 | Another model backend                                                                 | High citeturn6view0turn33view3              |
| entity["company","Microsoft Azure","cloud platform"]               | AI                 | Additional model backend (often used for OpenAI-hosted variants or other ML services) | High citeturn6view0                          |
| entity["company","PostHog","product analytics"]                    | Product analytics  | Event tracking in web apps (Cloud UI, possibly Local App)                             | High citeturn6view0                          |
| entity["company","Datadog","observability platform"]               | Analytics          | Metrics/logs/traces pipeline (cloud services, runner fleet)                           | High citeturn6view0                          |
| entity["company","Sentry","error monitoring"]                      | Error monitoring   | Application error capture for UI/backend                                              | High citeturn6view0                          |
| entity["company","Stripe","payments company"]                      | Billing            | Subscription and payments flows                                                       | High citeturn6view0                          |
| entity["company","Orb","billing platform"]                         | Billing            | Usage-based or contract billing support, suggests hybrid billing stack                | High citeturn6view0                          |
| entity["company","GitHub","code hosting platform"]                 | Source code        | Primary repo hosting and CI ecosystem integration                                     | High citeturn6view0turn7view0turn10search4 |
| entity["company","Linear","issue tracking"]                        | Issue tracking     | Internal engineering workflow                                                         | High citeturn6view0                          |
| entity["company","Slack","collaboration platform"]                 | Internal processes | Internal comms, also aligns with product notifications support                        | High citeturn6view0turn20view0              |
| entity["company","Notion","productivity software"]                 | Internal processes | Internal knowledge base                                                               | High citeturn6view0                          |
| entity["company","Pylon","customer support platform"]              | Support            | Customer support system                                                               | High citeturn6view0                          |
| entity["company","Superhuman","email client"]                      | Email              | Corporate/internal email handling                                                     | High citeturn6view0                          |
| entity["company","Google Workspace","productivity suite"]          | Internal processes | Corporate identity/docs tooling                                                       | High citeturn6view0                          |

### System decomposition with explicit confidence ratings

The table below captures the principal components you would expect in a system that behaves like Momentic, and ties each to public evidence.

| Component                                               | What it likely does                                                                      | Public evidence                                                                                                                                                                               | Confidence                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Cloud Web App (UI)                                      | Cloud test editor, run viewer, org settings, analytics, quarantine management            | Cloud quickstart describes creating tests in browser; failure analysis shown in Run Viewer; quarantine actions in Cloud UI; enterprise page positions “quality platform”                      | High citeturn22search7turn16view1turn18view3turn33view0                                                                 |
| Local App (UI + desktop server)                         | Local authoring UI for YAML tests, interactive runs, connects to MCP                     | CLI quickstart describes `npx momentic app` opening Local App UI; MCP doc states MCP server runs on developer machine and requires Local App running                                          | High citeturn31view1turn28search1                                                                                         |
| CLI (Node package)                                      | Project init, install browsers, run tests, upload results, quarantine commands, sharding | CLI readme and docs show installation and commands; `run` docs list reporters, parallel, sharding, results upload; quarantine docs show CLI command                                           | High citeturn8view0turn28search0turn18view3                                                                              |
| Cloud API (`api.momentic.ai`)                           | Central control plane for auth, runs, cache, memory, results                             | MCP config examples include a `MOMENTIC_SERVER` pointing to `https://api.momentic.ai`; CLI uses API key; JS SDK exposes “runs” and “steps.queue” resources                                    | High citeturn28search1turn10search4turn21search1                                                                         |
| Execution plane (runner fleet)                          | Runs tests in isolated workers, spawns browsers, collects artifacts, applies caching     | Environment requirements explicitly say each test runs in a separate worker; enterprise page claims spinning up thousands of parallel browser sessions in seconds                             | High citeturn26view0turn33view0                                                                                           |
| Browser automation engine                               | Drives Chromium/Chrome variants; collects console/network state                          | Browsers doc lists supported browsers and overrides; config supports disabling console/network logs; request mocking uses async separate process consistent with a browser automation runtime | High citeturn19view0turn29view0turn16view2                                                                               |
| AI agent layer (locator, assertion, visual, extraction) | Converts natural language intents into element targets and assertions, supports AI steps | AI configuration describes agent types and versioning; AI check and AI extract steps use AI models with HTML/screenshot modes                                                                 | High citeturn21search4turn31view0turn21search9                                                                           |
| Cache service (step cache)                              | Stores element targeting context and accelerates runs                                    | Step caching doc details stored fields (selectors, roles, screenshots, geometry), eligibility rules, expiration (90 days), branch/commit scoping                                              | High citeturn15view0turn29view0                                                                                           |
| Memory service (AI trace memory)                        | Stores traces from past runs to make AI decisions consistent                             | Memory doc describes storing completions and re-supplying them to AI agents; expiry 30 days; scoped per organisation                                                                          | High citeturn17view0                                                                                                       |
| Artifact storage                                        | Stores screenshots, videos, logs, run metadata; powers run viewer                        | Failure analysis uses screenshots; run command supports `--record-video` and outputs artifacts to directories; cloud viewer shows video (implied)                                             | Medium (object store choice inferred) citeturn16view1turn28search0turn29view0                                            |
| Serverless sandbox for JS steps                         | Runs user JS in isolated Node sandbox, with constraints and timeouts                     | JavaScript doc explicitly states isolated Node.js sandbox; email/SMS docs reference “JavaScript lambda timeout,” strongly implying serverless execution model                                 | Medium citeturn16view0turn18view0turn18view1                                                                             |
| Mobile execution                                        | Remote and local emulators, APK channels/tags, webview handling                          | Mobile CLI setup requires Node + JDK + Android Studio; emulator doc describes remote emulators, provisioning times, and regions; config supports emulator region `us-west1` and `eu-north1`   | High for product behaviour, medium for underlying automation framework citeturn19view1turn19view2turn29view0turn33view2 |

### Where direct evidence ends, and hypotheses begin

Some items the user requested are not explicitly named in Momentic public docs (CDN brand, specific DB engines for caches, vector DB choice, service mesh, IaC toolchain). Below is an explicit “uncertainty table” with plausible implementations, and how to validate them.

| Unknown detail                               | Plausible options                                                                                           | Evidence basis                                                                                                                            | Current best guess                                                                                             | Confidence                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| CDN / edge for momentic.ai + app.momentic.ai | Cloud CDN, Cloudflare, Fastly, Vercel Edge                                                                  | No explicit vendor disclosure in docs                                                                                                     | Cloud CDN or Cloudflare, because CNAME/headers typically reveal this, but not visible in sources captured here | Low                                                 |
| Cache and memory storage engine              | PostgreSQL tables, Redis, object storage blobs, specialised KV store                                        | They state it’s stored “securely on Momentic Cloud” with TTL policies; core DB is PostgreSQL per hiring                                   | PostgreSQL for metadata + KV/blob store for heavier payloads                                                   | Medium citeturn15view0turn17view0turn34search1 |
| Similarity search for “most relevant traces” | Embeddings + vector DB, heuristic ranking over structured fields, hybrid                                    | They “choose the most relevant traces,” but no mention of embeddings/vector DB                                                            | Hybrid heuristic ranking first, embeddings later if needed                                                     | Low to Medium citeturn17view0                    |
| Model routing strategy                       | Single provider, multi-provider failover, task-specialised routing (vision vs text)                         | Subprocessor list includes multiple AI providers; AI check includes a vision-only mode option                                             | Multi-provider routing/failover, with vision-optimised model for visual assertion modes                        | Medium to High citeturn6view0turn31view0        |
| “Deterministic runners” implementation       | Pinned browser versions, hermetic containers, fixed timeouts, controlled geolocation/UA, replayable network | Enterprise page claims deterministic runners; browsers doc lists UA and geolocation overrides; config supports page filtering and pruning | Hermetic containers + pinned browser versions + controlled environment and defaults                            | Medium citeturn33view0turn19view0turn29view0   |

## Full feature catalogue and mapping to technical components

### Core platform features

Momentic’s public docs enumerate a mixture of platform-level features and step-level primitives.

**Reliability and intelligence layer**

- Auto-healing (feature category present in docs navigation; detailed mechanics implied through intent-based targeting and cache/memory systems). citeturn6view0turn15view0turn17view0turn32search1
- Step caching (element context caching, branch-aware keys, Cloud storage, 90-day expiry). citeturn15view0turn29view0
- Memory (AI completion trace reuse, 30-day expiry, locator/assertion agents). citeturn17view0turn29view0
- Failure analysis (AI narrative and RCA, uses screenshots, page state, step history). citeturn16view1
- Failure recovery beta (CI-only, up to 3 recoveries, generates recovery steps for transient issues). citeturn31view2turn29view0
- Quarantine and quarantine rules (manual and rule-based quarantine for flaky tests across branches/environments). citeturn18view3

**Execution and scale**

- Parallelism, sharding, retries, timeouts (CLI run options). citeturn28search0turn10search4
- Deterministic runners and failover for enterprise claims. citeturn33view0
- Reporters: JUnit, Allure JSON, Playwright JSON (CLI). citeturn28search0
- Video capture via ffmpeg install and `--record-video`. citeturn28search0turn29view0
- Upload results to Cloud for centralised viewing. citeturn28search0turn10search4

**Integrations and automation**

- CI guides for multiple systems (GitHub Actions, CircleCI, Jenkins, and others are listed). citeturn6view0turn10search4turn14search20
- Notifications: Cloud mode lists Slack, PagerDuty, Opsgenie, and “any webhook-based system.” citeturn20view0
- MCP support for IDE agents, with multiple transports and an explicit security note that MCP is local-only and currently has no authentication for local access. citeturn28search1
- JavaScript sandbox utilities: HTTP via axios, database via pg, GitHub API helpers, plus built-in `email`, `sms`, and `ai.generate`, which effectively act as product-provided “mini-SDKs” for test-time operations. citeturn16view0turn18view0turn18view1turn18view2
- JavaScript SDK (`@momentic/js`) exposing REST resources for run status and queueing steps. citeturn21search1

### Complete step surface

Momentic’s documentation enumerates step types in three broad categories.

| Category        | Step types (as documented)                                                                                                                                                                                                                                                                                                                       | Notes / implications                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI steps        | AI action (beta), AI check, AI extract                                                                                                                                                                                                                                                                                                           | AI action expands into sub-steps; AI check supports HTML+screenshot vs vision-only context; AI extract can return structured output, schema-driven citeturn20view1turn31view0turn21search9                  |
| Primitive steps | Element check, Page check, Click, Type, Press, Key down, Key up, Hover, Scroll, Drag and drop, Select, Cookie, Wait, Wait for URL, Local storage, File upload, Switch tab, New tab, Navigate, Refresh, Copy, Paste, Set header, Register request listener, Await listener, Record requests, Get recorded requests, Mock route, Remove mock route | This set mirrors mature browser automation frameworks, plus request-listener and recording primitives that enable “black box” debugging and contract testing patterns citeturn31view0turn16view2turn16view3 |
| Advanced steps  | JavaScript, Visual diff, Save auth state, Load auth state, Conditional                                                                                                                                                                                                                                                                           | Signals a design that aims to keep most flows declarative while allowing procedural escape hatches and state reuse citeturn31view0turn21search22turn29view0                                                 |

### Feature mapping to technical components

The table below links user-facing features to the most likely underlying components and data flows.

| Feature                            | Primary components involved                       | Key data artifacts / API calls                                               | Confidence                                                                      |
| ---------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Natural language element targeting | Runner + locator agent + cache/memory             | DOM/accessibility tree context, screenshots, AI completion, cached selectors | High citeturn21search4turn15view0turn29view0                               |
| Fast repeat runs                   | Step cache + memory + runner                      | Cache hits for element resolution; fewer AI calls; 90-day cache expiry       | High citeturn15view0turn21search16                                          |
| AI assertions (“AI check”)         | Assertion agent (HTML+image) or vision-only agent | Screenshot capture, optional HTML context, LLM/VLM call                      | High citeturn31view0turn21search4                                           |
| Visual regression (“Visual diff”)  | Runner + artifact store + golden file dir         | Golden files on disk (`goldenFileDir`), update golden files flag             | High citeturn29view0turn28search0                                           |
| CI scaling (shards + parallel)     | CLI runner orchestration + results upload         | `--shard-index/--shard-count`, `--parallel`, merge/upload results pattern    | High citeturn10search4turn28search0                                         |
| Quarantine rules                   | Cloud analytics + quarantine service              | Run history, pass rate / flake rate; rule evaluation                         | Medium (implementation internal), high for feature existence citeturn18view3 |
| Request mocking                    | Browser engine + async mocking subprocess         | Route matchers, response generator JS, supports “fetch real response”        | High citeturn16view2                                                         |
| Failure analysis                   | Artifact pipeline + AI analysis service           | Screenshots before/after, step playback, URL/page state, error + stack       | High citeturn16view1                                                         |
| Failure recovery                   | Runner + AI recovery logic + CI detection         | CI env var gating, step injection and re-execution                           | High citeturn31view2turn29view0                                             |
| Email / SMS OTP flows              | JavaScript sandbox + email/SMS utilities          | Poll for messages afterDate, regex extraction, variable save                 | High citeturn18view0turn18view1turn27view0                                 |
| IDE agent editing via MCP          | Local desktop server + MCP tools                  | `momentic_test_create/get/edit`, session start, splice steps                 | High citeturn28search1                                                       |
| Enterprise SSO and auditability    | Auth provider + RBAC + audit log store            | SAML/SCIM SSO, immutable logs (implementation not public)                    | Medium to High citeturn33view0turn6view0                                    |

## Real-world use cases with implementation notes

This section translates features into concrete “how you would actually do it” patterns.

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["site:momentic.ai Momentic Editor screenshot","site:momentic.ai Momentic run viewer screenshot","site:momentic.ai Quarantine test screenshot","site:momentic.ai Momentic Mobile emulator screenshot"],"num_per_query":1}

### Pull-request quality gates for a web app

A canonical adoption path is PR gating: run a smoke suite (or shard a larger regression set), publish a JUnit report to CI, and optionally upload artifacts to Momentic Cloud for richer debugging.

Implementation notes:

- Use `momentic.config.yaml` to define environments, credentials, and browser defaults. citeturn29view0
- Use `npx momentic run --reporter junit --reporter-dir … --shard-index … --shard-count … --upload-results`. citeturn28search0turn10search4
- Keep caching enabled in CI to seed the cache and keep step runtimes low; Momentic explicitly ties cache saving eligibility to CI detection (`CI=true`) or explicit `--save-cache`. citeturn15view0turn28search0
- If a test is flaky, quarantine it so it stops failing pipelines while you fix the underlying cause, and optionally configure quarantine rules based on flake rate thresholds. citeturn18view3turn28search0

### Running “secure” tests against private deployments

Momentic provides an explicit IP allowlist strategy for Cloud runs: whitelist a fixed egress IP address. citeturn27view0  
This implies a common use case: staging environments behind network ACLs.

Implementation notes:

- Add the fixed Momentic Cloud egress IP to your allowlist, then point environments to the internal base URL. citeturn27view0turn29view0
- Avoid SSO flows in automation, and prefer username/password or email/SMS OTP patterns. citeturn27view0turn18view0turn18view1

### Testing email magic-link and OTP login flows

Momentic’s email utilities support polling for the latest email after a specific timestamp, which is a practical guard against flakiness from stale inbox messages.

Implementation notes:

- In a JavaScript step, call `email.fetchLatest({ inbox, afterDate: new Date(), timeout: … })` and extract the URL or code via regex. citeturn18view0turn27view0
- Save the output to an environment variable, then use `Navigate` or `Type` with `{{ env.VAR_NAME }}` templating. citeturn16view0turn27view0
- To prevent parallel-test races, use inbox suffixes (the docs recommend `Date.now()`-style randomisation). citeturn18view0

### Feature-flag and error-state testing via request mocking

Request mocking supports both full stubbing and response modification, including a “fetch real response” mode that allows you to patch a JSON payload and return it.

Implementation notes:

- Add a “mock route” step with a URL matcher (regex) and a JS response generator. citeturn16view2
- For feature flags, enable “fetch real response”, then modify `mock.response.json()` and return a new Response that flips a flag. citeturn16view2
- The docs highlight that mocking runs in a separate async process, an important operational detail because it affects debugging patterns and error propagation (500s with message body). citeturn16view2

### Debugging and triage at scale with AI failure analysis

Failure analysis is designed for fast triage: it composes a likely root cause narrative from screenshots, page state/URL, step intent, element targeting details, and error stacks.

Implementation notes:

- Enable in Cloud AI settings, or in CLI config via `ai.aiFailureAnalysis: true`. citeturn16view1turn29view0
- When debugging performance-sensitive tests, consider disabling high-volume browser monitoring (console/network logs) via config. This trades visibility for speed. citeturn29view0turn19view0

### Self-recovery from transient UI failures in CI

Failure recovery (beta) attempts to detect recoverable transient failures (slow loads, modals, UI races), generate recovery steps, and re-run the failed step.

Implementation notes:

- CI-only gating is explicit: your environment must set `CI=true`, and interactive editor sessions do not trigger recovery. citeturn31view2turn15view0
- Only primitive steps are eligible (not modules or AI actions), so you may want to keep critical flows granular to maximise recoverability. citeturn31view2turn20view1

### Mobile regression testing with remote emulators

Momentic Mobile adds a second execution substrate: remote hosted Android instances (via a third-party provider) and local Android Studio emulators.

Implementation notes:

- Remote emulator provisioning is described as on-demand with “under 1 second” provisioning, and regions are limited to US West and EU North as per docs. citeturn19view2turn33view2
- APKs are managed via channels and tags, and can be uploaded via a CLI command. citeturn19view2turn19view1
- Local emulators support environment-driven configuration (`LOCAL_AVD_ID`, `LOCAL_APK_PATH`), which is a practical pattern for teams that do not want to commit local-machine paths. citeturn19view2turn29view0

### IDE-native test authoring with MCP

MCP support suggests a “tests as agent-manipulated artefacts” paradigm: you can ask an IDE agent to create or edit tests via an API rather than direct file edits.

Implementation notes:

- The desktop MCP server runs locally and “currently no authentication is required for local access,” so the security boundary is your workstation. citeturn28search1
- Momentic recommends agent rules that forbid direct YAML edits and instead require MCP tool usage, which implies the YAML format is strict and tool-mediated edits reduce corruption risk. citeturn28search1

## Recommended tests and probes to validate hypotheses

The following probes are designed to validate the “unknowns” (CDN, exact data stores, model routing) without relying on private access. None of these require privileged information, but some require running the product or inspecting network traffic in your own environment.

| Hypothesis to validate                                      | Probe                                                                                                                                                      | Expected signal if true                                                                    | Confidence impact                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| CDN / edge provider for app.momentic.ai                     | Inspect DNS records (CNAME), TLS certificate SANs, and response headers from multiple geos                                                                 | Cloudflare headers, Google Cloud CDN headers, or other edge fingerprints                   | Raises from Low to Medium                                                     |
| Actual API surface of `api.momentic.ai`                     | Use `@momentic/js` against a test workspace, enumerate endpoints used for run status and step queueing                                                     | Confirms REST paths, auth scheme, pagination, rate limits                                  | Raises API certainty to High for endpoints citeturn21search1turn28search1 |
| Whether cache/memory are stored in PostgreSQL vs a KV store | Run many unique steps across branches, observe cache keying behaviour and TTL expiry patterns, then compare with “commit scoped” semantics                 | Strong alignment with relational indexing over (org, repo, branch, commit, step-id) fields | Raises storage inference to Medium/High citeturn15view0turn29view0        |
| Whether memory uses embeddings/vector search                | Create semantically similar but not identical locator prompts across runs, observe whether retrieval is “semantic” vs “exact key”                          | Semantic generalisation suggests embeddings, exact matching suggests heuristic keys        | Raises vector DB inference                                                    |
| “Deterministic runners” meaning                             | Compare runs across time and regions, inspect browser versions and UA, and variance in timing                                                              | Low variance and pinned versions support hermetic runners                                  | Raises determinism confidence citeturn33view0turn19view0                  |
| Mobile automation framework (Appium-like vs custom)         | Inspect mobile CLI runtime dependencies during install and run, and observe whether it starts an Appium server or uses standard Android tooling interfaces | Presence of Appium server logs or WebDriver endpoints supports Appium lineage              | Raises mobile framework confidence                                            |

A practical additional probe is to treat Momentic as a black box and profile its operational behaviour under load: parallel browser sessions, caching hit rates, and the number of AI completions per run. “Over 99% cached steps” is a platform-level claim in their performance docs, so your own telemetry should roughly reproduce that pattern after cache warm-up if your suite is stable. citeturn21search16turn15view0

## Estimated cost and scaling implications

This section separates **hard constraints explicitly stated by Momentic** from **cost arithmetic you can apply**.

### Compute scaling: browser sessions are the fundamental unit

Momentic’s environment requirements recommend at least **2 vCPUs and 4 GB RAM per browser instance** (minimum spec for Chromium), and they run each test in a separate worker that acts as a user. citeturn26view0turn19view0  
Therefore, at concurrency **N**, a first-order capacity model is:

- vCPU demand ≈ `2 * N`
- RAM demand ≈ `4 GB * N`

If you run N=500 tests in parallel for 12 minutes, resource consumption is:

- vCPU-minutes = `2 * 500 * 12 = 12,000 vCPU-min` (200 vCPU-hours)
- GB-minutes = `4 * 500 * 12 = 24,000 GB-min` (400 GB-hours)

This model is intentionally provider-agnostic, because actual $ pricing depends heavily on region, committed use discounts, spot/preemptible usage, and node packing efficiency. The important point is that **parallelism is a linear cost lever**.

Enterprise marketing claims they can “spin up thousands of parallel browser sessions in seconds,” which implies aggressive autoscaling and a runner pool designed for bursty workloads. citeturn33view0turn34search1

### AI inference cost: caching and page filtering are cost-control systems

Momentic’s own performance documentation highlights that cached steps are close to Playwright-level speed, while non-cached AI steps are much slower, and that “over 99%” of steps executed on the platform are cached. citeturn21search16turn15view0  
Two scaling conclusions follow:

1. **Warm caches amortise AI cost**: first runs on new flows pay higher inference latency and token usage, later runs largely avoid it. citeturn15view0turn21search16
2. **Token hygiene is productised**: config options like page chunking/filtering for large pages, pruning controls (important attributes/classes), and disabling accessibility-tree strictness exist specifically to reduce context size and failure modes. citeturn29view0turn21search4

A practical estimation framework (you can fill with your provider’s current token rates) is:

- AI cost per run ≈ `(#AI locator calls + #AI assertion calls + #AI extraction calls + #failure-analysis calls) * (avg tokens per call) * (cost per token)`
- Effective AI call rate shrinks as cache hit rate rises and as you choose more primitive/non-AI steps for stable regions of the UI. citeturn15view0turn31view0turn16view1

### Storage cost: artifacts, videos, and cache/memory retention

Known drivers from docs:

- Artifacts include screenshots, logs, and optionally recorded video, with video explicitly increasing results size. citeturn28search0turn29view0turn16view1
- Step caches expire after 90 days of inactivity; memory expires after 30 days. Expiry policies materially cap unbounded storage growth. citeturn15view0turn17view0

Cost implication:

- Video is the dominant storage multiplier. Enabling it for every run in a large CI suite is likely expensive; enabling only on failure, or only on selected suites, is typically the pragmatic approach (this is an implementation recommendation, not a Momentic-documented behaviour). Confidence: Medium.

### Engineering scaling strategies that align with documented behaviour

The following strategies are directly supported by documented flags/config fields:

- Use sharding + parallelism to reduce wall-clock time while explicitly controlling concurrency. citeturn10search4turn28search0
- Keep caching enabled in CI to continually evolve caches on the main branch and seed feature branches, which reduces both runtime and AI usage. citeturn15view0turn29view0
- Disable high-volume browser monitoring when performance matters more than rich debugging for a given suite. citeturn29view0
- Prefer deterministic primitives (Click/Type/Page check/Element check) in critical flows, reserving AI check for assertions that are expensive to encode as strict selectors but stable as semantic checks. citeturn31view0turn21search16

### Likely engineering org and roles

Momentic’s entity["organization","Y Combinator","startup accelerator"] profile indicates a small team size (12). citeturn25search17turn34search1  
Hiring materials also strongly imply a “small team, founder-led engineering” model with distinct emphases:

- Frontend and full-stack engineers focused on the Cloud UI and Local App (React/Next.js). citeturn34search1
- Infrastructure engineers focused on Kubernetes-scale execution and observability (the stack explicitly includes Kubernetes and Google Cloud). citeturn34search1turn34search3
- AI engineering roles that, based on job snippets, value both modern fine-tuning knowledge and classical ML techniques like template matching and OCR, suggesting a hybrid AI system, not purely LLM prompts. citeturn34search2turn34search5

Founding context from the cofounder blog suggests prior experience building internal testing platforms and a bias toward “force-multiplier” engineering investments, consistent with building an execution platform rather than a thin wrapper around an LLM. citeturn33view1

## References and links

Primary and near-primary sources used for reconstruction are listed below. Citations link directly to the source pages.

- Momentic documentation hub (product overview, navigation to all major docs). citeturn14search3
- Cloud vs CLI comparison (feature differences, notification systems, reporting availability). citeturn20view0
- CLI quickstart (Local App, YAML tests, install flows). citeturn31view1
- CLI `run` command reference (parallelism, sharding, reporters, video, results upload). citeturn28search0
- `momentic.config.yaml` reference (browser options, AI options, mobile emulator region config). citeturn29view0
- Step caching (how caches work, contents, eligibility, git scoping, expiry). citeturn15view0
- Memory (trace reuse, scope, expiry). citeturn17view0
- Failure analysis and failure recovery beta (AI debugging and recovery behaviour). citeturn16view1turn31view2
- Request mocking (route interception, response modification, async process note). citeturn16view2
- JavaScript sandbox and utilities (execution context, provided libraries, test-time helpers). citeturn16view0turn18view2
- Email and SMS utilities (polling, time filters, inbox strategy). citeturn18view0turn18view1
- Environment guidance (resource requirements, worker-per-test model, allowlist IP). citeturn26view0turn27view0
- MCP (local server endpoints, transports, available tools, security considerations). citeturn28search1
- Privacy and security (SOC 2 Type 2 claim and subprocessor list). citeturn6view0
- Enterprise page (SLA, SSO, audit logs, redundant regions, deterministic runners, scale claims). citeturn33view0
- Mobile launch post and mobile docs (product intent, mobile performance highlights, emulator model). citeturn33view2turn19view2turn19view1
- Funding and traction reporting: entity["organization","TechCrunch","technology news outlet"] article (Series A, customer/user counts, monthly step volume), plus Momentic’s own Series A and seed posts. citeturn33view3turn32search1turn32search2
- Stack disclosure in hiring materials (React/Next.js/Node/Postgres on Google Cloud + Kubernetes). citeturn34search1
- VC validation: entity["company","Dropbox Ventures","venture capital arm"] blog mentioning Momentic. citeturn32search7
