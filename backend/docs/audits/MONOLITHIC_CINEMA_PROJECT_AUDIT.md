# Monolithic Cinema Project Audit

Audit date: 2026-07-16
Auditor role: Senior Software Architect, Senior QA/Automation Engineer, Security Reviewer, Database Reviewer, Cinema Domain Analyst
Project: Magi Cinema
Architecture scope: monolithic Spring Boot backend with React/Vite frontend

This report follows `docs/architecture/test.md`. Production code was not modified. No commits, push, reset, database reset, real email, or real payment calls were performed.

Evidence labels:

| Label | Meaning |
|---|---|
| Confirmed | Reproduced by command/runtime output in this audit. |
| Code-evidenced | Direct evidence exists in code, but the workflow was not executed end-to-end. |
| Hypothesis | Plausible risk needing additional runtime evidence. |
| Blocked | Could not verify safely because dependency/config/test fixture was missing. |

## 1. Executive Summary

Overall status: **RED**

Demo readiness: **Conditional AMBER**. Backend tests and frontend build pass, so a controlled local demo may work if the existing PostgreSQL database is already prepared and frontend lint is not a gate. Demo should not use real credentials or real payment providers.

Deploy readiness: **RED / No-Go**. The project is not production-ready due to committed/default secrets, default admin behavior, non-versioned runtime schema mutation, broken full-stack Docker compose paths, missing payment transaction ledger/idempotency, incomplete tests, and missing database constraints for important invariants.

Top 5 risks:

1. **P0 secrets/default admin**: credentials and API keys/defaults are in `application.properties`, and default admin creation is present.
2. **P0 stale JWT authorization**: a banned/deleted user can keep using an already-issued JWT until expiry.
3. **P1 booking/payment integrity**: seat booking has application-level locks, but DB-level active-ticket invariant and payment transaction ledger are missing.
4. **P1 schema/migration risk**: `ddl-auto=update` and startup JDBC migrations mutate schema/data outside versioned migrations.
5. **P1 verification gap**: only 3 backend tests exist; no confirmed integration/E2E/concurrency tests for seat booking/payment/auth.

Not fully checked:

- Full HTTP startup with disposable database: blocked because no disposable DB/test fixture was configured and Docker compose is not currently valid for full stack.
- True threaded seat-booking concurrency test: blocked for same reason.
- Real payment provider callback against sandbox: not executed to avoid external calls and because no isolated sandbox fixture was configured.
- Email delivery: not executed to avoid sending real email.
- Backend dependency CVE audit: OSS Index plugin returned `401 Unauthorized`; result is inconclusive.

## 2. Verification Matrix

| Area | Compile | Tests | Startup | Runtime Flow | Status |
|---|---|---|---|---|---|
| Backend Spring Boot | Pass | Pass: 3 tests | Partial: Spring context startup in test | Not E2E verified | AMBER |
| Frontend React/Vite | Pass | No frontend tests found | Build artifact generated | Not browser-smoke verified | AMBER |
| Frontend lint/type quality | N/A | Lint fails | N/A | N/A | RED |
| Database schema/migration | JPA starts | Not isolated | Starts by mutating local DB | Fresh DB migration not verified | RED |
| Docker Compose | Config parses | N/A | Full-stack path invalid | Not runnable as-is | RED |
| Auth/security | Compiles | Password policy only | Context starts | No role/JWT runtime smoke | RED |
| Booking/payment | Compiles | No flow tests | Context starts | No concurrency/payment E2E | RED |
| Industry/practice alignment | N/A | N/A | N/A | Code/docs compared | AMBER |

Verification depth:

- Backend: **Unit-test verified + Spring context startup verified**, not full HTTP/E2E.
- Frontend: **Build verified**, lint failed, not browser/E2E verified.
- Database: **Runtime schema-update observed**, not versioned migration verified.
- Booking concurrency: **Code-evidenced only**, not runtime-confirmed.

## 3. Architecture Map

Actual architecture:

```text
React/Vite Frontend
    ↓
Spring MVC Controller/API
    ↓
Application/Service layer
    ↓
JPA Entity / Domain model
    ↓
Spring Data Repository
    ↓
PostgreSQL relational database
```

Package style:

