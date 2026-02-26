"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Copy,
  Check,
  Heart,
  Loader2,
  MessageCircle,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface InviteData {
  inviteCode: string;
  link: string;
  householdName: string;
}

interface PartnerInfo {
  name: string;
  id: string;
}

export function InvitePartner() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch partner info if profile has a partner_id
  useEffect(() => {
    if (!profile?.partner_id) return;

    const supabase = createClient();
    void supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", profile.partner_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPartnerInfo({ id: data.id, name: data.display_name ?? "שותף/ה" });
        }
      });
  }, [profile?.partner_id]);

  // Generate or load invite code
  const handleGenerateInvite = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const res = await fetch("/api/invite", { method: "POST" });
      if (!res.ok) {
        toast.error("שגיאה ביצירת קוד ההזמנה");
        return;
      }
      const data = (await res.json()) as InviteData;
      setInviteData(data);
    } catch {
      toast.error("שגיאה בחיבור לשרת");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-load invite for users already in a household
  useEffect(() => {
    if (user && profile?.household_id && !inviteData && !partnerInfo) {
      void handleGenerateInvite();
    }
  }, [user, profile?.household_id, inviteData, partnerInfo, handleGenerateInvite]);

  const handleCopyCode = useCallback(() => {
    if (!inviteData) return;
    void navigator.clipboard.writeText(inviteData.inviteCode).then(() => {
      setCodeCopied(true);
      toast.success("קוד ההזמנה הועתק!");
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [inviteData]);

  const handleCopyLink = useCallback(() => {
    if (!inviteData) return;
    void navigator.clipboard.writeText(inviteData.link).then(() => {
      setLinkCopied(true);
      toast.success("הקישור הועתק!");
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [inviteData]);

  const handleWhatsAppShare = useCallback(() => {
    if (!inviteData) return;
    const message = encodeURIComponent(
      `היי! הזמנתי אותך לנהל את הבית יחד איתי ב"בית בסדר" 🏠✨\n\nלחץ/י על הקישור להצטרפות:\n${inviteData.link}\n\nקוד הזמנה: ${inviteData.inviteCode}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  }, [inviteData]);

  // Not logged in
  if (!user) return null;

  return (
    <section className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">הזמן/י שותף/ה</h2>
      </div>

      <AnimatePresence mode="wait">
        {/* Partner already linked */}
        {partnerInfo ? (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-xl px-4 py-3"
          >
            <Heart className="w-5 h-5 text-success fill-success flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                מחובר/ת עם {partnerInfo.name}
              </p>
              <p className="text-xs text-muted">מנהלים את הבית יחד</p>
            </div>
          </motion.div>
        ) : loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 py-4"
          >
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted">טוען קוד הזמנה...</span>
          </motion.div>
        ) : inviteData ? (
          <motion.div
            key="invite"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted">
              שתפו את הקוד או הקישור עם השותף/ה שלכם כדי לנהל את הבית יחד
            </p>

            {/* Invite code display */}
            <div>
              <label className="text-xs text-muted block mb-1">
                קוד הזמנה
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-base font-mono font-bold tracking-widest text-primary text-center">
                  {inviteData.inviteCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2.5 rounded-lg bg-background border border-border hover:bg-surface-hover transition-colors"
                  aria-label="העתק קוד הזמנה"
                >
                  {codeCopied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted" />
                  )}
                </button>
              </div>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:opacity-90 transition-opacity active:scale-95 transition-transform shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                שתף בוואטסאפ
              </button>

              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-surface-hover transition-colors active:scale-95 transition-transform"
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <LinkIcon className="w-4 h-4 text-muted" />
                )}
                {linkCopied ? "הועתק!" : "העתק קישור"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted">
              צרו קוד הזמנה ושלחו לשותף/ה שלכם כדי להתחיל לנהל את הבית יחד
            </p>
            <button
              onClick={handleGenerateInvite}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 gradient-primary text-white rounded-xl font-medium text-sm shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <UserPlus className="w-4 h-4" />
              יצירת קוד הזמנה
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
