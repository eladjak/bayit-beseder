export interface Origin {
  lat: number;
  lon: number;
  label: string;
}

export interface PriceLine {
  code: string;
  name: string;
  price: number;
  packs: number;
  cost: number;
  weighted: boolean;
  estimate: boolean;
  promo: string | null;
}

export interface StoreResult {
  chain: string;
  chainName: string;
  storeId: string;
  name: string;
  city: string;
  address: string;
  distanceKm: number;
  published: string | null;
  fresh: boolean;
  lines: Record<string, PriceLine | null>;
  foundCount: number;
  foundTotal: number;
  commonTotal?: number;
  missing?: string[];
}

export interface CompareResponse {
  generatedAt: string;
  origin: Origin;
  items: { key: string; canonicalId: string | null; qty: number; strict: string[]; pinned: boolean }[];
  unknownItems: string[];
  ranked: StoreResult[];
  otherStores: StoreResult[];
  online: StoreResult[];
  commonKeys: string[];
  verdict: {
    storeKey: string;
    basis: "full" | "common";
    commonCount: number;
    itemsMatched: number;
    savingVsDearest: number;
  } | null;
  split: {
    a: string;
    b: string;
    pick: Record<string, "a" | "b">;
    itemCount: number;
    saving: number;
    note: string;
  } | null;
  chains: { key: string; name: string; lastOk: string | null; lastRunFailed: boolean; onlineOnly: boolean }[];
  pins: Record<string, string>;
  titles: Record<string, string>;
  labels: Record<string, string | null>;
}
