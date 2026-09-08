"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { purchaseReturnService } from "@/services/purchaseReturnService";
import { godownService } from "@/services/godownService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PurchaseReturnRecord {
  _id: string;
  returnNo: string;
  returnDate: string;
  supplierId?: { _id: string; name: string } | string;
  originalInvoiceNo?: string;
  items?: { itemName: string; godownId?: string }[];
  totalItems?: number;
  totalCase?: number;
  totalPcs?: number;
  totalQty?: number;
  netAmount?: number;
  pendingAmount?: number;
}

export default function PurchaseReturnListPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<PurchaseReturnRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PurchaseReturnRecord | null>(null);

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
      const data = await purchaseReturnService.getPurchaseReturns(companyId, page, 10, searchQuery);
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
      await purchaseReturnService.deletePurchaseReturn(deletingRecord._id);
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

  const columns = [
    { key: "returnNo", header: "Return No", accessor: (r: PurchaseReturnRecord) => r.returnNo, primary: true },
    {
      key: "returnDate",
      header: "Date",
      accessor: (r: PurchaseReturnRecord) => (r.returnDate ? new Date(r.returnDate).toLocaleDateString("en-IN") : "-"),
    },
    {
      key: "supplier",
      header: "Supplier",
      accessor: (r: PurchaseReturnRecord) => (typeof r.supplierId === "object" ? r.supplierId?.name : "-") || "-",
    },
    { key: "originalInvoiceNo", header: "Orig. Invoice", accessor: (r: PurchaseReturnRecord) => r.originalInvoiceNo || "-" },
    {
      key: "itemName",
      header: "Item Name",
      accessor: (r: PurchaseReturnRecord) => {
        const names = r.items?.map((i) => i.itemName) || [];
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    {
      key: "godown",
      header: "Godown",
      // Godown is per-line now, not per-invoice — a single return can span several
      // godowns across its lines, so show the distinct set (same "first + N more"
      // pattern the Item Name column above already uses).
      accessor: (r: PurchaseReturnRecord) => {
        const names = Array.from(new Set((r.items || []).map((l) => l.godownId).filter(Boolean)))
          .map((id) => godowns.find((g) => g._id === id)?.name)
          .filter(Boolean) as string[];
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    { key: "totalCase", header: "Case", accessor: (r: PurchaseReturnRecord) => r.totalCase ?? 0 },
    { key: "totalPcsLoose", header: "Loose", accessor: (r: PurchaseReturnRecord) => r.totalPcs ?? 0 },
    {
      key: "netAmount",
      header: "Net Amount",
      accessor: (r: PurchaseReturnRecord) => `₹${(r.netAmount ?? 0).toFixed(2)}`,
    },
    {
      key: "pendingAmount",
      header: "Pending",
      accessor: (r: PurchaseReturnRecord) => `₹${(r.pendingAmount ?? 0).toFixed(2)}`,
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: PurchaseReturnRecord) => (
        <div className="flex gap-2">
          <EditButton onClick={() => router.push(`/purchase-return/edit/${r._id}`)} />
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
          <h1 className="text-xl font-bold text-gray-900">Purchase Return</h1>
          <p className="text-sm text-gray-500 mt-1">Manage purchase return invoices</p>
        </div>
        <Button onClick={() => router.push("/purchase-return/add")} leftIcon={<Plus size={16} />} className="btn-primary">
          Add Purchase Return
        </Button>
      </div>

      <div className="card p-4">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by return no..."
        />
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No purchase returns found"
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
        title="Delete Purchase Return"
        message={`Delete return "${deletingRecord?.returnNo}"? This will reverse its stock effect. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
