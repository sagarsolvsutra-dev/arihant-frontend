"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { Table, Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useCompany } from "@/context/CompanyContext";
import { reportService } from "@/services/reportService";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";

interface LedgerEntry {
  date: string;
  type: string;
  ref: string;
  id: string;
  debit: number;
  credit: number;
  pendingAmount: number | null;
  balance: number;
}

function money(n: number) {
  return `₹${(n || 0).toFixed(2)}`;
}

const TYPE_EDIT_ROUTE: Record<string, string> = {
  Sale: "/sale/edit",
  "Sale Return": "/sale-return/edit",
};

export default function CustomerLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const { selectedCompanyId, isContextLoading } = useCompany();
  const router = useRouter();

  const [party, setParty] = useState<any>(null);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (isContextLoading || !selectedCompanyId || !id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, isContextLoading, id, dateFrom, dateTo]);

  async function load() {
    setIsLoading(true);
    try {
      const res: any = await reportService.getCustomerLedger(id, selectedCompanyId, dateFrom, dateTo);
      setParty(res.party);
      setOpeningBalance(res.openingBalance || 0);
      setClosingBalance(res.closingBalance || 0);
      setEntries(res.entries || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load customer ledger");
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }

  const openingRow: LedgerEntry = {
    date: dateFrom || "",
    type: "Opening Balance",
    ref: "-",
    id: "opening",
    debit: openingBalance > 0 ? openingBalance : 0,
    credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
    pendingAmount: null,
    balance: openingBalance,
  };

  const columns: Column<LedgerEntry>[] = [
    { key: "date", header: "Date", render: (r) => formatDate(r.date) },
    { key: "type", header: "Type", primary: true, render: (r) => r.type },
    {
      key: "ref",
      header: "Ref No",
      render: (r) =>
        TYPE_EDIT_ROUTE[r.type] ? (
          <button className="text-blue-600 hover:underline" onClick={() => router.push(`${TYPE_EDIT_ROUTE[r.type]}/${r.id}`)}>
            {r.ref}
          </button>
        ) : (
          r.ref
        ),
    },
    { key: "debit", header: "Debit", render: (r) => (r.debit ? money(r.debit) : "-"), className: "text-right" },
    { key: "credit", header: "Credit", render: (r) => (r.credit ? money(r.credit) : "-"), className: "text-right" },
    {
      key: "balance",
      header: "Balance",
      render: (r) => (
        <span className={r.balance < 0 ? "text-green-700 font-semibold" : "text-gray-900 font-semibold"}>
          {r.balance < 0 ? `${money(Math.abs(r.balance))} Adv` : `${money(r.balance)} Dr`}
        </span>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/customers")} className="p-2 rounded-lg hover:bg-gray-100" title="Back to Customers">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{party?.name || "Customer"} — Ledger</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {party?.phone ? `${party.phone} · ` : ""}
            {party?.city || ""}
            {party?.gstNo ? ` · GST: ${party.gstNo}` : ""}
          </p>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="w-full sm:w-44">
          <DatePicker label="From" value={dateFrom} onChange={setDateFrom} placeholder="From" />
        </div>
        <div className="w-full sm:w-44">
          <DatePicker label="To" value={dateTo} onChange={setDateTo} placeholder="To" minDate={dateFrom || undefined} />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reportService.exportCustomerLedger(id, selectedCompanyId, dateFrom, dateTo)}
          leftIcon={<FileSpreadsheet size={14} />}
        >
          Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs text-gray-500">Opening Balance{dateFrom ? ` (as of ${dateFrom})` : ""}</div>
          <div className={`text-xl font-bold mt-1 ${openingBalance < 0 ? "text-green-700" : "text-gray-900"}`}>
            {openingBalance < 0 ? `${money(Math.abs(openingBalance))} Advance` : `${money(openingBalance)} Dr`}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Closing Balance</div>
          <div className={`text-xl font-bold mt-1 ${closingBalance < 0 ? "text-green-700" : "text-red-600"}`}>
            {closingBalance < 0 ? `${money(Math.abs(closingBalance))} Advance` : `${money(closingBalance)} Receivable`}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        Debit increases the balance the customer owes (Sale); Credit decreases it (Sale Return). Each entry is dated by its own invoice/return date — this
        app doesn&apos;t track separate payment vouchers, so the balance reflects invoice activity, not individual payments received.
      </p>

      <div className="card">
        <Table
          columns={columns}
          data={dateFrom ? [openingRow, ...entries] : entries}
          isLoading={isLoading}
          emptyMessage="No ledger activity found"
        />
      </div>
    </div>
  );
}
