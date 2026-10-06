"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { useCompany } from "@/context/CompanyContext";
import { bankAccountService } from "@/services/bankAccountService";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";
import { exportLedgerToPDF } from "@/lib/pdf";

export default function BankStatementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [loading, setLoading] = useState(true);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);

  useEffect(() => {
    if (companyId && id) {
      loadStatement();
    }
  }, [companyId, id]);

  const loadStatement = async () => {
    setLoading(true);
    try {
      const data = await bankAccountService.getBankAccountStatement(id);
      setBankAccount(data.bankAccount);
      
      // Transform payments into a running balance ledger
      let runningBalance = data.bankAccount.openingBalance || 0;
      
      // Add Opening Balance as first row
      const ledger: any[] = [{
        _id: "opening",
        date: data.bankAccount.createdAt,
        type: "Opening Balance",
        particulars: "-",
        credit: runningBalance > 0 ? runningBalance : 0,
        debit: runningBalance < 0 ? Math.abs(runningBalance) : 0,
        balance: runningBalance
      }];

      // Calculate running balance
      let currentTotalIn = 0;
      let currentTotalOut = 0;
      data.payments.forEach((p: any) => {
        let debit = 0;
        let credit = 0;
        
        if (p.paymentType === "Receive") {
          credit = p.amount; // Money came IN
          currentTotalIn += credit;
          runningBalance += p.amount;
        } else if (p.paymentType === "Pay") {
          debit = p.amount; // Money went OUT
          currentTotalOut += debit;
          runningBalance -= p.amount;
        }

        ledger.push({
          _id: p._id,
          date: p.paymentDate,
          type: p.paymentType === "Receive" ? "Receipt" : "Payment",
          particulars: p.partyType === "BankAccount" ? `${p.partyId?.bankName} (Bank Transfer)` :
                       p.partyType === "Expense" ? `${p.partyId?.title} (Expense)` :
                       p.partyId?.name || p.partyId?.companyName || "-",
          credit,
          debit,
          balance: runningBalance
        });
      });

      // Reverse so newest is at the top, or keep chronological? Chronological is better for statements.
      // Usually users like newest on top for quick view. Let's do reverse chronological but keep opening bal at the bottom.
      ledger.reverse();
      setTransactions(ledger);
      setTotalIn(currentTotalIn);
      setTotalOut(currentTotalOut);

    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load bank statement");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!bankAccount) return;
    
    const pdfRows = transactions.map((t) => [
      formatDate(t.date),
      t.particulars,
      t.type,
      t.credit > 0 ? `+${t.credit.toFixed(2)}` : "-",
      t.debit > 0 ? `-${t.debit.toFixed(2)}` : "-",
      t.balance.toFixed(2)
    ]);

    exportLedgerToPDF(
      `${bankAccount.bankName || "Bank"} Statement`,
      `A/c No: ${bankAccount.accountNumber || "-"} | Branch: ${bankAccount.branch || "-"}`,
      ["Date", "Particulars (Party)", "Voucher Type", "Money In (Rs)", "Money Out (Rs)", "Balance (Rs)"],
      pdfRows,
      `Rs ${(bankAccount.openingBalance || 0).toFixed(2)}`,
      `Rs ${(bankAccount.currentBalance || 0).toFixed(2)}`
    );
  };

  const columns = [
    { key: "date", header: "Date", accessor: (r: any) => formatDate(r.date) },
    { key: "particulars", header: "Particulars (Party)", accessor: (r: any) => r.particulars },
    { key: "type", header: "Voucher Type", accessor: (r: any) => r.type },
    { 
      key: "credit", 
      header: "Money In (₹)", 
      accessor: (r: any) => r.credit > 0 ? <span className="text-green-600 font-medium">₹{r.credit.toFixed(2)}</span> : "-" 
    },
    { 
      key: "debit", 
      header: "Money Out (₹)", 
      accessor: (r: any) => r.debit > 0 ? <span className="text-red-600 font-medium">₹{r.debit.toFixed(2)}</span> : "-" 
    },
    { 
      key: "balance", 
      header: "Balance (₹)", 
      accessor: (r: any) => <span className="font-semibold text-gray-800">₹{r.balance.toFixed(2)}</span> 
    },
  ];

  if (!bankAccount && !loading) {
    return <div className="p-6 text-gray-500">Bank account not found.</div>;
  }

  return (
    <div className="space-y-6 w-full px-6 mx-auto pb-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push("/bank-accounts")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{bankAccount?.bankName || "Bank Statement"}</h1>
          <p className="text-sm text-gray-500 mt-1">A/c No: {bankAccount?.accountNumber || "-"} | Branch: {bankAccount?.branch || "-"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
           <Button variant="outline" onClick={handleDownloadPDF} title="Download PDF">
             <FileDown size={16} className="mr-2" /> PDF
           </Button>
           <Button variant="outline" onClick={loadStatement} title="Refresh">
             <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 font-medium mb-1">Opening Balance</div>
          <div className="text-2xl font-bold text-gray-800">₹{(bankAccount?.openingBalance || 0).toFixed(2)}</div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-green-200">
          <div className="text-sm text-green-600 font-medium mb-1">Total Money In</div>
          <div className="text-2xl font-bold text-green-700">₹{totalIn.toFixed(2)}</div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-red-200">
          <div className="text-sm text-red-600 font-medium mb-1">Total Money Out</div>
          <div className="text-2xl font-bold text-red-700">₹{totalOut.toFixed(2)}</div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="text-sm text-gray-500 font-medium mb-1">Current Balance</div>
          <div className="text-2xl font-bold text-blue-600">₹{(bankAccount?.currentBalance || 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">Transaction Ledger</h3>
        </div>
        <Table columns={columns} data={transactions} isLoading={loading} emptyMessage="No transactions found." />
      </div>
    </div>
  );
}
