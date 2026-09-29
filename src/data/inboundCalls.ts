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