- The backend is a **layered monolith** with package-by-layer structure: `controller`, `service`, `repository`, `entity`, `dto`, `mapper`, `config`, `validation`, `websocket`.
- It has feature-oriented class names inside the layers, but not a strict package-by-feature modular monolith.
- This is acceptable for a student/team monolith, but some services are becoming large and business invariants are split between service code and startup SQL.

Backend technologies:

| Area | Detected |
|---|---|
| Language | Java, target Java 21 |
| Framework | Spring Boot 3.3.1 |
| Build tool | Maven wrapper |
| Persistence | Spring Data JPA, Hibernate, PostgreSQL |
| Security | Spring Security OAuth2 Resource Server JWT with HS512 |
| API docs | springdoc-openapi |
| External integrations | SMTP, Cloudinary, TMDB, ZaloPay, MoMo, Google Sheets |
| Scheduled jobs | Booking hold cleanup, movie status update, showtime status sync |
| Frontend | React 19, Vite 8, TypeScript, Axios |

Scheduled jobs found:

| File | Line | Job |
|---|---:|---|
| `Hcm26CplJsJava02Team4MovieTheaterApplication.java` | 8 | `@EnableScheduling` |
| `BookingService.java` | 411 | Pending booking hold cleanup |
| `MovieService.java` | 417 | Daily movie status update |
| `ShowtimeService.java` | 329 | Showtime status sync |

External integration config includes TMDB, SMTP, Cloudinary, ZaloPay, MoMo, and Google Sheets. Several default credentials or real-looking keys are committed in config, covered under SECURITY-001.

## 4. Business Rule Coverage

| Rule ID | Business Rule | Code Evidence | Test Evidence | Coverage | Gap | Priority |
|---|---|---|---|---|---|---|
| AUTH-REG-001 | Registration with OTP verification | `AuthenticationService`, `OtpStore` | Not flow-tested | Partial | OTP in-memory, no retry limit | P1 |
| AUTH-LOGIN-001 | Login rejects inactive/banned/deleted users | `AuthenticationService.authenticate` | Not flow-tested | Partial | JWT remains valid after later status change | P0 |
| AUTH-RESET-001 | Password reset should resist brute force | `PasswordResetService` | Not tested | Partial | `Random`, 6-digit plain token, no retry limit | P1 |
| MOVIE-001 | Movie lifecycle status | `MovieService`, `MovieStatus` | Not flow-tested | Partial | Actual states differ from expected DRAFT/PENDING_REVIEW/APPROVED flow in requirement | P2 |
| TMDB-001 | TMDB import should avoid duplicate/provenance drift | `TmdbService`, config | Not flow-tested | Partial | Secret hard-coded/default; duplicate/provenance not fully verified | P1 |
| ROOM-001 | Room name uniqueness | `CinemaRoomService` | Not tested | Partial | App-level uniqueness only; no cluster model found | P2 |
| SEAT-001 | Seat label unique within room | `Seat` unique constraints | Not tested | Covered | DB unique constraints exist for seat label/row/number | P2 |
| SEAT-002 | Disabled/maintenance seats not sellable | `BookingService` seat validation | Not flow-tested | Partial | Not proven by runtime test | P1 |
| SHOWTIME-001 | Showtime cannot overlap in same room | `ShowtimeService.ensureNoOverlappingShowtime` | Not concurrency-tested | Partial | App-level check only, no DB exclusion constraint | P1 |
| SHOWTIME-002 | Showtime through midnight and buffer rules | `ShowtimeService`, auto-showtime docs | Not flow-tested | Partial | Runtime edge cases not proven | P2 |
| BOOKING-001 | Atomic seat hold | `BookingService`, `ShowtimeSeatRepository.@Lock` | Not concurrency-tested | Partial | Lock exists, but no test and no DB active-ticket guard | P1 |
| BOOKING-002 | User cannot confirm/release someone else's hold | `BookingService.validatePendingBookingCanBePaid` | Not flow-tested | Partial | Needs authorization tests | P1 |
| BOOKING-003 | Couple seat atomicity | `BookingService` validation | Not flow-tested | Partial | Needs tests for all-or-nothing behavior | P2 |
| PAYMENT-001 | Callback signature verified | `PaymentService`, provider services | Not sandbox-tested | Partial | Signature logic exists, no callback replay/idempotency table | P1 |
| PAYMENT-002 | Price snapshot and amount verification | `BookingService.confirmBookingPayment` | Not flow-tested | Partial | No provider transaction ledger | P1 |
| PROMO-001 | Promotion validity/usage/applicability | No promotion module found | Not tested | Gap | Feature missing | P1 |
| TICKET-001 | Ticket code/QR unique and check-in | `Ticket` lacks code/QR/check-in fields | Not tested | Gap | Feature incomplete | P1 |
| NOTIFY-001 | Email should not break booking transaction | Booking email wrapped in try/catch | Not tested | Partial | No retry/outbox for external failure | P2 |
| FRONT-001 | Route guard and role UI align with backend auth | `ProtectedRoute`, `SecurityConfig` | Not browser-tested | Partial | No contract/role tests | P1 |

