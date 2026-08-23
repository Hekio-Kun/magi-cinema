# CinePrime Full Project Audit Report

Audit date: 2026-07-16

Scope: backend Spring Boot project, frontend React/Vite project, Docker/deployment files, database model, security configuration, booking/payment business logic, and API contract alignment.

Note: This audit follows the requirement in `docs/architecture/test.md`: review and report first, no code fixes were made during the audit.

## 1. Executive Summary

CinePrime is currently a Spring Boot modular monolith with a React/Vite frontend. It is not a full microservices system. There is no Eureka, API Gateway, Kafka, Redis, service-per-database separation, Promotion Service, Membership Service, Analytics Service, or dedicated Notification Service pipeline.

The backend builds and its current test suite passes. The frontend production build also passes. However, the frontend lint gate fails heavily, backend tests depend on a real local PostgreSQL database, and the system is not production-ready.

The strongest implemented area is the booking flow: it has seat hold status, pessimistic locking at the application layer, server-side amount calculation, and payment signature checks for MoMo/ZaloPay callbacks. The largest risks are hard-coded/default secrets, default admin behavior, lack of token revocation, missing payment transaction ledger/idempotency, schema changes performed by `ddl-auto=update` and startup SQL, missing database-level invariant guards, and very low business/security/concurrency test coverage.

Final readiness:

| Target | Score |
|---|---:|
| Production readiness | 42/100 |
| Internal demo readiness | 62/100 |

## 2. Project Architecture Map

| Area | Actual State |
|---|---|
| Backend | Spring Boot 3.3.1, Java 21 target, Spring Web, Spring Security, JPA, PostgreSQL |
| Frontend | React, Vite, TypeScript |
| Database | PostgreSQL, JPA schema update, startup JDBC migrations |
| Auth | JWT resource server with HS512 symmetric key |
| Payment | MoMo and ZaloPay integration code |
| Deployment | Dockerfiles exist, compose paths are broken from current folders |
| Microservices | Not implemented |
| Message broker | Not implemented |
| Cache/session store | Not implemented |
| Service discovery/gateway | Not implemented |
| Promotion/membership | Not implemented |
| Review API | Entity/repository exists, no controller/service |
| Ticket QR/check-in | QR helper exists, ticket issuing/check-in not implemented |

Important structure:

| Path | Purpose |
|---|---|
| `backend/backend` | Spring Boot backend project |
| `frontend/frontend` | React/Vite frontend project |
| `backend/docs/architecture` | Architecture and requirement notes |
| `backend/docker-compose.yml` | Backend-side compose file, invalid frontend context |
| `frontend/docker-compose.yml` | Frontend-side compose file, invalid backend context |

## 3. Test Execution Summary

| Command | Result | Notes |
|---|---:|---|
| `.\mvnw.cmd test` | Pass | 3 tests. The tests connect to real local PostgreSQL at `localhost:5433/movietheater` and can mutate schema/data. |
| `npm run build` | Pass | Main JS bundle about 956 KB; Vite warns chunk is larger than 500 KB. |
| `npm run lint` | Fail | 144 total problems: 44 errors, 100 warnings. |
| `npm audit --omit=dev --audit-level=moderate` | Fail | 1 high severity vulnerability through `axios -> form-data@4.0.5`; `form-data@4.0.6` is available. |
| Maven OSS Index audit | Inconclusive | Plugin ran, but OSS Index returned `401 Unauthorized`; no reliable backend CVE result. |
| Docker compose path check | Fail | Compose files reference build contexts that do not exist from their own folder. |
| Full stack runtime smoke test | Not run | Compose is invalid and tests already depend on a local DB. |

Observed backend test issues:

- Only 3 backend tests exist: context load and password policy tests.
- No Testcontainers or isolated integration database is configured.
- Spring/Hibernate emitted schema update activity during test startup.
- `spring.jpa.open-in-view` warning appears.
- Java installed on the machine is Java 25, while the project target is Java 21.

