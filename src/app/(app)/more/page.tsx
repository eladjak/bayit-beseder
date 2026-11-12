"use client";

import Link from "next/link";
import { useNewUi } from "@/hooks/useNewUi";
import MoreV2 from "@/screens/more/MoreV2";
import { useTranslation } from "@/hooks/useTranslation";
import { CalendarDays, ChartNoAxesCombined, History, Music, Settings, ShieldAlert, BookOpen, Printer, CircleHelp, ChevronLeft, Wrench } from "lucide-react";

const groups = [
  { title: "כשהיום עמוס", links: [{ href: "/emergency", label: "יום עמוס? מצב חירום", description: "להתמקד במה שחשוב עכשיו", icon: ShieldAlert }] },
  { title: "לתכנן יחד", links: [{ href: "/weekly", label: "תכנון שבועי", description: "מבט על השבוע הקרוב", icon: CalendarDays }] },
  { title: "הבית שלנו", links: [
    { href: "/stats", label: "ההתקדמות שלנו", description: "סטטיסטיקה והישגים", icon: ChartNoAxesCombined },
    { href: "/history", label: "היסטוריה", description: "מה כבר עשינו יחד", icon: History },
    { href: "/tasks/print", label: "הדפסת משימות", description: "רשימה מוכנה להדפסה", icon: Printer },
  ] },
  { title: "רעיונות והנאה", links: [
    { href: "#house-tools", label: "כלי הבית", description: "מילה טובה, הפתעות וגלגל המזל", icon: Wrench },
    { href: "/playlists", label: "פלייליסטים", description: "מוזיקה לבית", icon: Music },
    { href: "/blog", label: "טיפים וכתבות", description: "רעיונות לבית", icon: BookOpen },
  ] },
  { title: "הגדרות ועזרה", links: [
    { href: "/settings", label: "הגדרות הבית והחשבון", description: "חברי הבית, התראות והעדפות", icon: Settings },
    { href: "/settings#shortcuts", label: "עזרה באפליקציה", description: "אפשרויות ועזרה", icon: CircleHelp },
  ] },
];
const english: Record<string, string> = {
  "כשהיום עמוס": "When the day is busy", "יום עמוס? מצב חירום": "Busy day? Emergency mode", "להתמקד במה שחשוב עכשיו": "Focus on what matters now",
  "לתכנן יחד": "Plan together", "תכנון שבועי": "Weekly planning", "מבט על השבוע הקרוב": "A look at the week ahead", "הבית שלנו": "Our home",
  "ההתקדמות שלנו": "Our progress", "סטטיסטיקה והישגים": "Statistics and achievements", "היסטוריה": "History", "מה כבר עשינו יחד": "What we have done together", "הדפסת משימות": "Print tasks", "רשימה מוכנה להדפסה": "A list ready to print",
  "רעיונות והנאה": "Ideas and fun", "כלי הבית": "Household tools", "מילה טובה, הפתעות וגלגל המזל": "Appreciation, surprises and the wheel", "פלייליסטים": "Playlists", "מוזיקה לבית": "Music for home", "טיפים וכתבות": "Tips and articles", "רעיונות לבית": "Ideas for home",
  "הגדרות ועזרה": "Settings and help", "הגדרות הבית והחשבון": "Home and account settings", "חברי הבית, התראות והעדפות": "Members, notifications and preferences", "עזרה באפליקציה": "App help", "אפשרויות ועזרה": "Options and help"
};
function MorePageV1() {
  const { locale } = useTranslation();
  const tr = (value: string) => locale === "en" ? (english[value] ?? value) : value;
  return <div className="space-y-7 px-4 py-8 sm:px-6"><header><p className="text-sm font-semibold text-primary">{tr("הבית שלנו")}</p><h1 className="mt-2 text-3xl font-bold">{locale === "en" ? "More at home" : "עוד בבית"}</h1><p className="mt-2 text-muted">{locale === "en" ? "Tools and settings, whenever you need them." : "כל הכלים וההגדרות, כשצריכים אותם."}</p></header>{groups.map(group => <section key={group.title}><h2 className="mb-2 px-1 text-sm font-bold text-muted">{tr(group.title)}</h2><div className="overflow-hidden rounded-2xl border border-border bg-surface">{group.links.map(({href,label,description,icon: Icon}) => <Link key={href} href={href} className="flex min-h-18 items-center gap-4 border-b border-border p-4 last:border-0 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true"/></span><span className="flex-1"><strong className="block">{tr(label)}</strong><span className="text-sm text-muted">{tr(description)}</span></span><ChevronLeft className="size-5 text-muted" aria-hidden="true"/></Link>)}</div></section>)}</div>;
}

export default function MorePage() {
  const newUi = useNewUi();
  return newUi ? <MoreV2 /> : <MorePageV1 />;
}