## 5. Findings

| ID | Severity | Module | Finding | Evidence | Reproduction | Impact | Recommendation |
|---|---|---|---|---|---|---|---|
| SECURITY-001 | P0 | Config/Auth | Secrets and default credentials are committed/defaulted in source. | `backend/src/main/resources/application.properties:8,42,48,53-55,60-62,75,92,99`; `ApplicationInitConfig.java:48,78,93`. | Confirmed by static search. Do not print secret values. | Credential leak, default admin takeover, unsafe staging/prod deploy. | Rotate exposed secrets, remove defaults, require env/secret manager, remove default admin password flow. Confidence: Confirmed. Scope: Current sprint. Effort: M. Dependency: none. |
| AUTH-001 | P0 | Auth/Security | JWT remains valid after user is banned/deleted because status is checked only at login. | `AuthenticationService.java:155-175`; `JwtService.java:28-56`; `SecurityConfig.java:190-206`. | Code-evidenced: login checks status, resource server later validates JWT only. | Revoked/locked users retain access until token expiry. | Add token version/security stamp, short-lived access tokens, refresh/revocation, and per-request active-user validation. Confidence: Code-evidenced. Scope: Current sprint. Effort: M. |
| BOOKING-001 | P1 | Booking/DB | DB does not enforce "one active ticket per showtime seat"; startup drops old ticket-seat constraint. | `BookingSchemaMigrationConfig.java:16-18`; `Ticket.java:15-31`; `BookingService.java:215,236,317`. | Code-evidenced; true race test blocked without disposable DB/test data. | Double booking risk if app lock is bypassed or future path misses validation. | Add partial unique index/constraint for active paid/held tickets; remove constraint-dropping startup code; add concurrency test. Confidence: Code-evidenced. Scope: Current sprint. Effort: L. |
| PAYMENT-001 | P1 | Payment | Missing payment transaction ledger, provider transaction uniqueness, raw callback audit, and idempotency key. | `PaymentService.java:31-141`; no `payment_transaction`, `providerTransaction`, or `outbox` match in Java sources. | Code-evidenced by static search. | Duplicate callback/replay/reconciliation/refund handling is weak. | Add `payment_transaction` table/entity, unique provider tx ref, raw callback audit, idempotent state transitions. Confidence: Code-evidenced. Scope: Current sprint. Effort: L. |
| DB-001 | P1 | Database | Runtime schema mutation via `ddl-auto=update` and startup JDBC migrations. | `application.properties:14-15`; test log showed Hibernate `alter table`; `ApplicationInitConfig.java:52`; `BookingSchemaMigrationConfig.java:16`. | Confirmed by `mvnw test` output. | Schema drift, unsafe deploys, tests mutate local DB. | Add Flyway/Liquibase, convert startup SQL to migrations, use `ddl-auto=validate` outside local dev. Confidence: Confirmed. Scope: Current sprint. Effort: L. |
| SHOWTIME-001 | P1 | Showtime/DB | Showtime overlap is checked in service only, not enforced by database. | `ShowtimeService.java:218-233,605`; no DB exclusion constraint/migration found. | Code-evidenced; concurrent insert test blocked. | Concurrent admin create can insert overlapping showtimes. | Add DB exclusion constraint or locking strategy, plus concurrency test. Confidence: Code-evidenced. Scope: Current sprint. Effort: M. |
| AUTH-002 | P1 | Auth | OTP/password reset are weak against brute force and multi-instance deployments. | `OtpStore.java:13-35`; `PasswordResetService.java:45-60`. | Code-evidenced. | OTP loss on restart; reset token brute force; no retry throttling. | Use SecureRandom, hash tokens, persist TTL metadata, add retry and rate limits. Confidence: Code-evidenced. Scope: Current sprint. Effort: M. |
| ACCESS-001 | P1 | User/Profile | Self profile update skips duplicate phone/identity validation. | `UserService.java:324-341`; admin update checks duplicates at `UserService.java:413,424`. | Code-evidenced. | Duplicate PII identifiers and inconsistent staff workflows. | Add duplicate checks and DB constraints where business requires uniqueness. Confidence: Code-evidenced. Scope: Current sprint. Effort: S. |
| FRONTEND-001 | P1 | Frontend | Frontend lint fails with 44 errors and 100 warnings. | `npm run lint` exit code 1, 11.98s. | Confirmed by command. | CI gate failure, React runtime/maintainability issues. | Fix lint errors, then warnings; add CI lint gate. Confidence: Confirmed. Scope: Current sprint. Effort: M. |
| DEPLOY-001 | P1 | Deployment | Docker compose config points frontend context to a missing path. | `docker compose config` shows frontend context `backend/frontend`; `Test-Path backend/frontend` was false. | Confirmed by config/path check. | Full-stack startup from compose is broken. | Move compose to project parent or correct build contexts; add healthchecks. Confidence: Confirmed. Scope: Current sprint. Effort: S. |
| TICKET-001 | P1 | Ticketing | Ticket lifecycle is incomplete: no ticket code, QR payload, check-in, duplicate check-in prevention, or refund state. | `Ticket.java:15-31`; `QrCodeService.java` exists but is not integrated into ticket issuing. | Code-evidenced. | Paid booking cannot become auditable e-ticket/check-in flow. | Add ticket code/QR/check-in/refund fields and workflows. Confidence: Code-evidenced. Scope: Next sprint. Effort: L. |
| PROMO-001 | P1 | Promotion | Promotion/discount module is missing. | No `*Promotion*.java` found. | Confirmed by file search. | Payment/booking lacks real cinema promotion behavior. | Implement promotion engine with validity, applicability, usage caps, user usage caps, stackability. Confidence: Confirmed. Scope: Next sprint. Effort: L. |
| REVIEW-001 | P2 | Review | Review entity/repository exist but API/service/business rule are missing. | `Review.java`, `ReviewRepository.java`; no review controller/service found. | Confirmed by file search. | Users cannot review; no purchase/attendance validation. | Add review service/controller and rule: only eligible paid/attended users can review. Confidence: Confirmed. Scope: Next sprint. Effort: M. |
| API-001 | P2 | API Contract | Frontend DTOs are looser or inconsistent compared with backend validation. | `movieApi.ts:47-72`; `MovieCreationRequest.java:25-79`; `AppRoutes.tsx:31`; `ShowtimeService.java:797-798`; `userApi.ts:22-27`. | Code-evidenced. | Runtime 400s and broken navigation possible. | Generate frontend types from OpenAPI or align DTOs manually. Confidence: Code-evidenced. Scope: Next sprint. Effort: M. |
| TEST-001 | P1 | QA | Critical domains have no integration/concurrency/security tests. | Only two backend test files found; no frontend `*.test.*` or `*.spec.*` found. | Confirmed by file search. | Passing tests do not prove booking/payment/auth correctness. | Add Testcontainers, concurrency tests, API auth tests, frontend smoke tests. Confidence: Confirmed. Scope: Current sprint. Effort: XL. |

