"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Table, Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { LedgerButton } from "@/components/ui/ActionButtons";
import { useCompany } from "@/context/CompanyContext";
import { reportService } from "@/services/reportService";
import { toast } from "@/lib/toast";

interface CustomerReportRow {
  customerId: string;
  name: string;
  phone: string;
  city: string;
  saleCount: number;
  saleAmount: number;
  salePendingAmount: number;
  saleReturnCount: number;
  saleReturnAmount: number;
  netPendingAmount: number;
}

function money(n: number) {
  return `₹${(n || 0).toFixed(2)}`;
}

export default function CustomerReportPage() {
  const { selectedCompanyId, isContextLoading } = useCompany();
  const router = useRouter();

  const [rows, setRows] = useState<CustomerReportRow[]>([]);
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
      const res: any = await reportService.getCustomerReport({
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
      toast.error(e.message || "Failed to load customer report");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  const columns: Column<CustomerReportRow>[] = [
    { key: "name", header: "Customer", primary: true, render: (r) => r.name, className: "font-semibold text-gray-900" },
    { key: "city", header: "City", render: (r) => r.city || "-" },
    { key: "saleCount", header: "Sales", render: (r) => r.saleCount, className: "text-right" },
    { key: "saleAmount", header: "Sale Amt", render: (r) => money(r.saleAmount), className: "text-right" },
    { key: "saleReturnCount", header: "Returns", render: (r) => r.saleReturnCount, className: "text-right" },
    { key: "saleReturnAmount", header: "Return Amt", render: (r) => money(r.saleReturnAmount), className: "text-right" },
    {
      key: "netPendingAmount",
      header: "Net Pending",
      render: (r) => (
        <span className={r.netPendingAmount < 0 ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
          {r.netPendingAmount < 0 ? `Advance ${money(Math.abs(r.netPendingAmount))}` : money(r.netPendingAmount)}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "actions",
      header: "Ledger",
      render: (r) => (
        <div className="flex justify-center">
          <LedgerButton onClick={() => router.push(`/customers/ledger/${r.customerId}`)} />
        </div>
      ),
      className: "text-center",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/reports")} className="p-2 rounded-lg hover:bg-gray-100" title="Back to Reports">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Customer Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">Sale, sale return &amp; outstanding totals per customer, within the selected date range.</p>
        </div>
      </div>

      <div className="card p-4 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <SearchInput placeholder="Search by name, phone, city..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
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
          onClick={() => reportService.exportReport("customers", { companyId: selectedCompanyId, search, dateFrom, dateTo })}
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
          emptyMessage="No customers found"
          pagination={{ currentPage: page, totalPages, onPageChange: setPage }}
        />
      </div>
    </div>
  );
}
