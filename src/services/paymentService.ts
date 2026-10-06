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

export const paymentService = {
  getPayments: async (type?: string) => {
    const url = type ? `${API_ENDPOINTS.PAYMENTS}?type=${type}` : API_ENDPOINTS.PAYMENTS;
    const res = await request(url);
    return res.payments;
  },
  getPendingInvoices: async (partyType: string, partyId: string) => {
    const url = `${API_ENDPOINTS.PAYMENTS}/pending/${partyType}/${partyId}`;
    const res = await request(url);
    return res.invoices;
  },
  getPaymentById: async (id: string) => {
    const res = await request(`${API_ENDPOINTS.PAYMENTS}/${id}`);
    return res.payment;
  },
  createPayment: async (data: any) => {
    const res = await request(API_ENDPOINTS.PAYMENTS, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.payment;
  },
  updatePayment: async (id: string, data: any) => {
    const res = await request(`${API_ENDPOINTS.PAYMENTS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res.payment;
  },
  deletePayment: async (id: string) => {
    return request(`${API_ENDPOINTS.PAYMENTS}/${id}`, {
      method: "DELETE",
    });
  },
};
