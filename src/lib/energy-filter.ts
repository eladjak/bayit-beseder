export type EnergyLevel = "all" | "moderate" | "light";

export type Difficulty = 1 | 2 | 3;

const HEAVY_KEYWORDS = ["עמוק", "ארגון", "יסודי", "חלונות", "תנור"];
const LIGHT_KEYWORDS = ["מהיר", "מים", "איוורור", "בדיקת"];

export function inferDifficulty(task: {
  title: string;
  category: string;
  estimated_minutes: number;
}): Difficulty {
  const title = task.title;

  // Check heavy keywords first
  if (HEAVY_KEYWORDS.some((kw) => title.includes(kw))) {
    return 3;
  }

  // Check light keywords
  if (LIGHT_KEYWORDS.some((kw) => title.includes(kw))) {
    return 1;
  }

  // Check by estimated time
  if (task.estimated_minutes <= 5) {
    return 1;
  }
  if (task.estimated_minutes >= 20) {
    return 3;
  }

  return 2;
}

export function filterTasksByEnergy<
  T extends { title: string; category: string; estimated_minutes: number },
>(tasks: T[], energyLevel: EnergyLevel): T[] {
  if (energyLevel === "all") {
    return tasks;
  }

  const maxDifficulty = energyLevel === "moderate" ? 2 : 1;
  return tasks.filter((task) => inferDifficulty(task) <= maxDifficulty);
}

export function getEnergyLabel(level: EnergyLevel): string {
  const labels: Record<EnergyLevel, string> = {
    all: "כל המשימות",
    moderate: "בינוני",
    light: "קל",
  };
  return labels[level];
}

export function getEnergyEmoji(level: EnergyLevel): string {
  const emojis: Record<EnergyLevel, string> = {
    all: "\u{1F4AA}",
    moderate: "\u{1F60A}",
    light: "\u{1F634}",
  };
  return emojis[level];
}

export function getEnergyDescription(level: EnergyLevel): string {
  const descriptions: Record<EnergyLevel, string> = {
    all: "מציג את כל המשימות",
    moderate: "משימות קלות ובינוניות בלבד",
    light: "רק משימות קלות וקצרות",
  };
  return descriptions[level];
}
