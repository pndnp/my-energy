import type { DailyLog } from "@prisma/client";
import {
  computeBestDays,
  computeRelationships,
  computeSummary,
  type RelationshipResult,
} from "../analytics/analytics.js";
import type { DayDTO } from "../analytics/analytics.js";

export interface AnalyticsContext {
  periodDays: number;
  fillRate: string;
  averages: Record<string, number>;
  energyRelationships: RelationshipResult[];
  bestDays: DayDTO[];
}

// Контекст LLM строится на общих аналитических функциях
// (modules/analytics/analytics.ts) — тот же расчёт, что отдаёт GET /api/analytics,
// плюс связи с энергией (не показываются в UI, но обязательны для промпта).
export function buildContext(logs: DailyLog[], periodDays: number): AnalyticsContext {
  const summary = computeSummary(logs, periodDays);

  return {
    periodDays,
    fillRate: `${summary.loggedDays} из ${periodDays}`,
    averages: summary.averages,
    energyRelationships: computeRelationships(logs),
    bestDays: computeBestDays(logs),
  };
}

// Generate prompt with strict JSON schema enforcement
export function buildPrompt(context: AnalyticsContext): string {
  const relationsText = context.energyRelationships.map(
    (r) => `${r.emoji} ${r.metric}: ≥4 → э${r.highAvgEnergy} / <4 → э${r.lowAvgEnergy}`,
  ).join("\n");

  return `Ты — аналитик привычек и самочувствия. Ты НЕ делаешь медицинские выводы.
Работай ТОЛЬКО с предоставленными данными. Не выдумывай статистику.

## Данные за последние ${context.periodDays} дней
- Заполнено: ${context.fillRate} дней
- Средняя энергия: ${context.averages.energy}, Настроение: ${context.averages.mood}, Самочувствие: ${context.averages.wellbeing}, Стресс: ${context.averages.stress}

## Связи показателей с энергией
${relationsText || "(Нет достаточных данных для связей)"}

## Лучшие дни
${context.bestDays.map((d) => `- ${d.date}: ⚡${d.energy}`).join("\n")}

## ТВОЯ ЗАДАЧА
Верни ТОЛЬКО JSON в формате:
\`\`\`json
{
  "insights": [
    {"type": "<ключ>", "title": "<короткий заголовок>", "description": "<описание наблюдения>", "confidence": "<high|medium|low>"}
  ],
  "experiment": {"title": "<название эксперимента>", "description": "<опиши эксперимент на следующую неделю>"}
}
\`\`\`

Ограничения:
- Максимум 5 наблюдений
- Каждое наблюдение основано НА РЕАЛЬНЫХ ДАННЫХ из выше
- Никогда не говори о причинах — только корреляциях ("в твоих данных...")
- Если мало данных (<7 дней): верни пустой insights [] и скажи "Недостаточно данных"
- confidence: "high" если n≥15, "medium" если 7-14, "low" если <7`;
}
