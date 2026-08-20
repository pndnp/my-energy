-- CreateTable

CREATE TABLE "ai_insights" (
  "id" VARCHAR(255) PRIMARY KEY,
  "user_id" VARCHAR(255) NOT NULL,
  "period_days" INTEGER NOT NULL,
  "insights_json" TEXT NOT NULL,
  "experiment_json" TEXT NOT NULL,
  "generated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "period_days")
);
