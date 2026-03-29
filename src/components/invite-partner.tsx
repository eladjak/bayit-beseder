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
  ChevronDown,
  Send,
  Users,
  Home,
  QrCode,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { QRInvite } from "@/components/qr-invite";

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
  const { t } = useTranslation();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "qr" | "whatsapp">("link");

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
          setPartnerInfo({ id: data.id, name: data.display_name ?? t("invite.partner") });
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
        toast.error(t("invite.errorGenerating"));
        return;
      }
      const data = (await res.json()) as InviteData;
      setInviteData(data);
    } catch {
      toast.error(t("invite.errorConnection"));
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
      toast.success(t("invite.codeCopied"));
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [inviteData, t]);

  const handleCopyLink = useCallback(() => {
    if (!inviteData) return;
    void navigator.clipboard.writeText(inviteData.link).then(() => {
      setLinkCopied(true);
      toast.success(t("invite.linkCopied"));
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [inviteData, t]);

  const handleWhatsAppShare = useCallback(() => {
    if (!inviteData) return;
    const message = encodeURIComponent(
      `${t("invite.whatsappMessage")}\n\n${t("invite.whatsappLink")}\n${inviteData.link}\n\n${t("invite.whatsappCode")} ${inviteData.inviteCode}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  }, [inviteData, t]);

  // Not logged in
  if (!user) return null;

  return (
    <section className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-muted" />
        <h2 className="font-semibold text-sm">{t("invite.title")}</h2>
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
                {t("invite.connectedWith")} {partnerInfo.name}
              </p>
              <p className="text-xs text-muted">{t("invite.managingTogether")}</p>
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
            <span className="text-sm text-muted">{t("invite.loadingCode")}</span>
          </motion.div>
        ) : inviteData ? (
          <motion.div
            key="invite"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* 3-step visual guide */}
            <div className="flex items-center justify-between px-2 py-3 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-[#25D366]" />
                </div>
                <span className="text-[10px] text-muted font-medium">{t("invite.stepSend")}</span>
              </div>
              <div className="text-muted/30 text-lg">&larr;</div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] text-muted font-medium">{t("invite.stepJoin")}</span>
              </div>
              <div className="text-muted/30 text-lg">&larr;</div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                  <Home className="w-4 h-4 text-success" />
                </div>
                <span className="text-[10px] text-muted font-medium">{t("invite.stepTogether")}</span>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-1.5 text-xs text-muted">
              <p>{t("invite.instruction1")}</p>
              <p>{t("invite.instruction2")}</p>
              <p>{t("invite.instruction3")}</p>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(
                [
                  { id: "link", label: t("invite.tabLink"), icon: <LinkIcon className="w-3.5 h-3.5" /> },
                  { id: "qr",   label: t("invite.tabQR"),   icon: <QrCode className="w-3.5 h-3.5" /> },
                  { id: "whatsapp", label: t("invite.tabWhatsapp"), icon: <MessageCircle className="w-3.5 h-3.5" /> },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "bg-background text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === "link" && (
                <motion.div
                  key="link"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="space-y-3"
                >
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-surface-hover transition-colors active:scale-[0.98]"
                  >
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <LinkIcon className="w-4 h-4 text-muted" />
                    )}
                    {linkCopied ? t("invite.linkCopied") : t("invite.copyLink")}
                  </button>

                  {/* Show invite code */}
                  <button
                    onClick={() => setShowCode((prev) => !prev)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCode ? "rotate-180" : ""}`} />
                    {showCode ? t("invite.hideCode") : t("invite.showCode")}
                  </button>
                  <AnimatePresence>
                    {showCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-base font-mono font-bold tracking-widest text-primary text-center">
                            {inviteData.inviteCode}
                          </code>
                          <button
                            onClick={handleCopyCode}
                            className="p-2.5 rounded-lg bg-background border border-border hover:bg-surface-hover transition-colors"
                            aria-label={t("invite.copyCodeLabel")}
                          >
                            {codeCopied ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeTab === "qr" && (
                <motion.div
                  key="qr"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <QRInvite inviteCode={inviteData.inviteCode} inviteLink={inviteData.link} />
                </motion.div>
              )}

              {activeTab === "whatsapp" && (
                <motion.div
                  key="whatsapp"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:opacity-90 transition-opacity active:scale-[0.98] shadow-md shadow-[#25D366]/20"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {t("invite.shareWhatsapp")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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
              {t("invite.generateDescription")}
            </p>
            <button
              onClick={handleGenerateInvite}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 gradient-primary text-white rounded-2xl font-semibold text-sm shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <UserPlus className="w-4 h-4" />
              {t("invite.generateButton")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
