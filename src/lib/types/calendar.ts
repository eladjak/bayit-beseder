// Google Calendar event types for client-side consumption

export interface ClientCalendarEvent {
  id: string
  summary: string
  description?: string
  startTime: string // ISO datetime or date string
  endTime: string   // ISO datetime or date string
  isAllDay: boolean
  date: string      // YYYY-MM-DD for grouping by day
}

export interface CalendarEventsResponse {
  connected: boolean
  events: ClientCalendarEvent[]
}
