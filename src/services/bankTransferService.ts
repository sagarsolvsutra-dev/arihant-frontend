import { API_BASE_URL } from "@/lib/api";

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

export const bankTransferService = {
  getBankTransfers: async (page = 1, limit = 10, dateFrom?: string, dateTo?: string) => {
    let url = `${API_BASE_URL}/bank-transfers?page=${page}&limit=${limit}`;
    if (dateFrom) url += `&dateFrom=${dateFrom}`;
    if (dateTo) url += `&dateTo=${dateTo}`;
    return request(url);
  },
  getBankTransferById: async (id: string) => {
    return request(`${API_BASE_URL}/bank-transfers/${id}`);
  },
  createBankTransfer: async (data: any) => {
    return request(`${API_BASE_URL}/bank-transfers`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  deleteBankTransfer: async (id: string) => {
    return request(`${API_BASE_URL}/bank-transfers/${id}`, {
      method: "DELETE",
    });
  },
};
