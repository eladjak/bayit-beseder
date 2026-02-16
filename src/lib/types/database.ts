export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          push_subscription: Json | null;
          notification_preferences: {
            morning: boolean;
            midday: boolean;
            evening: boolean;
            partner_activity: boolean;
          } | null;
          household_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          push_subscription?: Json | null;
          notification_preferences?: {
            morning: boolean;
            midday: boolean;
            evening: boolean;
            partner_activity: boolean;
          } | null;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          push_subscription?: Json | null;
          notification_preferences?: {
            morning: boolean;
            midday: boolean;
            evening: boolean;
            partner_activity: boolean;
          } | null;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          golden_rule_target: number;
          emergency_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          golden_rule_target?: number;
          emergency_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          golden_rule_target?: number;
          emergency_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_templates: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string | null;
          category:
            | "kitchen"
            | "bathroom"
            | "living"
            | "bedroom"
            | "laundry"
            | "outdoor"
            | "pets"
            | "general";
          zone: string | null;
          estimated_minutes: number;
          default_assignee: string | null;
          tips: string[];
          is_emergency: boolean;
          recurrence_type:
            | "daily"
            | "weekly"
            | "biweekly"
            | "monthly"
            | "quarterly"
            | "yearly";
          recurrence_day: number | null;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string | null;
          category:
            | "kitchen"
            | "bathroom"
            | "living"
            | "bedroom"
            | "laundry"
            | "outdoor"
            | "pets"
            | "general";
          zone?: string | null;
          estimated_minutes: number;
          default_assignee?: string | null;
          tips?: string[];
          is_emergency?: boolean;
          recurrence_type:
            | "daily"
            | "weekly"
            | "biweekly"
            | "monthly"
            | "quarterly"
            | "yearly";
          recurrence_day?: number | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          description?: string | null;
          category?:
            | "kitchen"
            | "bathroom"
            | "living"
            | "bedroom"
            | "laundry"
            | "outdoor"
            | "pets"
            | "general";
          zone?: string | null;
          estimated_minutes?: number;
          default_assignee?: string | null;
          tips?: string[];
          is_emergency?: boolean;
          recurrence_type?:
            | "daily"
            | "weekly"
            | "biweekly"
            | "monthly"
            | "quarterly"
            | "yearly";
          recurrence_day?: number | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_templates_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_templates_default_assignee_fkey";
            columns: ["default_assignee"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_instances: {
        Row: {
          id: string;
          template_id: string;
          household_id: string;
          assigned_to: string | null;
          due_date: string;
          status: "pending" | "completed" | "skipped";
          completed_at: string | null;
          completed_by: string | null;
          rating: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          household_id: string;
          assigned_to?: string | null;
          due_date: string;
          status?: "pending" | "completed" | "skipped";
          completed_at?: string | null;
          completed_by?: string | null;
          rating?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          household_id?: string;
          assigned_to?: string | null;
          due_date?: string;
          status?: "pending" | "completed" | "skipped";
          completed_at?: string | null;
          completed_by?: string | null;
          rating?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_instances_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "task_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_instances_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_instances_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_instances_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      streaks: {
        Row: {
          id: string;
          user_id: string;
          household_id: string;
          streak_type: "daily" | "weekly";
          current_count: number;
          best_count: number;
          last_completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id: string;
          streak_type: "daily" | "weekly";
          current_count?: number;
          best_count?: number;
          last_completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          household_id?: string;
          streak_type?: "daily" | "weekly";
          current_count?: number;
          best_count?: number;
          last_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "streaks_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      achievements: {
        Row: {
          id: string;
          code: string;
          title: string;
          description: string;
          icon: string;
          threshold: number;
          category: "streak" | "completion" | "special";
        };
        Insert: {
          id?: string;
          code: string;
          title: string;
          description: string;
          icon: string;
          threshold: number;
          category: "streak" | "completion" | "special";
        };
        Update: {
          id?: string;
          code?: string;
          title?: string;
          description?: string;
          icon?: string;
          threshold?: number;
          category?: "streak" | "completion" | "special";
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_syncs: {
        Row: {
          id: string;
          household_id: string;
          week_start: string;
          notes: string | null;
          focus_zones: string[];
          special_events: string[];
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          week_start: string;
          notes?: string | null;
          focus_zones?: string[];
          special_events?: string[];
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          week_start?: string;
          notes?: string | null;
          focus_zones?: string[];
          special_events?: string[];
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_syncs_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_syncs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coaching_messages: {
        Row: {
          id: string;
          trigger_type:
            | "task_complete"
            | "streak"
            | "emergency"
            | "low_motivation"
            | "golden_rule_hit"
            | "all_daily_done"
            | "partner_complete";
          message: string;
          emoji: string;
        };
        Insert: {
          id?: string;
          trigger_type:
            | "task_complete"
            | "streak"
            | "emergency"
            | "low_motivation"
            | "golden_rule_hit"
            | "all_daily_done"
            | "partner_complete";
          message: string;
          emoji: string;
        };
        Update: {
          id?: string;
          trigger_type?:
            | "task_complete"
            | "streak"
            | "emergency"
            | "low_motivation"
            | "golden_rule_hit"
            | "all_daily_done"
            | "partner_complete";
          message?: string;
          emoji?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for convenience
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Commonly used types
export type Profile = Tables<"profiles">;
export type Household = Tables<"households">;
export type HouseholdMember = Tables<"household_members">;
export type TaskTemplate = Tables<"task_templates">;
export type TaskInstance = Tables<"task_instances">;
export type Streak = Tables<"streaks">;
export type Achievement = Tables<"achievements">;
export type UserAchievement = Tables<"user_achievements">;
export type WeeklySync = Tables<"weekly_syncs">;
export type CoachingMessage = Tables<"coaching_messages">;

// Enum-like types extracted from the schema
export type TaskCategory = TaskTemplate["category"];
export type RecurrenceType = TaskTemplate["recurrence_type"];
export type TaskStatus = TaskInstance["status"];
export type StreakType = Streak["streak_type"];
export type AchievementCategory = Achievement["category"];
export type MemberRole = HouseholdMember["role"];
export type CoachingTrigger = CoachingMessage["trigger_type"];
export type NotificationPreferences = NonNullable<
  Profile["notification_preferences"]
>;
