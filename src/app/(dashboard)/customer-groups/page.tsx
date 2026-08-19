"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, AlertCircle, RefreshCw } from "lucide-react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { customerGroupService } from "@/services/customerGroupService";

interface CustomerGroupRecord {
  id: string;
  _id?: string;
  name: string;
  zoneNo?: string;
}

export default function CustomerGroupsPage() {
  const { selectedCompanyId } = useCompany();
  const [groups, setGroups] = useState<CustomerGroupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CustomerGroupRecord | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [zoneInput, setZoneInput] = useState("");

  // Errors
  const [nameError, setNameError] = useState("");
  const [formAlert, setFormAlert] = useState("");

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<CustomerGroupRecord | null>(null);

  useEffect(() => {
    loadCustomerGroups();
  }, [selectedCompanyId]);

  async function loadCustomerGroups() {
    setIsLoading(true);
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(selectedCompanyId || "");

    if (!isValidObjectId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await customerGroupService.getCustomerGroups(selectedCompanyId);
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
      zoneNo: zoneInput.trim() || undefined,
    };

    try {
      if (editingRecord) {
        await customerGroupService.updateCustomerGroup(editingRecord.id, payload);
      } else {
        await customerGroupService.createCustomerGroup(payload);
      }
      setIsFormOpen(false);
      resetForm();
      loadCustomerGroups();
    } catch (e: any) {
      setFormAlert(e.message || "Failed to save Customer Group");
    }
  };

  const handleEditClick = (record: CustomerGroupRecord) => {
    setEditingRecord(record);
    setNameInput(record.name);
    setZoneInput(record.zoneNo || "");
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: CustomerGroupRecord) => {
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;

    try {
      await customerGroupService.deleteCustomerGroup(deletingRecord.id);
      setIsDeleteOpen(false);
      setDeletingRecord(null);
      loadCustomerGroups();
    } catch (e: any) {
      alert(e.message || "Failed to delete customer group");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setNameInput("");
    setZoneInput("");
    setNameError("");
    setFormAlert("");
  };

  const filteredGroups = groups.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.zoneNo && item.zoneNo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns = [
    {
      key: "srno",
      header: "SR. NO.",
      accessor: (row: CustomerGroupRecord, index: number) => index + 1,
      className: "w-20 text-center font-semibold text-gray-500",
    },
    {
      key: "name",
      header: "GROUP NAME",
      accessor: (row: CustomerGroupRecord) => row.name,
      className: "font-semibold text-gray-900",
    },
    {
      key: "zoneNo",
      header: "ZONE NO.",
      accessor: (row: CustomerGroupRecord) => row.zoneNo || "-",
      className: "text-gray-600",
    },
    {
      key: "actions",
      header: "ACTIONS",
      accessor: (row: CustomerGroupRecord) => (
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
            Customer Groups (કસ્ટમર ગ્રુપ્સ લિસ્ટ)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Group customers geographically or commercially for reporting and operations.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCustomerGroups}
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
            <Plus className="h-4 w-4" /> Add Customer Group
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-xs">
        <SearchInput
          placeholder="Search by group name or zone..."
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
        title={editingRecord ? "Edit Customer Group" : "Add Customer Group"}
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
            label="Zone No."
            placeholder="e.g. Zone-A"
            value={zoneInput}
            onChange={(e) => setZoneInput(e.target.value)}
          />
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Customer Group"
        message={`Are you sure you want to delete the customer group "${deletingRecord?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
