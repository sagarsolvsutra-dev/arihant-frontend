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
import { itemGroupService } from "@/services/itemGroupService";

interface ItemNameRecord {
  id: string;
  _id?: string;
  name: string;
  itemGroupId: any;
  isActive: boolean;
}

export default function ItemNamesPage() {
  const { selectedCompanyId, isContextLoading } = useCompany();
  const [records, setRecords] = useState<ItemNameRecord[]>([]);
  const [itemGroups, setItemGroups] = useState<{ _id: string; name: string; isActive?: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ItemNameRecord | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [itemGroupIdInput, setItemGroupIdInput] = useState("");
  const [isActiveInput, setIsActiveInput] = useState(true);

  // Errors
  const [nameError, setNameError] = useState("");
  const [itemGroupIdError, setItemGroupIdError] = useState("");
  const [formAlert, setFormAlert] = useState("");

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ItemNameRecord | null>(null);

  useEffect(() => {
    if (isContextLoading || !selectedCompanyId) {
      if (isContextLoading) setIsLoading(true);
      return;
    }
    loadItemGroups();
    const timer = setTimeout(() => {
      loadRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCompanyId, isContextLoading, searchQuery]);

  async function loadItemGroups() {
    try {
      const data = await itemGroupService.getItemGroups(selectedCompanyId!, 1, 100);
      const list = Array.isArray(data) ? data : data.data || [];
      setItemGroups(list);
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }

  const validateForm = () => {
    let valid = true;
    setNameError("");
    setItemGroupIdError("");
    setFormAlert("");

    if (!nameInput.trim()) {
      setNameError("Item Name is required");
      valid = false;
    }

    if (!itemGroupIdInput) {
      setItemGroupIdError("Item Group is required");
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
      itemGroupId: itemGroupIdInput,
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
    setItemGroupIdInput(record.itemGroupId?._id || record.itemGroupId);
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
      alert(e.message || "Failed to delete item name");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setNameInput("");
    setItemGroupIdInput("");
    setIsActiveInput(true);
    setNameError("");
    setItemGroupIdError("");
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
      key: "group",
      header: "GROUP",
      accessor: (row: ItemNameRecord) => row.itemGroupId?.name || "-",
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
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Item Names (આઇટમ નેમ્સ લિસ્ટ)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage product names and their groups.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
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
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className="bg-black hover:bg-gray-900 text-white border-none cursor-pointer"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Item Name
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-xs">
        <SearchInput
          placeholder="Search by name..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
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
            label="Item Group"
            options={itemGroups
              .filter(g => g.isActive !== false || g._id === itemGroupIdInput)
              .map(g => ({ value: g._id, label: g.name }))}
            value={itemGroupIdInput}
            onChange={setItemGroupIdInput}
            error={itemGroupIdError}
            isRequired
            placeholder="Select Group"
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