Observed frontend lint examples:

- `src/api/movieApi.ts`: empty interface.
- `src/components/Header.tsx`: setState in effect.
- `src/components/Hero.tsx`: setState in effect.
- `src/components/NowShowing.tsx`: ref mutation during render.
- `src/components/PremiereCountdown.tsx`: component created during render.
- `src/components/Promotions.tsx`: `Date.now()` during render.
- `src/components/UserManagement.tsx`: `fetchUsers` used before declaration.
- Many `any`, missing dependencies, unused variables, and React compiler rule violations.

## 4. Business Rule Coverage

| Domain | Coverage | Main Gaps |
|---|---|---|
| Auth/register/login | Partial | OTP is in-memory, no retry limit, no token revocation, no refresh token/logout. |
| User/profile | Partial | Self-update skips duplicate phone/identity validation; DB lacks unique constraints for these profile fields. |
| Booking/seat hold | Partial/good app-level | Pessimistic locking is present, but DB invariant for active ticket per seat is missing. |
| Payment | Partial | Signatures are checked, but no payment ledger, provider transaction uniqueness, raw callback audit, or refund/reconciliation state. |
| Showtime scheduling | Partial | App-level overlap check exists; no DB exclusion constraint or concurrency-safe invariant. |
| Cinema room/seat | Partial | Active showtime/booking guards exist; some uniqueness remains app-level only. |
| Movie management | Partial | Validation exists; duplicate movie name appears app-level only; physical delete may remove history when no bookings exist. |
| Food/combo | Partial/good app-level | Food variant stock uses pessimistic lock; audit logs exist. |
| Ticket | Weak | No ticket code, QR issuing, check-in, staff validation, refund lifecycle. |
| Promotion | Missing | No promotion module found. |
| Membership | Missing | Docs describe a plan, no implementation found. |
| Review | Missing API | `Review` entity and repository exist, but no controller/service/business enforcement. |
| Notification | Partial | Dashboard notification and booking email exist; no event outbox/retry/DLQ. |

## 5. Findings

### SECURITY-001 [P0] Secrets and Default Admin Credentials in Source

Files:

- `backend/backend/src/main/resources/application.properties`
- `backend/backend/src/main/java/org/example/hcm26_cpl_js_java_02_team4_movie_theater/config/ApplicationInitConfig.java`

Evidence:

- `application.properties` contains default or direct values for database password, JWT signer key, admin password, Cloudinary key/secret, ZaloPay keys, MoMo secret, TMDB API key, and Google Sheets API key.
- `ApplicationInitConfig` creates an `admin` user if missing and logs that the default password is `admin`.

Impact:

- Anyone with repo/config access can obtain sensitive credentials.
- Production/staging can be deployed accidentally with known defaults.
- Default admin account is a direct account takeover risk.

Recommendation:

- Rotate all exposed credentials immediately.
- Remove real/default secrets from source.
- Use required environment variables or a secret manager.
- Fail startup if production secrets are missing.
- Replace default admin seeding with a one-time secure setup flow.

### AUTH-001 [P0] JWT Remains Valid After User Is Locked, Banned, or Deleted

Files:

- `AuthenticationService.java`
- `JwtService.java`
- `SecurityConfig.java`

Evidence:

- `AuthenticationService.authenticate` checks user status only during login.
- `JwtService` issues 24-hour JWTs by default.
- `SecurityConfig` validates JWT signature/expiry but does not re-check user status per request.

Impact:

- A banned/deleted user can keep using an already-issued token until expiration.
- Role/permission changes are not reliably enforced until token expiration.

Recommendation:

- Add token version or security stamp to JWT and user record.
- Re-check active user status in authentication conversion/filter.
- Add refresh tokens and short-lived access tokens.
- Implement logout/revocation for sensitive roles.

