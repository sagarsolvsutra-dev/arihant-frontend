import { API_ENDPOINTS } from "@/lib/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

export const openingBillService = {
  getOpeningBills: (companyId: string, type?: string) => {
    const params = new URLSearchParams({ companyId });
    if (type) params.append("type", type);
    return request(`${API_ENDPOINTS.OPENING_BILLS}?${params.toString()}`);
  },
  createOpeningBill: (payload: any) => {
    return request(API_ENDPOINTS.OPENING_BILLS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateOpeningBill: (id: string, payload: any) => {
    return request(`${API_ENDPOINTS.OPENING_BILLS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteOpeningBill: (id: string) => {
    return request(`${API_ENDPOINTS.OPENING_BILLS}/${id}`, {
      method: "DELETE",
    });
  },
};
