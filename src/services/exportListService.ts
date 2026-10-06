import { API_ENDPOINTS } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { toast } from "@/lib/toast";

export interface ExportListParams {
  dateFrom?: string;
  dateTo?: string;
  format?: "excel" | "pdf";
  search?: string;
  customerType?: string;
}

export const exportListService = {
  async exportList(resource: string, companyId: string, params: ExportListParams = {}) {
    const query = new URLSearchParams({ companyId });
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.format) query.set("format", params.format);
    if (params.search) query.set("search", params.search);
    if (params.customerType) query.set("customerType", params.customerType);
    
    const ext = params.format === "pdf" ? "pdf" : "xlsx";
    try {
      await downloadFile(`${API_ENDPOINTS.EXPORT_LIST}/${resource}?${query.toString()}`, `${resource}.${ext}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export");
    }
  },
};
