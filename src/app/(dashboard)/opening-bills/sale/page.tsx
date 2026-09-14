"use client";

import React, { useState, useEffect } from "react";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { Plus, Search, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { exportListService } from "@/services/exportListService";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { openingBillService } from "@/services/openingBillService";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/date";
import { canAction } from "@/lib/permissions";

interface OpeningBillRecord {
  id?: string;
  _id: string;
  type: "sale" | "purchase";
  customerId?: { _id: string; name: string } | string;
  billDate: string;
  billNo: string;
  totalAmount: number;
  notes?: string;
}

export default function SaleOpeningBillsPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [records, setRecords] = useState<OpeningBillRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<OpeningBillRecord | null>(null);

  useEffect(() => {
    if (companyId) loadRecords();
  }, [companyId]);

  const loadRecords = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await openingBillService.getOpeningBills(companyId, "sale");
      const list = Array.isArray(data) ? data : data.data || [];
      setRecords(list.map((i: any) => ({ ...i, id: i._id })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!companyId) return;
    exportListService.exportList("opening-bills-sale", companyId, { dateFrom, dateTo });
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

  const partyName = (r: OpeningBillRecord) =>
    typeof r.customerId === "string" ? r.customerId : r.customerId?.name || "-";

  const filtered = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = partyName(r).toLowerCase().includes(q) || (r.billNo || "").toLowerCase().includes(q);
    const billDay = r.billDate ? r.billDate.slice(0, 10) : "";
    const matchesFrom = !dateFrom || (billDay && billDay >= dateFrom);
    const matchesTo = !dateTo || (billDay && billDay <= dateTo);
    return matchesSearch && matchesFrom && matchesTo;
  });

  const columns = [
    { key: "customer", header: "Customer Name", accessor: partyName },
    { key: "invoice_no", header: "Invoice No.", accessor: (r: OpeningBillRecord) => r.billNo },
    { key: "invoice_date", header: "Invoice Date", accessor: (r: OpeningBillRecord) => formatDate(r.billDate) },
    {
      key: "amount",
      header: "Amount (₹)",
      accessor: (r: OpeningBillRecord) =>
        r.totalAmount != null ? `₹${r.totalAmount.toLocaleString("en-IN")}` : "-",
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r: OpeningBillRecord) => (
        <div className="flex gap-2">
          {canAction("openingBills", "edit") && <EditButton onClick={() => router.push(`/opening-bills/sale/edit/${r._id}`)} />}
          {canAction("openingBills", "delete") && <DeleteButton onClick={() => { setDeletingRecord(r); setIsDeleteOpen(true); }} />}
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
          <h1 className="text-lg font-bold text-gray-900">Opening Pending of Sale Bill</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage opening pending sale bills</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadRecords} className="px-2.5 hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canAction("openingBills", "create") && (
            <Button onClick={() => router.push("/opening-bills/sale/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
              Add Bill
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search bills..."
            className="!py-1.5 !text-xs"
          />
        </div>
        <div className="w-full sm:w-36">
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" className="!py-1.5 !text-xs" />
        </div>
        <div className="w-full sm:w-36">
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" minDate={dateFrom || undefined} className="!py-1.5 !text-xs" />
        </div>
        <Button variant="outline" size="sm" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={14} />} title="Export to Excel">
          Excel
        </Button>
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
        message={`Delete bill "${deletingRecord?.billNo}"${deletingRecord ? ` for "${partyName(deletingRecord)}"` : ""}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
