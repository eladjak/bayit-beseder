"use client";

import { AlertTriangle, LogOut } from "lucide-react";

interface DangerZoneProps {
  isDemo: boolean;
  onLogout: () => void;
  onClearLocalData: () => void;
}

export function DangerZone({ isDemo, onLogout, onClearLocalData }: DangerZoneProps) {
  return (
    <>
      {/* Emergency */}
      <section className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm">מצב חירום</h2>
        </div>
        <p className="text-xs text-muted mb-3">
          במצב חירום, רק משימות קריטיות מוצגות (מטבח, שירותים, חתולים)
        </p>
        <button className="w-full py-2.5 rounded-xl border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
          הפעלת מצב חירום
        </button>
      </section>

      {/* About & Data Management */}
      <section className="card-elevated p-4 space-y-4">
        <div>
          <h2 className="font-semibold text-sm mb-2">אודות</h2>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex justify-between">
              <span>גרסה</span>
              <span className="text-foreground font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>פותח על ידי</span>
              <span className="text-foreground font-medium">אלעד</span>
            </div>
            <div className="flex justify-between">
              <span>עם ❤️ ו-Claude</span>
              <span className="text-foreground font-medium">בית בסדר</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="font-semibold text-sm mb-2">ניהול נתונים</h2>
          <p className="text-xs text-muted mb-3">
            מחיקת נתונים מקומיים תאפס את כל ההעדפות וההגדרות שלכם
          </p>
          <button
            onClick={onClearLocalData}
            className="w-full py-2.5 rounded-xl border border-danger/30 text-sm font-medium text-danger hover:bg-danger/5 transition-colors"
          >
            מחיקת נתונים מקומיים
          </button>
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-danger text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        {isDemo ? "חזרה לדף ההתחברות" : "התנתקות"}
      </button>
    </>
  );
}
