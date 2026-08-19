"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, AlertCircle, RefreshCw } from "lucide-react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { itemGroupService } from "@/services/itemGroupService";

interface ItemGroupRecord {
  id: string;
  _id?: string;
  name: string;
  shortName?: string;
  commissionRate: number;
  isActive: boolean;
}

export default function ItemGroupsPage() {
  const { selectedCompanyId } = useCompany();
  const [groups, setGroups] = useState<ItemGroupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ItemGroupRecord | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [shortInput, setShortInput] = useState("");
  const [commissionInput, setCommissionInput] = useState("0.00");
  const [isActiveInput, setIsActiveInput] = useState(true);

  // Errors
  const [nameError, setNameError] = useState("");
  const [formAlert, setFormAlert] = useState("");

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ItemGroupRecord | null>(null);

  useEffect(() => {
    loadItemGroups();
  }, [selectedCompanyId]);

  async function loadItemGroups() {
    setIsLoading(true);
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(selectedCompanyId || "");

    if (!isValidObjectId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await itemGroupService.getItemGroups(selectedCompanyId);
      setGroups(data.map((item: any) => ({ ...item, id: item._id })));
    } catch (e) {
      console.error(e);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }

  const validateForm = () => {
    let valid = true;
    setNameError("");
    setFormAlert("");

    if (!nameInput.trim()) {
      setNameError("Group Name is required");
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
      shortName: shortInput.trim() || undefined,
      commissionRate: parseFloat(commissionInput) || 0,
      isActive: isActiveInput,
    };

    try {
      if (editingRecord) {
        await itemGroupService.updateItemGroup(editingRecord.id, payload);
      } else {
        await itemGroupService.createItemGroup(payload);
      }
      setIsFormOpen(false);
      resetForm();
      loadItemGroups();
    } catch (e: any) {
      setFormAlert(e.message || "Failed to save Item Group");
    }
  };

  const handleEditClick = (record: ItemGroupRecord) => {
    setEditingRecord(record);
    setNameInput(record.name);
    setShortInput(record.shortName || "");
    setCommissionInput(record.commissionRate.toString());
    setIsActiveInput(record.isActive);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: ItemGroupRecord) => {
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;

    try {
      await itemGroupService.deleteItemGroup(deletingRecord.id);
      setIsDeleteOpen(false);
      setDeletingRecord(null);
      loadItemGroups();
    } catch (e: any) {
      alert(e.message || "Failed to delete item group");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setNameInput("");
    setShortInput("");
    setCommissionInput("0.00");
    setIsActiveInput(true);
    setNameError("");
    setFormAlert("");
  };

  const filteredGroups = groups.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.shortName && item.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns = [
    {
      key: "srno",
      header: "SR. NO.",
      accessor: (row: ItemGroupRecord, index: number) => index + 1,
      className: "w-20 text-center font-semibold text-gray-500",
    },
    {
      key: "name",
      header: "GROUP NAME",
      accessor: (row: ItemGroupRecord) => row.name,
      className: "font-semibold text-gray-900",
    },
    {
      key: "shortName",
      header: "SHORT NAME",
      accessor: (row: ItemGroupRecord) => row.shortName || "-",
      className: "text-gray-600",
    },
    {
      key: "commissionRate",
      header: "COMMISSION RATE (%)",
      accessor: (row: ItemGroupRecord) => `${row.commissionRate.toFixed(2)}%`,
      className: "text-gray-700 text-center font-medium",
    },
    {
      key: "status",
      header: "STATUS",
      accessor: (row: ItemGroupRecord) => (
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
      accessor: (row: ItemGroupRecord) => (
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
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Item Groups (આઇટમ ગ્રુપ્સ લિસ્ટ)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage product categories and group-level default attributes.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadItemGroups}
            className="hover:bg-gray-100 text-gray-600 cursor-pointer"
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
            className="bg-black hover:bg-gray-900 text-white border-none cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Item Group
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-xs">
        <SearchInput
          placeholder="Search by group name or short name..."
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
        />
      </div>

      {/* Main Table area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
        <Table columns={columns} data={filteredGroups} isLoading={isLoading} />
      </div>

      {/* Add / Edit Form Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRecord ? "Edit Item Group" : "Add Item Group"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-black hover:bg-gray-900 text-white border-none"
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

          <Input
            label="Group Name"
            placeholder="e.g. VALSAD"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (e.target.value) setNameError("");
            }}
            isRequired
            error={nameError}
          />

          <Input
            label="Short Name"
            placeholder="e.g. VAL"
            value={shortInput}
            onChange={(e) => setShortInput(e.target.value)}
          />

          <Input
            label="Commission Rate (%)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={commissionInput}
            onChange={(e) => setCommissionInput(e.target.value)}
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
              Group Active (એક્ટિવ છે)
            </label>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Item Group"
        message={`Are you sure you want to delete the item group "${deletingRecord?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
