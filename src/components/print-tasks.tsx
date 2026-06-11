"use client";

export interface PrintTask {
  id: string;
  title: string;
  category_id: string | null;
  assigned_to: string | null;
  points: number;
  status: string;
}

export interface PrintCategory {
  id: string;
  name: string;
  icon: string;
}

export interface PrintMember {
  id: string;
  display_name: string;
}

interface PrintTasksProps {
  tasks: PrintTask[];
  categories: PrintCategory[];
  members: PrintMember[];
  houseName: string;
}

function DifficultyDots({ points }: { points: number }) {
  const level = points <= 5 ? 1 : points <= 15 ? 2 : 3;
  return (
    <span style={{ display: "inline-flex", gap: "3px", alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: i <= level ? "#1a1a1a" : "transparent",
            border: "1.5px solid #1a1a1a",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

function formatHebrewDate(date: Date): string {
  return date.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PrintTasks({ tasks, categories, members, houseName }: PrintTasksProps) {
  const today = new Date();
  const dateStr = formatHebrewDate(today);

  const memberMap = new Map(members.map((m) => [m.id, m.display_name]));

  // Group tasks by category_id
  const grouped = new Map<string | null, PrintTask[]>();
  for (const task of tasks) {
    const key = task.category_id ?? "__none__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  // Build ordered category list — categories first, then uncategorised
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const orderedGroups: Array<{ id: string | null; name: string; icon: string; tasks: PrintTask[] }> = [];

  for (const cat of categories) {
    const catTasks = grouped.get(cat.id);
    if (catTasks && catTasks.length > 0) {
      orderedGroups.push({ id: cat.id, name: cat.name, icon: cat.icon, tasks: catTasks });
    }
  }

  const uncategorised = grouped.get("__none__");
  if (uncategorised && uncategorised.length > 0) {
    orderedGroups.push({ id: null, name: "כללי", icon: "✨", tasks: uncategorised });
  }

  const totalRooms = orderedGroups.length;
  const totalTasks = tasks.length;

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Heebo', 'Arial Hebrew', Arial, sans-serif",
    direction: "rtl",
    maxWidth: "210mm",
    margin: "0 auto",
    padding: "20mm 15mm",
    background: "#fff",
    color: "#1a1a1a",
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: "2px solid #1a1a1a",
    paddingBottom: "12px",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  };

  const logoStyle: React.CSSProperties = {
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "-0.5px",
  };

  const houseDateStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: "12px",
    color: "#444",
    lineHeight: 1.5,
  };

  const roomHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "15px",
    fontWeight: 700,
    padding: "8px 0",
    borderBottom: "1px solid #ccc",
    marginBottom: "2px",
    marginTop: "20px",
  };

  const taskRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px 6px",
    borderBottom: "1px dotted #e0e0e0",
    fontSize: "13px",
  };

  const checkboxStyle: React.CSSProperties = {
    width: "16px",
    height: "16px",
    border: "1.5px solid #1a1a1a",
    borderRadius: "3px",
    flexShrink: 0,
    display: "inline-block",
  };

  const taskTitleStyle: React.CSSProperties = {
    flex: 1,
    fontWeight: 400,
  };

  const memberStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#555",
    flexShrink: 0,
    minWidth: "60px",
    textAlign: "left",
  };

  const footerStyle: React.CSSProperties = {
    marginTop: "32px",
    borderTop: "1px solid #ccc",
    paddingTop: "12px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#666",
  };

  const printButtonStyle: React.CSSProperties = {
    position: "fixed",
    top: "16px",
    left: "16px",
    background: "#4F46E5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "15px",
    fontFamily: "'Heebo', Arial, sans-serif",
    cursor: "pointer",
    fontWeight: 600,
    zIndex: 1000,
    boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
  };

  return (
    <>
      {/* Print button — hidden in @media print via className */}
      <button
        className="no-print"
        style={printButtonStyle}
        onClick={() => window.print()}
        type="button"
      >
        הדפס רשימה
      </button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap');

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page {
            size: A4;
            margin: 0;
          }
        }

        @media screen {
          body {
            background: #f3f4f6;
          }
        }
      `}</style>

      <div style={pageStyle} dir="rtl">
        {/* Header */}
        <header style={headerStyle}>
          <div>
            <div style={logoStyle}>בית בסדר</div>
            <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "2px" }}>
              {houseName}
            </div>
          </div>
          <div style={houseDateStyle}>
            <div>{dateStr}</div>
            <div style={{ marginTop: "4px", fontSize: "11px", color: "#888" }}>
              {totalRooms} חדרים · {totalTasks} משימות
            </div>
          </div>
        </header>

        {/* Task groups */}
        {orderedGroups.length === 0 && (
          <div style={{ textAlign: "center", color: "#888", padding: "40px 0", fontSize: "14px" }}>
            אין משימות להדפסה
          </div>
        )}

        {orderedGroups.map((group) => (
          <section key={group.id ?? "__none__"}>
            <div style={roomHeaderStyle}>
              <span style={{ fontSize: "18px" }}>{group.icon}</span>
              <span>{group.name}</span>
              <span style={{ fontSize: "11px", color: "#888", fontWeight: 400, marginRight: "auto", marginLeft: "0" }}>
                {group.tasks.length} משימות
              </span>
            </div>

            {group.tasks.map((task) => {
              const assigneeName = task.assigned_to ? memberMap.get(task.assigned_to) ?? "" : "";
              return (
                <div key={task.id} style={taskRowStyle}>
                  <span style={checkboxStyle} />
                  <span style={taskTitleStyle}>{task.title}</span>
                  <DifficultyDots points={task.points} />
                  {assigneeName && (
                    <span style={memberStyle}>{assigneeName}</span>
                  )}
                </div>
              );
            })}
          </section>
        ))}

        {/* Footer */}
        <footer style={footerStyle}>
          <span>
            {totalRooms} חדרים · {totalTasks} משימות סה{'"'}כ
          </span>
          <span>נוצר ע{'"'}י בית בסדר | bayitbeseder.com</span>
        </footer>
      </div>
    </>
  );
}
