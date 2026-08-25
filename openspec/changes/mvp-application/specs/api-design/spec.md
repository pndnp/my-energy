## Purpose

Defines the REST API contract between frontend and backend, including endpoints, authentication middleware, request/response formats and error conventions.

## ADDED Requirements

### Requirement: REST endpoint structure

All API routes MUST live under `/api/` prefix. Endpoints SHALL follow resource-based naming with plural nouns.

#### Scenario: Daily logs route organization

- **WHEN** client requests daily log resources
- **THEN** routes are: POST /api/daily-logs, GET /api/daily-logs/:date, PUT /api/daily-logs/:date, GET /api/daily-logs?from=&to=

#### Scenario: Analytics route organization

- **WHEN** client requests analytics data
- **THEN** route is: GET /api/analytics?from=&to= (единый payload: summary, timeSeries, bestDays, worstDays)

### Requirement: Session cookie authentication

All protected routes MUST use httpOnly session cookies. The `token` cookie (JWT) is set by /api/auth/login and /api/auth/register and cleared by /api/auth/logout.

#### Scenario: Token in Cookie header

- **WHEN** making a protected API request from an authenticated browser session
- **THEN** the request carries `Cookie: token=<jwt>` (sent automatically, cookie is HttpOnly)

### Requirement: Standard error response format

All error responses SHALL include an error object with `code`, `message` and optionally `details`.

#### Scenario: Validation error

- **WHEN** request body fails field validation
- **THEN** server returns 400 with `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`

#### Scenario: Authentication error

- **WHEN** request lacks or has invalid token
- **THEN** server returns 401 with `{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }`

### Requirement: Data transfer objects (DTOs)

Request and response bodies MUST use consistent DTO structures matching the database schema for daily logs.

#### Scenario: Creating daily log via DTO

- **WHEN** client sends POST /api/daily-logs
- **THEN** body contains `{ "date": "2025-08-14", "sleep": 4, "nutrition": 3, ... }` and response includes all fields plus `created_at`/`updated_at`
