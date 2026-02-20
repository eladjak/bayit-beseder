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
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          color: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string | null;
          color?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category_id: string | null;
          assigned_to: string | null;
          status: "pending" | "in_progress" | "completed" | "skipped";
          due_date: string | null;
          points: number;
          recurring: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category_id?: string | null;
          assigned_to?: string | null;
          status?: "pending" | "in_progress" | "completed" | "skipped";
          due_date?: string | null;
          points?: number;
          recurring?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category_id?: string | null;
          assigned_to?: string | null;
          status?: "pending" | "in_progress" | "completed" | "skipped";
          due_date?: string | null;
          points?: number;
          recurring?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_completions: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          completed_at: string;
          photo_url: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          completed_at?: string;
          photo_url?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          completed_at?: string;
          photo_url?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_completions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          points: number;
          streak: number;
          partner_id: string | null;
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
          points?: number;
          streak?: number;
          partner_id?: string | null;
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
          points?: number;
          streak?: number;
          partner_id?: string | null;
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
      shopping_items: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          quantity: number;
          unit: string | null;
          category: string;
          checked: boolean;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          quantity?: number;
          unit?: string | null;
          category?: string;
          checked?: boolean;
          added_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          quantity?: number;
          unit?: string | null;
          category?: string;
          checked?: boolean;
          added_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_added_by_fkey";
            columns: ["added_by"];
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
export type ShoppingItemRow = Tables<"shopping_items">;
export type ShoppingItemInsert = InsertTables<"shopping_items">;
export type ShoppingItemUpdate = UpdateTables<"shopping_items">;

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

// ============================================
// Derived types from Database tables
// ============================================

/** Category row from the categories table */
export type CategoryRow = Tables<"categories">;

/** Task row from the tasks table */
export type TaskRow = Tables<"tasks">;

/** Insert shape for tasks table */
export type TaskInsert = InsertTables<"tasks">;

/** Update shape for tasks table */
export type TaskUpdate = UpdateTables<"tasks">;

/** Task completion row */
export type TaskCompletionRow = Tables<"task_completions">;

/** Insert shape for task_completions */
export type TaskCompletionInsert = InsertTables<"task_completions">;

/** Profile row (simplified view used by hooks) */
export interface ProfileRow {
  id: string;
  name: string;
  avatar_url: string | null;
  points: number;
  streak: number;
  partner_id: string | null;
  notification_preferences: NotificationPreferences | null;
  created_at: string;
}

/** Update shape for profiles (used by hooks) */
export interface ProfileUpdate {
  name?: string;
  avatar_url?: string | null;
  points?: number;
  streak?: number;
  notification_preferences?: NotificationPreferences | null;
}
