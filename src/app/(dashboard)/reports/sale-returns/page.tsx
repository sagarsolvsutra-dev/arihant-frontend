"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { Table, Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useCompany } from "@/context/CompanyContext";
import { reportService } from "@/services/reportService";
import { itemService } from "@/services/itemService";
import { godownService } from "@/services/godownService";
import { customerService } from "@/services/customerService";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";

interface SaleReturnLine {
  recordId: string;
  returnNo: string;
  returnDate: string;
  itemName: string;
  subGroupName?: string | null;
  godownId: string;
  customerName?: string;
  condition: string;
  caseQty: number;
  pcsQty: number;
  rate: number;
  taxableValue: number;
  gstAmount: number;
  netValue: number;
}

function money(n: number) {
  return `₹${(n || 0).toFixed(2)}`;
}

const CONDITION_PILL: Record<string, string> = {
  Fresh: "bg-green-100 text-green-700",
  Expired: "bg-amber-100 text-amber-700",
  Damaged: "bg-red-100 text-red-700",
};

const CONDITIONS = [
  { value: "", label: "All Conditions" },
  { value: "Fresh", label: "Fresh" },
  { value: "Expired", label: "Expired" },
  { value: "Damaged", label: "Damaged" },
];

export default function SaleReturnReportPage() {
  const { selectedCompanyId, isContextLoading } = useCompany();
  const router = useRouter();

  const [rows, setRows] = useState<SaleReturnLine[]>([]);
  const [totals, setTotals] = useState({ taxableValue: 0, gstAmount: 0, netValue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemId, setItemId] = useState("");
  const [godownId, setGodownId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [condition, setCondition] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [items, setItems] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    itemService.getItems(selectedCompanyId, 1, 1000).then((res: any) => setItems(res.data || res || []));
    godownService.getGodowns(selectedCompanyId, 1, 1000).then((res: any) => setGodowns(res.data || res || []));
    customerService.getCustomers(selectedCompanyId, 1, 1000).then((res: any) => setCustomers(res.data || res || []));
  }, [selectedCompanyId]);

  useEffect(() => {
    if (isContextLoading || !selectedCompanyId) return;
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, isContextLoading, page, search, dateFrom, dateTo, itemId, godownId, customerId, condition]);

  async function load() {
    setIsLoading(true);
    try {
      const res: any = await reportService.getSaleReturnReport({
        companyId: selectedCompanyId,
        page,
        limit: 20,
        search,
        dateFrom,
        dateTo,
        itemId,
        godownId,
        customerId,
        condition,
      });
      setRows(res.data || []);
      setTotals(res.totals || { taxableValue: 0, gstAmount: 0, netValue: 0 });
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (e: any) {
      toast.error(e.message || "Failed to load sale return report");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  const godownName = (id: string) => godowns.find((g) => g._id === id)?.name || "-";

  const columns: Column<SaleReturnLine>[] = [
    { key: "returnNo", header: "Return No", primary: true, render: (r) => (
        <button className="text-blue-600 hover:underline" onClick={() => router.push(`/sale-return/edit/${r.recordId}`)}>
          {r.returnNo}
        </button>
      ) },
    { key: "returnDate", header: "Date", render: (r) => formatDate(r.returnDate) },
    { key: "customerName", header: "Customer", render: (r) => r.customerName || "-" },
    { key: "itemName", header: "Item", render: (r) => r.itemName },
    { key: "subGroupName", header: "Sub Group", render: (r) => r.subGroupName || "-" },
    { key: "godown", header: "Godown", render: (r) => godownName(r.godownId) },
    { key: "condition", header: "Condition", render: (r) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONDITION_PILL[r.condition] || "bg-gray-100 text-gray-700"}`}>{r.condition}</span>
      ) },
    { key: "caseQty", header: "Case", render: (r) => r.caseQty, className: "text-right" },
    { key: "pcsQty", header: "Pcs", render: (r) => r.pcsQty, className: "text-right" },
    { key: "netValue", header: "Net Value", render: (r) => money(r.netValue), className: "text-right font-semibold" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/reports")} className="p-2 rounded-lg hover:bg-gray-100" title="Back to Reports">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Sale Return Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">Line-by-line sale return detail, filterable by date, item, godown, customer &amp; condition.</p>
        </div>
      </div>

      <div className="card p-4 flex flex-col xl:flex-row xl:items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <SearchInput placeholder="Search by return no..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
        </div>
        <div className="w-full xl:w-44">
          <Select label="Customer" placeholder="All Customers" options={[{ value: "", label: "All Customers" }, ...customers.map((c) => ({ value: c._id, label: c.name }))]} value={customerId} onChange={(v) => { setCustomerId(v); setPage(1); }} />
        </div>
        <div className="w-full xl:w-40">
          <Select label="Item" placeholder="All Items" options={[{ value: "", label: "All Items" }, ...items.map((i) => ({ value: i._id, label: i.itemName }))]} value={itemId} onChange={(v) => { setItemId(v); setPage(1); }} />
        </div>
        <div className="w-full xl:w-36">
          <Select label="Godown" placeholder="All Godowns" options={[{ value: "", label: "All Godowns" }, ...godowns.map((g) => ({ value: g._id, label: g.name }))]} value={godownId} onChange={(v) => { setGodownId(v); setPage(1); }} />
        </div>
        <div className="w-full xl:w-36">
          <Select label="Condition" searchable={false} placeholder="All Conditions" options={CONDITIONS} value={condition} onChange={(v) => { setCondition(v); setPage(1); }} />
        </div>
        <div className="w-full xl:w-36">
          <DatePicker label="From" value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder="From" />
        </div>
        <div className="w-full xl:w-36">
          <DatePicker label="To" value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder="To" minDate={dateFrom || undefined} />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reportService.exportReport("sale-returns", { companyId: selectedCompanyId, search, dateFrom, dateTo, itemId, godownId, customerId, condition })}
          leftIcon={<FileSpreadsheet size={14} />}
        >
          Excel
        </Button>
      </div>

      <div className="card p-4 flex flex-wrap gap-6">
        <div>
          <div className="text-xs text-gray-500">Taxable Value</div>
          <div className="text-base font-bold text-gray-900">{money(totals.taxableValue)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">GST Amount</div>
          <div className="text-base font-bold text-gray-900">{money(totals.gstAmount)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Net Value</div>
          <div className="text-base font-bold text-gray-900">{money(totals.netValue)}</div>
        </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyMessage="No sale return lines found"
          pagination={{ currentPage: page, totalPages, onPageChange: setPage }}
        />
      </div>
    </div>
  );
}
