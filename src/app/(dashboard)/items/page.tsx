"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus, Search, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportListService } from "@/services/exportListService";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { itemService } from "@/services/itemService";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

interface ItemRecord {
  id?: string;
  _id: string;
  itemName: string;
  codeBarCode?: string;
  hsnCode?: string;
  uqcUnit?: string;
  mrp?: number;
  purchaseRate?: number;
  sellingRate?: number;
  lastCostRate?: number;
  packing?: number;
  purchaseType?: string;
  purchaseQty?: number;
  itemSubGroupId?: { _id: string; name: string } | string;
  isActive: boolean;
}

export default function ItemsPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ItemRecord | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

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
      const data = await itemService.getItems(companyId, page, 10, searchQuery);
      if (data.pagination) {
        setRecords((data.data || []).map((i: any) => ({ ...i, id: i._id })));
        setTotalPages(data.pagination.totalPages || 1);
      } else {
        const list = Array.isArray(data) ? data : data.data || [];
        setRecords(list.map((i: any) => ({ ...i, id: i._id })));
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
} finally {
      setLoading(false);
    }
  };

  const toggleActive = async (r: ItemRecord) => {
    if (togglingIds.has(r._id)) return; // a request for this row is already in flight
    setTogglingIds((prev) => new Set(prev).add(r._id));
    const nextActive = !r.isActive;
    try {
      await itemService.updateItem(r._id, { isActive: nextActive });
      setRecords((prev) => prev.map((it) => (it._id === r._id ? { ...it, isActive: nextActive } : it)));
      toast.success(`Item marked ${nextActive ? "Active" : "Inactive"}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update status");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(r._id);
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await itemService.deleteItem(deletingRecord._id);
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
    {
      key: "subGroup",
      header: "Sub Group",
      accessor: (r: ItemRecord) => (typeof r.itemSubGroupId === "object" ? r.itemSubGroupId?.name : "") || "-",
    },
    { key: "name", header: "Name", accessor: (r: ItemRecord) => r.itemName, primary: true },
    { key: "code", header: "Code", accessor: (r: ItemRecord) => r.codeBarCode || "-" },
    { key: "hsn", header: "HSN", accessor: (r: ItemRecord) => r.hsnCode || "-" },
    { key: "uqc", header: "UQC", accessor: (r: ItemRecord) => r.uqcUnit || "-" },
    { key: "packing", header: "Packing", accessor: (r: ItemRecord) => r.packing || "1" },
    { key: "purchaseType", header: "Pur. Type", accessor: (r: ItemRecord) => r.purchaseType || "-" },
    { key: "purchaseRatePc", header: "Pur. Rate (1 Pc)", accessor: (r: ItemRecord) => {
        const pRate = r.purchaseRate || 0;
        const pack = r.packing || 1;
        const pQty = r.purchaseQty || 1;
        const totalPcs = r.purchaseType === "Carton" ? pQty * pack : pQty;
        return totalPcs > 0 ? `₹${(pRate / totalPcs).toFixed(4)}` : "₹0.0000";
    } },
    { key: "mrp", header: "MRP", accessor: (r: ItemRecord) => r.mrp != null ? `₹${r.mrp}` : "-" },
    { key: "netCostSelf", header: "Net Cost - Self", accessor: (r: ItemRecord) => r.lastCostRate != null ? `₹${r.lastCostRate.toFixed(2)}` : "-" },
    {
      key: "status",
      header: "Status",
      accessor: (r: ItemRecord) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleActive(r); }}
          disabled={togglingIds.has(r._id)}
          title="Click to toggle status"
          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            r.isActive
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: ItemRecord) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <EditButton onClick={() => router.push(`/items/edit/${r._id}`)} />
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
          <h1 className="text-lg font-bold text-gray-900">Items / M.R.Ps.</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage items and pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadRecords} className="px-2.5 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportListService.exportList("items", companyId!)} leftIcon={<FileSpreadsheet size={14} />} title="Export to Excel">
            Excel
          </Button>
          <Button onClick={() => router.push("/items/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
            Add Item
          </Button>
        </div>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search items..."
      />

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No items found"
          onRowClick={(r) => router.push(`/items/stock/${r._id}`)}
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
        title="Delete Item"
        message={`Delete "${deletingRecord?.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
