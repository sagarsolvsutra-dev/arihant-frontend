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

export const expenseService = {
  getExpenses: async (page = 1, limit = 10, search = "", dateFrom?: string, dateTo?: string) => {
    let url = `${API_BASE_URL}/expenses?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (dateFrom) url += `&dateFrom=${dateFrom}`;
    if (dateTo) url += `&dateTo=${dateTo}`;
    return request(url);
  },
  getExpenseById: async (id: string) => {
    return request(`${API_BASE_URL}/expenses/${id}`);
  },
  createExpense: async (data: any) => {
    return request(`${API_BASE_URL}/expenses`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  deleteExpense: async (id: string) => {
    return request(`${API_BASE_URL}/expenses/${id}`, {
      method: "DELETE",
    });
  },
};
