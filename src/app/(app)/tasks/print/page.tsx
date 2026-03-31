"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useHousehold } from "@/hooks/useHousehold";
import { useProfile } from "@/hooks/useProfile";
import { PrintTasks, type PrintMember } from "@/components/print-tasks";

function PrintPageSkeleton() {
  return (
    <div
      style={{
        fontFamily: "'Heebo', Arial, sans-serif",
        direction: "rtl",
        maxWidth: "210mm",
        margin: "0 auto",
        padding: "20mm 15mm",
      }}
      dir="rtl"
    >
      {/* Skeleton header */}
      <div
        style={{
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: "12px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div
            style={{
              width: "100px",
              height: "22px",
              background: "#e5e7eb",
              borderRadius: "4px",
              marginBottom: "8px",
            }}
          />
          <div
            style={{
              width: "160px",
              height: "18px",
              background: "#e5e7eb",
              borderRadius: "4px",
            }}
          />
        </div>
        <div
          style={{
            width: "120px",
            height: "36px",
            background: "#e5e7eb",
            borderRadius: "4px",
          }}
        />
      </div>

      {/* Skeleton rooms */}
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ marginTop: "20px" }}>
          <div
            style={{
              width: "140px",
              height: "20px",
              background: "#e5e7eb",
              borderRadius: "4px",
              marginBottom: "12px",
            }}
          />
          {[1, 2, 3, 4].map((j) => (
            <div
              key={j}
              style={{
                height: "34px",
                background: "#f3f4f6",
                borderRadius: "4px",
                marginBottom: "4px",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PrintPage() {
  const today = new Date().toISOString().split("T")[0];

  const { profile, loading: profileLoading } = useProfile();
  const householdId = profile?.household_id ?? null;

  const { tasks, loading: tasksLoading } = useTasks();
  const { taskCategories, loading: categoriesLoading } = useTaskCategories();
  const { household, loading: householdLoading } = useHousehold(householdId);
  const { members: householdMembers, loading: membersLoading } = useHouseholdMembers(
    householdId,
    today,
  );

  const isLoading =
    profileLoading || tasksLoading || categoriesLoading || householdLoading || membersLoading;

  // Adapt HouseholdMember → PrintMember shape
  const printMembers: PrintMember[] = useMemo(
    () => householdMembers.map((m) => ({ id: m.id, display_name: m.name })),
    [householdMembers],
  );

  // Adapt TaskCategoryRow → PrintCategory shape
  const printCategories = useMemo(
    () => taskCategories.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    [taskCategories],
  );

  // Adapt TaskRow → PrintTask shape (only pending / in_progress tasks)
  const printTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "skipped")
        .map((t) => ({
          id: t.id,
          title: t.title,
          category_id: t.category_id,
          assigned_to: t.assigned_to,
          points: t.points,
          status: t.status,
        })),
    [tasks],
  );

  return (
    <>
      {/* Back button — hidden during print via className */}
      <div
        className="no-print"
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 1000,
        }}
      >
        <Link
          href="/tasks"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "14px",
            fontFamily: "'Heebo', Arial, sans-serif",
            color: "#374151",
            textDecoration: "none",
            fontWeight: 600,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <ArrowRight size={16} />
          חזרה למשימות
        </Link>
      </div>

      {isLoading ? (
        <PrintPageSkeleton />
      ) : (
        <PrintTasks
          tasks={printTasks}
          categories={printCategories}
          members={printMembers}
          houseName={household?.name ?? "הבית שלנו"}
        />
      )}
    </>
  );
}
