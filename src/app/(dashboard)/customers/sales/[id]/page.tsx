"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Receipt, TrendingDown, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useCompany } from "@/context/CompanyContext";
import { itemService } from "@/services/itemService";
import { saleService } from "@/services/saleService";
import { saleReturnService } from "@/services/saleReturnService";
import { customerService } from "@/services/customerService";
import { splitCasePcs } from "@/lib/stock";
import { toast } from "@/lib/toast";

interface SaleLine {
  itemId: string;
  itemName: string;
  caseQty?: number;
  pcsQty?: number;
  totalPieces?: number;
  afterGstRate?: number;
  taxableValue?: number;
  netValue?: number;
}

interface SaleRecord {
  _id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId?: { _id: string; name: string } | string;
  pendingAmount?: number;
  items?: SaleLine[];
}

interface LineRow {
  saleId: string;
  invoiceNo: string;
  invoiceDate: string;
  itemName: string;
  subGroupName: string;
  caseQty: number;
  pcsQty: number;
  totalPieces: number;
  rate: number;
  netValue: number;
}

interface ItemSummaryRow {
  itemName: string;
  subGroupName: string;
  totalCase: number;
  totalPcs: number;
  totalTaxableValue: number;
  totalNetValue: number;
}

interface SaleReturnLine {
  itemId?: string;
  itemName: string;
  caseQty?: number;
  pcsQty?: number;
  afterGstRate?: number;
  netValue?: number;
}

interface SaleReturnRecord {
  _id: string;
  returnNo: string;
  returnDate: string;
  customerId?: { _id: string; name: string } | string;
  items?: SaleReturnLine[];
}

interface ReturnLineRow {
  returnId: string;
  returnNo: string;
  returnDate: string;
  itemName: string;
  subGroupName: string;
  caseQty: number;
  pcsQty: number;
  rate: number;
  netValue: number;
}

