## Purpose

Provides statistical summaries, comparison charts, energy relationships and best/worst day analysis across configurable time periods to help users discover patterns in their data.

## ADDED Requirements

### Requirement: Period selection

Users MUST be able to select from predefined time ranges for analytics: 7 days, 14 days, 30 days, 90 days.

#### Scenario: Selecting 30-day period

- **WHEN** user selects "30 days" as the analysis period
- **THEN** analytics compute only data within the last 30 days

#### Scenario: Selecting 7-day period

- **WHEN** user selects "7 days" as the analysis period
- **THEN** analytics display results restricted to the past week

### Requirement: Summary statistics

The analytics page SHALL show average values for key metrics over the selected period along with a fill rate.

#### Scenario: Average values computed

- **WHEN** user opens the analytics view with logs for the selected period
- **THEN** system displays average energy, mood, wellbeing and stress as decimal numbers rounded to 1 decimal place

#### Scenario: Fill rate displayed

- **WHEN** user has partial coverage in the selected period
- **THEN** system shows "X из N дней" where X is logged days and N is total period days

### Requirement: Multi-metric comparison chart

Users MUST be able to compare multiple metrics simultaneously via a line chart with checkboxes.

#### Scenario: Comparing energy and sleep

- **WHEN** user checks "Энергия" and "Сон" in the chart controls
- **THEN** the chart renders two lines, one for each metric over time

#### Scenario: Single metric shown

- **WHEN** only one checkbox is selected
- **THEN** the chart displays that single metric's daily values

### Requirement: Energy relationship analysis

The system SHALL calculate how splitting each metric at a threshold (≥ 4 vs < 4) affects average energy.

#### Scenario: Sleep-energy relationship

- **WHEN** user opens the relationship section
- **THEN** system shows: "Сон ≥ 4 → средняя энергия X.Y" and "Сон < 4 → средняя энергия Z.W" based on actual data

### Requirement: Best and worst days

The analytics page SHALL list the top 3 highest-energy days and bottom 3 lowest-energy days within the selected period.

#### Scenario: Top 3 energy days displayed

- **WHEN** user views the " лучшие дни" section
- **THEN** system ranks days by energy descending and shows date, energy value and medals (🥇🥈🥉)

#### Scenario: Fewer than 3 entries

- **WHEN** fewer than 3 logged days exist in the selected period
- **THEN** the section shows only the available entries without errors
