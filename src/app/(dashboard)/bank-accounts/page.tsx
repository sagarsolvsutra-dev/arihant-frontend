"use client";

import React, { useState, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { bankAccountService } from "@/services/bankAccountService";
import { toast } from "@/lib/toast";
import { canAction } from "@/lib/permissions";

interface BankAccountRecord {
  _id: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  ifscCode: string;
  openingBalance: number;
  currentBalance: number;
  status: string;
}

import { useRouter } from "next/navigation";

export default function BankAccountsPage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [records, setRecords] = useState<BankAccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BankAccountRecord | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<BankAccountRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number | "">("");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    if (!companyId) return;
    loadRecords();
  }, [companyId]);

  const loadRecords = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await bankAccountService.getBankAccounts();
      setRecords(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) =>
    r.bankName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setBankName("");
    setAccountNumber("");
    setBranch("");
    setIfscCode("");
    setOpeningBalance("");
    setStatus("Active");
    setEditingRecord(null);
  };

  const openAdd = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (record: BankAccountRecord) => {
    setEditingRecord(record);
    setBankName(record.bankName);
    setAccountNumber(record.accountNumber || "");
    setBranch(record.branch || "");
    setIfscCode(record.ifscCode || "");
    setOpeningBalance(record.openingBalance || 0);
    setStatus(record.status || "Active");
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !bankName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        companyId,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        branch: branch.trim(),
        ifscCode: ifscCode.trim(),
        openingBalance: Number(openingBalance) || 0,
        status,
      };

      if (editingRecord?._id) {
        await bankAccountService.updateBankAccount(editingRecord._id, payload);
      } else {
        await bankAccountService.createBankAccount(payload);
      }
      setFormOpen(false);
      resetForm();
      loadRecords();
      toast.success("Saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await bankAccountService.deleteBankAccount(deletingRecord._id);
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

  const columns = [
    { 
      key: "bankName", 
      header: "Bank Name", 
      accessor: (r: BankAccountRecord) => (
        <span 
          className="text-blue-600 hover:underline cursor-pointer font-medium"
          onClick={() => router.push(`/bank-accounts/${r._id}`)}
        >
          {r.bankName}
        </span>
      )
    },
    { key: "accountNumber", header: "Account No.", accessor: (r: BankAccountRecord) => r.accountNumber || "-" },
    { key: "openingBalance", header: "Opening Bal.", accessor: (r: BankAccountRecord) => r.openingBalance.toFixed(2) },
    { key: "currentBalance", header: "Current Bal.", accessor: (r: BankAccountRecord) => r.currentBalance.toFixed(2) },
    {
      key: "status",
      header: "Status",
      accessor: (r: BankAccountRecord) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === "Active" ? "bg-gray-100 text-gray-900" : "bg-gray-50 text-gray-500"}`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: BankAccountRecord) => (
        <div className="flex gap-2">
          {canAction("bankAccounts", "edit") && <EditButton onClick={() => openEdit(r)} />}
          {canAction("bankAccounts", "delete") && <DeleteButton onClick={() => { setDeletingRecord(r); setIsDeleteOpen(true); }} />}
        </div>
      ),
    },
  ];

  if (!companyId) return <div className="p-4 text-gray-500">Please select a company</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your bank accounts and opening balances</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadRecords} className="px-2.5 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canAction("bankAccounts", "create") && (
            <Button onClick={openAdd} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
              Add Bank Account
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
        <div className="lg:w-72">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search banks..."
            className="!py-1.5 !text-xs"
          />
        </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={filteredRecords}
          isLoading={loading}
          emptyMessage="No bank accounts found"
        />
      </div>

      <Dialog
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); resetForm(); }}
        title={editingRecord ? "Edit Bank Account" : "Add Bank Account"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Bank Name *"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
          />
          <Input
            label="Account Number"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
            <Input
              label="IFSC Code"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Opening Balance"
              type="number"
              step="any"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value === "" ? "" : Number(e.target.value))}
            />
            <div>
              <Select
                label="Status"
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" }
                ]}
                value={status}
                onChange={setStatus}
                searchable={false}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" isLoading={saving}>{editingRecord ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setDeletingRecord(null); }}
        onConfirm={confirmDelete}
        title="Delete Bank Account"
        message={`Are you sure you want to delete "${deletingRecord?.bankName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
