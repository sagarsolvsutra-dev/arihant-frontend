"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, AlertCircle, RefreshCw } from "lucide-react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { itemNameService } from "@/services/itemNameService";
import { supplierService } from "@/services/supplierService";
import { toast } from "sonner";

interface ItemNameRecord {
  id: string;
  _id?: string;
  name: string;
  supplierId: any;
  isActive: boolean;
}

export default function ItemNamesPage() {
  const { selectedCompanyId, isContextLoading } = useCompany();
  const [records, setRecords] = useState<ItemNameRecord[]>([]);
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string; isActive?: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ItemNameRecord | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [supplierIdInput, setSupplierIdInput] = useState("");
  const [isActiveInput, setIsActiveInput] = useState(true);

  // Errors
  const [nameError, setNameError] = useState("");
  const [supplierIdError, setSupplierIdError] = useState("");
  const [formAlert, setFormAlert] = useState("");

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ItemNameRecord | null>(null);

  useEffect(() => {
    if (isContextLoading || !selectedCompanyId) {
      if (isContextLoading) setIsLoading(true);
      return;
    }
    loadSuppliers();
    const timer = setTimeout(() => {
      loadRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCompanyId, isContextLoading, searchQuery]);

  async function loadSuppliers() {
    try {
      const data = await supplierService.getSuppliers(selectedCompanyId!, 1, 1000);
      const list = Array.isArray(data) ? data : data.data || [];
      setSuppliers(list);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred");
}
  }

  async function loadRecords() {
    setIsLoading(true);
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(selectedCompanyId || "");

    if (!isValidObjectId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await itemNameService.getItemNames(selectedCompanyId!, searchQuery);
      const list = Array.isArray(data) ? data : data.data || [];
      setRecords(list.map((item: any) => ({ ...item, id: item._id })));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred");
setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  const validateForm = () => {
    let valid = true;
    setNameError("");
    setSupplierIdError("");
    setFormAlert("");

    if (!nameInput.trim()) {
      setNameError("Item Name is required");
      valid = false;
    }

    if (!supplierIdInput) {
      setSupplierIdError("Supplier is required");
      valid = false;
    }

    return valid;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      companyId: selectedCompanyId,
      name: nameInput.trim(),
      supplierId: supplierIdInput,
      isActive: isActiveInput,
    };

    try {
      if (editingRecord) {
        await itemNameService.updateItemName(editingRecord.id, payload);
      } else {
        await itemNameService.createItemName(payload);
      }
      setIsFormOpen(false);
      resetForm();
      loadRecords();
    } catch (e: any) {
      setFormAlert(e.response?.data?.message || e.message || "Failed to save Item Name");
    }
  };

  const handleEditClick = (record: ItemNameRecord) => {
    setEditingRecord(record);
    setNameInput(record.name);
    setSupplierIdInput(record.supplierId?._id || record.supplierId);
    setIsActiveInput(record.isActive);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: ItemNameRecord) => {
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;

    try {
      await itemNameService.deleteItemName(deletingRecord.id);
      setIsDeleteOpen(false);
      setDeletingRecord(null);
      loadRecords();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete item name");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setNameInput("");
    setSupplierIdInput("");
    setIsActiveInput(true);
    setNameError("");
    setSupplierIdError("");
    setFormAlert("");
  };

  const columns = [
    {
      key: "srno",
      header: "SR. NO.",
      accessor: (row: ItemNameRecord, index: number) => index + 1,
      className: "w-20 text-center font-semibold text-gray-500",
    },
    {
      key: "name",
      header: "ITEM NAME",
      accessor: (row: ItemNameRecord) => row.name,
      className: "font-semibold text-gray-900",
    },
    {
      key: "supplier",
      header: "SUPPLIER",
      accessor: (row: ItemNameRecord) => row.supplierId?.name || "-",
      className: "text-gray-600",
    },
    {
      key: "status",
      header: "STATUS",
      accessor: (row: ItemNameRecord) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.isActive
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
            }`}
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
      className: "text-center",
    },
    {
      key: "actions",
      header: "ACTIONS",
      accessor: (row: ItemNameRecord) => (
        <div className="flex items-center justify-center gap-2">
          <EditButton onClick={() => handleEditClick(row)} />
          <DeleteButton onClick={() => handleDeleteClick(row)} />
        </div>
      ),
      className: "w-24 text-center",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Item Names (આઇટમ નેમ્સ લિસ્ટ)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage product names and their groups.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRecords}
            className="px-2.5 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            size="sm"
            leftIcon={<Plus size={14} />}
            className="btn-primary"
          >
            Add Item Name
          </Button>
        </div>
      </div>

      <SearchInput
        placeholder="Search by name..."
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <div className="card">
        <Table
          columns={columns}
          data={records} 
          isLoading={isLoading} 
        />
      </div>

      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRecord ? "Edit Item Name" : "Add Item Name"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
            >
              Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {formAlert && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {formAlert}
            </div>
          )}

          <Select
            label="Supplier"
            options={suppliers
              .filter(s => s.isActive !== false || s._id === supplierIdInput)
              .map(s => ({ value: s._id, label: s.name }))}
            value={supplierIdInput}
            onChange={setSupplierIdInput}
            error={supplierIdError}
            isRequired
            placeholder="Select Supplier"
          />

          <Input
            label="Item Name"
            placeholder="e.g. SUGAR"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (e.target.value) setNameError("");
            }}
            isRequired
            error={nameError}
          />

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActiveInput}
              onChange={(e) => setIsActiveInput(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black h-4 w-4 cursor-pointer"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
              Active (એક્ટિવ છે)
            </label>
          </div>
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Item Name"
        message={`Are you sure you want to delete "${deletingRecord?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
