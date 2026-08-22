"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { openingBillService } from "@/services/openingBillService";
import { useRouter } from "next/navigation";

interface OpeningBillRecord {
  id?: string;
  _id: string;
  type: "customer" | "supplier";
  partyName: string;
  billDate: string;
  billNumber: string;
  amount: number;
  notes?: string;
}

export default function SaleOpeningBillsPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<OpeningBillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<OpeningBillRecord | null>(null);

  useEffect(() => {
    if (companyId) loadRecords();
  }, [companyId]);

  const loadRecords = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await openingBillService.getOpeningBills(companyId, "customer");
      const list = Array.isArray(data) ? data : data.data || [];
      setRecords(list.map((i: any) => ({ ...i, id: i._id })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRecord?._id) return;
    try {
      await openingBillService.deleteOpeningBill(deletingRecord._id);
      loadRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleteOpen(false);
      setDeletingRecord(null);
    }
  };

  const filtered = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    return r.partyName.toLowerCase().includes(q) || r.billNumber.toLowerCase().includes(q);
  });

  const columns = [
    { key: "customer", header: "Customer Name", accessor: (r: OpeningBillRecord) => r.partyName },
    { key: "invoice_no", header: "Invoice No.", accessor: (r: OpeningBillRecord) => r.billNumber },
    { key: "invoice_date", header: "Invoice Date", accessor: (r: OpeningBillRecord) => r.billDate },
    {
      key: "amount",
      header: "Amount (₹)",
      accessor: (r: OpeningBillRecord) =>
        r.amount != null ? `₹${r.amount.toLocaleString("en-IN")}` : "-",
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: OpeningBillRecord) => (
        <div className="flex gap-2">
          <EditButton onClick={() => router.push(`/opening-bills/sale/edit/${r._id}`)} />
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
          <h1 className="text-xl font-bold text-gray-900">Opening Pending of Sale Bill</h1>
          <p className="text-sm text-gray-500 mt-1">Manage opening pending sale bills</p>
        </div>
        <Button onClick={() => router.push("/opening-bills/sale/add")} leftIcon={<Plus size={16} />} className="btn-primary">
          Add Bill
        </Button>
      </div>

      <div className="card p-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search bills..."
        />
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={filtered}
          isLoading={loading}
          emptyMessage="No opening sale bills found"
        />
      </div>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingRecord(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Opening Bill"
        message={`Delete bill "${deletingRecord?.billNumber}" for "${deletingRecord?.partyName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
