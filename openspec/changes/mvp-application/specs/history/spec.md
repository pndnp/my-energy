## Purpose

Shows a calendar view and list of historical daily log entries with the ability to select individual days and view their full details.

## ADDED Requirements

### Requirement: Calendar display

The history page SHALL render a monthly calendar showing which days have logged entries.

#### Scenario: Calendar with some filled days

- **WHEN** user opens the history page and has logs for various dates
- **THEN** system renders a calendar grid where filled days are visually distinct from empty ones

#### Scenario: Navigating months

- **WHEN** user navigates to a different month using prev/next controls
- **THEN** the calendar updates to show that month's data

### Requirement: Energy indicator per day

Each day in the calendar or list SHALL display the energy level achieved on that day.

#### Scenario: Day with known energy level

- **WHEN** a day has a logged entry
- **THEN** the energy value is shown as an icon, number or colored indicator

#### Scenario: Day without a log

- **WHEN** a day has no logged entry
- **THEN** it appears visually as empty/unfilled

### Requirement: Day details

Selecting a specific date SHALL display all 9 metric values for that day.

#### Scenario: Clicking a logged day

- **WHEN** user clicks/taps on a filled day
- **THEN** system displays all metrics for that date in a detail card

### Requirement: Day list view

In addition to the calendar, users MUST be able to see a scrolling list of past days with brief summaries.

#### Scenario: List of recent days

- **WHEN** user scrolls down the history page
- **THEN** they see previous days ordered by date descending with key metrics visible
