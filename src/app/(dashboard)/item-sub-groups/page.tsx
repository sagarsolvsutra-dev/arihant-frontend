"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, AlertCircle } from "lucide-react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { supplierService } from "@/services/supplierService";
import { itemNameService } from "@/services/itemNameService";
import { itemSubGroupService } from "@/services/itemSubGroupService";

interface ItemSubGroup {
  _id: string;
  id?: string;
  name: string;
  supplierId?: string;
  itemNameId?: any;
  isActive: boolean;
}

export default function ItemSubGroupsPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [records, setRecords] = useState<ItemSubGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ItemSubGroup | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ItemSubGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [itemNameId, setItemNameId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [suppliers, setSuppliers] = useState<{ _id: string; name: string; isActive?: boolean }[]>([]);
  const [itemNames, setItemNames] = useState<{ _id: string; name: string; isActive?: boolean }[]>([]);

  // Load suppliers once when company changes
  useEffect(() => {
    if (companyId) {
      loadSuppliers();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId && supplierId) {
      loadItemNames(supplierId);
    } else {
      setItemNames([]);
    }
  }, [companyId, supplierId]);

  // Load records with debounce for search and pagination
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
      const data = await itemSubGroupService.getItemSubGroups(companyId, page, 10, searchQuery);
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

  const loadSuppliers = async () => {
    if (!companyId) return;
    try {
      const data = await supplierService.getSuppliers(companyId, 1, 1000);
      const list = Array.isArray(data) ? data : data.data || [];
      setSuppliers(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadItemNames = async (supplierId: string) => {
    if (!companyId) return;
    try {
      const data = await itemNameService.getItemNames(companyId, "", supplierId);
      const list = Array.isArray(data) ? data : data.data || [];
      setItemNames(list);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setName("");
    setSupplierId("");
    setItemNameId("");
    setIsActive(true);
    setEditingRecord(null);
    setErrors({});
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (record: ItemSubGroup) => {
    resetForm();
    if (record.supplierId) {
      loadItemNames(record.supplierId);
    }
    setEditingRecord(record);
    setName(record.name || "");
    setSupplierId(record.supplierId || "");
    setItemNameId(record.itemNameId?._id || record.itemNameId || "");
    setIsActive(record.isActive ?? true);
    setFormOpen(true);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!supplierId) newErrors.supplierId = "Supplier is required";
    if (!itemNameId) newErrors.itemNameId = "Item Name is required";
    if (!name.trim()) newErrors.name = "Sub Group Name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    
    if (!validate()) return;
    
    setSaving(true);
    try {
      const payload = {
        companyId,
        name: name.trim(),
        supplierId: supplierId || undefined,
        itemNameId: itemNameId || undefined,
        isActive,
      };
      if (editingRecord?._id) {
        await itemSubGroupService.updateItemSubGroup(editingRecord._id, payload);
      } else {
        await itemSubGroupService.createItemSubGroup(payload);
      }
      setFormOpen(false);
      resetForm();
      loadRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await itemSubGroupService.deleteItemSubGroup(deletingRecord._id);
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
    setPage(1); // Reset to page 1 on new search
  };

  const columns = [
    { key: "name", header: "Name", accessor: (r: ItemSubGroup) => r.name },
    {
      key: "supplier",
      header: "Supplier",
      accessor: (r: ItemSubGroup) => {
        const s = suppliers.find((sup) => sup._id === r.supplierId);
        return s ? s.name : "-";
      }
    },
    { 
      key: "itemName", 
      header: "Item Name", 
      accessor: (r: ItemSubGroup) => r.itemNameId?.name || "-"
    },
    {
      key: "status",
      header: "Status",
      accessor: (r: ItemSubGroup) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            r.isActive
              ? "bg-gray-100 text-gray-900"
              : "bg-gray-50 text-gray-500"
          }`}
        >
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: ItemSubGroup) => (
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Item Sub Groups</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage item sub-groups under your company
          </p>
        </div>
        <Button
          onClick={openAdd}
          leftIcon={<Plus size={16} />}
          className="btn-primary"
        >
          Add Sub Group
        </Button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search sub groups..."
        />
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No item sub-groups found"
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        title={editingRecord ? "Edit Sub Group" : "Add Sub Group"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Supplier"
            options={suppliers
              .filter(s => s.isActive !== false || s._id === supplierId)
              .map(s => ({ value: s._id, label: s.name }))}
            value={supplierId}
            onChange={(val) => {
              setSupplierId(val);
              setItemNameId(""); // reset item name on supplier change
              if (val) loadItemNames(val);
            }}
            error={errors.supplierId}
            placeholder="Select Supplier"
            isRequired
          />
          <Select
            label="Item Name"
            options={itemNames
              .filter(inm => inm.isActive !== false || inm._id === itemNameId)
              .map(inm => ({ value: inm._id, label: inm.name }))}
            value={itemNameId}
            onChange={setItemNameId}
            error={errors.itemNameId}
            placeholder="Select Item Name"
            isRequired
            disabled={!supplierId}
          />
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            isRequired
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
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

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingRecord(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Sub Group"
        message={`Delete "${deletingRecord?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
