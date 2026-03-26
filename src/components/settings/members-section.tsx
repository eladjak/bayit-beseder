"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MoreVertical,
  Crown,
  UserMinus,
  RefreshCw,
  Plus,
  Loader2,
  User,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useHouseholdMembers, type HouseholdMember } from "@/hooks/useHouseholdMembers";
import { useTranslation } from "@/hooks/useTranslation";
import { createClient } from "@/lib/supabase";

// ── Avatar ──────────────────────────────────────────────────────────────────

const GRADIENT_PALETTE = [
  "from-indigo-400 to-purple-500",
  "from-pink-400 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-teal-400 to-cyan-500",
  "from-emerald-400 to-green-500",
  "from-sky-400 to-blue-500",
];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffff;
  }
  return GRADIENT_PALETTE[hash % GRADIENT_PALETTE.length];
}

function MemberAvatar({
  name,
  avatarUrl,
  size = 36,
  gradient,
}: {
  name: string;
  avatarUrl: string | null;
  size?: number;
  gradient: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold select-none`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || <User className="w-4 h-4" />}
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function TaskProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden min-w-[40px]">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ scaleX: 0, originX: "right" }}
          animate={{ scaleX: pct / 100 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: "right" }}
        />
      </div>
      <span className="text-[11px] text-muted tabular-nums shrink-0">
        {completed}/{total}
      </span>
    </div>
  );
}

// ── Kebab menu ───────────────────────────────────────────────────────────────

interface KebabMenuProps {
  memberId: string;
  memberName: string;
  memberRole: "owner" | "member";
  isLastOwner: boolean;
  onChangeRole: (memberId: string, newRole: "owner" | "member") => Promise<void>;
  onRemove: (memberId: string, memberName: string) => Promise<void>;
}

function KebabMenu({
  memberId,
  memberName,
  memberRole,
  isLastOwner,
  onChangeRole,
  onRemove,
}: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();

  const handleChangeRole = useCallback(async () => {
    if (busy) return;
    setOpen(false);
    setBusy(true);
    const newRole = memberRole === "owner" ? "member" : "owner";
    await onChangeRole(memberId, newRole);
    setBusy(false);
  }, [busy, memberId, memberRole, onChangeRole]);

  const handleRemove = useCallback(async () => {
    if (busy) return;
    setOpen(false);
    setBusy(true);
    await onRemove(memberId, memberName);
    setBusy(false);
  }, [busy, memberId, memberName, onRemove]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="אפשרויות"
        aria-expanded={open}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MoreVertical className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-10 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[180px]"
            >
              {/* Change Role */}
              <button
                onClick={handleChangeRole}
                disabled={isLastOwner && memberRole === "owner"}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground hover:bg-surface-hover transition-colors text-right disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4 text-muted shrink-0" />
                <span>
                  {memberRole === "owner"
                    ? t("settings.members.makeRegularMember")
                    : t("settings.members.makeOwner")}
                </span>
              </button>

              <div className="h-px bg-border" />

              {/* Remove */}
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-right"
              >
                <UserMinus className="w-4 h-4 shrink-0" />
                <span>{t("settings.members.removeMember")}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

interface ConfirmRemoveProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmRemoveDialog({ name, onConfirm, onCancel }: ConfirmRemoveProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-background rounded-2xl p-6 max-w-xs w-full shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">
              {t("settings.members.removeMember")}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {t("settings.members.removeConfirm").replace("{name}", name)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm text-foreground font-medium hover:bg-surface-hover transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            {t("settings.members.removeMember")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: HouseholdMember;
  isCurrentUser: boolean;
  isOwner: boolean;
  isLastOwner: boolean;
  onChangeRole: (memberId: string, newRole: "owner" | "member") => Promise<void>;
  onRemove: (memberId: string, memberName: string) => Promise<void>;
  index: number;
}

function MemberRow({
  member,
  isCurrentUser,
  isOwner,
  isLastOwner,
  onChangeRole,
  onRemove,
  index,
}: MemberRowProps) {
  const { t } = useTranslation();
  const gradient = getGradient(member.id);

  return (
    <motion.div
      key={member.id}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 py-2.5"
    >
      {/* Avatar */}
      <div className="shrink-0">
        <MemberAvatar
          name={member.name}
          avatarUrl={member.avatarUrl}
          size={40}
          gradient={gradient}
        />
      </div>

      {/* Name + role + tasks */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {member.name}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
              {t("settings.members.you")}
            </span>
          )}
          {member.role === "owner" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded-full shrink-0">
              <Crown className="w-2.5 h-2.5" />
              {t("settings.members.owner")}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-muted bg-surface-hover px-1.5 py-0.5 rounded-full shrink-0">
              {t("settings.members.member")}
            </span>
          )}
        </div>

        {member.totalToday > 0 && (
          <TaskProgress completed={member.completedToday} total={member.totalToday} />
        )}
        {member.totalToday === 0 && (
          <span className="text-[11px] text-muted">{t("settings.members.noTasksToday")}</span>
        )}
      </div>

      {/* Kebab — only for owners managing others (not self) */}
      {isOwner && !isCurrentUser && (
        <KebabMenu
          memberId={member.id}
          memberName={member.name}
          memberRole={member.role}
          isLastOwner={isLastOwner && member.role === "owner"}
          onChangeRole={onChangeRole}
          onRemove={onRemove}
        />
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MembersSectionProps {
  onInviteClick?: () => void;
}

export function MembersSection({ onInviteClick }: MembersSectionProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { t } = useTranslation();

  const todayStr = new Date().toISOString().slice(0, 10);
  const { members, loading, refetch } = useHouseholdMembers(
    profile?.household_id ?? null,
    todayStr
  );

  const [confirmRemove, setConfirmRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const currentUserId = user?.id ?? null;
  const currentMember = members.find((m) => m.id === currentUserId);
  const isOwner = currentMember?.role === "owner";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  const handleChangeRole = useCallback(
    async (memberId: string, newRole: "owner" | "member") => {
      if (!profile?.household_id) return;

      if (newRole === "member" && ownerCount <= 1) {
        toast.error(t("settings.members.lastOwner"));
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("household_members")
          .update({ role: newRole })
          .eq("user_id", memberId)
          .eq("household_id", profile.household_id);

        if (error) {
          toast.error(t("common.error"));
          return;
        }
        toast.success(t("settings.members.roleUpdated"));
        await refetch();
      } catch {
        toast.error(t("common.error"));
      }
    },
    [profile?.household_id, ownerCount, refetch, t]
  );

  const handleRemove = useCallback(
    async (memberId: string, memberName: string) => {
      if (memberId === currentUserId) {
        toast.error(t("settings.members.cannotRemoveSelf"));
        return;
      }
      setConfirmRemove({ id: memberId, name: memberName });
    },
    [currentUserId, t]
  );

  const executeRemove = useCallback(async () => {
    if (!confirmRemove || !profile?.household_id) return;

    setConfirmRemove(null);
    try {
      const supabase = createClient();

      const [{ error: memberError }, { error: profileError }] = await Promise.all([
        supabase
          .from("household_members")
          .delete()
          .eq("user_id", confirmRemove.id)
          .eq("household_id", profile.household_id),
        supabase
          .from("profiles")
          .update({ household_id: null })
          .eq("id", confirmRemove.id),
      ]);

      if (memberError ?? profileError) {
        toast.error(t("common.error"));
        return;
      }

      toast.success(t("settings.members.memberRemoved"));
      await refetch();
    } catch {
      toast.error(t("common.error"));
    }
  }, [confirmRemove, profile?.household_id, refetch, t]);

  // Don't render if not in a household
  if (!profile?.household_id) return null;

  return (
    <>
      <section className="card-elevated p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted" />
          <h2 className="font-semibold text-sm flex-1">
            {t("settings.members.title")}
          </h2>
          {!loading && members.length > 0 && (
            <span className="text-[11px] font-medium text-muted bg-surface-hover px-2 py-0.5 rounded-full">
              {members.length}
            </span>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-full bg-surface-hover animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-hover rounded animate-pulse w-32" />
                  <div className="h-2 bg-surface-hover rounded animate-pulse w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Member list */}
        {!loading && members.length > 0 && (
          <div className="divide-y divide-border/50">
            <AnimatePresence>
              {members.map((member, index) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isCurrentUser={member.id === currentUserId}
                  isOwner={isOwner}
                  isLastOwner={ownerCount <= 1}
                  onChangeRole={handleChangeRole}
                  onRemove={handleRemove}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {!loading && members.length === 0 && (
          <p className="text-sm text-muted text-center py-3">
            {t("settings.members.noMembers")}
          </p>
        )}

        {/* Invite CTA */}
        <div className="pt-1">
          <button
            onClick={onInviteClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-primary font-medium hover:bg-primary/5 hover:border-primary/40 transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {t("settings.members.inviteMore")}
          </button>
        </div>
      </section>

      {/* Confirm removal dialog */}
      <AnimatePresence>
        {confirmRemove && (
          <ConfirmRemoveDialog
            name={confirmRemove.name}
            onConfirm={executeRemove}
            onCancel={() => setConfirmRemove(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
