## MODIFIED Requirements

### Requirement: Get daily log by date

Users MUST be able to retrieve their own daily log for a specific date. When no log exists for the requested date the server MUST return `200 OK` with a JSON body of `null` — an absent log is a normal state, not an error. The `PUT /api/daily-logs/:date` endpoint MUST still return `404 Not Found` when no log exists for the date.

#### Scenario: Existing log found

- **WHEN** authenticated user sends GET /api/daily-logs/2025-08-14
- **THEN** server returns 200 OK with the log entry for that date

#### Scenario: No log for date

- **WHEN** authenticated user sends GET /api/daily-logs/2025-08-14 and no entry exists for that date
- **THEN** server returns 200 OK with a JSON body of `null`

#### Scenario: Update missing log still returns 404

- **WHEN** authenticated user sends PUT /api/daily-logs/2025-08-14 and no entry exists for that date
- **THEN** server returns 404 Not Found (create is done via POST, not PUT)
