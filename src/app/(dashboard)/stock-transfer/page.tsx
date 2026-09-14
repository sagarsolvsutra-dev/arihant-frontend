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
import { stockTransferService } from "@/services/stockTransferService";
import { godownService } from "@/services/godownService";
import { itemService } from "@/services/itemService";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";
import { canAction } from "@/lib/permissions";

interface StockTransferRecord {
  _id: string;
  transferNo: string;
  transferDate: string;
  fromGodownId?: { _id: string; name: string } | string;
  toGodownId?: { _id: string; name: string } | string;
  items?: { itemId?: string; itemName: string }[];
  totalItems?: number;
  totalCase?: number;
  totalPcs?: number;
  totalQty?: number;
}

export default function StockTransferListPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<StockTransferRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string }[]>([]);
  const [itemSubGroupMap, setItemSubGroupMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<StockTransferRecord | null>(null);

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
      const data = await stockTransferService.getStockTransfers(companyId, page, 10, searchQuery, dateFrom, dateTo);
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
      await stockTransferService.deleteStockTransfer(deletingRecord._id);
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
    exportListService.exportList("stock-transfers", companyId, { dateFrom, dateTo });
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const godownName = (v: any) => {
    if (!v) return "-";
    if (typeof v === "object") return v.name || "-";
    return godowns.find((g) => g._id === v)?.name || "-";
  };

  const columns = [
    { key: "transferNo", header: "Transfer No", accessor: (r: StockTransferRecord) => r.transferNo, primary: true },
    {
      key: "transferDate",
      header: "Date",
      accessor: (r: StockTransferRecord) => formatDate(r.transferDate),
    },
    { key: "fromGodown", header: "From Godown", accessor: (r: StockTransferRecord) => godownName(r.fromGodownId) },
    { key: "toGodown", header: "To Godown", accessor: (r: StockTransferRecord) => godownName(r.toGodownId) },
    {
      key: "itemName",
      header: "Item Name",
      accessor: (r: StockTransferRecord) => {
        const names = r.items?.map((i) => i.itemName) || [];
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    {
      key: "subGroup",
      header: "Sub Group",
      // Same "first + N more" pattern as Item Name above — a single transfer can
      // span several items across several Sub Groups.
      accessor: (r: StockTransferRecord) => {
        const names = Array.from(
          new Set((r.items || []).map((i) => (i.itemId && itemSubGroupMap.get(i.itemId)) || "-").filter((n) => n !== "-"))
        );
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    { key: "totalItems", header: "Items", accessor: (r: StockTransferRecord) => r.totalItems ?? 0 },
    { key: "totalCase", header: "Case", accessor: (r: StockTransferRecord) => r.totalCase ?? 0 },
    { key: "totalPcsLoose", header: "Loose", accessor: (r: StockTransferRecord) => r.totalPcs ?? 0 },
    { key: "totalQty", header: "Total Qty", accessor: (r: StockTransferRecord) => (r.totalQty ?? 0).toFixed(0) },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: StockTransferRecord) => (
        <div className="flex gap-2">
          {canAction("stockTransfer", "edit") && <EditButton onClick={() => router.push(`/stock-transfer/edit/${r._id}`)} />}
          {canAction("stockTransfer", "delete") && <DeleteButton onClick={() => { setDeletingRecord(r); setIsDeleteOpen(true); }} />}
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
          <h1 className="text-lg font-bold text-gray-900">Stock Transfer</h1>
          <p className="text-xs text-gray-500 mt-0.5">Move stock directly from one godown to another</p>
        </div>
        {canAction("stockTransfer", "create") && (
          <Button onClick={() => router.push("/stock-transfer/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
            Add Stock Transfer
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by transfer no..."
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
          emptyMessage="No stock transfers found"
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
        title="Delete Stock Transfer"
        message={`Delete transfer "${deletingRecord?.transferNo}"? This will reverse its stock effect (moving quantity back from To Godown to From Godown). This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
