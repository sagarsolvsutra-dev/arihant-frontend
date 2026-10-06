"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { useCompany } from "@/context/CompanyContext";
import { bankAccountService } from "@/services/bankAccountService";
import { bankTransferService } from "@/services/bankTransferService";
import { toast } from "@/lib/toast";
import { getTodayDate } from "@/lib/date";
import { ArrowRightLeft } from "lucide-react";

export default function BankTransferPage() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;
  const router = useRouter();

  const [banks, setBanks] = useState<any[]>([]);
  const [fromBankId, setFromBankId] = useState("");
  const [toBankId, setToBankId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(getTodayDate());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!fromBankId || !toBankId || !amount || !date) {
      toast.error("Please fill all required fields");
      return;
    }
    if (fromBankId === toBankId) {
      toast.error("Source and destination banks cannot be the same");
      return;
    }
    
    const transferAmount = Number(amount);
    if (transferAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    const sourceBank = banks.find(b => b._id === fromBankId);
    if (sourceBank && (sourceBank.currentBalance || 0) < transferAmount) {
      toast.error(`Insufficient balance in ${sourceBank.bankName}`);
      return;
    }

    setSaving(true);
    try {
      await bankTransferService.createBankTransfer({
        companyId,
        fromBankId,
        toBankId,
        amount: transferAmount,
        date,
        notes
      });
      toast.success("Funds transferred successfully");
      router.push("/bank-transfer");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to transfer funds");
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) return <div className="p-4 text-gray-500">Please select a company</div>;

  const bankOptions = banks.map((b) => ({
    value: b._id,
    label: `${b.bankName} - ${b.accountNumber} (Bal: ₹${(b.currentBalance || 0).toFixed(2)})`,
  }));

  return (
    <div className="bg-[#f0f0f0] min-h-screen font-sans pb-10">
      <FormToolbar
        title="Bank to Bank Transfer"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/bank-transfer")}
        onClose={() => router.push("/bank-transfer")}
      />
      <div className="w-full px-6 mx-auto space-y-6 pt-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6 border-b pb-4">
            <ArrowRightLeft className="text-gray-500 w-5 h-5" />
            <h2 className="text-gray-800 font-semibold text-base">Transfer Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block mb-1">From Bank Account *</label>
              <Select
                options={bankOptions}
                value={fromBankId}
                onChange={setFromBankId}
                placeholder="Select Source Bank"
              />
              <p className="text-[10px] text-gray-400 mt-1">Funds will be deducted from this account</p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block mb-1">To Bank Account *</label>
              <Select
                options={bankOptions}
                value={toBankId}
                onChange={setToBankId}
                placeholder="Select Destination Bank"
              />
              <p className="text-[10px] text-gray-400 mt-1">Funds will be added to this account</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Transfer Amount (₹) *</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                className="text-lg font-semibold"
              />
            </div>
            
            <div>
              <DatePicker
                label="Transfer Date *"
                value={date}
                onChange={setDate}
                placeholder="Select date"
              />
            </div>
          </div>

          <div>
            <Input
              label="Notes / Reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UTR number, internal transfer reason..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
