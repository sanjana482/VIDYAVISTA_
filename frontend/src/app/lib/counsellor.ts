import { API_URL } from "./api";

export type CounsellorRequestInput = {
  name: string;
  mobile: string;
  child_class?: string;
  city?: string;
  board?: string;
  budget?: string;
  notes?: string;
  source?: string;
};

export type OpenCounsellorOptions = {
  mobile?: string;
  source?: string;
  child_class?: string;
  city?: string;
};

export function openCounsellorModal(options: OpenCounsellorOptions = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("open-counsellor-modal", { detail: options })
    );
  }
}

export async function submitCounsellorRequest(
  data: CounsellorRequestInput
): Promise<{ ok: boolean; message: string; lead_id?: number }> {
  const source =
    data.source ||
    (typeof window !== "undefined" ? window.location.pathname : "Website");

  const res = await fetch(`${API_URL}/counsellor-request/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      source,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }

  return {
    ok: true,
    message:
      json.message ||
      "Your counselling request has been received! Our expert counsellor will connect with you shortly.",
    lead_id: json.lead_id,
  };
}
