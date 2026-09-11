"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportListService } from "@/services/exportListService";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { schemeService } from "@/services/schemeService";
import { toast } from "@/lib/toast";

interface SchemeRecord {
  id?: string;
  _id: string;
  customerId?: { _id: string; name: string };
  lessPercentage?: number;
  cdPercentage?: number;
}

export default function SchemesPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [records, setRecords] = useState<SchemeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<SchemeRecord | null>(null);

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
      const data = await schemeService.getSchemes(companyId, page, 10, searchQuery);
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

  const router = useRouter();

  const openAdd = () => {
    router.push("/schemes/add");
  };

  const openEdit = (record: SchemeRecord) => {
    router.push(`/schemes/edit/${record._id}`);
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await schemeService.deleteScheme(deletingRecord._id);
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
    { key: "customer", header: "Customer Name", accessor: (r: SchemeRecord) => r.customerId?.name || "-" },
    { key: "lessPercentage", header: "Less %age", accessor: (r: SchemeRecord) => r.lessPercentage != null ? r.lessPercentage.toFixed(2) : "0.00" },
    { key: "cdPercentage", header: "C.D. %age", accessor: (r: SchemeRecord) => r.cdPercentage != null ? r.cdPercentage.toFixed(2) : "0.00" },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: SchemeRecord) => (
        <div className="flex gap-2">
          <EditButton onClick={() => openEdit(r)} />
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
          <h1 className="text-lg font-bold text-gray-900">Schemes</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage schemes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadRecords} className="px-2.5 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportListService.exportList("schemes", companyId!)} leftIcon={<FileSpreadsheet size={14} />} title="Export to Excel">
            Excel
          </Button>
          <Button onClick={openAdd} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
            Add Scheme
          </Button>
        </div>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search schemes..."
      />

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No schemes found"
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
        title="Delete Scheme"
        message={`Delete this scheme? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
