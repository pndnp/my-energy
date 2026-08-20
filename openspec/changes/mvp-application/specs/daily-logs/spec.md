## Purpose

Manages creation, retrieval, updating and deletion of daily log entries containing 9 subjective metrics rated on a scale from 1 to 5.

## ADDED Requirements

### Requirement: Daily log structure

A daily log entry SHALL contain the following fields: `date` (ISO date string), `sleep`, `nutrition`, `caffeine`, `alcohol`, `activity`, `mood`, `wellbeing`, `stress`, `energy` — all integers from 1 to 5 inclusive. The `user_id` is implicitly derived from the authenticated session.

#### Scenario: Valid daily log fields

- **WHEN** a client provides all 9 metric fields with values between 1 and 5
- **THEN** the data satisfies the schema validation

#### Scenario: Invalid metric value below minimum

- **WHEN** a metric field contains a value less than 1
- **THEN** the system returns 400 Bad Request

#### Scenario: Invalid metric value above maximum

- **WHEN** a metric field contains a value greater than 5
- **THEN** the system returns 400 Bad Request

### Requirement: Create daily log

Users MUST be able to create one daily log entry per day. The database MUST enforce uniqueness on `user_id + date`.

#### Scenario: Successful creation

- **WHEN** authenticated user sends POST /api/daily-logs with valid date and metric values
- **THEN** server creates the entry and returns 201 Created

#### Scenario: Duplicate log for same day

- **WHEN** authenticated user attempts to create a second entry for the same date
- **THEN** server updates the existing entry instead (upsert behavior) and returns 200 OK

### Requirement: Get daily log by date

Users MUST be able to retrieve their own daily log for a specific date.

#### Scenario: Existing log found

- **WHEN** authenticated user sends GET /api/daily-logs/2025-08-14
- **THEN** server returns 200 OK with the log entry for that date

#### Scenario: No log for date

- **WHEN** authenticated user requests a date with no entry
- **THEN** server returns 404 Not Found

### Requirement: List daily logs

Users MUST be able to retrieve daily logs within a date range.

#### Scenario: Range query with valid dates

- **WHEN** authenticated user sends GET /api/daily-logs?from=2025-08-01&to=2025-08-14
- **THEN** server returns 200 OK with an array of log entries sorted by date descending

### Requirement: Update daily log

Users MUST be able to update any field of their existing daily log for a given date.

#### Scenario: Partial update

- **WHEN** authenticated user sends PUT /api/daily-logs/2025-08-14 with only some metric fields
- **THEN** server updates only the provided fields and returns 200 OK with the updated entry

### Requirement: Uniqueness constraint

Exactly one daily log per user per date MUST exist in the system at any time.

#### Scenario: Concurrent writes

- **WHEN** two requests attempt to create or update a log for the same user and date simultaneously
- **THEN** exactly one entry survives without duplicate records
