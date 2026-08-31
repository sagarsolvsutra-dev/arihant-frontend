"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Receipt, ShoppingCart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useCompany } from "@/context/CompanyContext";
import { itemService } from "@/services/itemService";
import { purchaseService } from "@/services/purchaseService";
import { purchaseReturnService } from "@/services/purchaseReturnService";
import { supplierService } from "@/services/supplierService";
import { splitCasePcs } from "@/lib/stock";
import { toast } from "sonner";

interface PurchaseLine {
  itemId: string;
  itemName: string;
  caseQty?: number;
  pcsQty?: number;
  totalPieces?: number;
  beforeGstRate?: number;
  taxableValue?: number;
  netValue?: number;
}

interface PurchaseRecord {
  _id: string;
  invoiceNo: string;
  invoiceDate: string;
  pendingAmount?: number;
  items?: PurchaseLine[];
}

interface LineRow {
  purchaseId: string;
  invoiceNo: string;
  invoiceDate: string;
  itemName: string;
  caseQty: number;
  pcsQty: number;
  totalPieces: number;
  rate: number;
  netValue: number;
}

interface ItemSummaryRow {
  itemName: string;
  totalCase: number;
  totalPcs: number;
  totalTaxableValue: number;
  totalNetValue: number;
}

interface PurchaseReturnLine {
  itemName: string;
  caseQty?: number;
  pcsQty?: number;
  beforeGstRate?: number;
  netValue?: number;
}

interface PurchaseReturnRecord {
  _id: string;
  returnNo: string;
  returnDate: string;
  supplierId?: { _id: string; name: string } | string;
  items?: PurchaseReturnLine[];
}

interface ReturnLineRow {
  returnId: string;
  returnNo: string;
  returnDate: string;
  itemName: string;
  caseQty: number;
  pcsQty: number;
  rate: number;
  netValue: number;
}

