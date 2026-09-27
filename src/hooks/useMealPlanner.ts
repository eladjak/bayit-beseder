"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { computeTonightPrep, type DefrostItem } from "@/lib/meals/defrost";
import type { GeneratedMealDay } from "@/lib/meals/generator";
import type { Meal } from "@/lib/meals/types";

export interface WeekPlanResponse {
  weekStart: string;
  days: GeneratedMealDay[];
}

export interface SwapAlternative {
  id: string;
  name: string;
  tags: string[];
  prepLeadHours: number;
}

interface UseMealPlannerReturn {
  loading: boolean;
  error: string | null;
  meals: Meal[];
  week: WeekPlanResponse | null;
  tonightPrep: DefrostItem[];
  refetch: () => Promise<void>;
  regenerateWeek: () => Promise<void>;
  swapDay: (date: string, mealId: string) => Promise<void>;
  markDay: (date: string, action: "cooked" | "skipped" | "leftovers") => Promise<void>;
  setDayNote: (date: string, note: string | null) => Promise<void>;
  fetchAlternatives: (date: string) => Promise<SwapAlternative[]>;
  addMeal: (meal: {
    name: string;
    whoEats: string[];
    prepLeadHours: number;
    prepNote: string | null;
    tags: string[];
    ingredients: Array<{ name: string; quantity?: number; unit?: string }>;
  }) => Promise<boolean>;
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function useMealPlanner(): UseMealPlannerReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [week, setWeek] = useState<WeekPlanResponse | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mealsRes, planRes] = await Promise.all([
        fetch("/api/meals"),
        fetch("/api/meals/plan"),
      ]);
      const mealsBody = await safeJson(mealsRes);
      const planBody = await safeJson(planRes);
      if (!mealsRes.ok) throw new Error(mealsBody?.error ?? "שגיאה בטעינת הארוחות");
      if (!planRes.ok) throw new Error(planBody?.error ?? "שגיאה בטעינת התוכנית");
      setMeals(mealsBody.meals ?? []);
      setWeek(planBody);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const regenerateWeek = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meals/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const body = await safeJson(res);
      if (!res.ok) throw new Error(body?.error ?? "שגיאה ביצירת תוכנית חדשה");
      setWeek(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה לא צפויה");
    } finally {
      setLoading(false);
    }
  }, []);

  const swapDay = useCallback(
    async (date: string, mealId: string) => {
      await fetch("/api/meals/plan/day", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, action: "setMeal", mealId }),
      });
      await refetch();
    },
    [refetch]
  );

  const markDay = useCallback(
    async (date: string, action: "cooked" | "skipped" | "leftovers") => {
      await fetch("/api/meals/plan/day", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, action }),
      });
      await refetch();
    },
    [refetch]
  );

  const setDayNote = useCallback(
    async (date: string, note: string | null) => {
      await fetch("/api/meals/plan/day", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, action: "note", note }),
      });
      await refetch();
    },
    [refetch]
  );

  const fetchAlternatives = useCallback(async (date: string): Promise<SwapAlternative[]> => {
    const res = await fetch(`/api/meals/plan/day?date=${date}`);
    const body = await safeJson(res);
    if (!res.ok) return [];
    return (body?.alternatives ?? []).map((m: Meal) => ({
      id: m.id,
      name: m.name,
      tags: m.tags,
      prepLeadHours: m.prep_lead_hours,
    }));
  }, []);

  const addMeal = useCallback(
    async (meal: {
      name: string;
      whoEats: string[];
      prepLeadHours: number;
      prepNote: string | null;
      tags: string[];
      ingredients: Array<{ name: string; quantity?: number; unit?: string }>;
    }) => {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meal),
      });
      if (res.ok) {
        await refetch();
        return true;
      }
      return false;
    },
    [refetch]
  );

  const tonightPrep = useMemo(() => {
    if (!week) return [];
    const days = week.days.map((d) => ({
      plan_date: d.date,
      meal_id: d.mealId,
      status: d.status,
    }));
    return computeTonightPrep({ now: new Date(), days, meals }).items;
  }, [week, meals]);

  return {
    loading,
    error,
    meals,
    week,
    tonightPrep,
    refetch,
    regenerateWeek,
    swapDay,
    markDay,
    setDayNote,
    fetchAlternatives,
    addMeal,
  };
}
