"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { supplierService } from "@/services/supplierService";
import { useRouter } from "next/navigation";

interface SupplierRecord {
  id?: string;
  _id: string;
  name: string;
  gstNo?: string;
  phone?: string;
  phone2?: string;
  mobile?: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isActive: boolean;
  balanceMethod?: string;
  creditDays?: number;
}

export default function SuppliersPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<SupplierRecord | null>(null);

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
      const data = await supplierService.getSuppliers(companyId, page, 10, searchQuery);
      if (data.pagination) {
        setRecords((data.data || []).map((i: any) => ({ ...i, id: i._id })));
        setTotalPages(data.pagination.totalPages || 1);
      } else {
        const list = Array.isArray(data) ? data : data.data || [];
        setRecords(list.map((i: any) => ({ ...i, id: i._id })));
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await supplierService.deleteSupplier(deletingRecord._id);
      loadRecords();
    } catch (err) {
      console.error(err);
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
    { key: "name", header: "Name", accessor: (r: SupplierRecord) => r.name },
    { key: "gst", header: "GST", accessor: (r: SupplierRecord) => r.gstNo || "-" },
    { key: "phone", header: "Phone", accessor: (r: SupplierRecord) => r.phone || "-" },
    { key: "city", header: "City", accessor: (r: SupplierRecord) => r.city || "-" },
    {
      key: "status",
      header: "Status",
      accessor: (r: SupplierRecord) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            r.isActive ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-500"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: SupplierRecord) => (
        <div className="flex gap-2">
          <EditButton onClick={() => router.push(`/suppliers/edit/${r._id}`)} />
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
          <h1 className="text-xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier accounts</p>
        </div>
        <Button onClick={() => router.push("/suppliers/add")} leftIcon={<Plus size={16} />} className="btn-primary">
          Add Supplier
        </Button>
      </div>

      <div className="card p-4">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search suppliers..."
        />
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No suppliers found"
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
        title="Delete Supplier"
        message={`Delete "${deletingRecord?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