export default function SupplierPurchaseHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [loading, setLoading] = useState(true);
  const [supplierName, setSupplierName] = useState("");
  const [lineRows, setLineRows] = useState<LineRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<ItemSummaryRow[]>([]);
  const [returnLineRows, setReturnLineRows] = useState<ReturnLineRow[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);

  useEffect(() => {
    if (!companyId || !supplierId) return;
    setLoading(true);
    Promise.all([
      supplierService.getSupplierById(supplierId),
      itemService.getItems(companyId, 1, 1000),
      purchaseService.getPurchases(companyId, 1, 1000),
      purchaseReturnService.getPurchaseReturns(companyId, 1, 1000),
    ])
      .then(([supplierRes, itemRes, purchaseRes, purchaseReturnRes]: [any, any, any, any]) => {
        setSupplierName(supplierRes?.name || "(unknown supplier)");

        // Unlike Purchase, PurchaseReturn.supplierId IS a real, persisted field —
        // no join through Item is needed, just a direct filter.
        const returnList: PurchaseReturnRecord[] = purchaseReturnRes.data || purchaseReturnRes || [];
        const returnLines: ReturnLineRow[] = [];
        returnList.forEach((pr) => {
          const prSupplierId = typeof pr.supplierId === "string" ? pr.supplierId : pr.supplierId?._id;
          if (prSupplierId !== supplierId) return;
          (pr.items || []).forEach((line) => {
            returnLines.push({
              returnId: pr._id,
              returnNo: pr.returnNo,
              returnDate: pr.returnDate,
              itemName: line.itemName,
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              rate: line.beforeGstRate || 0,
              netValue: line.netValue || 0,
            });
          });
        });
        returnLines.sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
        setReturnLineRows(returnLines);

        // Purchase records don't carry supplierId directly — a "purchase from this
        // supplier" is derived by joining through Item.supplierId, since Supplier is
        // the item's principal/brand, not a field on Purchase itself (see CLAUDE.md).
        const itemList = itemRes.data || itemRes || [];
        const supplierItemIds = new Set(
          itemList
            .filter((i: any) => (typeof i.supplierId === "object" ? i.supplierId?._id : i.supplierId) === supplierId)
            .map((i: any) => i._id)
        );
        // Packing per item, so the per-item summary can be re-split into whole
        // Case + remaining Pcs after summing across invoices (see splitCasePcs).
        const itemPackingMap = new Map<string, number>(
          itemList.map((i: any) => [i._id, parseFloat(String(i.packing)) || 1])
        );

        const purchaseList: PurchaseRecord[] = purchaseRes.data || purchaseRes || [];
        const lines: LineRow[] = [];
        const summaryPiecesMap = new Map<string, { itemName: string; totalPieces: number; totalTaxableValue: number; totalNetValue: number }>();
        // pendingAmount is header-level on Purchase, not per-line — count each matching
        // invoice's pendingAmount exactly once, even if it has multiple lines for this supplier.
        const countedPurchaseIds = new Set<string>();
        let pending = 0;

        purchaseList.forEach((p) => {
          (p.items || []).forEach((line) => {
            if (!supplierItemIds.has(line.itemId)) return;
            if (!countedPurchaseIds.has(p._id)) {
              countedPurchaseIds.add(p._id);
              pending += p.pendingAmount || 0;
            }
            const caseQty = line.caseQty || 0;
            const pcsQty = line.pcsQty || 0;
            const totalPieces = line.totalPieces || 0;
            const netValue = line.netValue || 0;
            const taxableValue = line.taxableValue || 0;

            lines.push({
              purchaseId: p._id,
              invoiceNo: p.invoiceNo,
              invoiceDate: p.invoiceDate,
              itemName: line.itemName,
              caseQty,
              pcsQty,
              totalPieces,
              rate: line.beforeGstRate || 0,
              netValue,
            });

            const existing = summaryPiecesMap.get(line.itemId) || {
              itemName: line.itemName,
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
        setPendingTotal(pending);

        lines.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        const summary = Array.from(summaryPiecesMap.entries())
          .map(([itemId, v]) => {
            const split = splitCasePcs(v.totalPieces, itemPackingMap.get(itemId) || 1);
            return {
              itemName: v.itemName,
              totalCase: split.case,
              totalPcs: split.pcs,
              totalTaxableValue: v.totalTaxableValue,
              totalNetValue: v.totalNetValue,
            };
          })
          .sort((a, b) => b.totalNetValue - a.totalNetValue);

        setLineRows(lines);
        setSummaryRows(summary);
      })
      .catch((err: any) => {
        console.error(err);
        toast.error("Failed to load purchase history");
      })
      .finally(() => setLoading(false));
  }, [companyId, supplierId]);

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
        <Button variant="outline" size="sm" onClick={() => router.push("/suppliers")} leftIcon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={20} className="text-green-600" />
            {supplierName} — Purchase History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every Purchase line for items whose Supplier is {supplierName} ({lineRows.length} lines across{" "}
            {new Set(lineRows.map((l) => l.purchaseId)).size} invoices)
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500">Total Purchased (Net Value)</div>
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
            { key: "case", header: "Total Case", align: "right" as const, accessor: (r: ItemSummaryRow) => r.totalCase },
            { key: "pcs", header: "Total Pcs (loose)", align: "right" as const, accessor: (r: ItemSummaryRow) => r.totalPcs },
            { key: "taxable", header: "Taxable Value", align: "right" as const, accessor: (r: ItemSummaryRow) => `₹${r.totalTaxableValue.toFixed(2)}` },
            { key: "net", header: "Net Value", align: "right" as const, accessor: (r: ItemSummaryRow) => `₹${r.totalNetValue.toFixed(2)}` },
          ]}
          data={summaryRows}
          emptyMessage="No purchases recorded yet for any item under this supplier."
        />
      </div>

      <div className="card overflow-hidden">
        <Tabs
          tabs={[
            {
              key: "lines",
              label: "All Purchase Lines",
              icon: <ShoppingCart size={14} />,
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
                          onClick={() => router.push(`/purchase/edit/${r.purchaseId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.invoiceNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: LineRow) => (r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-") },
                    { key: "item", header: "Item", accessor: (r: LineRow) => r.itemName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: LineRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: LineRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: LineRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: LineRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={lineRows}
                  emptyMessage="No purchase lines found."
                />
              ),
            },
            {
              key: "returns",
              label: "Purchase Return History",
              icon: <RotateCcw size={14} />,
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
                          onClick={() => router.push(`/purchase-return/edit/${r.returnId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.returnNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: ReturnLineRow) => (r.returnDate ? new Date(r.returnDate).toLocaleDateString("en-IN") : "-") },
                    { key: "item", header: "Item", accessor: (r: ReturnLineRow) => r.itemName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: ReturnLineRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: ReturnLineRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: ReturnLineRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: ReturnLineRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={returnLineRows}
                  emptyMessage="No purchase returns recorded yet for this supplier."
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
