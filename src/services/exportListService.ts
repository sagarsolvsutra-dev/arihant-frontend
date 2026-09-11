import { API_ENDPOINTS } from "@/lib/api";

export interface ExportListParams {
  dateFrom?: string;
  dateTo?: string;
}

export const exportListService = {
  exportList(resource: string, companyId: string, params: ExportListParams = {}) {
    const query = new URLSearchParams({ companyId });
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    // window.open() is a plain browser navigation — it can't carry an
    // Authorization header, so the token has to ride along as a query param
    // (the backend's `protect` middleware accepts either). Without this every
    // export silently 401'd once real auth landed.
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) query.set("token", token);
    window.open(`${API_ENDPOINTS.EXPORT_LIST}/${resource}?${query.toString()}`, "_blank");
  },
};
