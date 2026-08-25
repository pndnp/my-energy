# Capability: auth

## Purpose

Handles user registration, authentication, session management and authorization through REST API with JWT tokens.

## Requirements

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

### Requirement: Authentication form error display

The login and registration forms MUST display a Russian-language error message when an authentication request fails, so the user can understand why the request was rejected. The message MUST be selected by a fixed mapping from the server response `error.code` field to Russian text: `UNAUTHORIZED` → «Неверный email или пароль», `CONFLICT` → «Пользователь с таким email уже существует», `VALIDATION_ERROR` → «Проверьте правильность введённых данных», `INTERNAL_ERROR` → «Внутренняя ошибка сервера, попробуйте позже». For a network failure (no HTTP response) or an unknown/missing code the forms MUST display the fallback message «Что-то пошло не так, попробуйте позже». The raw English `error.message` from the server MUST NOT be shown to the user. Form field validation errors (client-side) MUST remain separate from server errors and MUST be displayed in Russian (e.g. malformed email, password shorter than required, passwords don't match).

#### Scenario: Login with wrong password

- **WHEN** user submits the login form with correct email but an incorrect password and the server responds 401 with `error.code` "UNAUTHORIZED"
- **THEN** the login form displays the error message «Неверный email или пароль»
- **AND** the form remains filled in so the user can correct the password and resubmit

#### Scenario: Login with unregistered email

- **WHEN** user submits the login form with an email that has no account and the server responds 401 with `error.code` "UNAUTHORIZED"
- **THEN** the login form displays the same message «Неверный email или пароль» (the UI does not reveal whether the email exists)

#### Scenario: Registration with existing email

- **WHEN** user submits the registration form with an email that is already registered and the server responds 409 with `error.code` "CONFLICT"
- **THEN** the registration form displays the error message «Пользователь с таким email уже существует»

#### Scenario: Registration with weak or malformed input

- **WHEN** user submits the registration form with data the server rejects with 400 and `error.code` "VALIDATION_ERROR"
- **THEN** the registration form displays the error message «Проверьте правильность введённых данных»

#### Scenario: Server error

- **WHEN** the login or registration request fails with a 5xx response carrying `error.code` "INTERNAL_ERROR"
- **THEN** the form displays the error message «Внутренняя ошибка сервера, попробуйте позже»

#### Scenario: Network error or unknown code

- **WHEN** the login or registration request fails without an HTTP response (network failure) or with a response whose `error.code` is missing or not in the mapping
- **THEN** the form displays the fallback message «Что-то пошло не так, попробуйте позже»

#### Scenario: Error cleared on next submission

- **WHEN** a server error is displayed on the login or registration form and the user resubmits the form
- **THEN** the previous error message is removed before the new submission is processed and only the result of the new request is shown
