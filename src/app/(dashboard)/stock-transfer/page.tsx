"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { stockTransferService } from "@/services/stockTransferService";
import { godownService } from "@/services/godownService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StockTransferRecord {
  _id: string;
  transferNo: string;
  transferDate: string;
  fromGodownId?: { _id: string; name: string } | string;
  toGodownId?: { _id: string; name: string } | string;
  items?: { itemName: string }[];
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
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<StockTransferRecord | null>(null);

  useEffect(() => {
    if (!companyId) return;
    godownService.getGodowns(companyId, 1, 1000).then((res: any) => {
      setGodowns(res.data || res || []);
    });
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const timer = setTimeout(() => {
      loadRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [companyId, page, searchQuery]);

  const loadRecords = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await stockTransferService.getStockTransfers(companyId, page, 10, searchQuery);
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
      accessor: (r: StockTransferRecord) => (r.transferDate ? new Date(r.transferDate).toLocaleDateString("en-IN") : "-"),
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
    { key: "totalItems", header: "Items", accessor: (r: StockTransferRecord) => r.totalItems ?? 0 },
    { key: "totalCase", header: "Case", accessor: (r: StockTransferRecord) => r.totalCase ?? 0 },
    { key: "totalPcsLoose", header: "Loose", accessor: (r: StockTransferRecord) => r.totalPcs ?? 0 },
    { key: "totalQty", header: "Total Qty", accessor: (r: StockTransferRecord) => (r.totalQty ?? 0).toFixed(0) },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: StockTransferRecord) => (
        <div className="flex gap-2">
          <EditButton onClick={() => router.push(`/stock-transfer/edit/${r._id}`)} />
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
          <h1 className="text-lg font-bold text-gray-900">Stock Transfer</h1>
          <p className="text-xs text-gray-500 mt-0.5">Move stock directly from one godown to another</p>
        </div>
        <Button onClick={() => router.push("/stock-transfer/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary">
          Add Stock Transfer
        </Button>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search by transfer no..."
      />

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
