"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { useCompany } from "@/context/CompanyContext";
import { paymentService } from "@/services/paymentService";
import { bankAccountService } from "@/services/bankAccountService";
import { customerService } from "@/services/customerService";
import { supplierService } from "@/services/supplierService";
import { toast } from "@/lib/toast";
import { usesBankAccount } from "@/lib/paymentModes";
import { getTodayDate, formatDate } from "@/lib/date";

export default function EditPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  // Master Data
  const [banks, setBanks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Form State
  const [paymentType, setPaymentType] = useState("Receive");
  const [partyType, setPartyType] = useState("Customer");
  const [partyId, setPartyId] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [amount, setAmount] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const [allocationMode, setAllocationMode] = useState<"Auto" | "Manual">("Auto");
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    loadMasters();
  }, [companyId]);

  useEffect(() => {
    if (banks.length > 0 && customers.length > 0 && suppliers.length > 0 && initialLoad && id) {
      loadPayment();
    }
  }, [banks, customers, suppliers, id]);

  const loadPayment = async () => {
    try {
      const p = await paymentService.getPaymentById(id);
      if (p) {
        setPaymentType(p.paymentType);
        setPartyType(p.partyType);
        setPartyId(typeof p.partyId === "object" ? p.partyId._id : p.partyId);
        setPaymentDate(p.paymentDate ? p.paymentDate.split("T")[0] : "");
        setAmount(p.amount);
        setPaymentMode(p.paymentMode);
        setBankAccountId(p.bankAccountId?._id || p.bankAccountId || "");
        setNotes(p.notes || "");
        
        // Wait a bit for pending invoices to load before setting allocations
        setTimeout(() => {
          if (p.allocations && p.allocations.length > 0) {
            setAllocationMode("Manual");
            const allocs: Record<string, number> = {};
            p.allocations.forEach((a: any) => {
              allocs[a.invoiceId] = a.allocatedAmount;
            });
            setManualAllocations(allocs);
          }
        }, 500);
      }
      setInitialLoad(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payment");
    }
  };

  useEffect(() => {
    if (paymentType === "Receive") {
      setPartyType("Customer");
    } else {
      setPartyType("Supplier");
    }
    setPartyId("");
    setPendingInvoices([]);
    setManualAllocations({});
  }, [paymentType]);

  useEffect(() => {
    if (partyId) {
      loadPendingInvoices(partyType, partyId);
    } else {
      setPendingInvoices([]);
      setManualAllocations({});
    }
  }, [partyId]);

  const loadMasters = async () => {
    try {
      const [b, c, s] = await Promise.all([
        bankAccountService.getBankAccounts(),
        customerService.getCustomers(companyId as string, 1, 1000),
        supplierService.getSuppliers(companyId as string, 1, 1000)
      ]);
      setBanks(b || []);
      setCustomers(c.data || []);
      setSuppliers(s.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPendingInvoices = async (pType: string, pId: string) => {
    try {
      const invoices = await paymentService.getPendingInvoices(pType, pId);
      setPendingInvoices(invoices || []);
      setManualAllocations({});
    } catch (err) {
      console.error(err);
      toast.error("Failed to load pending invoices");
    }
  };

  // Auto allocation logic
  const autoAllocations = useMemo(() => {
    const allocs: Record<string, number> = {};
    if (allocationMode !== "Auto") return allocs;
    
    let remaining = Number(amount) || 0;
    if (remaining <= 0) return allocs;

    for (const inv of pendingInvoices) {
      if (remaining <= 0) break;
      const applyAmt = Math.min(inv.pendingAmount, remaining);
      allocs[inv._id] = applyAmt;
      remaining -= applyAmt;
    }
    return allocs;
  }, [amount, pendingInvoices, allocationMode]);

  const currentAllocations = allocationMode === "Auto" ? autoAllocations : manualAllocations;

  const totalAllocated = Object.values(currentAllocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const totalOutstanding = pendingInvoices.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);

  const handleManualChange = (invoiceId: string, val: string) => {
    const num = Number(val);
    setManualAllocations(prev => ({
      ...prev,
      [invoiceId]: isNaN(num) ? 0 : num
    }));
  };

  const handleReset = () => {
    setPaymentDate(getTodayDate());
    setPaymentType("Receive");
    setPartyType("Customer");
    setPartyId("");
    setPaymentMode("Cash");
    setBankAccountId("");
    setAmount("");
    setReferenceNo("");
    setNotes("");
    setAllocationMode("Auto");
    setManualAllocations({});
    setPendingInvoices([]);
  };

  const handleSave = async () => {
    if (!companyId || !partyId || !amount) {
      toast.error("Please fill required fields (Party and Amount)");
      return;
    }
    
    const parsedAmount = Number(amount);
    if (parsedAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (usesBankAccount(paymentMode) && !bankAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    const allocationsList = Object.entries(currentAllocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invoiceId, amountApplied]) => {
        const inv = pendingInvoices.find(i => i._id === invoiceId);
        return {
          invoiceId,
          allocatedAmount: amountApplied,
          invoiceType: inv?.type || (partyType === "Customer" ? "Sale" : "Purchase")
        };
      });

    if (totalAllocated > parsedAmount) {
      toast.error("Allocated amount exceeds total payment amount");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        companyId,
        paymentDate,
        paymentType,
        partyType,
        partyId,
        paymentMode,
        bankAccountId: usesBankAccount(paymentMode) ? bankAccountId : undefined,
        amount: parsedAmount,
        referenceNo,
        notes,
        allocations: allocationsList
      };

      await paymentService.updatePayment(id, payload);
      toast.success("Payment updated successfully");
      router.push("/payments");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) return <div className="p-4 text-gray-500">Please select a company</div>;

  const partyOptions = partyType === "Customer" 
    ? customers.map(c => ({ value: c._id, label: c.name }))
    : suppliers.map(s => ({ value: s._id, label: s.name }));

  return (
    <div className="bg-[#f0f0f0] min-h-screen font-sans pb-10">
      <FormToolbar
        title="Edit Payment Receiver"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/payments")}
        onClose={() => router.push("/payments")}
      />
      <div className="w-full px-6 mx-auto space-y-6 pt-4">
        <p className="text-sm text-gray-500 mt-1 mb-4">Record incoming/outgoing payments — the amount auto-settles against oldest outstanding invoices first.</p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Form */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-6 border-b pb-3">
              <span className="text-gray-700 font-semibold text-sm uppercase tracking-wide">
                Payment Details
              </span>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-4">
              <Select
                label="Payment Type *"
                options={[
                  { value: "Receive", label: "Receive (From Customer)" },
                  { value: "Pay", label: "Pay (To Supplier)" }
                ]}
                value={paymentType}
                onChange={setPaymentType}
                searchable={false}
              />
              <DatePicker
                label="Date *"
                value={paymentDate}
                onChange={setPaymentDate}
                placeholder="Select date"
              />
            </div>

            <div className="mb-4">
              <Select
                label="Party *"
                options={partyOptions}
                value={partyId}
                onChange={setPartyId}
                placeholder={partyType === "Customer" ? "Select Customer" : "Select Supplier"}
              />
            </div>

            <div className="grid grid-cols-2 gap-5 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Amount *</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <Select
                label="Payment Mode *"
                options={[
                  { value: "Cash", label: "Cash" },
                  { value: "Bank", label: "Bank" },
                  { value: "UPI", label: "UPI" },
                  { value: "Cheque", label: "Cheque" }
                ]}
                value={paymentMode}
                onChange={setPaymentMode}
                searchable={false}
              />
            </div>

            {usesBankAccount(paymentMode) && (
              <div className="mb-4">
                <Select
                  label="Bank Account *"
                  options={banks.map(b => ({ value: b._id, label: `${b.bankName} - ${b.accountNumber} (Bal: ₹${(b.currentBalance || 0).toFixed(2)})` }))}
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  placeholder="Select Bank"
                />
              </div>
            )}

            <div className="mb-6">
              <Input
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any extra details..."
              />
            </div>
          </div>
        </div>

        {/* Right Side: Ledger / Allocations */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>Client Ledger</span>
            </h3>

            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-red-50 text-red-700 rounded p-3">
                <div className="text-xs uppercase tracking-wider font-semibold mb-1">Outstanding</div>
                <div className="text-lg font-bold">₹{totalOutstanding.toFixed(2)}</div>
              </div>
              <div className="flex-1 bg-green-50 text-green-700 rounded p-3">
                <div className="text-xs uppercase tracking-wider font-semibold mb-1">Unused Amount</div>
                <div className="text-lg font-bold">₹{Math.max(0, (Number(amount) || 0) - totalAllocated).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">How To Apply</h4>
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  className={`px-3 py-1 text-xs font-medium rounded ${allocationMode === "Auto" ? "bg-black text-white shadow-sm" : "text-gray-600 hover:text-black"}`}
                  onClick={() => setAllocationMode("Auto")}
                >
                  Auto
                </button>
                <button
                  className={`px-3 py-1 text-xs font-medium rounded ${allocationMode === "Manual" ? "bg-black text-white shadow-sm" : "text-gray-600 hover:text-black"}`}
                  onClick={() => setAllocationMode("Manual")}
                >
                  Manual
                </button>
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              {pendingInvoices.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-6">
                  {partyId ? "No pending invoices found." : "Select a party to view pending invoices."}
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvoices.map((inv) => {
                    const applied = currentAllocations[inv._id] || 0;
                    return (
                      <div key={inv._id} className="flex items-center justify-between p-3 rounded-md border border-gray-100 bg-gray-50 hover:border-gray-300 transition-colors">
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{inv.invoiceNo}</div>
                          <div className="text-xs text-gray-500">Bal ₹{inv.pendingAmount.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Date: {formatDate(inv.date)}</span>
                          <div className="w-24">
                            {allocationMode === "Auto" ? (
                              <div className="text-right text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                {applied > 0 ? `+ ₹${applied.toFixed(2)}` : "-"}
                              </div>
                            ) : (
                              <Input
                                type="number"
                                value={manualAllocations[inv._id] === undefined ? "" : manualAllocations[inv._id]}
                                onChange={(e) => handleManualChange(inv._id, e.target.value)}
                                className="!py-1 !text-right !text-sm"
                                placeholder="0"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
