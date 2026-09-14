"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus, Search, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { exportListService } from "@/services/exportListService";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { salesmanService } from "@/services/salesmanService";
import { toast } from "@/lib/toast";
import { canAction } from "@/lib/permissions";

interface SalesmanRecord {
  id?: string;
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export default function SalesmenPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [records, setRecords] = useState<SalesmanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesmanRecord | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<SalesmanRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [salesmanActive, setSalesmanActive] = useState(true);

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
      const data = await salesmanService.getSalesmen(companyId, page, 10, searchQuery);
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

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setSalesmanActive(true);
    setEditingRecord(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (record: SalesmanRecord) => {
    setEditingRecord(record);
    setName(record.name || "");
    setPhone(record.phone || "");
    setEmail(record.email || "");
    setSalesmanActive(record.isActive ?? true);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !name.trim()) return;
    if (phone.trim() && phone.trim().length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Invalid email format");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        companyId,
        name: name.trim(),
        isActive: salesmanActive,
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();

      if (editingRecord?._id) {
        await salesmanService.updateSalesman(editingRecord._id, payload);
      } else {
        await salesmanService.createSalesman(payload);
      }
      setFormOpen(false);
      resetForm();
      loadRecords();
      toast.success("Saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await salesmanService.deleteSalesman(deletingRecord._id);
      loadRecords();
      toast.success("Deleted successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete");
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
    { key: "name", header: "Name", accessor: (r: SalesmanRecord) => r.name },
    { key: "phone", header: "Phone", accessor: (r: SalesmanRecord) => r.phone || "-" },
    { key: "email", header: "Email", accessor: (r: SalesmanRecord) => r.email || "-" },
    {
      key: "status",
      header: "Status",
      accessor: (r: SalesmanRecord) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${r.isActive ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-500"
            }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: SalesmanRecord) => (
        <div className="flex gap-2">
          {canAction("salesmen", "edit") && <EditButton onClick={() => openEdit(r)} />}
          {canAction("salesmen", "delete") && <DeleteButton onClick={() => { setDeletingRecord(r); setIsDeleteOpen(true); }} />}
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
          <h1 className="text-lg font-bold text-gray-900">Salesmen</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage salesmen</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadRecords} className="px-2.5 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportListService.exportList("salesmen", companyId!)} leftIcon={<FileSpreadsheet size={14} />} title="Export to Excel">
            Excel
          </Button>
          {canAction("salesmen", "create") && (
            <Button onClick={openAdd} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
              Add Salesman
            </Button>
          )}
        </div>
      </div>

      <SearchInput
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search salesmen..."
      />

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No salesmen found"
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
          }}
        />
      </div>

      <Dialog
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        title={editingRecord ? "Edit Salesman" : "Add Salesman"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={salesmanActive}
              onChange={(e) => setSalesmanActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingRecord ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingRecord(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Salesman"
        message={`Delete "${deletingRecord?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
