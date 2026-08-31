"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { purchaseService } from "@/services/purchaseService";
import { godownService } from "@/services/godownService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PurchaseRecord {
  _id: string;
  invoiceNo: string;
  invoiceDate: string;
  godownId?: string;
  items?: { itemName: string }[];
  totalItems?: number;
  totalCase?: number;
  totalPcs?: number;
  totalQty?: number;
  netAmount?: number;
}

export default function PurchaseListPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<PurchaseRecord | null>(null);

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
      const data = await purchaseService.getPurchases(companyId, page, 10, searchQuery);
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
      await purchaseService.deletePurchase(deletingRecord._id);
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
    { key: "invoiceNo", header: "Invoice No", accessor: (r: PurchaseRecord) => r.invoiceNo, primary: true },
    {
      key: "invoiceDate",
      header: "Date",
      accessor: (r: PurchaseRecord) => (r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-"),
    },
    {
      key: "itemName",
      header: "Item Name",
      accessor: (r: PurchaseRecord) => {
        const names = r.items?.map((i) => i.itemName) || [];
        if (names.length === 0) return "-";
        return names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} more`;
      },
    },
    {
      key: "godown",
      header: "Godown",
      accessor: (r: PurchaseRecord) => godowns.find((g) => g._id === r.godownId)?.name || "-",
    },
    { key: "totalItems", header: "Items", accessor: (r: PurchaseRecord) => r.totalItems ?? 0 },
    { key: "totalCase", header: "Case", accessor: (r: PurchaseRecord) => r.totalCase ?? 0 },
    { key: "totalPcsLoose", header: "Loose", accessor: (r: PurchaseRecord) => r.totalPcs ?? 0 },
    { key: "totalQty", header: "Total Qty", accessor: (r: PurchaseRecord) => (r.totalQty ?? 0).toFixed(0) },
    {
      key: "netAmount",
      header: "Net Amount",
      accessor: (r: PurchaseRecord) => `₹${(r.netAmount ?? 0).toFixed(2)}`,
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: PurchaseRecord) => (
        <div className="flex gap-2">
          <EditButton onClick={() => router.push(`/purchase/edit/${r._id}`)} />
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
          <h1 className="text-xl font-bold text-gray-900">Purchase</h1>
          <p className="text-sm text-gray-500 mt-1">Manage purchase invoices</p>
        </div>
        <Button onClick={() => router.push("/purchase/add")} leftIcon={<Plus size={16} />} className="btn-primary">
          Add Purchase
        </Button>
      </div>

      <div className="card p-4">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by invoice no..."
        />
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No purchases found"
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
        title="Delete Purchase"
        message={`Delete invoice "${deletingRecord?.invoiceNo}"? This will reverse its stock effect. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
