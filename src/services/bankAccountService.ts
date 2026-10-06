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

export const bankAccountService = {
  getBankAccounts: async () => {
    const res = await request(`${API_ENDPOINTS.BANK_ACCOUNTS}`);
    return res.bankAccounts;
  },
  getBankAccountStatement: async (id: string) => {
    return request(`${API_ENDPOINTS.BANK_ACCOUNTS}/${id}/statement`);
  },
  createBankAccount: async (data: any) => {
    const res = await request(API_ENDPOINTS.BANK_ACCOUNTS, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.bankAccount;
  },
  updateBankAccount: async (id: string, data: any) => {
    const res = await request(`${API_ENDPOINTS.BANK_ACCOUNTS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res.bankAccount;
  },
  deleteBankAccount: async (id: string) => {
    return request(`${API_ENDPOINTS.BANK_ACCOUNTS}/${id}`, {
      method: "DELETE",
    });
  },
  transferFunds: async (data: any) => {
    return request(`${API_ENDPOINTS.BANK_ACCOUNTS}/transfer`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
