"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ClientCalendarEvent, CalendarEventsResponse } from "@/lib/types/calendar";

interface UseCalendarEventsOptions {
  timeMin: string;
  timeMax: string;
  enabled?: boolean;
}

interface UseCalendarEventsReturn {
  events: ClientCalendarEvent[];
  eventsByDate: Map<string, ClientCalendarEvent[]>;
  loading: boolean;
  error: string | null;
  connected: boolean;
  refetch: () => Promise<void>;
}

export function useCalendarEvents({
  timeMin,
  timeMax,
  enabled = true,
}: UseCalendarEventsOptions): UseCalendarEventsReturn {
  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!enabled || !timeMin || !timeMax) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ timeMin, timeMax });
      const res = await fetch(`/api/calendar/events?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch calendar events: ${res.status}`);
      }

      const data: CalendarEventsResponse & { error?: string } = await res.json();
      setConnected(data.connected);
      setEvents(data.events);

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בטעינת היומן";
      setError(message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [timeMin, timeMax, enabled]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ClientCalendarEvent[]>();
    for (const event of events) {
      const existing = map.get(event.date) ?? [];
      existing.push(event);
      map.set(event.date, existing);
    }
    // Sort events within each day by start time
    for (const [date, dayEvents] of map) {
      map.set(
        date,
        dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime))
      );
    }
    return map;
  }, [events]);

  return {
    events,
    eventsByDate,
    loading,
    error,
    connected,
    refetch: fetchEvents,
  };
}
