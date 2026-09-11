"use client";

import React, { useState, useEffect } from "react";
import { Plus, AlertCircle, RefreshCw, FileSpreadsheet } from "lucide-react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { exportListService } from "@/services/exportListService";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { godownGroupService } from "@/services/godownGroupService";
import { toast } from "@/lib/toast";

interface GodownGroupRecord {
  id: string;
  _id?: string;
  name: string;
}

export default function GodownGroupsPage() {
  const { selectedCompanyId, isContextLoading } = useCompany();
  const [groups, setGroups] = useState<GodownGroupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GodownGroupRecord | null>(null);
  const [nameInput, setNameInput] = useState("");

  const [nameError, setNameError] = useState("");
  const [formAlert, setFormAlert] = useState("");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<GodownGroupRecord | null>(null);

  useEffect(() => {
    if (isContextLoading || !selectedCompanyId) {
      if (isContextLoading) setIsLoading(true);
      return;
    }
    const timer = setTimeout(() => {
      loadGodownGroups();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedCompanyId, isContextLoading, page, searchQuery]);

  async function loadGodownGroups() {
    setIsLoading(true);
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(selectedCompanyId || "");

    if (!isValidObjectId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await godownGroupService.getGodownGroups(selectedCompanyId, page, 10, searchQuery);
      if (data.pagination) {
        setGroups(data.data.map((item: any) => ({ ...item, id: item._id })));
        setTotalPages(data.pagination.totalPages || 1);
      } else {
        const list = Array.isArray(data) ? data : data.data || [];
        setGroups(list.map((item: any) => ({ ...item, id: item._id })));
        setTotalPages(1);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "An error occurred");
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
    };

    try {
      if (editingRecord) {
        await godownGroupService.updateGodownGroup(editingRecord.id, payload);
        toast.success("Godown Group updated successfully");
      } else {
        await godownGroupService.createGodownGroup(payload);
        toast.success("Godown Group created successfully");
      }
      setIsFormOpen(false);
      resetForm();
      loadGodownGroups();
    } catch (e: any) {
      setFormAlert(e.message || "Failed to save Godown Group");
    }
  };

  const handleEditClick = (record: GodownGroupRecord) => {
    setEditingRecord(record);
    setNameInput(record.name);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: GodownGroupRecord) => {
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;

    try {
      await godownGroupService.deleteGodownGroup(deletingRecord.id);
      setIsDeleteOpen(false);
      setDeletingRecord(null);
      loadGodownGroups();
      toast.success("Godown Group deleted successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete godown group");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setNameInput("");
    setNameError("");
    setFormAlert("");
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const columns = [
    {
      key: "srno",
      header: "SR. NO.",
      accessor: (row: GodownGroupRecord, index: number) => index + 1,
      className: "w-20 text-center font-semibold text-gray-500",
    },
    {
      key: "name",
      header: "GROUP NAME",
      accessor: (row: GodownGroupRecord) => row.name,
      className: "font-semibold text-gray-900",
    },
    {
      key: "actions",
      header: "ACTIONS",
      accessor: (row: GodownGroupRecord) => (
        <div className="flex items-center justify-center gap-2">
          <EditButton onClick={() => handleEditClick(row)} />
          <DeleteButton onClick={() => handleDeleteClick(row)} />
        </div>
      ),
      className: "w-24 text-center",
    },
  ];

  if (!selectedCompanyId) {
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
          <h1 className="text-lg font-bold text-gray-900">
            Godown Groups (ગોડાઉન ગ્રુપ્સ લિસ્ટ)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Group godowns/warehouses for stock management and reporting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadGodownGroups}
            className="px-2.5 hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportListService.exportList("godown-groups", selectedCompanyId!)} leftIcon={<FileSpreadsheet size={14} />} title="Export to Excel">
            Excel
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            size="sm"
            leftIcon={<Plus size={14} />}
            className="btn-primary !px-3 !py-1.5"
          >
            Add Godown Group
          </Button>
        </div>
      </div>

      <SearchInput
        placeholder="Search by group name..."
        value={searchQuery}
        onChange={handleSearchChange}
      />

      <div className="card">
        <Table
          columns={columns}
          data={groups}
          isLoading={isLoading}
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage
          }}
        />
      </div>

      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRecord ? "Edit Godown Group" : "Add Godown Group"}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
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
            placeholder="e.g. VALSAD WAREHOUSES"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (e.target.value) setNameError("");
            }}
            isRequired
            error={nameError}
          />
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Godown Group"
        message={`Are you sure you want to delete the godown group "${deletingRecord?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
