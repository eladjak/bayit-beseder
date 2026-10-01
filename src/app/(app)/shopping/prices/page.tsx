"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useHousehold } from "@/hooks/useHousehold";
import type { CompareResponse } from "@/lib/prices/types";
import { VerdictCard } from "@/components/prices/verdict-card";
import { StoreCard } from "@/components/prices/store-card";
import { CityPicker } from "@/components/prices/city-picker";
import { CandidatesSheet, type Candidate } from "@/components/prices/candidates-sheet";
import { OnlineSection, PricesFooter, SplitCard, UnknownItems } from "@/components/prices/extras";
import { storeKey } from "@/components/prices/format";

const LS_KEY = "bayit.prices.city";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500";

type View =
  | { kind: "loading" }
  | { kind: "need_location" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: CompareResponse };

type Query = { city: string } | { lat: number; lon: number } | null;

function readSavedCity(): string | null {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}
function saveCity(c: string) {
  try {
    localStorage.setItem(LS_KEY, c);
  } catch {
    /* ignore */
  }
}

export default function PricesPage() {
  const { profile, loading: profileLoading } = useProfile();
  const { household, loading: householdLoading, updateHousehold } = useHousehold(profile?.household_id);
  const [view, setView] = useState<View>({ kind: "loading" });
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [cities, setCities] = useState<{ name: string; stores: number }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [sheet, setSheet] = useState<{ key: string; canonicalId: string } | null>(null);
  const lastQuery = useRef<Query>(null);
  const started = useRef(false);

  const compare = useCallback(async (q: Query) => {
    lastQuery.current = q;
    setView({ kind: "loading" });
    const sp = new URLSearchParams();
    if (q && "city" in q) sp.set("city", q.city);
    if (q && "lat" in q) {
      sp.set("lat", String(q.lat));
      sp.set("lon", String(q.lon));
    }
    try {
      const res = await fetch(`/api/prices/compare?${sp.toString()}`);
      const body = (await res.json().catch(() => ({}))) as Partial<CompareResponse> & { error?: string };
      if (res.ok) {
        const data = body as CompareResponse;
        setCityLabel(data.origin?.label ?? null);
        setView({ kind: "ready", data });
        return;
      }
      if (res.status === 400 && body.error === "need_location") {
        setView({ kind: "need_location" });
        return;
      }
      if (res.status === 400 && body.error === "empty_list") {
        setView({ kind: "empty" });
        return;
      }
      setView({
        kind: "error",
        message: res.status === 404 ? "השוואת המחירים אינה זמינה כרגע." : body.error || "משהו השתבש. נסו שוב.",
      });
    } catch {
      setView({ kind: "error", message: "אין חיבור לשרת. בדקו את האינטרנט ונסו שוב." });
    }
  }, []);

  const loadCities = useCallback(async () => {
    if (cities.length > 0) return;
    setCitiesLoading(true);
    try {
      const res = await fetch("/api/prices/cities");
      if (res.ok) {
        const j = (await res.json()) as { cities?: { name: string; stores: number }[] };
        setCities(j.cities ?? []);
      }
    } catch {
      /* picker shows empty state */
    } finally {
      setCitiesLoading(false);
    }
  }, [cities.length]);

  // First load: saved city > household city > let the server decide.
  useEffect(() => {
    if (started.current || profileLoading || householdLoading) return;
    started.current = true;
    const c = readSavedCity() || household.city;
    void compare(c ? { city: c } : null);
  }, [profileLoading, householdLoading, household.city, compare]);

  useEffect(() => {
    if (view.kind === "need_location") {
      setPicking(true);
      void loadCities();
    }
  }, [view.kind, loadCities]);

  function openPicker() {
    setPicking(true);
    void loadCities();
  }

  async function pickCity(name: string) {
    setPicking(false);
    saveCity(name);
    if (profile?.household_id && household.city !== name) {
      const ok = await updateHousehold({ city: name });
      if (!ok) toast.error("לא הצלחנו לשמור את היישוב בבית. ההשוואה תמשיך לפיו.");
    }
    void compare({ city: name });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("הדפדפן לא תומך באיתור מיקום");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPicking(false);
        void compare({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => toast.error("לא הצלחנו לקבל את המיקום. אפשר לבחור יישוב ידנית."),
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  async function pin(canonicalId: string, c: Candidate | null) {
    try {
      const res = await fetch("/api/prices/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          c
            ? { canonicalId, itemCode: c.code, chain: c.chain, name: c.name }
            : { canonicalId, itemCode: null }
        ),
      });
      if (!res.ok) throw new Error("pin failed");
      toast.success(c ? "המוצר נבחר" : "הבחירה בוטלה");
      setSheet(null);
      void compare(lastQuery.current);
    } catch {
      toast.error("לא הצלחנו לשמור את הבחירה. נסו שוב.");
    }
  }

  const data = view.kind === "ready" ? view.data : null;
  const winner =
    data && data.verdict
      ? [...data.ranked, ...data.otherStores].find((s) => storeKey(s) === data.verdict?.storeKey) ?? null
      : null;
  const sheetTitle = data && sheet ? data.titles[sheet.key] ?? sheet.key : "";

  return (
    <div className="px-4 py-4 space-y-3 pb-28 max-w-[512px] mx-auto" dir="rtl">
      <div className="flex items-center gap-2">
        <Link href="/shopping" aria-label="חזרה לרשימת הקניות" className={`p-2 rounded-lg ${FOCUS}`}>
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">השוואת מחירים</h1>
      </div>

      {!picking && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface p-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
            <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
              {cityLabel ?? readSavedCity() ?? household.city ?? "לא נבחר יישוב"}
            </span>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className={`text-sm underline text-gray-700 dark:text-gray-300 ${FOCUS}`}
          >
            שנה
          </button>
        </div>
      )}

      {picking && (
        <CityPicker
          cities={cities}
          loading={citiesLoading}
          onPick={(n) => void pickCity(n)}
          onGeo={useMyLocation}
          onClose={view.kind === "need_location" ? undefined : () => setPicking(false)}
        />
      )}

      {view.kind === "loading" && (
        <div className="space-y-3" aria-busy="true" aria-label="טוען השוואה">
          <div className="h-24 rounded-2xl shimmer" />
          <div className="h-20 rounded-2xl shimmer" />
          <div className="h-20 rounded-2xl shimmer" />
        </div>
      )}

      {view.kind === "error" && (
        <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm text-red-800 dark:text-red-300">{view.message}</p>
          <button
            type="button"
            onClick={() => void compare(lastQuery.current)}
            className={`mt-2 rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm ${FOCUS}`}
          >
            נסה שוב
          </button>
        </div>
      )}

      {view.kind === "empty" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-surface p-4 text-center">
          <p className="font-medium text-gray-900 dark:text-gray-100">רשימת הקניות ריקה</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">הוסיפו פריטים לרשימה ואז חזרו להשוואה.</p>
          <Link href="/shopping" className={`inline-block mt-2 text-sm underline ${FOCUS}`}>
            לרשימת הקניות
          </Link>
        </div>
      )}

      {data && (
        <>
          <VerdictCard verdict={data.verdict} winner={winner} totalItems={data.items.length} />

          {data.ranked.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">לא נמצאו סניפים עם נתונים עדכניים באזור.</p>
          ) : (
            <ul className="space-y-2" aria-label="סניפים לפי מחיר">
              {data.ranked.map((s) => (
                <StoreCard
                  key={storeKey(s)}
                  store={s}
                  data={data}
                  onPick={setSheet}
                  onUnpin={(id) => void pin(id, null)}
                />
              ))}
            </ul>
          )}

          <SplitCard data={data} />

          {data.otherStores.length > 0 && (
            <details className="rounded-2xl">
              <summary className={`cursor-pointer text-sm font-medium py-2 text-gray-900 dark:text-gray-100 ${FOCUS}`}>
                סניפים נוספים ({data.otherStores.length})
              </summary>
              <ul className="space-y-2 mt-2">
                {data.otherStores.map((s) => (
                  <StoreCard
                    key={storeKey(s)}
                    store={s}
                    data={data}
                    stale={!s.fresh}
                    onPick={setSheet}
                    onUnpin={(id) => void pin(id, null)}
                  />
                ))}
              </ul>
            </details>
          )}

          <OnlineSection data={data} />
          <UnknownItems data={data} />
          <PricesFooter data={data} />
        </>
      )}

      {sheet && (
        <CandidatesSheet
          title={sheetTitle}
          canonicalId={sheet.canonicalId}
          onChoose={(c) => void pin(sheet.canonicalId, c)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
