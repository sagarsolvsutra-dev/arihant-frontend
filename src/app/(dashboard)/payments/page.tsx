"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Pencil, Trash } from "lucide-react";
import { DeleteButton } from "@/components/ui/ActionButtons";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { paymentService } from "@/services/paymentService";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";
import { canAction } from "@/lib/permissions";

export default function PaymentsPage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<any>(null);

  useEffect(() => {
    if (!companyId) return;
    loadRecords();
  }, [companyId]);

  const loadRecords = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await paymentService.getPayments();
      setRecords(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      await paymentService.deletePayment(deletingRecord._id);
      toast.success("Payment deleted successfully");
      setIsDeleteOpen(false);
      setDeletingRecord(null);
      loadRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment");
    }
  };

  // Payments the Expense / Bank Transfer modules mint alongside their own
  // record. Those modules reverse the bank effect themselves on delete, so
  // reversing one again from here would credit the account twice — the API
  // refuses it, and these rows are read-only in this list to match.
  const isDerived = (r: any) => r.partyType === "Expense" || r.partyType === "BankAccount";

  const filteredRecords = records.filter((r) =>
    (r.partyId?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.referenceNo || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: "paymentDate", header: "Date", accessor: (r: any) => formatDate(r.paymentDate) },
    { key: "type", header: "Type", accessor: (r: any) => r.paymentType },
    { key: "party", header: "Party", accessor: (r: any) => r.partyId?.name || "-" },
    { key: "mode", header: "Mode", accessor: (r: any) => r.paymentMode },
    { key: "amount", header: "Amount (₹)", accessor: (r: any) => `₹${(r.amount || 0).toFixed(2)}` },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: any) => (
        // Expense / Bank Transfer rows are shadow entries owned by those
        // modules, which reverse their own bank effect on delete — the API
        // refuses to edit or delete them from here, so don't offer it.
        isDerived(r) ? (
          <span className="text-xs text-gray-400">Auto</span>
        ) : (
          <div className="flex gap-3">
            {canAction("payments", "edit") && (
              <button
                onClick={() => router.push(`/payments/edit/${r._id}`)}
                className="text-blue-500 hover:text-blue-700"
                title="Edit"
              >
                <Pencil size={18} />
              </button>
            )}
            {canAction("payments", "delete") && (
              <DeleteButton onClick={() => { setDeletingRecord(r); setIsDeleteOpen(true); }} />
            )}
          </div>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Payments</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage incoming and outgoing payments</p>
        </div>
        {canAction("payments", "create") && (
          <Button onClick={() => router.push("/payments/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
            Add Payment
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by party or ref no..."
            className="!py-1.5 !text-xs"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadRecords} title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="card">
        <Table columns={columns} data={filteredRecords} isLoading={loading} />
      </div>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message={`Are you sure you want to delete this payment?`}
      />
    </div>
  );
}
