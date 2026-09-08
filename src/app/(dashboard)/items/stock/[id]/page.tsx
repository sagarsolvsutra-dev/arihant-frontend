"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Boxes, ShoppingCart, TrendingDown, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useCompany } from "@/context/CompanyContext";
import { itemService } from "@/services/itemService";
import { godownService } from "@/services/godownService";
import { purchaseService } from "@/services/purchaseService";
import { saleService } from "@/services/saleService";
import { purchaseReturnService } from "@/services/purchaseReturnService";
import { saleReturnService } from "@/services/saleReturnService";
import { splitCasePcs } from "@/lib/stock";
import { toast } from "sonner";

interface GodownStockBucket {
  godownId: string;
  openingStockFreshPcs?: number;
  openingStockExpiredPcs?: number;
  openingStockDamagedPcs?: number;
}

interface MrpEntry {
  mrp?: number;
  packing?: number;
  godownStock?: GodownStockBucket[];
}

interface ItemRecord {
  _id: string;
  itemName: string;
  codeBarCode?: string;
  hsnCode?: string;
  packing?: number;
  openingStockFreshCase?: number;
  openingStockFreshPcs?: number;
  openingStockExpiredCase?: number;
  openingStockExpiredPcs?: number;
  openingStockDamagedCase?: number;
  openingStockDamagedPcs?: number;
  mrpEntries?: MrpEntry[];
}

interface GodownRow {
  godownId: string;
  godownName: string;
  freshPcs: number;
  freshCase: number;
  freshTotalPcs: number;
  expiredPcs: number;
  expiredCase: number;
  expiredTotalPcs: number;
  damagedPcs: number;
  damagedCase: number;
  damagedTotalPcs: number;
}

interface PurchaseLine {
  itemId: string;
  godownId?: string;
  caseQty?: number;
  pcsQty?: number;
  beforeGstRate?: number;
  netValue?: number;
}

interface PurchaseRecord {
  _id: string;
  invoiceNo: string;
  invoiceDate: string;
  items?: PurchaseLine[];
}

interface PurchaseRow {
  purchaseId: string;
  invoiceNo: string;
  invoiceDate: string;
  godownName: string;
  caseQty: number;
  pcsQty: number;
  rate: number;
  netValue: number;
}

interface SaleLine {
  itemId: string;
  godownId?: string;
  caseQty?: number;
  pcsQty?: number;
  afterGstRate?: number;
  netValue?: number;
}

interface SaleRecord {
  _id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerId?: { _id: string; name: string } | string;
  items?: SaleLine[];
}

interface SaleRow {
  saleId: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  godownName: string;
  caseQty: number;
  pcsQty: number;
  rate: number;
  netValue: number;
}

interface ReturnLine {
  itemId: string;
  godownId?: string;
  caseQty?: number;
  pcsQty?: number;
  totalPieces?: number;
  beforeGstRate?: number;
  afterGstRate?: number;
  netValue?: number;
  condition?: "Fresh" | "Expired" | "Damaged";
}

interface PurchaseReturnRecord {
  _id: string;
  returnNo: string;
  returnDate: string;
  supplierId?: { _id: string; name: string } | string;
  items?: ReturnLine[];
}

interface SaleReturnRecord {
  _id: string;
  returnNo: string;
  returnDate: string;
  customerId?: { _id: string; name: string } | string;
  items?: ReturnLine[];
}

interface ReturnRow {
  returnId: string;
  returnNo: string;
  returnDate: string;
  partyName: string;
  godownName: string;
  caseQty: number;
  pcsQty: number;
  totalPieces: number;
  rate: number;
  netValue: number;
  condition: "Fresh" | "Expired" | "Damaged";
}

// Fresh = green (sellable), Expired = amber, Damaged = red — 3 genuinely
// separate, independently-tracked stock buckets, not one bucket with two labels.
function conditionPillClass(condition: string) {
  if (condition === "Expired") return "bg-amber-100 text-amber-700";
  if (condition === "Damaged") return "bg-red-100 text-red-700";
  return "bg-green-100 text-green-700";
}