export default function CustomerSalesHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [pendingTotal, setPendingTotal] = useState(0);
  const [lineRows, setLineRows] = useState<LineRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<ItemSummaryRow[]>([]);
  const [returnLineRows, setReturnLineRows] = useState<ReturnLineRow[]>([]);

  useEffect(() => {
    if (!companyId || !customerId) return;
    setLoading(true);
    Promise.all([
      customerService.getCustomerById(customerId),
      itemService.getItems(companyId, 1, 1000),
      saleService.getSales(companyId, 1, 1000),
      saleReturnService.getSaleReturns(companyId, 1, 1000),
    ])
      .then(([customerRes, itemRes, saleRes, saleReturnRes]: [any, any, any, any]) => {
        setCustomerName(customerRes?.name || "(unknown customer)");

        // Unlike Purchase (which has no supplierId field), Sale.customerId IS a real,
        // persisted field — no join through Item is needed, just a direct filter.
        const itemList = itemRes.data || itemRes || [];
        const itemPackingMap = new Map<string, number>(
          itemList.map((i: any) => [i._id, parseFloat(String(i.packing)) || 1])
        );
        // Same item name can legitimately repeat across different Sub Groups (see
        // CLAUDE.md's Item model note) — every table on this page shows Sub Group
        // alongside Item Name so two same-named items stay distinguishable.
        const itemSubGroupMap = new Map<string, string>(
          itemList.map((i: any) => [i._id, (typeof i.itemSubGroupId === "object" ? i.itemSubGroupId?.name : "") || "-"])
        );

        // SaleReturn.customerId IS a real, persisted field — direct filter, no join.
        const returnList: SaleReturnRecord[] = saleReturnRes.data || saleReturnRes || [];
        const returnLines: ReturnLineRow[] = [];
        returnList.forEach((sr) => {
          const srCustomerId = typeof sr.customerId === "string" ? sr.customerId : sr.customerId?._id;
          if (srCustomerId !== customerId) return;
          (sr.items || []).forEach((line) => {
            returnLines.push({
              returnId: sr._id,
              returnNo: sr.returnNo,
              returnDate: sr.returnDate,
              itemName: line.itemName,
              subGroupName: (line.itemId && itemSubGroupMap.get(line.itemId)) || "-",
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              rate: line.afterGstRate || 0,
              netValue: line.netValue || 0,
            });
          });
        });
        returnLines.sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
        setReturnLineRows(returnLines);

        const saleList: SaleRecord[] = saleRes.data || saleRes || [];
        const lines: LineRow[] = [];
        const summaryPiecesMap = new Map<string, { itemName: string; subGroupName: string; totalPieces: number; totalTaxableValue: number; totalNetValue: number }>();
        let pending = 0;

        saleList.forEach((s) => {
          const sCustomerId = typeof s.customerId === "string" ? s.customerId : s.customerId?._id;
          if (sCustomerId !== customerId) return;
          pending += s.pendingAmount || 0;

          (s.items || []).forEach((line) => {
            const caseQty = line.caseQty || 0;
            const pcsQty = line.pcsQty || 0;
            const totalPieces = line.totalPieces || 0;
            const netValue = line.netValue || 0;
            const taxableValue = line.taxableValue || 0;

            lines.push({
              saleId: s._id,
              invoiceNo: s.invoiceNo,
              invoiceDate: s.invoiceDate,
              itemName: line.itemName,
              subGroupName: itemSubGroupMap.get(line.itemId) || "-",
              caseQty,
              pcsQty,
              totalPieces,
              rate: line.afterGstRate || 0,
              netValue,
            });

            const existing = summaryPiecesMap.get(line.itemId) || {
              itemName: line.itemName,
              subGroupName: itemSubGroupMap.get(line.itemId) || "-",
              totalPieces: 0,
              totalTaxableValue: 0,
              totalNetValue: 0,
            };
            existing.totalPieces += totalPieces;
            existing.totalTaxableValue += taxableValue;
            existing.totalNetValue += netValue;
            summaryPiecesMap.set(line.itemId, existing);
          });
        });

        lines.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        const summary = Array.from(summaryPiecesMap.entries())
          .map(([itemId, v]) => {
            const split = splitCasePcs(v.totalPieces, itemPackingMap.get(itemId) || 1);
            return {
              itemName: v.itemName,
              subGroupName: v.subGroupName,
              totalCase: split.case,
              totalPcs: split.pcs,
              totalTaxableValue: v.totalTaxableValue,
              totalNetValue: v.totalNetValue,
            };
          })
          .sort((a, b) => b.totalNetValue - a.totalNetValue);

        setLineRows(lines);
        setSummaryRows(summary);
        setPendingTotal(pending);
      })
      .catch((err: any) => {
        console.error(err);
        toast.error("Failed to load sale history");
      })
      .finally(() => setLoading(false));
  }, [companyId, customerId]);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a company first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const grandTotal = summaryRows.reduce((s, r) => s + r.totalNetValue, 0);
  const grandTotalReturned = returnLineRows.reduce((s, r) => s + r.netValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/customers")} leftIcon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={20} className="text-blue-600" />
            {customerName} — Sale History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every Sale to {customerName} ({lineRows.length} lines across{" "}
            {new Set(lineRows.map((l) => l.saleId)).size} invoices)
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500">Total Sold (Net Value)</div>
            <div className="text-2xl font-bold text-blue-900">₹{grandTotal.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Pending</div>
            <div className="text-2xl font-bold text-red-600">₹{pendingTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">Summary by Item</div>
        <Table
          columns={[
            { key: "item", header: "Item", accessor: (r: ItemSummaryRow) => r.itemName, primary: true },
            { key: "subGroup", header: "Sub Group", accessor: (r: ItemSummaryRow) => r.subGroupName },
            { key: "case", header: "Total Case", align: "right" as const, accessor: (r: ItemSummaryRow) => r.totalCase },
            { key: "pcs", header: "Total Pcs (loose)", align: "right" as const, accessor: (r: ItemSummaryRow) => r.totalPcs },
            { key: "taxable", header: "Taxable Value", align: "right" as const, accessor: (r: ItemSummaryRow) => `₹${r.totalTaxableValue.toFixed(2)}` },
            { key: "net", header: "Net Value", align: "right" as const, accessor: (r: ItemSummaryRow) => `₹${r.totalNetValue.toFixed(2)}` },
          ]}
          data={summaryRows}
          emptyMessage="No sales recorded yet for this customer."
        />
      </div>

      <div className="card overflow-hidden">
        <Tabs
          tabs={[
            {
              key: "lines",
              label: "All Sale Lines",
              icon: <TrendingDown size={14} />,
              badge: `₹${grandTotal.toFixed(2)}`,
              content: (
                <Table
                  columns={[
                    {
                      key: "invoiceNo",
                      header: "Invoice No",
                      primary: true,
                      accessor: (r: LineRow) => (
                        <button
                          type="button"
                          onClick={() => router.push(`/sale/edit/${r.saleId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.invoiceNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: LineRow) => (r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-") },
                    { key: "item", header: "Item", accessor: (r: LineRow) => r.itemName },
                    { key: "subGroup", header: "Sub Group", accessor: (r: LineRow) => r.subGroupName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: LineRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: LineRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: LineRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: LineRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={lineRows}
                  emptyMessage="No sale lines found."
                />
              ),
            },
            {
              key: "returns",
              label: "Sale Return History",
              icon: <Undo2 size={14} />,
              badge: `₹${grandTotalReturned.toFixed(2)}`,
              content: (
                <Table
                  columns={[
                    {
                      key: "returnNo",
                      header: "Return No",
                      primary: true,
                      accessor: (r: ReturnLineRow) => (
                        <button
                          type="button"
                          onClick={() => router.push(`/sale-return/edit/${r.returnId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.returnNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: ReturnLineRow) => (r.returnDate ? new Date(r.returnDate).toLocaleDateString("en-IN") : "-") },
                    { key: "item", header: "Item", accessor: (r: ReturnLineRow) => r.itemName },
                    { key: "subGroup", header: "Sub Group", accessor: (r: ReturnLineRow) => r.subGroupName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: ReturnLineRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: ReturnLineRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: ReturnLineRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: ReturnLineRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={returnLineRows}
                  emptyMessage="No sale returns recorded yet for this customer."
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