Detailed expected vs actual for top findings:

| Finding | Endpoint/Workflow | Expected Behavior | Actual Behavior |
|---|---|---|---|
| SECURITY-001 | Application startup/config | No committed production secrets; no known default admin in deployable config. | Real-looking/default secrets and default admin password behavior are present. |
| AUTH-001 | Any protected endpoint with old JWT | Locked/deleted users should be rejected immediately or near-immediately. | JWT validation is stateless and does not re-check user status. |
| BOOKING-001 | `POST /bookings`, payment confirm | DB should enforce no double-sold seat. | App lock exists, but active-ticket invariant is not enforced by DB. |
| PAYMENT-001 | Payment callback/IPN | Callback should be idempotent, auditable, and tied to unique provider transaction. | Signature is checked, but no transaction ledger/unique provider ref is present. |
| SHOWTIME-001 | Admin create showtime | Concurrent overlap must be rejected. | Service checks overlap before save; DB does not enforce non-overlap. |

## 6. Test Execution Log

| Command/Test | Result | Evidence | Notes |
|---|---|---|---|
| `git status --short` | Pass | Output showed `A docs/architecture/test.md` and previous report file untracked before this report. | Existing user/doc changes preserved. |
| `Test-Path docs/audits` | Initially false | Directory did not exist. | Created `docs/audits` for required deliverable. |
| `.\mvnw.cmd test` | Pass | Exit 0, 14.43s, 3 tests passed. | Unit/context verified. Test connected to local PostgreSQL and emitted Hibernate DDL. |
| `npm run build` | Pass | Exit 0, 1.80s. | Bundle: JS about 956.88 kB, gzip about 250.79 kB; chunk warning. |
| `npm run lint` | Fail | Exit 1, 11.98s; 144 problems. | 44 errors, 100 warnings. |
| `npm audit --omit=dev --audit-level=moderate` | Fail | Exit 1, 1.26s. | 1 high severity: `form-data` via `axios`, CRLF injection advisory. |
| `docker compose config` in `backend` | Config parses but invalid path | Shows frontend context `backend/frontend`. | That path does not exist; full build/start would fail. |
| Backend TODO/FIXME search | Pass | No output. | No `TODO`/`FIXME` in backend Java core flow search. |
| Backend `@Version` search | Gap | No output. | No optimistic locking annotations found. |
| Backend scheduled job search | Pass | Found booking cleanup, movie status, showtime status sync. | Multi-instance scheduler idempotency not runtime-tested. |
| `docs/issues/ISSUE_TEMPLATE.md` check | Missing | `False`. | Issue candidates below use local concise format. |

