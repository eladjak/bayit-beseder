import type { SeasonalTemplate } from "./types";
import { PESACH_TEMPLATE } from "./templates/pesach";

export const SEASONAL_TEMPLATES: SeasonalTemplate[] = [PESACH_TEMPLATE];

export function getTemplateById(id: string): SeasonalTemplate | undefined {
  return SEASONAL_TEMPLATES.find((t) => t.id === id);
}

/**
 * Returns the first template whose availability window covers today
 * and whose holiday date is in the future (or today).
 */
export function getActiveTemplate(now = new Date()): SeasonalTemplate | null {
  const year = now.getFullYear();

  for (const template of SEASONAL_TEMPLATES) {
    const { month, day } = template.availableFrom;
    const availableDate = new Date(year, month - 1, day);
    const holidayDate = template.getHolidayDate(year);

    // Template is active if we're past availability start and before or on the holiday
    if (now >= availableDate && now <= holidayDate) {
      return template;
    }
  }

  return null;
}

/**
 * Returns days until the holiday for a given template.
 */
export function getDaysUntilHoliday(template: SeasonalTemplate, now = new Date()): number {
  const holiday = template.getHolidayDate(now.getFullYear());
  const diffMs = holiday.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
