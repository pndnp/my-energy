## Purpose

Handles user registration, authentication, session management and authorization through REST API with JWT tokens.

## ADDED Requirements

### Requirement: User registration

The system MUST allow new users to register with an email and password. Passwords must be hashed before storage. The system SHALL reject registration if the email is already taken.

#### Scenario: Successful registration

- **WHEN** user sends POST /api/auth/register with a unique email and a password of at least 8 characters
- **THEN** server creates the user account and returns a 201 status with credentials or token

#### Scenario: Registration with existing email

- **WHEN** user sends POST /api/auth/register with an email that is already registered
- **THEN** server returns 409 Conflict with an error message

#### Scenario: Registration with weak password

- **WHEN** user sends POST /api/auth/register with a password shorter than 8 characters
- **THEN** server returns 400 Bad Request with an error message describing the minimum length requirement

#### Scenario: Registration with invalid email

- **WHEN** user sends POST /api/auth/register with a malformed email address
- **THEN** server returns 400 Bad Request with an error message

### Requirement: User login

The system MUST authenticate registered users by verifying their email and password. Upon success it SHALL return a session token.

#### Scenario: Successful login

- **WHEN** user sends POST /api/auth/login with valid email and password
- **THEN** server returns 200 OK with a session token

#### Scenario: Login with wrong password

- **WHEN** user sends POST /api/auth/login with correct email but incorrect password
- **THEN** server returns 401 Unauthorized

#### Scenario: Login with unregistered email

- **WHEN** user sends POST /api/auth/login with an email that has no account
- **THEN** server returns 401 Unauthorized

### Requirement: User logout

The system MUST support session termination.

#### Scenario: Successful logout

- **WHEN** authenticated user sends POST /api/auth/logout
- **THEN** server invalidates the session token and returns 200 OK

### Requirement: Authenticated route protection

All API endpoints under `/api/daily-logs`, `/api/analytics` and `/api/ai` SHALL require valid authentication.

#### Scenario: Accessing protected endpoint without token

- **WHEN** unauthenticated user requests GET /api/daily-logs/latest
- **THEN** server returns 401 Unauthorized

#### Scenario: Accessing protected endpoint with expired token

- **WHEN** user requests GET /api/analytics/summary with an expired token
- **THEN** server returns 401 Unauthorized

### Requirement: Current user info

Authenticated users MUST be able to retrieve their own profile information.

#### Scenario: Retrieving current user profile

- **WHEN** authenticated user sends GET /api/auth/me
- **THEN** server returns 200 OK with user profile data (excluding sensitive fields like password hash)
