import { API_ENDPOINTS } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { toast } from "@/lib/toast";

export interface ExportListParams {
  dateFrom?: string;
  dateTo?: string;
}

export const exportListService = {
  async exportList(resource: string, companyId: string, params: ExportListParams = {}) {
    const query = new URLSearchParams({ companyId });
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    try {
      await downloadFile(`${API_ENDPOINTS.EXPORT_LIST}/${resource}?${query.toString()}`, `${resource}.xlsx`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export");
    }
  },
};
