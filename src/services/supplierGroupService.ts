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

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

export const supplierGroupService = {
  getSupplierGroups: (companyId: string) => {
    return request(`${API_ENDPOINTS.SUPPLIER_GROUPS}?companyId=${companyId}`);
  },
  createSupplierGroup: (payload: { companyId: string; name: string }) => {
    return request(API_ENDPOINTS.SUPPLIER_GROUPS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateSupplierGroup: (id: string, payload: { name?: string }) => {
    return request(`${API_ENDPOINTS.SUPPLIER_GROUPS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteSupplierGroup: (id: string) => {
    return request(`${API_ENDPOINTS.SUPPLIER_GROUPS}/${id}`, {
      method: "DELETE",
    });
  },
};
