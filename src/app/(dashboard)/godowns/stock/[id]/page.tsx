"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Boxes, Package, AlertTriangle, ShoppingCart, TrendingDown, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
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
import { toast } from "@/lib/toast";

interface GodownStockBucket {
  godownId: string;
  openingStockFreshPcs?: number;
  openingStockExpiredPcs?: number;
  openingStockDamagedPcs?: number;
}

interface MrpEntry {
  godownStock?: GodownStockBucket[];
}

interface ItemRecord {
  _id: string;
  itemName: string;
  codeBarCode?: string;
  packing?: number;
  itemSubGroupId?: { _id: string; name: string } | string;
  mrpEntries?: MrpEntry[];
}

interface ItemRow {
  itemId: string;
  itemName: string;
  subGroupName: string;
  codeBarCode?: string;
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
  itemId?: string;
  itemName: string;
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
  itemName: string;
  subGroupName: string;
  caseQty: number;
  pcsQty: number;
  rate: number;
  netValue: number;
}

interface SaleLine {
  itemId?: string;
  itemName: string;
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
  itemName: string;
  subGroupName: string;
  caseQty: number;
  pcsQty: number;
  rate: number;
  netValue: number;
}

interface ReturnLine {
  itemId?: string;
  itemName: string;
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
  itemName: string;
  subGroupName: string;
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

export default function GodownStockPage() {
  const router = useRouter();
  const params = useParams();
  const godownId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [loading, setLoading] = useState(true);
  const [godownName, setGodownName] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([]);
  const [saleRows, setSaleRows] = useState<SaleRow[]>([]);
  const [purchaseReturnRows, setPurchaseReturnRows] = useState<ReturnRow[]>([]);
  const [saleReturnRows, setSaleReturnRows] = useState<ReturnRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!companyId || !godownId) return;
    setLoading(true);
    Promise.all([
      godownService.getGodowns(companyId, 1, 1000),
      itemService.getItems(companyId, 1, 1000),
      purchaseService.getPurchases(companyId, 1, 1000),
      saleService.getSales(companyId, 1, 1000),
      purchaseReturnService.getPurchaseReturns(companyId, 1, 1000),
      saleReturnService.getSaleReturns(companyId, 1, 1000),
    ])
      .then(([godownRes, itemRes, purchaseRes, saleRes, purchaseReturnRes, saleReturnRes]: [any, any, any, any, any, any]) => {
        const godownList = godownRes.data || godownRes || [];
        const godown = godownList.find((g: any) => g._id === godownId);
        setGodownName(godown?.name || "(unknown godown)");

        const itemList: ItemRecord[] = itemRes.data || itemRes || [];
        // Same item name can legitimately repeat across different Sub Groups (see
        // CLAUDE.md's Item model note) — every table on this page shows Sub Group
        // alongside Item Name so two same-named items stay distinguishable.
        const itemSubGroupMap = new Map<string, string>(
          itemList.map((i: any) => [i._id, (typeof i.itemSubGroupId === "object" ? i.itemSubGroupId?.name : "") || "-"])
        );

        // Every Purchase line whose own (per-line) godownId matches this godown —
        // a single Purchase can span several godowns across its lines.
        const purchaseList: PurchaseRecord[] = purchaseRes.data || purchaseRes || [];
        const builtPurchaseRows: PurchaseRow[] = [];
        purchaseList.forEach((p) => {
          (p.items || []).forEach((line) => {
            if (String(line.godownId) !== String(godownId)) return;
            builtPurchaseRows.push({
              purchaseId: p._id,
              invoiceNo: p.invoiceNo,
              invoiceDate: p.invoiceDate,
              itemName: line.itemName,
              subGroupName: (line.itemId && itemSubGroupMap.get(line.itemId)) || "-",
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              rate: line.beforeGstRate || 0,
              netValue: line.netValue || 0,
            });
          });
        });
        builtPurchaseRows.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        setPurchaseRows(builtPurchaseRows);

        // Every Purchase Return line whose own (per-line) godownId matches this godown.
        const purchaseReturnList: PurchaseReturnRecord[] = purchaseReturnRes.data || purchaseReturnRes || [];
        const builtPurchaseReturnRows: ReturnRow[] = [];
        purchaseReturnList.forEach((pr) => {
          const supplierName = typeof pr.supplierId === "object" ? pr.supplierId?.name : "";
          (pr.items || []).forEach((line) => {
            if (String(line.godownId) !== String(godownId)) return;
            builtPurchaseReturnRows.push({
              returnId: pr._id,
              returnNo: pr.returnNo,
              returnDate: pr.returnDate,
              partyName: supplierName || "-",
              itemName: line.itemName,
              subGroupName: (line.itemId && itemSubGroupMap.get(line.itemId)) || "-",
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

        // Every Sale Return line whose own (per-line) godownId matches this godown.
        const saleReturnList: SaleReturnRecord[] = saleReturnRes.data || saleReturnRes || [];
        const builtSaleReturnRows: ReturnRow[] = [];
        saleReturnList.forEach((sr) => {
          const customerName = typeof sr.customerId === "object" ? sr.customerId?.name : "";
          (sr.items || []).forEach((line) => {
            if (String(line.godownId) !== String(godownId)) return;
            builtSaleReturnRows.push({
              returnId: sr._id,
              returnNo: sr.returnNo,
              returnDate: sr.returnDate,
              partyName: customerName || "-",
              itemName: line.itemName,
              subGroupName: (line.itemId && itemSubGroupMap.get(line.itemId)) || "-",
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

        // Every Sale line whose own (per-line) godownId matches this godown — a
        // single Sale can span several godowns across its lines.
        const saleList: SaleRecord[] = saleRes.data || saleRes || [];
        const builtSaleRows: SaleRow[] = [];
        saleList.forEach((s) => {
          const customerName = typeof s.customerId === "object" ? s.customerId?.name : "";
          (s.items || []).forEach((line) => {
            if (String(line.godownId) !== String(godownId)) return;
            builtSaleRows.push({
              saleId: s._id,
              invoiceNo: s.invoiceNo,
              invoiceDate: s.invoiceDate,
              customerName: customerName || "-",
              itemName: line.itemName,
              subGroupName: (line.itemId && itemSubGroupMap.get(line.itemId)) || "-",
              caseQty: line.caseQty || 0,
              pcsQty: line.pcsQty || 0,
              rate: line.afterGstRate || 0,
              netValue: line.netValue || 0,
            });
          });
        });
        builtSaleRows.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        setSaleRows(builtSaleRows);

        const builtRows: ItemRow[] = [];
        itemList.forEach((item) => {
          const packing = parseFloat(String(item.packing)) || 1;
          let freshPcs = 0;
          let expiredPcs = 0;
          let damagedPcs = 0;
          (item.mrpEntries || []).forEach((entry) => {
            const bucket = (entry.godownStock || []).find((g) => String(g.godownId) === String(godownId));
            if (bucket) {
              freshPcs += parseFloat(String(bucket.openingStockFreshPcs)) || 0;
              expiredPcs += parseFloat(String(bucket.openingStockExpiredPcs)) || 0;
              damagedPcs += parseFloat(String(bucket.openingStockDamagedPcs)) || 0;
            }
          });
          if (freshPcs !== 0 || expiredPcs !== 0 || damagedPcs !== 0) {
            const fresh = splitCasePcs(freshPcs, packing);
            const expired = splitCasePcs(expiredPcs, packing);
            const damaged = splitCasePcs(damagedPcs, packing);
            builtRows.push({
              itemId: item._id,
              itemName: item.itemName,
              subGroupName: itemSubGroupMap.get(item._id) || "-",
              codeBarCode: item.codeBarCode,
              freshCase: fresh.case,
              freshPcs: fresh.pcs,
              freshTotalPcs: freshPcs,
              expiredCase: expired.case,
              expiredPcs: expired.pcs,
              expiredTotalPcs: expiredPcs,
              damagedCase: damaged.case,
              damagedPcs: damaged.pcs,
              damagedTotalPcs: damagedPcs,
            });
          }
        });
        builtRows.sort((a, b) => a.itemName.localeCompare(b.itemName));
        setRows(builtRows);
      })
      .catch((err: any) => {
        console.error(err);
        toast.error("Failed to load godown stock");
      })
      .finally(() => setLoading(false));
  }, [companyId, godownId]);

  const filteredRows = rows.filter(
    (r) =>
      !searchQuery.trim() ||
      r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.codeBarCode || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const totalFreshPcs = filteredRows.reduce((s, r) => s + r.freshTotalPcs, 0);
  // Each figure combines two things that would otherwise show as separate, confusing
  // tiles: stock still physically sitting in this godown marked Expired/Damaged (from
  // a Sale Return with that condition — still a real, present quantity) and stock
  // already sent back to a supplier as Expired/Damaged via Purchase Return (condition
  // doesn't move stock into a bucket there — see purchaseReturnController.applyStockDelta
  // — so that quantity only exists as a sum over return lines, never as a stock figure).
  // Shown as one merged number per condition since to the user both are just "how much
  // has been Expired/Damaged," regardless of whether it's still on-site or already gone
  // back out. Expired and Damaged are now genuinely separate buckets/figures — not the
  // same underlying data with two labels.
  const totalExpiredStockPcs = filteredRows.reduce((s, r) => s + r.expiredTotalPcs, 0);
  const totalExpiredReturnedPcs = purchaseReturnRows
    .filter((r) => r.condition === "Expired")
    .reduce((s, r) => s + r.totalPieces, 0);
  const totalExpiredPcs = totalExpiredStockPcs + totalExpiredReturnedPcs;
  const totalDamagedStockPcs = filteredRows.reduce((s, r) => s + r.damagedTotalPcs, 0);
  const totalDamagedReturnedPcs = purchaseReturnRows
    .filter((r) => r.condition === "Damaged")
    .reduce((s, r) => s + r.totalPieces, 0);
  const totalDamagedPcs = totalDamagedStockPcs + totalDamagedReturnedPcs;
  const totalPurchasedNetValue = purchaseRows.reduce((s, r) => s + r.netValue, 0);
  const totalSoldNetValue = saleRows.reduce((s, r) => s + r.netValue, 0);
  const totalPurchaseReturnedNetValue = purchaseReturnRows.reduce((s, r) => s + r.netValue, 0);
  const totalSaleReturnedNetValue = saleReturnRows.reduce((s, r) => s + r.netValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/godowns")} leftIcon={<ArrowLeft size={16} />}>
          Back
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Boxes size={20} className="text-green-600" />
            {godownName} — Stock
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every item with any Purchase/Sale-driven stock in this godown ({filteredRows.length} of {rows.length} shown)
          </p>
        </div>
      </div>

      <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search items in this godown..." />

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <Package size={20} className="text-green-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Fresh Pcs</div>
            <div className="text-xl font-bold text-green-700">{totalFreshPcs.toFixed(1)}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Expired Pcs</div>
            <div className="text-xl font-bold text-amber-700">{totalExpiredPcs.toFixed(1)}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Damaged Pcs</div>
            <div className="text-xl font-bold text-red-700">{totalDamagedPcs.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">Current Stock</div>
        <Table
          columns={[
            { key: "item", header: "Item", accessor: (r: ItemRow) => r.itemName, primary: true },
            { key: "subGroup", header: "Sub Group", accessor: (r: ItemRow) => r.subGroupName },
            { key: "code", header: "Code", accessor: (r: ItemRow) => r.codeBarCode || "-" },
            { key: "freshCase", header: "Fresh Case", align: "right" as const, accessor: (r: ItemRow) => r.freshCase },
            { key: "freshPcs", header: "Fresh Pcs", align: "right" as const, accessor: (r: ItemRow) => r.freshPcs },
            { key: "expiredCase", header: "Expired Case", align: "right" as const, accessor: (r: ItemRow) => r.expiredCase },
            { key: "expiredPcs", header: "Expired Pcs", align: "right" as const, accessor: (r: ItemRow) => r.expiredPcs },
            { key: "damagedCase", header: "Damaged Case", align: "right" as const, accessor: (r: ItemRow) => r.damagedCase },
            { key: "damagedPcs", header: "Damaged Pcs", align: "right" as const, accessor: (r: ItemRow) => r.damagedPcs },
          ]}
          data={filteredRows}
          emptyMessage={
            rows.length === 0
              ? "No item has any Purchase/Sale-driven stock in this godown yet."
              : "No items match your search."
          }
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
                    { key: "item", header: "Item", accessor: (r: PurchaseRow) => r.itemName },
                    { key: "subGroup", header: "Sub Group", accessor: (r: PurchaseRow) => r.subGroupName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: PurchaseRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: PurchaseRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: PurchaseRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: PurchaseRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={purchaseRows}
                  emptyMessage="No purchase has been made into this godown yet."
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
                    { key: "item", header: "Item", accessor: (r: SaleRow) => r.itemName },
                    { key: "subGroup", header: "Sub Group", accessor: (r: SaleRow) => r.subGroupName },
                    { key: "case", header: "Case", align: "right" as const, accessor: (r: SaleRow) => r.caseQty },
                    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (r: SaleRow) => r.pcsQty },
                    { key: "rate", header: "Rate", align: "right" as const, accessor: (r: SaleRow) => `₹${r.rate.toFixed(2)}` },
                    { key: "net", header: "Net Value", align: "right" as const, accessor: (r: SaleRow) => `₹${r.netValue.toFixed(2)}` },
                  ]}
                  data={saleRows}
                  emptyMessage="No sale has been made from this godown yet."
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
                    { key: "item", header: "Item", accessor: (r: ReturnRow) => r.itemName },
                    { key: "subGroup", header: "Sub Group", accessor: (r: ReturnRow) => r.subGroupName },
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
                  emptyMessage="No purchase return has been made from this godown yet."
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
                    { key: "item", header: "Item", accessor: (r: ReturnRow) => r.itemName },
                    { key: "subGroup", header: "Sub Group", accessor: (r: ReturnRow) => r.subGroupName },
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
                  emptyMessage="No sale return has been made from this godown yet."
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
