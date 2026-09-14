"use client";

import React, { useState, useEffect } from "react";
import { Plus, FileText, FileSpreadsheet, RefreshCw } from "lucide-react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { godownService } from "@/services/godownService";
import { godownGroupService } from "@/services/godownGroupService";
import { API_ENDPOINTS } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";

const EXPORT_TYPES = [
  { value: "", label: "All Types" },
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "purchaseReturn", label: "Purchase Return" },
  { value: "saleReturn", label: "Sale Return" },
];

interface GodownRecord {
  id?: string;
  _id: string;
  name: string;
  godownGroupId?: { _id: string; name: string } | string | null;
  isActive: boolean;
}

export default function GodownsPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<GodownRecord[]>([]);
  const [allGodowns, setAllGodowns] = useState<GodownRecord[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GodownRecord | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<GodownRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Export report controls — separate from `records` (which is paginated to 10
  // per page) so every godown is selectable regardless of which page it's on.
  const [exportGodownId, setExportGodownId] = useState("");
  const [exportType, setExportType] = useState("");

  const [name, setName] = useState("");
  const [godownGroupId, setGodownGroupId] = useState("");
  const [godownActive, setGodownActive] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    godownGroupService.getGodownGroups(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setGroups(list);
    });
  }, [companyId]);

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
      const data = await godownService.getGodowns(companyId, page, 10, searchQuery);
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
    // Keep the Export panel's Godown list (unpaginated) in sync with any
    // add/edit/delete made through this page.
    godownService.getGodowns(companyId, 1, 1000).then((res: any) => {
      setAllGodowns(res.data || res || []);
    });
  };

  const resetForm = () => {
    setName("");
    setGodownGroupId("");
    setGodownActive(true);
    setEditingRecord(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (record: GodownRecord) => {
    setEditingRecord(record);
    setName(record.name || "");
    setGodownGroupId(typeof record.godownGroupId === "string" ? record.godownGroupId : record.godownGroupId?._id || "");
    setGodownActive(record.isActive ?? true);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !name.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        companyId,
        name: name.trim(),
        godownGroupId: godownGroupId || null,
        isActive: godownActive,
      };

      if (editingRecord?._id) {
        await godownService.updateGodown(editingRecord._id, payload);
      } else {
        await godownService.createGodown(payload);
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
      await godownService.deleteGodown(deletingRecord._id);
      loadRecords();
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

  // Fetched as a blob and saved via a throwaway <a download> rather than
  // window.open()'d — window.open() is what caused a real bug where a
  // blocked/hijacked popup could fall back to navigating the current tab,
  // which looked like the whole page refreshing. See lib/download.ts.
  const handleExport = async (format: "pdf" | "excel") => {
    if (!companyId) return;
    // No Godown picked → "all" tells the backend to export across every godown
    // in the company (adding its own Godown column to the report) instead of
    // requiring a specific one. Same "all" fallback for Type — no selection
    // exports every transaction type as a combined multi-section report.
    const url = `${API_ENDPOINTS.GODOWNS}/${exportGodownId || "all"}/export?companyId=${companyId}&type=${exportType || "all"}&format=${format}`;
    try {
      await downloadFile(url, `godown_export.${format === "pdf" ? "pdf" : "xlsx"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to export");
    }
  };

  const columns = [
    { key: "name", header: "Godown Name", accessor: (r: GodownRecord) => r.name },
    { key: "group", header: "Group", accessor: (r: GodownRecord) => (typeof r.godownGroupId === "object" ? r.godownGroupId?.name : "") || "-" },
    {
      key: "status",
      header: "Status",
      accessor: (r: GodownRecord) => (
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
      accessor: (r: GodownRecord) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
          <h1 className="text-lg font-bold text-gray-900">Godowns (ગોડાઉન)</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage godowns/warehouses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadRecords} className="px-2.5 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openAdd} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
            Add Godown
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
          <div className="lg:w-72">
            <label className="block text-xs font-medium text-gray-500 mb-1 lg:hidden">Search</label>
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search godowns..."
              className="!py-1.5 !text-xs"
            />
          </div>

          <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-end gap-3">
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Godown</label>
              <Select
                options={[
                  { value: "", label: "All Godowns" },
                  ...allGodowns.map((g) => ({ value: g._id, label: g.name })),
                ]}
                value={exportGodownId}
                onChange={setExportGodownId}
                placeholder="All Godowns"
                className="!py-1.5 !text-xs"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <Select
                options={EXPORT_TYPES}
                value={exportType}
                onChange={setExportType}
                searchable={false}
                className="!py-1.5 !text-xs"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                leftIcon={<FileText size={14} />}
              >
                PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
                leftIcon={<FileSpreadsheet size={14} />}
              >
                Excel
              </Button>
            </div>
          </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={records}
          isLoading={loading}
          emptyMessage="No godowns found"
          onRowClick={(r) => router.push(`/godowns/stock/${r._id}`)}
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
        title={editingRecord ? "Edit Godown" : "Add Godown"}
        overflowVisible
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Godown Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
            <Select
              options={groups.map((g) => ({ value: g._id, label: g.name }))}
              value={godownGroupId}
              onChange={setGodownGroupId}
              placeholder="Select Godown Group"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={godownActive}
              onChange={(e) => setGodownActive(e.target.checked)}
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
        title="Delete Godown"
        message={`Delete "${deletingRecord?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
