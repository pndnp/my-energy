## 1. Backend initialization

- [ ] 1.1 Initialize Node.js + TypeScript project in backend/ directory with tsconfig, package.json (exact versions)
- [ ] 1.2 Install Express, Prisma, zod, bcryptjs, jsonwebtoken, recharts-server packages
- [ ] 1.3 Configure tsconfig.json with path aliases (@/*, @modules/*), strict mode, erasableSyntaxOnly
- [ ] 1.4 Create basic Express app entry point (app.ts, server.ts) with health check endpoint
- [ ] 1.5 Set up environment variable handling (.env.example) with DB_URL, JWT_SECRET, LLM_API_KEY, LLM_MODEL
- [ ] 1.6 Initialize Prisma, define schema.prisma with User and DailyLog models, run first migration

## 2. Database layer

- [ ] 2.1 Define Prisma schema: User model with id, email (unique), passwordHash, createdAt, updatedAt
- [ ] 2.2 Define Prisma schema: DailyLog model with id, userId, date, sleep, nutrition, caffeine, alcohol, activity, mood, wellbeing, stress, energy, createdAt, updatedAt
- [ ] 2.3 Add UNIQUE constraint on (userId, date) in Prisma schema
- [ ] 2.4 Verify Prisma type generation works and types are used throughout backend
- [ ] 2.5 Create db client singleton module with connection management

## 3. Auth module - registration & login

- [ ] 3.1 Implement /api/auth/register POST — validate email/password with zod hash password with bcrypt saltRounds=10 create user via Prisma return token
- [ ] 3.2 Implement /api/auth/login POST — verify credentials with bcrypt generate signed JWT with expiration set httpOnly cookie
- [ ] 3.3 Implement /api/auth/logout POST — clear token invalidate session destroy cookie
- [ ] 3.4 Send consistent error responses for 409 Conflict (duplicate email) and 400 Bad Request (validation) per api-design spec

## 4. Auth module - middleware & protected routes

- [ ] 4.1 Create auth middleware that verifies JWT token from httpOnly cookie
- [ ] 4.2 Attach decoded user info (userId) to request context object typed as AuthenticatedRequest
- [ ] 4.3 Apply auth middleware globally to all routes under /api/daily-logs /api/analytics /api/ai
- [ ] 4.4 Handle expired/invalid tokens returning 401 Unauthorized per api-design spec
- [ ] 4.5 Implement GET /api/auth/me returning current user profile without sensitive fields

## 5. Daily-logs module - CRUD operations

- [ ] 5.1 Implement POST /api/daily-logs — create daily log with upsert behavior (UPDATE if exists INSERT otherwise) using.userId+date uniqueness
- [ ] 5.2 Validate all 9 metric fields (integers 1–5) with zod before database write
- [ ] 5.3 Implement GET /api/daily-logs/:date — fetch single log by date for authenticated user only filter by userId
- [ ] 5.4 Implement PUT /api/daily-logs/:date — partial update allowing any subset of 9 metrics use $unset/$set approach
- [ ] 5.5 Implement GET /api/daily-logs?from=…&to=… — range query returning array sorted by date descending limited to authenticated user's logs
- [ ] 5.6 Ensure DTOs match response format including id userId date all metrics and timestamps

## 6. Analytics module — calculations

- [ ] 6.1 Implement calculateSummary — compute avg values rounded to 1 decimal place for energy mood wellbeing stress within a period plus fillRate
- [ ] 6.2 Implement getDailyTrend — retrieve ordered list of {date energy sleep nutrition activity mood wellbeing stress caffeine alcohol} for chart rendering
- [ ] 6.3 Implement analyzeEnergyRelationships — split each metric at threshold ≥4 vs <4 compute group averages show to frontend as pregrouped pairs
- [ ] 6.4 Implement getBestDays — order dailyLogs by energy DESC return top 3 (or fewer if less data)
- [ ] 6.5 Implement getWorstDays — order by energy ASC return bottom 3
- [ ] 6.6 Export pure TS functions with zero LLM dependencies so they can be tested in isolation and reused by AI insights

## 7. Analytics module — API endpoints

- [ ] 7.1 Implement GET /api/analytics/summary — accept query parameter for selected_period default 30d call summary logic respond with JSON matching dashboard analytics spec
- [ ] 7.2 Implement GET /api/analytics/energy — return time-series data points for the chosen period used by Recharts line chart
- [ ] 7.3 Implement GET /api/analytics/relationships — return energy relationship analysis results for each available metric

## 8. AI Insights module — LLM integration

- [ ] 8.1 Define LLMProvider interface with method generateInsights(context: AnalysisContext): Promise<StructuredInsightResponse>
- [ ] 8.2 Implement OpenAIProvider wrapping OpenAI SDK — send context build prompt enforcing exact JSON schema receive parsed response validate with Zod
- [ ] 8.3 Implement ContextBuilder — takes analytics results produces minimal but informative context for the LLM excluding raw log entries
- [ ] 8.4 Implement InsightService orchestrating flow: call analytics → build context → call LLM → validate response → cache result
- [ ] 8.5 Implement caching — store lastGeneratedAt and cachedResult check TTL (e.g. 6 hours). Return cached instead of calling LLM when fresh
- [ ] 8.6 Define StructuredInsightResponse schema matching spec: [{type title description confidence}] + experiment: {title description}

## 9. AI Insights — API endpoints

- [ ] 9.1 Implement GET /api/ai/insights — regenerate fresh insights (bypass cache) and also serve cached version if within TTL
- [ ] 9.2 Implement POST /api/ai/insights/regenerate — explicit manual regeneration trigger used by dashboard "Generate" button
- [ ] 9.3 Handle LLM failures gracefully — catch network errors parse errors fallback message ("Недостаточно данных для выводов") return safe HTML-safe strings

## 10. Docker Compose configuration

- [ ] 10.1 Create docker-compose.yml defining three services: backend (Node/TS) frontend (static files) postgres
- [ ] 10.2 Configure PostgreSQL service with environment variables volumes for persistent data
- [ ] 10.3 Set up frontend container serving built static files with nginx
- [ ] 10.4 Wire environment variables between containers .env file references
- [ ] 10.5 Add healthchecks for container orchestration reliability

## 11. Frontend — shared infrastructure

- [ ] 11.1 Install TanStack Query @tanstack/react-query axios for API client setup configure base URL with env var proxy config for dev
- [ ] 11.2 Create API client module with interceptors handling token injection from storage automatic logout on 401 responses
- [ ] 11.3 Setup React Router v7 with routes for Dashboard History Analytics AIInsights pages
- [ ] 11.4 Add navigation component with sidebar/topbar showing four main tabs
- [ ] 11.5 Add AuthProvider wrapping auth state (isLoggedIn user) using React context + TanStack Query mutation hooks
- [ ] 11.6 Create layout components: MainLayout PageWrapper Card wrapper reusing shadcn/ui. Consider mobile-first approach

## 12. Frontend — auth pages (Login Register)

- [ ] 12.1 Create Login page form with email password fields submit handler calling /api/auth/login
- [ ] 12.2 Create Register page form with email password confirmPassword fields calling /api/auth/register
- [ ] 12.3 Add validation with zod resolver react-hook-form showing field-level errors
- [ ] 12.4 Store access token appropriately (httpOnly cookie handled automatically by browser redirect after successful auth)
- [ ] 12.5 Protected route guard — redirect to login if not authenticated for non-public routes

## 13. Frontend — daily-log feature (forms)

- [ ] 13.1 Create MetricInput component using shadcn slider + label accepting value (1–5) change callback aria attributes emoji icon per metric type
- [ ] 13.2 Create DailyLogForm component composing all 9 MetricInputs in a vertical stack save button
- [ ] 13.3 Wire form to TanStack Query mutations for CREATE/UPDATE /api/daily-logs
- [ ] 13.4 Implement onSubmit with optimistic update then refetch invalidation
- [ ] 13.5 Show success/error toast notifications

## 14. Frontend — Dashboard page

- [ ] 14.1 Fetch today’s daily log fetching latest log if not filled yet empty state
- [ ] 14.2 Render TodayEnergy card showing ⚡ symbol big number today’s date
- [ ] 14.3 Render inline DailyLogForm for editing all metrics with Изменить/Сохранить buttons
- [ ] 14.4 Fetch energy chart data calling /api/analytics/energy fetching 7 days limit
- [ ] 14.5 Render small Recharts AreaChart for last 7 days energy trend
- [ ] 14.6 Fetch and render AI insight preview section showing brief observation text with link to full AI Insights page
- [ ] 14.7 Handle loading skeletons and empty states per each UI block

## 15. Frontend — History page

- [ ] 15.1 Create CalendarMonth component wrapping shadcn calendar displaying month grid with day cells coloured by energy level or grey if no data
- [ ] 15.2 Handle month navigation prev/next fetching data on mount and month changes
- [ ] 15.3 Create DayList component showing scrollable list of recent days with date energy badge click detail view
- [ ] 15.4 Create DayDetails modal/sheet panel showing all 9 metrics for selected day
- [ ] 15.5 Wire calendar clicks to open DayDetails same as DayList selection

## 16. Frontend — Analytics page

- [ ] 16.1 Create PeriodSelector component with buttons/tabs for 7 14 30 90 days switching active period
- [ ] 16.2 Fetch and display Summary stats average values fillRate using data from /api/analytics/summary
- [ ] 16.3 Fetch multi-line chart data from /api/analytics/energy enable toggle checkboxes for individual metrics
- [ ] 16.4 Render Recharts ComposedChart with dynamic datasets based on enabled checkboxes
- [ ] 16.5 Fetch relationships from /api/analytics/relationships and render EnergyRelationship cards showing split groups
- [ ] 16.6 Display BestDays WorstDays sections with medal icons ranking and dates

## 17. Frontend — AI Insights page

- [ ] 17.1 Create InsightsPage layout fetching insights from /api/ai/insights
- [ ] 17.2 Render InsightCard component showing type title description confidence badge
- [ ] 17.3 Render ExperimentCard section showing suggested experiment title + description
- [ ] 17.4 Add Generate button triggering POST /api/ai/insights/regenerate with loading spinner
- [ ] 17.5 Handle errors and empty states — show placeholder messages from spec

## 18. Testing & polish

- [ ] 18.1 Run npm run build in backend confirming zero TypeScript errors zero unused exports
- [ ] 18.2 Run npm run build in frontend confirming zero TypeScript errors no oxlint warnings besides known buttonVariants warning
- [ ] 18.3 Test end-to-end Happy path: register → login → fill today → navigate history → check analytics → generate insights
- [ ] 18.4 Verify all edge cases: missing data few logged days invalid input malformed JWT
- [ ] 18.5 Update README.md with project setup instructions and docker compose commands
