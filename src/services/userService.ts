import { API_ENDPOINTS } from "@/lib/api";
import { PermissionsMap } from "@/lib/permissions";

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

const USERS_API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/users`;

export const userService = {
  getUsers: () => {
    return request(API_ENDPOINTS.USERS);
  },
  createUser: (payload: any) => {
    return request(API_ENDPOINTS.REGISTER, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  deleteUser: (id: string) => {
    return request(`${USERS_API_URL}/${id}`, {
      method: "DELETE",
    });
  },
  // Company-admin-only staff management (see CLAUDE.md's Staff & Permissions
  // section) — createStaff/updateStaff always create/edit a role:"staff" user
  // scoped to the caller's own company; the backend enforces both of those,
  // never trusting anything the client sends for role/companyId.
  createStaff: (payload: { name: string; email: string; phone?: string; password: string; permissions: PermissionsMap }) => {
    return request(USERS_API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateStaff: (
    id: string,
    payload: { name?: string; phone?: string; password?: string; permissions?: PermissionsMap; isActive?: boolean }
  ) => {
    return request(`${USERS_API_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
