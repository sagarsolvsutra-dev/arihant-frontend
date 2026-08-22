"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { useCompany } from "@/context/CompanyContext";
import { openingBillService } from "@/services/openingBillService";
import { supplierService } from "@/services/supplierService";

export default function AddPurchaseOpeningBillPage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string }[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [billDate, setBillDate] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pendingAmount, setPendingAmount] = useState("");

  useEffect(() => {
    if (companyId) {
      supplierService.getSuppliers(companyId).then((res) => {
        setSuppliers(res.data || res || []);
      });
    }
  }, [companyId]);

  // When amount changes, auto-fill pending amount
  useEffect(() => {
    if (amount && !pendingAmount) {
      setPendingAmount(amount);
    }
  }, [amount]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId || !supplierId || !billDate || !billNumber || !amount) {
      alert("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      await openingBillService.createOpeningBill({
        companyId,
        type: "purchase",
        supplierId,
        billDate,
        billNo: billNumber.trim(),
        totalAmount: parseFloat(amount),
        pendingAmount: parseFloat(pendingAmount) || parseFloat(amount),
      });
      router.push("/opening-bills/purchase");
    } catch (err) {
      console.error(err);
      alert("Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a company first.</p>
      </div>
    );
  }

  const inputClass = "!h-[32px] !py-1 !px-2 !text-sm !rounded-md !bg-white";
  const selectClass = "!h-[32px] !py-1 !px-2 !text-sm !rounded-md !bg-white flex items-center";

  return (
    <div className="mx-auto bg-[#f0f0f0] min-h-screen font-sans">
      <FormToolbar
        title="Opening Pending of Purchase Bill"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/opening-bills/purchase")}
        onClose={() => router.push("/opening-bills/purchase")}
      />

      <div className="p-3 flex gap-4 max-w-[1200px] mx-auto text-sm">
        
        {/* Left Form Area */}
        <div className="flex-[1.5] border border-gray-300 bg-white p-4 rounded-md shadow-sm">
          <table className="w-full border-separate" style={{ borderSpacing: '0 10px' }}>
            <tbody>
              <tr>
                <td className="w-[180px] align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Supplier Name</td>
                <td className="flex gap-2 items-start relative z-[60]">
                  <div className="w-96">
                    <Select 
                      options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                      value={supplierId} 
                      onChange={setSupplierId}
                      className={selectClass}
                    />
                  </div>
                  <button className="h-[32px] px-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded font-bold text-gray-600">3 +</button>
                </td>
              </tr>
              
              <tr>
                <td className="w-[180px] align-middle font-medium text-gray-700 whitespace-nowrap">Invoice No.</td>
                <td>
                  <div className="w-48">
                    <Input 
                      type="text" 
                      value={billNumber} 
                      onChange={(e) => setBillNumber(e.target.value)} 
                      className={inputClass}
                    />
                  </div>
                </td>
              </tr>

              <tr>
                <td className="w-[180px] align-middle font-medium text-gray-700 whitespace-nowrap">Invoice Date</td>
                <td>
                  <div className="w-48">
                    <Input 
                      type="date" 
                      value={billDate} 
                      onChange={(e) => setBillDate(e.target.value)} 
                      className={inputClass}
                    />
                  </div>
                </td>
              </tr>

              <tr>
                <td className="w-[180px] align-middle font-medium text-gray-700 whitespace-nowrap">Invoice Amount</td>
                <td>
                  <div className="w-48">
                    <Input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      className={inputClass}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </td>
              </tr>

              <tr>
                <td className="w-[180px] align-middle font-medium text-gray-700 whitespace-nowrap">Pending Amount</td>
                <td>
                  <div className="w-48">
                    <Input 
                      type="number" 
                      value={pendingAmount} 
                      onChange={(e) => setPendingAmount(e.target.value)} 
                      className={inputClass}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Area - Mock Panels */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="border border-gray-300 bg-[#f8f9fa] p-2 rounded-sm shadow-sm flex flex-col gap-2 w-64">
             <div className="flex items-center justify-between">
                <span className="bg-gray-200 px-2 py-0.5 text-xs border border-gray-300 rounded-sm">Field</span>
                <select className="border border-gray-300 text-xs px-1 py-0.5 w-32 bg-white">
                  <option>Invoice No.</option>
                </select>
             </div>
             <div className="flex items-center justify-between">
                <span className="bg-gray-200 px-2 py-0.5 text-xs border border-gray-300 rounded-sm">Search</span>
                <input type="text" className="border border-gray-300 text-xs px-1 py-0.5 w-32" />
             </div>
          </div>
          
          <div className="border border-gray-300 bg-white p-2 rounded-sm shadow-sm flex flex-col gap-4 w-64">
             <div className="flex gap-2">
                <span className="text-xs mt-1 font-medium text-gray-600">Add</span>
                <div className="flex flex-col gap-1 w-40">
                  <input type="text" className="border border-black h-6 px-1 text-xs" />
                  <input type="text" className="border border-black h-6 px-1 text-xs" />
                  <input type="text" className="border border-black h-6 px-1 text-xs" />
                </div>
             </div>
             <div className="flex gap-2">
                <span className="text-xs mt-1 font-medium text-gray-600">Edit</span>
                <div className="flex flex-col gap-1 w-40">
                  <input type="text" className="border border-black h-6 px-1 text-xs" />
                  <input type="text" className="border border-black h-6 px-1 text-xs" />
                  <input type="text" className="border border-black h-6 px-1 text-xs" />
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
