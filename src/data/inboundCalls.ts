export const INBOUND_CALLS_SNAPSHOT = `${import.meta.env.BASE_URL}data/inbound-calls.json`;

export interface InboundCallRow {
  id?: string;
  periodMonth: string;
  date: string;
  inboundCalls: number | null;
  clinics: number | null;
  opdReservations: number | null;
  expertInquiries: number | null;
  expertVisits: number | null;
  physiotherapy: number | null;
  contracts: number | null;
  internal: number | null;
  operations: number | null;
  radiology: number | null;
  laboratory: number | null;
  catheterization: number | null;
  medicalReports: number | null;
  dialysis: number | null;
  pharmacy: number | null;
  comprehensiveCheckups: number | null;
  bloodBank: number | null;
  emergency: number | null;
  ambulance: number | null;
  accounts: number | null;
  marketing: number | null;
  purchasing: number | null;
  recruitment: number | null;
  wrongCalls: number | null;
  generalInquiries: number | null;
}

export async function fetchInboundCallsSnapshot(): Promise<InboundCallRow[]> {
  const response = await fetch(`${INBOUND_CALLS_SNAPSHOT}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Inbound calls snapshot returned ${response.status}`);
  return response.json() as Promise<InboundCallRow[]>;
}


/**
 * Combine API and published snapshot by calendar day, rather than replacing the
 * entire history whenever the API returns at least one row.
 * Preserve a previously recorded positive OPD value if a subsequent API refresh
 * temporarily reports zero/null for that same day. A real correction downward
 * should be made in the canonical source and reflected in the next snapshot too.
 */
export function mergeInboundCalls(
  snapshot: InboundCallRow[],
  live: InboundCallRow[],
): InboundCallRow[] {
  const merged = new Map<string, InboundCallRow>();
  for (const row of snapshot) {
    if (row?.date && row.periodMonth) merged.set(row.date, { ...row });
  }
  for (const row of live) {
    if (!row?.date || !row.periodMonth) continue;
    const previous = merged.get(row.date);
    if (!previous) {
      merged.set(row.date, { ...row });
      continue;
    }
    const combined = { ...previous };
    for (const key of Object.keys(previous) as Array<keyof InboundCallRow>) {
      if (key === "date" || key === "id" || key === "periodMonth") continue;
      const incoming = row[key];
      if (typeof incoming !== "number" || !Number.isFinite(incoming) || incoming < 0) continue;
      if (
        key === "opdReservations" &&
        incoming === 0 &&
        typeof previous.opdReservations === "number" &&
        previous.opdReservations > 0
      ) continue;
      // All remaining numeric fields are provided by the most recent valid API row.
      (combined as unknown as Record<string, unknown>)[key] = incoming;
    }
    merged.set(row.date, combined);
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
}
