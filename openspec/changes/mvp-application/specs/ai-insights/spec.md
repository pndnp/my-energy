## Purpose

Generates AI-powered observations and experiment suggestions by combining analytics statistics with an LLM, while ensuring statistical calculations are performed by code rather than the LLM itself.

## ADDED Requirements

### Requirement: Backend-driven analytics aggregation

The backend MUST compute all summary statistics before sending any data to the LLM. The LLM SHALL NOT perform its own statistical calculations.

#### Scenario: Statistics sent to LLM

- **WHEN** generating insights for a 30-day period
- **THEN** backend sends precomputed averages, energy relationships and trends to the LLM

#### Scenario: LLM receives structured data

- **WHEN** the request payload reaches the LLM API
- **THEN** the body contains analytics results (e.g., sleep ≥ 4 avg energy = 4.2), not raw daily log entries

### Requirement: Structured LLM response format

The LLM SHALL return a JSON object with an `insights` array and an optional `experiment` object.

#### Scenario: Response has expected schema

- **WHEN** LLM returns successfully
- **THEN** the response contains `{"insights": [{"type", "title", "description", "confidence"}], "experiment": {"title", "description"}}`

#### Scenario: Invalid LLM response

- **WHEN** the LLM responds with malformed or non-conforming JSON
- **THEN** the backend returns 502 Bad Gateway with a user-friendly fallback message on frontend

### Requirement: Insight display

Frontend SHALL render insight cards and an experiment card based on the structured LLM response.

#### Scenario: Rendering multiple insights

- **WHEN** the API returns an insights array with 3 items
- **THEN** system renders 3 distinct cards, one per insight

#### Scenario: Empty insights list

- **WHEN** the API returns an empty insights array
- **THEN** system shows a message indicating no insights are available yet

### Requirement: One-click insight generation

Users MUST be able to trigger insight generation from the dashboard or analytics page.

#### Scenario: Manual invocation

- **WHEN** user clicks a "Generate insights" button
- **THEN** system calls GET /api/ai/insights and displays the returned insights

#### Scenario: Cached insights shown automatically

- **WHEN** user opens the AI Insights page within a reasonable freshness window of the last generation
- **THEN** existing cached insights are displayed without calling the LLM again
