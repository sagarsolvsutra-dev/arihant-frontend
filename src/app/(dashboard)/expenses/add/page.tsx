"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { useCompany } from "@/context/CompanyContext";
import { bankAccountService } from "@/services/bankAccountService";
import { expenseService } from "@/services/expenseService";
import { toast } from "@/lib/toast";
import { usesBankAccount } from "@/lib/paymentModes";
import { getTodayDate } from "@/lib/date";

const EXPENSE_CATEGORIES = [
  "Salary",
  "Rent",
  "Electricity",
  "Office Supplies",
  "Marketing",
  "Travel",
  "Meals",
  "Maintenance",
  "Other"
];

export default function AddExpensePage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [banks, setBanks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Form State
  const [expenseDate, setExpenseDate] = useState(getTodayDate());
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!companyId) return;
    loadBanks();
  }, [companyId]);

  const loadBanks = async () => {
    try {
      const b = await bankAccountService.getBankAccounts();
      setBanks(b || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    if (!expenseDate || !title || !category || !amount || !paymentMode) {
      toast.error("Please fill all required fields");
      return;
    }

    const expAmount = Number(amount);
    if (expAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    if (usesBankAccount(paymentMode)) {
      if (!bankAccountId) {
        toast.error("Please select a bank account");
        return;
      }
      const selectedBank = banks.find(b => b._id === bankAccountId);
      if (selectedBank && (selectedBank.currentBalance || 0) < expAmount) {
        toast.error(`Insufficient balance in ${selectedBank.bankName}`);
        return;
      }
    }

    setSaving(true);
    try {
      await expenseService.createExpense({
        companyId,
        expenseDate,
        title,
        category,
        amount: expAmount,
        paymentMode,
        bankAccountId: usesBankAccount(paymentMode) ? bankAccountId : null,
        referenceNo,
        notes
      });
      toast.success("Expense added successfully");
      router.push("/expenses");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add expense");
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) return <div className="p-4 text-gray-500">Please select a company</div>;

  const categoryOptions = EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }));
  const paymentModeOptions = [
    { value: "Cash", label: "Cash" },
    { value: "Bank", label: "Bank Transfer" },
    { value: "UPI", label: "UPI" },
    { value: "Cheque", label: "Cheque" },
  ];
  const bankOptions = banks.map(b => ({
    value: b._id,
    label: `${b.bankName} - ${b.accountNumber} (Bal: ₹${(b.currentBalance || 0).toFixed(2)})`,
  }));

  return (
    <div className="bg-[#f0f0f0] min-h-screen font-sans pb-10">
      <FormToolbar
        title="Add Expense"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/expenses")}
        onClose={() => router.push("/expenses")}
      />
      <div className="w-full px-6 mx-auto space-y-6 pt-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <DatePicker
                label="Expense Date *"
                value={expenseDate}
                onChange={setExpenseDate}
                placeholder="Select date"
              />
            </div>
            <div>
              <Select
                label="Category *"
                options={categoryOptions}
                value={category}
                onChange={setCategory}
              />
            </div>
          </div>

          <div className="mb-6">
            <Input
              label="Title / Description *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Office rent for September"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Amount (₹) *</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="font-bold text-red-600"
              />
            </div>
            <div>
              <Select
                label="Payment Mode *"
                options={paymentModeOptions}
                value={paymentMode}
                onChange={setPaymentMode}
              />
            </div>
            {usesBankAccount(paymentMode) && (
              <div>
                <Select
                  label="Bank Account *"
                  options={bankOptions}
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  placeholder="Select Bank"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Reference No. (Cheque / UTR)"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Reference number"
              />
            </div>
            <div>
              <Input
                label="Additional Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