### BOOKING-001 [P1] Missing Database-Level Guard for Active Ticket per Seat

Files:

- `BookingSchemaMigrationConfig.java`
- `BookingService.java`
- `Ticket.java`

Evidence:

- `BookingService` uses pessimistic lock on selected `ShowtimeSeat` rows.
- `BookingSchemaMigrationConfig` drops `uk_ticket_showtime_seat` on startup.
- `Ticket` has no final unique guard on booked seat/ticket state.

Impact:

- Application-level locking is helpful, but a race, bug, manual DB operation, or future code path can still create duplicate active tickets.
- The database is not enforcing the most important booking invariant.

Recommendation:

- Model booking/ticket lifecycle explicitly.
- Add a partial unique index or equivalent DB constraint for active/paid tickets per `showtime_seat`.
- Remove startup constraint-dropping logic.
- Add concurrency tests that attempt duplicate booking for the same seat.

### PAYMENT-001 [P1] Missing Payment Transaction Ledger, Idempotency, and Reconciliation

Files:

- `PaymentService.java`
- `ZaloPayPaymentService.java`
- `MomoPaymentService.java`
- `Booking.java`

Evidence:

- MoMo and ZaloPay signatures are verified.
- Booking is confirmed by booking id and paid amount.
- No `payment_transaction` table/entity was found.
- No provider transaction id uniqueness, raw callback storage, idempotency key, reconciliation status, or refund tracking was found.

Impact:

- Duplicate callbacks are only indirectly idempotent through booking status.
- Multiple provider attempts for the same booking are not auditable.
- Refunds, disputes, failed callbacks, reconciliation, and support workflows are weak.

Recommendation:

- Add `payment_transaction` with provider, provider transaction id, booking id, amount, status, raw payload hash/body, timestamps, and unique constraints.
- Use idempotency keys for create-payment and callback handling.
- Store and reconcile every provider event.
- Separate payment state from booking confirmation state.

### SHOWTIME-001 [P1] Showtime Overlap Protection Is App-Level Only

File:

- `ShowtimeService.java`

Evidence:

- `ensureNoOverlappingShowtime` checks overlaps before save.
- No PostgreSQL exclusion constraint/range-based guard exists.

Impact:

- Two concurrent admin requests can both pass the overlap check and insert conflicting showtimes.

Recommendation:

- Add a database constraint for non-overlapping room schedule.
- PostgreSQL range/exclusion constraints are a good fit.
- Add concurrency tests for overlapping showtime creation.

### DB-001 [P1] No Versioned Migrations; Schema Mutates at Runtime

Files:

- `application.properties`
- `ApplicationInitConfig.java`
- `BookingSchemaMigrationConfig.java`

Evidence:

- `spring.jpa.hibernate.ddl-auto=update`.
- `spring.jpa.show-sql=true`.
- Multiple JDBC schema/data fixups run in `ApplicationRunner`.

Impact:

- Environments are not reproducible.
- Rollbacks are difficult.
- Tests and startup can mutate the local database.
- Production schema changes are not reviewable.

Recommendation:

- Introduce Flyway or Liquibase.
- Convert all startup SQL migrations into versioned migration files.
- Use `ddl-auto=validate` in production.
- Use isolated DB/Testcontainers for tests.

### AUTH-002 [P1] OTP and Password Reset Are Weak Against Brute Force

Files:

- `OtpStore.java`
- `PasswordResetService.java`

Evidence:

- OTP is stored in a local `ConcurrentHashMap`.
- OTP is not shared across instances and is lost on restart.
- No retry counter was found.
- Password reset token is a 6-digit value generated using `java.util.Random`.
- Reset token appears stored in plain form and looked up directly.

Impact:

- Brute force is easier than necessary.
- Multi-instance deployments will behave inconsistently.
- Restart invalidates pending registration OTPs.

Recommendation:

- Use `SecureRandom`.
- Store hashed reset tokens.
- Add per-account and per-IP rate limits.
- Add retry counters and lockouts.
- Persist OTP/reset state in a shared store with TTL.

### ACCESS-001 [P1] Self Profile Update Skips Duplicate Phone/Identity Checks

File:

- `UserService.java`

Evidence:

- Admin update path checks duplicate phone and identity card.
- `updateMyProfile` sets phone and identity directly.
- `UserProfile` lacks DB unique constraints for phone/identity.

Impact:

- Users can create duplicate profile identifiers.
- Staff/admin workflows may rely on identity uniqueness that the database does not enforce.

Recommendation:

- Add service-level duplicate checks to self-update.
- Add database unique constraints where business rules require uniqueness.
- Add tests for duplicate phone/identity updates.

### FRONTEND-001 [P1] Frontend Lint Gate Fails Heavily

Files:

- Multiple files under `frontend/frontend/src`

Evidence:

- `npm run lint` reports 144 problems: 44 errors and 100 warnings.

Impact:

- React compiler/lint rule violations can cause subtle UI bugs.
- CI quality gate would fail if lint is enforced.
- Type safety is weakened by broad `any` usage.

Recommendation:

- Fix lint errors first, then reduce warnings.
- Add CI lint gate.
- Avoid component creation in render, `Date.now()` in render, ref mutation during render, and unsafe effect state updates.

### DEPLOY-001 [P1] Docker Compose Files Cannot Run the Full Stack From Their Current Locations

Files:

- `backend/docker-compose.yml`
- `frontend/docker-compose.yml`

Evidence:

- `backend/docker-compose.yml` references `./frontend`, but `backend/frontend` does not exist.
- `frontend/docker-compose.yml` references `./backend`, but `frontend/backend` does not exist.

Impact:

- A new developer or deployment job cannot reliably start the system with the provided compose files.

Recommendation:

- Move compose file to the project parent folder or fix build contexts.
- Add healthchecks and startup readiness.
- Document required environment variables.

### MODULE-001 [P1] Ticket, Promotion, Membership, and Review Are Incomplete

Files:

- `Ticket.java`
- `Review.java`
- `ReviewRepository.java`

Evidence:

- `Ticket` only contains id, booking, showtime seat, and price.
- `QrCodeService` exists but is not integrated into ticket issuing/check-in.
- No promotion or membership implementation found.
- `Review` entity/repository exist, but no controller/service found.

Impact:

- Core cinema workflows are missing: e-ticket, check-in, refund, promotions, loyalty, review moderation/eligibility.

Recommendation:

- Add ticket code, QR payload/signature, check-in status, check-in staff/time.
- Implement promotion rules with usage caps and eligibility.
- Implement membership points and tier lifecycle.
- Implement review API with rule: only paid/attended users can review.

### API-001 [P2] Frontend and Backend Contract Mismatches

Files:

- `frontend/frontend/src/api/movieApi.ts`
- `frontend/frontend/src/routes/AppRoutes.tsx`
- `frontend/frontend/src/api/userApi.ts`
- `backend/backend/src/main/java/.../dto/movie/MovieCreationRequest.java`
- `backend/backend/src/main/java/.../service/ShowtimeService.java`

Evidence:

- Backend `MovieCreationRequest` requires many fields, while frontend `MovieCreateRequest` marks most fields optional.
- Frontend `ShowtimeRequest.status` allows `number | string | null`, while backend expects enum.
- Backend returns `/seat-selection?...`, while React route is `/booking/:showtimeId`.
- `UserResponse.status` is typed as `number` in one frontend interface while other user types use string.

Impact:

- Compile-time frontend checks do not match backend validation.
- Users may hit runtime 400 errors or broken navigation.

Recommendation:

- Generate frontend client/types from OpenAPI.
- Align route returned by backend with React route.
- Normalize enum/string types across frontend APIs.

