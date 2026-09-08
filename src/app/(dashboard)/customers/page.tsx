"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { customerService } from "@/services/customerService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CustomerRecord {
  id?: string;
  _id: string;
  name: string;
  customerGroupId?: { _id: string; name: string } | null;
  customerType?: string;
  gstNo?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  zoneNo?: string;
  isActive: boolean;
  creditLimit?: number;
  openingBalance?: number;
}

export default function CustomersPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<CustomerRecord | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId) return;
    const timer = setTimeout(() => {
      loadRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [companyId, page, searchQuery, customerTypeFilter]);

  const loadRecords = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await customerService.getCustomers(companyId, page, 10, searchQuery, customerTypeFilter);
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

  const toggleActive = async (r: CustomerRecord) => {
    if (togglingIds.has(r._id)) return;
    setTogglingIds((prev) => new Set(prev).add(r._id));
    const nextActive = !r.isActive;
    try {
      await customerService.updateCustomer(r._id, { isActive: nextActive });
      setRecords((prev) => prev.map((it) => (it._id === r._id ? { ...it, isActive: nextActive } : it)));
      toast.success(`Customer marked ${nextActive ? "Active" : "Inactive"}`);
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
      await customerService.deleteCustomer(deletingRecord._id);
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

  const handleTypeFilterChange = (val: string) => {
    setCustomerTypeFilter(val);
    setPage(1);
  };

  const columns = [
    { key: "name", header: "Name", accessor: (r: CustomerRecord) => r.name, primary: true },
    { key: "group", header: "Group", accessor: (r: CustomerRecord) => r.customerGroupId?.name || "-" },
    { key: "gst", header: "GST", accessor: (r: CustomerRecord) => r.gstNo || "-" },
    { key: "phone", header: "Phone", accessor: (r: CustomerRecord) => r.phone || "-" },
    { key: "city", header: "City", accessor: (r: CustomerRecord) => r.city || "-" },
    {
      key: "status",
      header: "Status",
      accessor: (r: CustomerRecord) => (
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
      accessor: (r: CustomerRecord) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <EditButton onClick={() => router.push(`/customers/edit/${r._id}`)} />
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
          <h1 className="text-lg font-bold text-gray-900">Customers</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage customer accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadRecords} className="px-2.5 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => router.push("/customers/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary">
            Add Customer
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search customers..."
          />
        </div>
        <div className="w-full md:w-56">
          <Select
            options={[
              { value: "", label: "All Customer Types" },
              { value: "Retailer", label: "Retailer" },
              { value: "Wholesaler", label: "Wholesaler" },
              { value: "Distributor", label: "Distributor" },
            ]}
            value={customerTypeFilter}
            onChange={handleTypeFilterChange}
            placeholder="All Customer Types"
            searchable={false}
          />
        </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No customers found"
          onRowClick={(r: CustomerRecord) => router.push(`/customers/sales/${r._id}`)}
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
        title="Delete Customer"
        message={`Delete "${deletingRecord?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
