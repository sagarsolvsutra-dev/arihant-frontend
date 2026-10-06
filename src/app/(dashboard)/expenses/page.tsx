"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Table } from "@/components/ui/Table";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { expenseService } from "@/services/expenseService";
import { useCompany } from "@/context/CompanyContext";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";
import { DeleteButton, EditButton } from "@/components/ui/ActionButtons";
import { useRouter } from "next/navigation";
import { canAction } from "@/lib/permissions";

export default function ExpensesListPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // searchQuery belongs here too: `page` is sent to the server, so typing a
  // search while on page 3 asked for page 3 of a result that now has one page
  // and the table came back empty.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    if (!companyId) return;
    const timer = setTimeout(() => {
      loadExpenses();
    }, 300);
    return () => clearTimeout(timer);
  }, [companyId, page, searchQuery, dateFrom, dateTo]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await expenseService.getExpenses(page, limit, searchQuery, dateFrom, dateTo);
      setExpenses(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await expenseService.deleteExpense(deleteId);
      toast.success("Expense deleted successfully");
      setIsDeleteOpen(false);
      setDeleteId(null);
      loadExpenses();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete expense");
    }
  };

  if (!companyId) return <div className="p-4 text-gray-500">Please select a company</div>;

  const columns = [
    { key: "expenseDate", header: "Date", accessor: (r: any) => formatDate(r.expenseDate) },
    { key: "title", header: "Title", accessor: (r: any) => r.title },
    { 
      key: "category", 
      header: "Category", 
      accessor: (r: any) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {r.category}
        </span>
      )
    },
    { key: "amount", header: "Amount (₹)", accessor: (r: any) => <span className="font-bold text-red-600">₹{(r.amount || 0).toFixed(2)}</span> },
    { key: "paymentMode", header: "Payment Mode", accessor: (r: any) => r.paymentMode },
    { key: "bank", header: "Bank", accessor: (r: any) => r.bankAccountId ? `${r.bankAccountId.bankName} - ${r.bankAccountId.accountNumber}` : "-" },
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
          <h1 className="text-lg font-bold text-gray-900">Expenses</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage daily company expenses</p>
        </div>
        {canAction("payments", "create") && (
          <Button onClick={() => router.push("/expenses/add")} size="sm" leftIcon={<Plus size={14} />} className="btn-primary !px-3 !py-1.5">
            Add Expense
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search expense title..."
            className="!py-1.5 !text-xs"
          />
        </div>
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
        <Button variant="outline" size="sm" onClick={loadExpenses} title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="card">
        <Table 
          columns={columns} 
          data={expenses} 
          isLoading={loading} 
          emptyMessage="No expenses found."
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
        title="Delete Expense"
        message="Are you sure you want to delete this expense? The amount will be refunded back to the bank account."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