### TECH-001 [P2] Money Uses Integer/Long Instead of Explicit Monetary Type

Files:

- `Booking.java`
- `Ticket.java`
- Food/combo pricing entities

Evidence:

- Booking and ticket use `Integer`.
- Food/combo prices use `Long`.
- No `BigDecimal`, currency field, or rounding policy was found.

Impact:

- Monetary calculations are harder to reason about and audit.
- Future discounts, tax, multi-currency, or partial refunds will be error-prone.

Recommendation:

- Use a consistent money representation.
- If only VND integer minor units are supported, define that explicitly.
- Centralize rounding/discount rules.

### TEST-001 [P1] Critical Business/Security Tests Are Missing

Evidence:

- Backend has only 3 tests.
- Frontend has no detected `*.test.*` or `*.spec.*` files.

Impact:

- Booking/payment/auth regressions can ship undetected.
- Current test pass does not prove core system correctness.

Recommendation:

- Add Testcontainers integration tests.
- Add concurrency tests.
- Add security/access-control tests.
- Add frontend booking/payment smoke tests.

## 6. API Contract Mismatches

| Contract | Backend | Frontend | Risk |
|---|---|---|---|
| Movie create | Many required fields with validation annotations | `MovieCreateRequest` marks most fields optional | Frontend can compile payloads backend rejects. |
| Showtime status | Backend enum | `number | string | null` | Invalid runtime values possible. |
| Seat selection navigation | Backend returns `/seat-selection?...` | React route is `/booking/:showtimeId` | Broken navigation if API path is used. |
| User status | Backend returns enum/string | One frontend interface uses `number` | Rendering/filtering bugs possible. |
| Production API URL/CORS | Backend CORS default localhost only | `.env.production` points to `https://hekio.tokyo` | Deploy may fail CORS unless env is overridden. |
  2s
d
    Z
## 7. Database Findings

| Severity | Finding | Impact |
|---|---|---|
| P1 | `ddl-auto=update` and startup JDBC migrations | Non-reproducible schema, unsafe production changes. |
| P1 | Startup drops `uk_ticket_showtime_seat` | Removes DB-level safety for key booking invariant. |
| P1 | Showtime overlap lacks DB constraint | Concurrent insert can create conflicting showtimes. |
| P1 | Phone/identity uniqueness lacks DB constraint | Duplicate user profile identity data possible. |
| P2 | No `@Version` detected | Aggregate updates have limited optimistic concurrency protection. |
| P2 | Money fields use mixed `Integer`/`Long` | Weak monetary consistency. |
| P2 | `docs/database/movie.sql` differs from current entities | Documentation/schema drift. |

## 8. Security Findings

| Severity | Finding | Recommendation |
|---|---|---|
| P0 | Secrets/default credentials in source | Rotate, remove, use secret manager/env, fail on missing prod secrets. |
| P0 | JWT not revoked after user status change | Add token version/revocation/status check. |
| P1 | OTP/reset token brute-force protections missing | Add SecureRandom, hash tokens, rate limits, retry counters. |
| P1 | JWT stored in `localStorage` | Consider httpOnly secure cookies or hardened XSS posture. |
| P1 | Swagger/OpenAPI public | Gate by environment or auth in staging/prod. |
| P2 | `/auth/me` returns JWT claims | Keep only in dev/debug or reduce output. |
| P2 | Backend CVE scan inconclusive | Add reliable CI scanner such as OWASP Dependency-Check, Snyk, Trivy, or GitHub Dependabot. |

## 9. Missing Tests