export default function ItemStockPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<ItemRecord | null>(null);
  const [rows, setRows] = useState<GodownRow[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  const [saleRows, setSaleRows] = useState<SaleRow[]>([]);
  const [purchaseReturnRows, setPurchaseReturnRows] = useState<ReturnRow[]>([]);
  const [saleReturnRows, setSaleReturnRows] = useState<ReturnRow[]>([]);

  useEffect(() => {
    if (!companyId || !itemId) return;
    setLoading(true);
    Promise.all([
      itemService.getItemById(itemId),
      godownService.getGodowns(companyId, 1, 1000),
      purchaseService.getPurchases(companyId, 1, 1000),
      saleService.getSales(companyId, 1, 1000),
      purchaseReturnService.getPurchaseReturns(companyId, 1, 1000),
      saleReturnService.getSaleReturns(companyId, 1, 1000),
    ])
      .then(([itemRes, godownRes, purchaseRes, saleRes, purchaseReturnRes, saleReturnRes]: [any, any, any, any, any, any]) => {
        const godownList = godownRes.data || godownRes || [];
        const godownNameMap = new Map<string, string>(godownList.map((g: any) => [g._id, g.name]));

        setItem(itemRes);

        // Every Purchase line for this item — Purchase has no real supplierId field
        // (see Purchase model note), so no Supplier column here; Godown is real.
        const purchaseList: PurchaseRecord[] = purchaseRes.data || purchaseRes || [];
        const builtPurchaseRows: PurchaseRow[] = [];
        purchaseList.forEach((p) => {
          (p.items || []).forEach((line) => {
            if (line.itemId !== itemId) return;
            builtPurchaseRows.push({
              purchaseId: p._id,
              invoiceNo: p.invoiceNo,
              invoiceDate: p.invoiceDate,
              godownName: godownNameMap.get(String(line.godownId)) || "-",
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              rate: line.beforeGstRate || 0,
              netValue: line.netValue || 0,
            });
          });
        });
        builtPurchaseRows.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        setPurchaseRows(builtPurchaseRows);

        // Every Purchase Return line for this item — where it's been sent back to a supplier.
        const purchaseReturnList: PurchaseReturnRecord[] = purchaseReturnRes.data || purchaseReturnRes || [];
        const builtPurchaseReturnRows: ReturnRow[] = [];
        purchaseReturnList.forEach((pr) => {
          const supplierName = typeof pr.supplierId === "object" ? pr.supplierId?.name : "";
          (pr.items || []).forEach((line) => {
            if (line.itemId !== itemId) return;
            builtPurchaseReturnRows.push({
              returnId: pr._id,
              returnNo: pr.returnNo,
              returnDate: pr.returnDate,
              partyName: supplierName || "-",
              godownName: godownNameMap.get(String(line.godownId)) || "-",
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              totalPieces: line.totalPieces || 0,
              rate: line.beforeGstRate || 0,
              netValue: line.netValue || 0,
              condition: ["Fresh", "Expired", "Damaged"].includes(line.condition as string) ? (line.condition as "Fresh" | "Expired" | "Damaged") : "Fresh",
            });
          });
        });
        builtPurchaseReturnRows.sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
        setPurchaseReturnRows(builtPurchaseReturnRows);

        // Every Sale Return line for this item — where a customer sent it back.
        const saleReturnList: SaleReturnRecord[] = saleReturnRes.data || saleReturnRes || [];
        const builtSaleReturnRows: ReturnRow[] = [];
        saleReturnList.forEach((sr) => {
          const customerName = typeof sr.customerId === "object" ? sr.customerId?.name : "";
          (sr.items || []).forEach((line) => {
            if (line.itemId !== itemId) return;
            builtSaleReturnRows.push({
              returnId: sr._id,
              returnNo: sr.returnNo,
              returnDate: sr.returnDate,
              partyName: customerName || "-",
              godownName: godownNameMap.get(String(line.godownId)) || "-",
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              totalPieces: line.totalPieces || 0,
              rate: line.afterGstRate || 0,
              netValue: line.netValue || 0,
              condition: ["Fresh", "Expired", "Damaged"].includes(line.condition as string) ? (line.condition as "Fresh" | "Expired" | "Damaged") : "Fresh",
            });
          });
        });
        builtSaleReturnRows.sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
        setSaleReturnRows(builtSaleReturnRows);

        // Every Sale line for this item, across all customers/godowns — lets you see
        // where/how much of this item has actually sold, not just current stock.
        const saleList: SaleRecord[] = saleRes.data || saleRes || [];
        const builtSaleRows: SaleRow[] = [];
        saleList.forEach((s) => {
          const customerName = typeof s.customerId === "object" ? s.customerId?.name : "";
          (s.items || []).forEach((line) => {
            if (line.itemId !== itemId) return;
            builtSaleRows.push({
              saleId: s._id,
              invoiceNo: s.invoiceNo,
              invoiceDate: s.invoiceDate,
              customerName: customerName || "-",
              godownName: godownNameMap.get(String(line.godownId)) || "-",
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              rate: line.afterGstRate || 0,
              netValue: line.netValue || 0,
            });
          });
        });
        builtSaleRows.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        setSaleRows(builtSaleRows);

        // Sum every MRP tier's godownStock bucket per godown — the item can carry
        // multiple price tiers, but "stock in Godown X" is a physical quantity, not
        // tier-specific, so tiers are combined here.
        const byGodown = new Map<string, { freshPcs: number; expiredPcs: number; damagedPcs: number }>();
        const packing = parseFloat(String(itemRes.packing)) || 1;
        (itemRes.mrpEntries || []).forEach((entry: MrpEntry) => {
          (entry.godownStock || []).forEach((bucket: GodownStockBucket) => {
            const gid = String(bucket.godownId);
            const existing = byGodown.get(gid) || { freshPcs: 0, expiredPcs: 0, damagedPcs: 0 };
            existing.freshPcs += parseFloat(String(bucket.openingStockFreshPcs)) || 0;
            existing.expiredPcs += parseFloat(String(bucket.openingStockExpiredPcs)) || 0;
            existing.damagedPcs += parseFloat(String(bucket.openingStockDamagedPcs)) || 0;
            byGodown.set(gid, existing);
          });
        });

        const builtRows: GodownRow[] = Array.from(byGodown.entries()).map(([godownId, v]) => {
          const fresh = splitCasePcs(v.freshPcs, packing);
          const expired = splitCasePcs(v.expiredPcs, packing);
          const damaged = splitCasePcs(v.damagedPcs, packing);
          return {
            godownId,
            godownName: godownNameMap.get(godownId) || "(deleted godown)",
            freshCase: fresh.case,
            freshPcs: fresh.pcs,
            freshTotalPcs: v.freshPcs,
            expiredCase: expired.case,
            expiredPcs: expired.pcs,
            expiredTotalPcs: v.expiredPcs,
            damagedCase: damaged.case,
            damagedPcs: damaged.pcs,
            damagedTotalPcs: v.damagedPcs,
          };
        });
        builtRows.sort((a, b) => a.godownName.localeCompare(b.godownName));
        setRows(builtRows);
      })
      .catch((err: any) => {
        console.error(err);
        toast.error("Failed to load item stock");
      })
      .finally(() => setLoading(false));
  }, [companyId, itemId]);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a company first.</p>
      </div>
    );
  }

  if (loading || !item) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const godownTotalFreshPcs = rows.reduce((s, r) => s + r.freshTotalPcs, 0);
  // Each figure combines two things that would otherwise show as separate, confusing
  // tiles: stock still physically sitting in a godown marked Expired/Damaged (from a
  // Sale Return with that condition) and stock already sent back to a supplier as
  // Expired/Damaged via Purchase Return (condition doesn't move stock into a bucket
  // there — see purchaseReturnController.applyStockDelta — so that quantity only
  // exists as a sum over return lines, never as a stock figure). Merged into one
  // number per axis, per condition — Expired and Damaged are now genuinely separate
  // buckets/figures, not the same underlying data with two labels.
  const godownTotalExpiredStockPcs = rows.reduce((s, r) => s + r.expiredTotalPcs, 0);
  const totalExpiredReturnedPcs = purchaseReturnRows
    .filter((r) => r.condition === "Expired")
    .reduce((s, r) => s + r.totalPieces, 0);
  const godownTotalExpiredPcs = godownTotalExpiredStockPcs + totalExpiredReturnedPcs;
  const godownTotalDamagedStockPcs = rows.reduce((s, r) => s + r.damagedTotalPcs, 0);
  const totalDamagedReturnedPcs = purchaseReturnRows
    .filter((r) => r.condition === "Damaged")
    .reduce((s, r) => s + r.totalPieces, 0);
  const godownTotalDamagedPcs = godownTotalDamagedStockPcs + totalDamagedReturnedPcs;
  const totalPurchasedNetValue = purchaseRows.reduce((s, r) => s + r.netValue, 0);
  const totalSoldNetValue = saleRows.reduce((s, r) => s + r.netValue, 0);
  const totalPurchaseReturnedNetValue = purchaseReturnRows.reduce((s, r) => s + r.netValue, 0);
  const totalSaleReturnedNetValue = saleReturnRows.reduce((s, r) => s + r.netValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/items")} leftIcon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Boxes size={20} className="text-green-600" />
            {item.itemName} — Stock
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {item.codeBarCode ? `Code: ${item.codeBarCode}` : ""}{item.hsnCode ? ` · HSN: ${item.hsnCode}` : ""}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500">Company-wide Total (Fresh)</div>
            <div className="text-lg font-bold text-gray-900">{(item.openingStockFreshPcs ?? 0).toFixed(1)} pcs</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Company-wide Total (Expired)</div>
            <div className="text-lg font-bold text-amber-700">{(item.openingStockExpiredPcs ?? 0).toFixed(1)} pcs</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Company-wide Total (Damaged)</div>
            <div className="text-lg font-bold text-red-700">{(item.openingStockDamagedPcs ?? 0).toFixed(1)} pcs</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Sum Across Godowns (Fresh)</div>
            <div className="text-lg font-bold text-green-700">{godownTotalFreshPcs.toFixed(1)} pcs</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Sum Across Godowns (Expired)</div>
            <div className="text-lg font-bold text-amber-700">{godownTotalExpiredPcs.toFixed(1)} pcs</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Sum Across Godowns (Damaged)</div>
            <div className="text-lg font-bold text-red-700">{godownTotalDamagedPcs.toFixed(1)} pcs</div>
          </div>
        </div>
        {godownTotalFreshPcs !== (item.openingStockFreshPcs ?? 0) && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            The company-wide total can be higher than the sum across godowns below — opening stock entered directly
            on the Item master isn't attributed to any godown, only stock moved via Purchase/Sale is.
          </p>
        )}
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">Stock by Godown</div>
        <Table
          columns={[
            { key: "godown", header: "Godown", accessor: (r: GodownRow) => r.godownName },
            { key: "freshCase", header: "Fresh Case", align: "right" as const, accessor: (r: GodownRow) => r.freshCase },
            { key: "freshPcs", header: "Fresh Pcs", align: "right" as const, accessor: (r: GodownRow) => r.freshPcs },
            { key: "expiredCase", header: "Expired Case", align: "right" as const, accessor: (r: GodownRow) => r.expiredCase },
            { key: "expiredPcs", header: "Expired Pcs", align: "right" as const, accessor: (r: GodownRow) => r.expiredPcs },
            { key: "damagedCase", header: "Damaged Case", align: "right" as const, accessor: (r: GodownRow) => r.damagedCase },
            { key: "damagedPcs", header: "Damaged Pcs", align: "right" as const, accessor: (r: GodownRow) => r.damagedPcs },
          ]}
          data={rows}
          emptyMessage="No purchase/sale has moved stock for this item into any godown yet."
        />
      </div>

      <div className="card overflow-hidden">
        <Tabs
          tabs={[
            {
              key: "purchase",
              label: "Purchase",
              icon: <ShoppingCart size={14} />,
              badge: `₹${totalPurchasedNetValue.toFixed(2)}`,
              content: (
                <Table
                  columns={[
                    {
                      key: "invoiceNo",
                      header: "Invoice No",
                      primary: true,
                      accessor: (r: PurchaseRow) => (
                        <button
                          type="button"
                          onClick={() => router.push(`/purchase/edit/${r.purchaseId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.invoiceNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: PurchaseRow) => (r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-") },
                    { key: "godown", header: "Godown", accessor: (r: PurchaseRow) => r.godownName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: PurchaseRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: PurchaseRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: PurchaseRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: PurchaseRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={purchaseRows}
                  emptyMessage="No purchase has been made for this item yet."
                />
              ),
            },
            {
              key: "sale",
              label: "Sale",
              icon: <TrendingDown size={14} />,
              badge: `₹${totalSoldNetValue.toFixed(2)}`,
              content: (
                <Table
                  columns={[
                    {
                      key: "invoiceNo",
                      header: "Invoice No",
                      primary: true,
                      accessor: (r: SaleRow) => (
                        <button
                          type="button"
                          onClick={() => router.push(`/sale/edit/${r.saleId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.invoiceNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: SaleRow) => (r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString("en-IN") : "-") },
                    { key: "customer", header: "Customer", accessor: (r: SaleRow) => r.customerName },
                    { key: "godown", header: "Godown", accessor: (r: SaleRow) => r.godownName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: SaleRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: SaleRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: SaleRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: SaleRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={saleRows}
                  emptyMessage="No sale has been made for this item yet."
                />
              ),
            },
            {
              key: "purchaseReturn",
              label: "Purchase Return",
              icon: <RotateCcw size={14} />,
              badge: `₹${totalPurchaseReturnedNetValue.toFixed(2)}`,
              content: (
                <Table
                  columns={[
                    {
                      key: "returnNo",
                      header: "Return No",
                      primary: true,
                      accessor: (r: ReturnRow) => (
                        <button
                          type="button"
                          onClick={() => router.push(`/purchase-return/edit/${r.returnId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.returnNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: ReturnRow) => (r.returnDate ? new Date(r.returnDate).toLocaleDateString("en-IN") : "-") },
                    { key: "supplier", header: "Supplier", accessor: (r: ReturnRow) => r.partyName },
                    { key: "godown", header: "Godown", accessor: (r: ReturnRow) => r.godownName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: ReturnRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: ReturnRow) => r.pcsQty },
                    {
                      key: "condition",
                      header: "Condition",
                      accessor: (r: ReturnRow) => (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${conditionPillClass(r.condition)}`}>
                          {r.condition}
                        </span>
                      ),
                    },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: ReturnRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: ReturnRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={purchaseReturnRows}
                  emptyMessage="No purchase return has been made for this item yet."
                />
              ),
            },
            {
              key: "saleReturn",
              label: "Sale Return",
              icon: <Undo2 size={14} />,
              badge: `₹${totalSaleReturnedNetValue.toFixed(2)}`,
              content: (
                <Table
                  columns={[
                    {
                      key: "returnNo",
                      header: "Return No",
                      primary: true,
                      accessor: (r: ReturnRow) => (
                        <button
                          type="button"
                          onClick={() => router.push(`/sale-return/edit/${r.returnId}`)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {r.returnNo}
                        </button>
                      ),
                    },
                    { key: "date", header: "Date", accessor: (r: ReturnRow) => (r.returnDate ? new Date(r.returnDate).toLocaleDateString("en-IN") : "-") },
                    { key: "customer", header: "Customer", accessor: (r: ReturnRow) => r.partyName },
                    { key: "godown", header: "Godown", accessor: (r: ReturnRow) => r.godownName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: ReturnRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: ReturnRow) => r.pcsQty },
                    {
                      key: "condition",
                      header: "Condition",
                      accessor: (r: ReturnRow) => (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${conditionPillClass(r.condition)}`}>
                          {r.condition}
                        </span>
                      ),
                    },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: ReturnRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: ReturnRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={saleReturnRows}
                  emptyMessage="No sale return has been made for this item yet."
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
