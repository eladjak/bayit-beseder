"use client";

import { memo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import type { HouseholdMember } from "@/hooks/useHouseholdMembers";

// ---- Single-member card (legacy / partner mode) ----

interface PartnerStatusProps {
  name: string;
  avatarUrl?: string;
  completedCount: number;
  totalCount: number;
  recentTasks: string[];
}

function MemberCard({
  name,
  avatarUrl,
  completedCount,
  totalCount,
}: {
  name: string;
  avatarUrl?: string | null;
  completedCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/60">
      <div className="relative">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={32}
            height={32}
            sizes="32px"
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary-light/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        )}
        {completedCount > 0 && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface dark:border-surface"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted">
          {completedCount}/{totalCount} משימות היום
        </p>
      </div>
      {totalCount > 0 && (
        <div className="text-xs font-semibold text-primary">
          {Math.round((completedCount / totalCount) * 100)}%
        </div>
      )}
    </div>
  );
}

// ---- Multi-member variant (N members) ----

interface MembersStatusProps {
  members: HouseholdMember[];
}

export const MembersStatus = memo(function MembersStatus({ members }: MembersStatusProps) {
  if (members.length === 0) return null;

  return (
    <div className="card-elevated p-4 space-y-2">
      {members.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <MemberCard
            name={m.name}
            avatarUrl={m.avatarUrl}
            completedCount={m.completedToday}
            totalCount={m.totalToday}
          />
        </motion.div>
      ))}
    </div>
  );
});

// ---- Legacy single-partner variant (backward compat) ----

export const PartnerStatus = memo(function PartnerStatus({
  name,
  avatarUrl,
  completedCount,
  totalCount,
  recentTasks,
}: PartnerStatusProps) {
  return (
    <div className="card-elevated p-4 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={32}
              height={32}
              sizes="32px"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-light/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          )}
          {completedCount > 0 && (
            <motion.div
              className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface dark:border-surface"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted">
            {completedCount}/{totalCount} משימות היום
          </p>
        </div>
      </div>
      {recentTasks.length > 0 && (
        <div className="space-y-1">
          {recentTasks.map((task, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2 text-xs text-muted"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <motion.span
                className="text-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: i * 0.1 + 0.05 }}
              >
                ✓
              </motion.span>
              <span>{task}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
});