| Area | Required Tests |
|---|---|
| Booking concurrency | Two users book same seat; only one succeeds. |
| Hold expiry | Pending booking expires and releases seats. |
| Payment callback | Duplicate callback, fake signature, amount mismatch, provider replay. |
| Auth token lifecycle | Banned/deleted user with old JWT is rejected. |
| OTP/reset | Retry limit, expired token, brute-force lockout. |
| Access control | User A cannot read/update User B booking/profile. |
| Showtime scheduling | Concurrent overlapping showtime creation is rejected. |
| Profile uniqueness | Self-update cannot duplicate phone/identity. |
| Database bootstrap | Clean PostgreSQL starts from migrations only. |
| Frontend | Booking route, payment return pages, admin CRUD smoke tests. |
| API contract | Generated OpenAPI client or schema contract tests. |

## 10. Technical Debt

- Dashboard has mock/static data components.
- API pagination appears inconsistent between 0-based and 1-based endpoints.
- No central observability for booking/payment state changes.
- No outbox/event pattern for email/notification side effects.
- Upload/media validation should explicitly enforce file size and type.
- Frontend main bundle is large; code splitting is needed.
- Java runtime on the machine is 25 while project target is 21.
- Swagger is public by default.
- `spring.jpa.open-in-view` warning should be addressed.
- Backend tests should not depend on a developer's local PostgreSQL database.

## 11. Recommended Fix Roadmap

### Phase 0: Immediate Security and Repo Hygiene

1. Rotate every credential found in source/config.
2. Remove real secrets and unsafe defaults from committed files.
3. Replace default admin seeding with secure one-time setup.
4. Add `.env.example` without secrets.
5. Add environment validation at startup.
6. Fix frontend `form-data` vulnerability.

### Phase 1: Database and Deployment Foundation

1. Add Flyway or Liquibase.
2. Convert all startup SQL/JPA schema changes into versioned migrations.
3. Use `ddl-auto=validate` outside local development.
4. Fix Docker compose build contexts.
5. Add healthchecks and readiness.
6. Add Testcontainers PostgreSQL for integration tests.

### Phase 2: Booking and Payment Integrity

1. Add DB guard for active ticket per showtime seat.
2. Add payment transaction ledger.
3. Add provider transaction id uniqueness and idempotency.
4. Store raw callback events for audit/reconciliation.
5. Define booking/payment state machine: hold, expired, paid, confirmed, cancelled, refunded.
6. Add concurrency and payment replay tests.

### Phase 3: Auth Hardening

1. Add token version/revocation.
2. Add refresh token flow and logout.
3. Re-check user status after JWT validation.
4. Replace reset token generation with `SecureRandom`.
5. Hash reset tokens and add retry/rate limits.
6. Persist OTP/reset metadata in shared storage.

### Phase 4: Business Completion

1. Implement ticket code, QR issuing, QR verification, and check-in.
2. Implement promotion engine with eligibility and usage caps.
3. Implement membership points/tier rules.
4. Implement review API with purchase/attendance validation.
5. Add notification outbox/retry.

### Phase 5: Quality Gates

1. Fix frontend lint errors.
2. Add CI for backend tests, frontend lint/build, dependency scan.
3. Add API contract generation or OpenAPI schema checks.
4. Add load/performance tests for showtime seats and booking.

## 12. Final Readiness Score

| Category | Score |
|---|---:|
| Architecture fit | 45/100 |
| Business completeness | 50/100 |
| Security | 35/100 |
| Data integrity | 45/100 |
| Test coverage | 25/100 |
| Deployment readiness | 35/100 |
| Overall production readiness | 42/100 |

Conclusion:

CinePrime is usable as a local/demo monolith after environment setup, but it is not ready for production or high-concurrency ticketing. The first blockers to address are secrets/default admin, versioned migrations, booking/payment database invariants, payment transaction ledger, JWT revocation/status validation, and critical integration/concurrency tests.

## Official References Used

- Spring Boot Database Initialization: https://docs.spring.io/spring-boot/how-to/data-initialization.html
- Spring Security OAuth2 Resource Server JWT: https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- OWASP API Security Top 10 2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- PostgreSQL Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL Range Types and Exclusion Constraints: https://www.postgresql.org/docs/current/rangetypes.html
