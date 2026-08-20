## Purpose

Presents users with today's metrics, an interactive form for editing entries, a 7-day energy trend chart and a brief AI observation on the dashboard.

## ADDED Requirements

### Requirement: Display today's metrics

When a daily log exists for the current date, the dashboard SHALL display all 9 metric values.

#### Scenario: Log exists for today

- **WHEN** user opens the dashboard and has a log entry for today
- **THEN** system displays each metric value clearly

#### Scenario: No log exists for today

- **WHEN** user opens the dashboard with no entry for today
- **THEN** system shows empty/zeroed fields and a prompt to fill in

### Requirement: Inline edit form

Dashboard MUST provide an editable form for today's entry.

#### Scenario: Opening edit mode

- **WHEN** user clicks "Изменить" button or enters edit mode
- **THEN** all 9 metric fields become interactive (slider or number input)

#### Scenario: Saving from form

- **WHEN** user modifies any metric and clicks "Сохранить"
- **THEN** system sends an update request to the backend and confirms success

### Requirement: 7-day energy chart

The dashboard SHALL display a line or bar chart showing energy level (and optionally other metrics) for the last 7 days where data is available.

#### Scenario: Chart with 7 days of data

- **WHEN** user has logs for the past 7 consecutive days
- **THEN** system renders a complete 7-point chart

#### Scenario: Chart with fewer than 7 days of data

- **WHEN** user has fewer than 7 logged days
- **THEN** system displays only the available points without misleading gaps

### Requirement: Brief AI observation

A small AI-suggested insight must be shown on the dashboard when there is enough data to generate one.

#### Scenario: Insight present

- **WHEN** at least 3 days of historical data exist and AI insights have not been generated recently
- **THEN** a short observation generated from analytics statistics is displayed

#### Scenario: No insight available

- **WHEN** fewer than 3 days of data exist
- **THEN** the insight section is hidden or shows a placeholder message