## 7. Industry Comparison

Sources accessed on 2026-07-16.

| Domain | Current Design | Industry Practice | Classification | Gap | Source |
|---|---|---|---|---|---|
| Vietnam film age classification | Movie model has status/metadata, but age-rating enforcement in booking was not confirmed. | Vietnam film classification includes categories such as P/K/T13/T16/T18/C under the Cinema Law/Circular guidance. | Regulation | Need explicit age-rating field and booking/admission policy if project handles Vietnamese public screening. | Law on Cinema 2022 PDF: https://datafiles.chinhphu.vn/cpp/files/vbpq/2022/07/05-2022-qh15..pdf ; Circular summary: https://english.luatvietnam.vn/circular-no-05-2023-tt-bvhttdl-dated-april-05-2023-of-the-ministry-of-culture-sports-and-tourism-prescribing-film-classification-criteria-and-displ-249745-doc1.html |
| Age verification at cinema | Not implemented as a check-in/admission workflow. | CGV Vietnam states customers should bring ID or ID image for age-restricted films. | Common industry practice | Add admission/check-in workflow support if the system is used beyond online booking. | CGV Terms: https://www.cgv.vn/en/terms-use/ |
| Ticket refund/exchange policy | Booking has `PENDING/SUCCESS/CANCELLED`, no refund state. | CGV states online successful tickets generally are not refunded/exchanged except special cases. Lotte has online booking fee terms. | Common industry practice | Project needs explicit refund/cancel policy and state machine, not necessarily the same as CGV/Lotte. | CGV conditions: https://www.cgv.vn/skin/frontend/cgv/default/html/pages/agreement-conditions-en.html ; Lotte terms: https://www.lottecinemavn.com/LCHS/Contents/etc/terms-of-use.aspx |
| Payment callback security | Signature verification exists. | Payment callbacks should be signed, idempotent, auditable, and reconciled. | Recommended design | Missing transaction ledger/idempotency. | OWASP API Top 10: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ |
| Password reset | 6-digit token with `Random`, no retry limit. | OWASP recommends consistent responses, rate limiting, cryptographically secure random tokens, and secure token storage. | Recommended design | Reset/OTP flow needs hardening. | OWASP Forgot Password: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html |
| Secret management | Secrets/defaults in source. | Centralized secret management, rotation metadata, secure token storage; avoid insecure browser local storage for tokens. | Recommended design | Remove and rotate secrets; reconsider frontend token storage. | OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html |
| Database migrations | `ddl-auto=update` and startup SQL. | Spring Boot recommends a single schema-generation mechanism; Flyway/Liquibase are standard for versioned schema management. | Recommended design | Introduce versioned migrations; use `validate` outside dev. | Spring Boot Database Initialization: https://docs.spring.io/spring-boot/how-to/data-initialization.html |
| JWT resource server | JWT signature/expiry validation configured. | Spring Security resource server validates JWT signature, timestamps, issuer, and maps scopes; application-specific revocation/status checks remain a domain concern. | Recommended design | Add user status/token version validation. | Spring Security JWT docs: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html |
| Showtime non-overlap | Service-level overlap check. | PostgreSQL exclusion constraints can enforce non-overlapping ranges at DB level. | Recommended design | Add DB non-overlap invariant for room schedules. | PostgreSQL range constraints: https://www.postgresql.org/docs/current/rangetypes.html |
| TMDB metadata import | TMDB integration exists, but provenance/duplicate behavior not fully runtime-verified. | TMDB supports appending related resources to detail responses to reduce request count and keep mapping explicit. | Recommended design | Ensure import is preview/confirm, duplicate-safe, and preserves provenance. | TMDB docs: https://developer.themoviedb.org/docs/append-to-response |

