"use client";

import { Save, Loader2 } from "lucide-react";
import { AvatarUpload } from "@/components/avatar-upload";
import { User } from "lucide-react";

interface ProfileSectionProps {
  displayName: string;
  avatarUrl: string;
  profileSaving: boolean;
  isDemo: boolean;
  userId: string | null;
  onNameChange: (name: string) => void;
  onAvatarUploaded: (url: string) => void;
  onSave: () => void;
}

export function ProfileSection({
  displayName,
  avatarUrl,
  profileSaving,
  isDemo,
  userId,
  onNameChange,
  onAvatarUploaded,
  onSave,
}: ProfileSectionProps) {
  return (
    <section className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <User className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">פרופיל</h2>
      </div>

      {/* Avatar */}
      <AvatarUpload
        currentUrl={avatarUrl || null}
        userId={userId}
        displayName={displayName || "משתמש"}
        onUploaded={onAvatarUploaded}
      />

      {/* Name edit */}
      <div>
        <label className="text-xs text-muted block mb-1">שם תצוגה</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="השם שלכם"
          className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={profileSaving || isDemo}
        className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
      >
        {profileSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {profileSaving ? "שומר..." : "שמירת שינויים"}
      </button>
    </section>
  );
}
