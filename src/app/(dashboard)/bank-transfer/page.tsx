"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { bankTransferService } from "@/services/bankTransferService";
import { useCompany } from "@/context/CompanyContext";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";
import { DeleteButton } from "@/components/ui/ActionButtons";
import { useRouter } from "next/navigation";
import { canAction } from "@/lib/permissions";

export default function BankTransferListPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!companyId) return;
    loadTransfers();
  }, [companyId, page, dateFrom, dateTo]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await bankTransferService.getBankTransfers(page, limit, dateFrom, dateTo);
      setTransfers(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load bank transfers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await bankTransferService.deleteBankTransfer(deleteId);
      toast.success("Transfer deleted successfully");
      setIsDeleteOpen(false);
      setDeleteId(null);
      loadTransfers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete transfer");
    }
  };

  if (!companyId) return <div className="p-4 text-gray-500">Please select a company</div>;

  const columns = [
    { key: "transferDate", header: "Date", accessor: (r: any) => formatDate(r.transferDate) },
    { key: "fromBank", header: "From Bank", accessor: (r: any) => r.fromBankId ? `${r.fromBankId.bankName} - ${r.fromBankId.accountNumber}` : "-" },
    { key: "toBank", header: "To Bank", accessor: (r: any) => r.toBankId ? `${r.toBankId.bankName} - ${r.toBankId.accountNumber}` : "-" },
    { key: "amount", header: "Amount (₹)", accessor: (r: any) => <span className="font-bold text-blue-600">₹{(r.amount || 0).toFixed(2)}</span> },
    { key: "referenceNo", header: "Reference No.", accessor: (r: any) => r.referenceNo || "-" },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: any) => (
        <div className="flex gap-3">
          {canAction("payments", "delete") && (
            <DeleteButton onClick={() => { setDeleteId(r._id); setIsDeleteOpen(true); }} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Bank Transfers</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage fund transfers between bank accounts</p>
        </div>
        {canAction("payments", "create") && (
          <Button onClick={() => router.push("/bank-transfer/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
            Add Transfer
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-end">
        <div className="flex-1" />
        <div className="w-full sm:w-36">
          <DatePicker
            value={dateFrom}
            onChange={(d) => {
              setDateFrom(d);
              setPage(1);
            }}
            placeholder="From"
            className="!py-1.5 !text-xs"
          />
        </div>
        <div className="w-full sm:w-36">
          <DatePicker
            value={dateTo}
            onChange={(d) => {
              setDateTo(d);
              setPage(1);
            }}
            placeholder="To"
            className="!py-1.5 !text-xs"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadTransfers} title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="card">
        <Table 
          columns={columns} 
          data={transfers} 
          isLoading={loading} 
          emptyMessage="No bank transfers found."
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
          }}
        />
      </div>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Bank Transfer"
        message="Are you sure you want to delete this transfer? The balances will be reversed."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