## 8. Prioritized Remediation Plan

### P0 - Fix before any demo/deploy

1. Rotate all exposed credentials and remove real/default secrets from committed config.
2. Remove default admin password behavior; require secure one-time admin setup.
3. Add JWT revocation/status validation so banned/deleted users lose access.

Dependency order:

```text
Secret rotation -> config/env validation -> default admin removal
JWT status check -> token version/revocation -> auth tests
```

### P1 - Fix before sprint close

1. Add versioned migrations and stop runtime schema mutation.
2. Add DB invariant for active ticket per showtime seat.
3. Add payment transaction ledger and callback idempotency.
4. Add DB or locking strategy for showtime overlap under concurrency.
5. Harden OTP/password reset.
6. Fix duplicate phone/identity self-update.
7. Fix Docker compose build contexts.
8. Fix frontend lint errors or relax only intentionally justified rules.
9. Add critical Testcontainers/concurrency/security tests.

Dependency order:

```text
Migrations first -> DB constraints -> booking/payment tests
Compose fix -> disposable DB startup -> E2E smoke
Auth hardening -> auth/authorization tests
Frontend lint -> CI gate
```

### P2 - Next sprint

1. Implement ticket QR/check-in/refund lifecycle.
2. Implement promotion engine.
3. Implement review API with eligibility rules.
4. Align OpenAPI/frontend DTO contracts.
5. Improve dashboard from mock/static data to real data.
6. Add upload size/type validation if missing.
7. Reduce frontend bundle size via code splitting.

### P3 - Backlog

1. Add observability dashboards for booking/payment state changes.
2. Add optional notification outbox/retry for email failures.
3. Standardize pagination conventions.
4. Document cinema-specific project decisions, especially seat type rules and refund policy.
5. Consider package-by-feature refactor only after tests are in place.

## 9. Issue Candidates

No `docs/issues/ISSUE_TEMPLATE.md` was found, so these candidates use a concise testable format. They are not created as separate issue files to avoid duplicates.

### ISSUE-001 - Remove committed/default secrets and default admin password

Severity: P0
Module: Config/Auth
Acceptance Criteria:

- No real secret or production-like default secret remains in committed config.
- App fails startup in non-local profile if required secrets are missing.
- Existing exposed keys are rotated.
- Default admin creation no longer uses a known password.
- Test or startup check verifies missing required secret fails predictably.

### ISSUE-002 - Add JWT revocation/status validation

Severity: P0
Module: Auth/Security
Acceptance Criteria:

- A user whose status changes to `BANNED`, `INACTIVE`, or `DELETED` cannot access protected APIs with an old token.
- Token version/security stamp changes invalidate existing JWTs.
- Tests cover active, banned, deleted, and role-changed user cases.

### ISSUE-003 - Introduce versioned database migrations

Severity: P1
Module: Database
Acceptance Criteria:

- Flyway or Liquibase is configured.
- Existing startup schema SQL is migrated into versioned scripts.
- Non-local profile uses `ddl-auto=validate`.
- Fresh disposable PostgreSQL starts from migrations.
- Existing DB migration path is documented/tested.

