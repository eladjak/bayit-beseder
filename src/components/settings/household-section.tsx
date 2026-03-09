"use client";

import { Save, Loader2, Copy, Check, Home } from "lucide-react";

interface HouseholdSectionProps {
  householdName: string;
  goldenTarget: number;
  inviteCode: string;
  copied: boolean;
  householdSaving: boolean;
  onNameChange: (name: string) => void;
  onTargetChange: (target: number) => void;
  onCopyInviteCode: () => void;
  onSave: () => void;
}

export function HouseholdSection({
  householdName,
  goldenTarget,
  inviteCode,
  copied,
  householdSaving,
  onNameChange,
  onTargetChange,
  onCopyInviteCode,
  onSave,
}: HouseholdSectionProps) {
  return (
    <section className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Home className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">בית</h2>
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">שם הבית</label>
        <input
          type="text"
          value={householdName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-background dark:bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">קוד הזמנה</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground">
            {inviteCode}
          </code>
          <button
            onClick={onCopyInviteCode}
            className="p-2 rounded-lg bg-background border border-border hover:bg-surface-hover text-muted"
            aria-label="העתקת קוד הזמנה"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-muted" />
            )}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted block mb-2">
          יעד כלל הזהב: {goldenTarget}%
        </label>
        <input
          type="range"
          min={50}
          max={100}
          value={goldenTarget}
          onChange={(e) => onTargetChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted mt-1">
          <span>50%</span>
          <span>100%</span>
        </div>
        <p className="text-[10px] text-muted mt-2">
          {goldenTarget === 50
            ? "חלוקה שווה לחלוטין"
            : goldenTarget >= 80
              ? "יעד גבוה לשיתוף פעולה"
              : "יעד מאוזן"}
        </p>
      </div>
      {/* Save household button */}
      <button
        onClick={onSave}
        disabled={householdSaving}
        className="flex items-center gap-2 px-4 py-2 gradient-primary text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
      >
        {householdSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {householdSaving ? "שומר..." : "שמירת הגדרות הבית"}
      </button>
    </section>
  );
}
