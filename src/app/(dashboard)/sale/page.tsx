"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { exportListService } from "@/services/exportListService";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { saleService } from "@/services/saleService";
import { godownService } from "@/services/godownService";
import { itemService } from "@/services/itemService";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

interface SaleRecord {
  _id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId?: { _id: string; name: string } | string;
  items?: { itemId?: string; itemName: string; godownId?: string }[];
  totalItems?: number;
  totalCase?: number;
  totalPcs?: number;
  totalQty?: number;
  netAmount?: number;
  pendingAmount?: number;
}

export default function SaleListPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string }[]>([]);
  const [itemSubGroupMap, setItemSubGroupMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<SaleRecord | null>(null);

  useEffect(() => {
    if (!companyId) return;
    godownService.getGodowns(companyId, 1, 1000).then((res: any) => {
      setGodowns(res.data || res || []);
    });
    // Same item name can legitimately repeat across different Sub Groups (see
    // CLAUDE.md's Item model note) — Item Name's own column can't disambiguate
    // by itself, so Sub Group gets a column here too.
    itemService.getItems(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setItemSubGroupMap(
        new Map(list.map((i: any) => [i._id, (typeof i.itemSubGroupId === "object" ? i.itemSubGroupId?.name : "") || "-"]))
      );
    });
  }, [companyId]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!companyId) return;
    const timer = setTimeout(() => {
      loadRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [companyId, page, searchQuery, dateFrom, dateTo]);

  const loadRecords = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await saleService.getSales(companyId, page, 10, searchQuery, dateFrom, dateTo);
      setRecords(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await saleService.deleteSale(deletingRecord._id);
      loadRecords();
      toast.success("Deleted successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setIsDeleteOpen(false);
      setDeletingRecord(null);
    }
  };

  const handleExportExcel = () => {
    if (!companyId) return;
    exportListService.exportList("sales", companyId, { dateFrom, dateTo });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const columns = [
    { key: "invoiceNo", header: "Invoice No", accessor: (r: SaleRecord) => r.invoiceNo, primary: true },
    {
      key: "invoiceDate",
      header: "Date",
      accessor: (r: SaleRecord) => (r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-"),
    },
    {
      key: "customer",
      header: "Customer",
      accessor: (r: SaleRecord) => (typeof r.customerId === "object" ? r.customerId?.name : "") || "-",
    },
    {
      key: "itemName",
      header: "Item Name",
      accessor: (r: SaleRecord) => {
        const names = r.items?.map((i) => i.itemName) || [];
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    {
      key: "subGroup",
      header: "Sub Group",
      // Same "first + N more" pattern as Godown below — a single Sale can span
      // several items across several Sub Groups.
      accessor: (r: SaleRecord) => {
        const names = Array.from(
          new Set((r.items || []).map((i) => (i.itemId && itemSubGroupMap.get(i.itemId)) || "-").filter((n) => n !== "-"))
        );
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    {
      key: "godown",
      header: "Godown",
      // Godown is per-line now, not per-invoice — a single Sale can span several
      // godowns across its lines, so show the distinct set (same "first + N more"
      // pattern the Item Name column above already uses).
      accessor: (r: SaleRecord) => {
        const names = Array.from(new Set((r.items || []).map((l) => l.godownId).filter(Boolean)))
          .map((id) => godowns.find((g) => g._id === id)?.name)
          .filter(Boolean) as string[];
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    { key: "totalItems", header: "Items", accessor: (r: SaleRecord) => r.totalItems ?? 0 },
    { key: "totalCase", header: "Case", accessor: (r: SaleRecord) => r.totalCase ?? 0 },
    { key: "totalPcsLoose", header: "Loose", accessor: (r: SaleRecord) => r.totalPcs ?? 0 },
    { key: "totalQty", header: "Total Qty", accessor: (r: SaleRecord) => (r.totalQty ?? 0).toFixed(0) },
    {
      key: "netAmount",
      header: "Net Amount",
      accessor: (r: SaleRecord) => `₹${(r.netAmount ?? 0).toFixed(2)}`,
    },
    {
      key: "pendingAmount",
      header: "Pending",
      accessor: (r: SaleRecord) => `₹${(r.pendingAmount ?? 0).toFixed(2)}`,
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: SaleRecord) => (
        <div className="flex gap-2">
          <EditButton onClick={() => router.push(`/sale/edit/${r._id}`)} />
          <DeleteButton onClick={() => { setDeletingRecord(r); setIsDeleteOpen(true); }} />
        </div>
      ),
    },
  ];

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a company first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Sell (વેચાણ)</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage sale invoices</p>
        </div>
        <Button onClick={() => router.push("/sale/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
          Add Sale
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by invoice no..."
            className="!py-1.5 !text-xs"
          />
        </div>
        <div className="w-full sm:w-36">
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" className="!py-1.5 !text-xs" />
        </div>
        <div className="w-full sm:w-36">
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" minDate={dateFrom || undefined} className="!py-1.5 !text-xs" />
        </div>
        <Button variant="outline" size="sm" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={14} />} title="Export to Excel">
          Excel
        </Button>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No sales found"
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
          }}
        />
      </div>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingRecord(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Sale"
        message={`Delete invoice "${deletingRecord?.invoiceNo}"? This will reverse its stock effect. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
