"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Table, Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useCompany } from "@/context/CompanyContext";
import { reportService } from "@/services/reportService";
import { toast } from "@/lib/toast";

interface ItemReportRow {
  itemId: string;
  itemName: string;
  subGroupName?: string | null;
  packing: number;
  currentStockFreshPcs: number;
  currentStockExpiredPcs: number;
  currentStockDamagedPcs: number;
  purchasedQty: number;
  purchasedAmount: number;
  soldQty: number;
  soldAmount: number;
  purchaseReturnedQty: number;
  purchaseReturnedAmount: number;
  saleReturnedQty: number;
  saleReturnedAmount: number;
}

function money(n: number) {
  return `₹${(n || 0).toFixed(2)}`;
}

export default function ItemReportPage() {
  const { selectedCompanyId, isContextLoading } = useCompany();
  const router = useRouter();

  const [rows, setRows] = useState<ItemReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isContextLoading || !selectedCompanyId) return;
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, isContextLoading, page, search, dateFrom, dateTo]);

  async function load() {
    setIsLoading(true);
    try {
      const res: any = await reportService.getItemReport({
        companyId: selectedCompanyId,
        page,
        limit: 10,
        search,
        dateFrom,
        dateTo,
      });
      setRows(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (e: any) {
      toast.error(e.message || "Failed to load item report");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  const columns: Column<ItemReportRow>[] = [
    { key: "itemName", header: "Item Name", primary: true, render: (r) => r.itemName, className: "font-semibold text-gray-900" },
    { key: "subGroupName", header: "Sub Group", render: (r) => r.subGroupName || "-" },
    { key: "packing", header: "Packing", render: (r) => r.packing, className: "text-center" },
    { key: "purchased", header: "Purchased (Pcs)", render: (r) => r.purchasedQty, className: "text-right" },
    { key: "purchasedAmount", header: "Purchased Amt", render: (r) => money(r.purchasedAmount), className: "text-right" },
    { key: "sold", header: "Sold (Pcs)", render: (r) => r.soldQty, className: "text-right" },
    { key: "soldAmount", header: "Sold Amt", render: (r) => money(r.soldAmount), className: "text-right" },
    { key: "purchaseReturned", header: "Pur. Ret (Pcs)", render: (r) => r.purchaseReturnedQty, className: "text-right" },
    { key: "saleReturned", header: "Sale Ret (Pcs)", render: (r) => r.saleReturnedQty, className: "text-right" },
    {
      key: "stock",
      header: "Current Stock (Fresh/Exp/Dmg)",
      render: (r) => (
        <span className="whitespace-nowrap">
          <span className="text-green-700 font-semibold">{r.currentStockFreshPcs}</span>
          {" / "}
          <span className="text-amber-600">{r.currentStockExpiredPcs}</span>
          {" / "}
          <span className="text-red-600">{r.currentStockDamagedPcs}</span>
        </span>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/reports")} className="p-2 rounded-lg hover:bg-gray-100" title="Back to Reports">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Item Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Purchased / sold / returned quantity &amp; value per item, within the selected date range. Current stock is always as-of-now.
          </p>
        </div>
      </div>

      <div className="card p-4 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <SearchInput placeholder="Search by item name..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>
        <div className="w-full sm:w-40">
          <DatePicker label="From" value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder="From" />
        </div>
        <div className="w-full sm:w-40">
          <DatePicker label="To" value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder="To" minDate={dateFrom || undefined} />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reportService.exportReport("items", { companyId: selectedCompanyId, search, dateFrom, dateTo })}
          leftIcon={<FileSpreadsheet size={14} />}
        >
          Excel
        </Button>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyMessage="No items found"
          pagination={{ currentPage: page, totalPages, onPageChange: setPage }}
        />
      </div>
    </div>
  );
}