### ISSUE-004 - Enforce seat booking invariant in database

Severity: P1
Module: Booking/Database
Acceptance Criteria:

- DB prevents two active/confirmed tickets for the same showtime seat.
- Existing booking flow still succeeds.
- Concurrent two-thread test for same seat results in exactly one success.
- Constraint-dropping startup logic is removed.

### ISSUE-005 - Add payment transaction ledger and callback idempotency

Severity: P1
Module: Payment
Acceptance Criteria:

- Payment transaction entity/table stores booking, provider, provider reference, amount, status, raw callback metadata, timestamps.
- Provider transaction reference is unique where available.
- Duplicate callback is idempotent and audited.
- Amount mismatch and invalid signature are rejected.
- Tests cover MoMo and ZaloPay callback replay.

### ISSUE-006 - Prevent concurrent overlapping showtimes

Severity: P1
Module: Showtime/Database
Acceptance Criteria:

- Same room cannot have overlapping showtimes even under concurrent create requests.
- Legitimate adjacent showtimes respecting buffer are allowed.
- Overnight showtimes are covered by tests.
- DB constraint or transaction lock strategy is documented.

### ISSUE-007 - Harden OTP and password reset

Severity: P1
Module: Auth
Acceptance Criteria:

- Reset/OTP tokens use cryptographically secure randomness.
- Tokens are stored hashed or otherwise protected.
- Retry/rate limits exist per account and/or IP.
- Expired/used tokens are invalidated.
- Tests cover brute-force/rate-limit behavior.

### ISSUE-008 - Fix Docker compose full-stack startup

Severity: P1
Module: Deployment
Acceptance Criteria:

- One documented compose command starts DB, backend, and frontend.
- Build contexts resolve from repository location.
- Backend waits for DB readiness.
- Healthcheck or equivalent smoke endpoint is documented.

### ISSUE-009 - Fix frontend lint gate

Severity: P1
Module: Frontend
Acceptance Criteria:

- `npm run lint` exits 0.
- React compiler rule violations are fixed.
- Critical booking/payment pages remain buildable.
- CI can enforce lint without blocking on known intentional exceptions.

### ISSUE-010 - Add critical integration/concurrency test suite

Severity: P1
Module: QA
Acceptance Criteria:

- Testcontainers PostgreSQL or equivalent disposable DB is used.
- Tests cover booking same seat concurrently, payment duplicate callback, stale JWT after status change, profile duplicate phone/identity, showtime overlap.
- Tests can run from clean checkout without local DB assumptions.

## 10. Final Go/No-Go Checklist

```text
[x] Build pass
[x] Unit tests pass
[ ] Integration tests pass
[~] Startup pass
[ ] Database migration pass
[ ] Authentication/authorization pass
[ ] Movie lifecycle pass
[ ] Cinema room/seat layout pass
[ ] Showtime overlap pass
[ ] Seat concurrency pass
[ ] Booking/payment idempotency pass
[ ] Frontend critical flows pass
[ ] No committed production secrets
[ ] No unresolved P0
```

Legend:

- `[x]` confirmed pass.
- `[~]` partially verified only.
- `[ ]` not passed, not verified, or blocked.

Final decision: **NO-GO for deploy**. Conditional local demo is possible only after secrets are removed/rotated and the team accepts that booking/payment/security flows are not fully verified.

## Definition-of-Done Status for This Audit

| Requirement from `test.md` | Status |
|---|---|
| Checked main modules/packages | Mostly done by static audit and command searches |
| Ran feasible build/tests | Done |
| Tried startup if environment allows | Partial: Spring context startup via tests; full HTTP startup blocked |
| Checked DB/schema/migration | Done by config/code/test logs; fresh migration blocked |
| Checked happy/negative path for every core domain | Partial/code-evidenced; not all runtime paths executed |
| Checked concurrency for seat booking with real threads | Blocked: no disposable DB/test fixture; not run against local user DB |
| Checked role authorization frontend/backend | Partial/code-evidenced; runtime role smoke not executed |
| Industry practice checked with current sources | Done |
| Conclusions include evidence/confidence | Done |
| No production code modified | Done |
| No duplicate issues created | Done; issue candidates only |
| Practical monolith-focused fix order | Done |

