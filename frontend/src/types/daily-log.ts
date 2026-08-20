export interface DailyLog {
  id: string;
  userId: string;
  date: string;
  sleep: number;
  nutrition: number;
  caffeine: number;
  alcohol: number;
  activity: number;
  mood: number;
  wellbeing: number;
  stress: number;
  energy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyLogInput {
  date: string;
  sleep: number;
  nutrition: number;
  caffeine: number;
  alcohol: number;
  activity: number;
  mood: number;
  wellbeing: number;
  stress: number;
  energy: number;
}

export type PartialUpdate = Partial<CreateDailyLogInput>;
