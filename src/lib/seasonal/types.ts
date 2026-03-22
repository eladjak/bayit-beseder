import type { TaskCategory } from "@/lib/types/database";

export interface SeasonalTaskDef {
  title: string;
  category: TaskCategory;
  estimated_minutes: number;
  difficulty: 1 | 2 | 3;
  /** Phase 1-4 (1 = earliest, 4 = day before) */
  phase: 1 | 2 | 3 | 4;
  /** Ideal days before the holiday to do this task */
  daysBeforeHoliday: number;
  /** How many days earlier/later the task can flex from ideal */
  flexDays: number;
  /** Room/zone grouping for same-room batching */
  zone: string;
}

export interface SeasonalShoppingDef {
  title: string;
  category: string;
  quantity?: number;
  unit?: string;
}

export interface SeasonalTemplate {
  id: string;
  name: string;
  nameHe: string;
  emoji: string;
  description: string;
  /** Gradient colors for the banner [from, to] */
  gradientColors: [string, string];
  /** When this template becomes available (month-day) */
  availableFrom: { month: number; day: number };
  /** The holiday date for the current/upcoming year (computed) */
  getHolidayDate: (year: number) => Date;
  tasks: SeasonalTaskDef[];
  shopping: SeasonalShoppingDef[];
}

export interface SeasonalActivation {
  templateId: string;
  activatedAt: string;
  holidayDate: string;
  startDate: string;
  tasksCreated: boolean;
  shoppingAdded: boolean;
  /** IDs of tasks created by this activation */
  taskIds: string[];
  /** IDs of shopping items created by this activation */
  shoppingIds: string[];
}
