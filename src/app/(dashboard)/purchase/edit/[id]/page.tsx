"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { useCompany } from "@/context/CompanyContext";
import { purchaseService } from "@/services/purchaseService";
import { itemService } from "@/services/itemService";
import { supplierService } from "@/services/supplierService";
import { godownService } from "@/services/godownService";
import { toast } from "sonner";
import { Plus, X, Pencil, Package, Boxes, TrendingUp } from "lucide-react";

interface MrpEntry {
  mrp?: number;
  mrpActive?: boolean;
  purchaseRate?: number;
  retailRate?: number;
  netCostSelfPerPiece?: number;
  packing?: number;
  purchaseQty?: number;
  salesQty?: number;
  openingStockFreshCase?: number;
  openingStockFreshPcs?: number;
  openingStockDamagedCase?: number;
  openingStockDamagedPcs?: number;
  godownStock?: {
    godownId: string;
    openingStockFreshCase?: number;
    openingStockFreshPcs?: number;
    openingStockDamagedCase?: number;
    openingStockDamagedPcs?: number;
  }[];
}

interface ItemRecord {
  _id: string;
  itemName: string;
  hsnCode?: string;
  supplierId?: { _id: string; name: string } | string;
  mrp?: number;
  purchaseRate?: number;
  purchaseQty?: number;
  packing?: number;
  retailRate?: number;
  salesQty?: number;
  gstPercentage?: number;
  openingStockFreshPcs?: number;
  openingStockDamagedPcs?: number;
  lastCostRate?: number;
  isActive?: boolean;
  mrpEntries?: MrpEntry[];
}

interface SupplierRecord {
  _id: string;
  name: string;
}

interface Line {
  key: string;
  itemId: string;
  itemName: string;
  packing: number;
  purchaseQty: number;
  mrp: number;
  caseQty: number;
  pcsQty: number;
  freeQty: number;
  totalPieces: number;
  beforeGstRate: number;
  lessPercent: number;
  lessRs: number;
  cdPercent: number;
  cdRs: number;
  afterGstRate: number;
  amount: number;
  taxableValue: number;
  gstPercent: number;
  gstAmount: number;
  netValue: number;
}

function computeLine(entry: {
  caseQty: number; pcsQty: number; freeQty: number; beforeGstRate: number;
  lessPercent: number; lessRs: number; cdPercent: number; cdRs: number;
}, item: ItemRecord) {
  const packing = item.packing || 1;
  const purchaseQty = item.purchaseQty || 1;
  const gstPercent = item.gstPercentage || 0;

  const billedPieces = entry.caseQty * packing + entry.pcsQty;
  const totalPieces = billedPieces + entry.freeQty;
  const pricePerPiece = purchaseQty > 0 ? entry.beforeGstRate / purchaseQty : 0;

  const amount = pricePerPiece * billedPieces;
  const lessAmt = (amount * entry.lessPercent) / 100 + entry.lessRs;
  const cdAmt = (amount * entry.cdPercent) / 100 + entry.cdRs;
  const taxableValue = amount - lessAmt - cdAmt;
  const gstAmount = (taxableValue * gstPercent) / 100;
  const netValue = taxableValue + gstAmount;

  // Scale taxableValue back to the beforeGstRate basis (per purchaseQty units) so
  // flat-Rs discounts (lessRs/cdRs) are folded in the same way percent discounts are —
  // mirrors purchaseController.js's computeLine exactly so this preview never lies.
  const discountedRate =
    billedPieces > 0
      ? (taxableValue / billedPieces) * purchaseQty
      : entry.beforeGstRate - (entry.beforeGstRate * (entry.lessPercent + entry.cdPercent)) / 100;
  const afterGstRate = discountedRate + (discountedRate * gstPercent) / 100;

  return { packing, purchaseQty, gstPercent, totalPieces, amount, taxableValue, gstAmount, netValue, afterGstRate };
}

function toDateInputValue(d: any) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function EditPurchasePage() {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // See purchase/add/page.tsx for why this ref exists — blocks a rapid double-click
  // from firing two concurrent saves that could race on the same item's stock update.
  const savingRef = useRef(false);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string }[]>([]);

  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [receivingDate, setReceivingDate] = useState("");
  const [godownId, setGodownId] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedRateIndex, setSelectedRateIndex] = useState<number | null>(null);
  const [mrp, setMrp] = useState("0");
  const [caseQty, setCaseQty] = useState("0");
  const [pcsQty, setPcsQty] = useState("0");
  const [freeQty, setFreeQty] = useState("0");
  const [beforeGstRate, setBeforeGstRate] = useState("0");
  const [lessPercent, setLessPercent] = useState("0");
  const [lessRs, setLessRs] = useState("0");
  const [cdPercent, setCdPercent] = useState("0");
  const [cdRs, setCdRs] = useState("0");

  const [lines, setLines] = useState<Line[]>([]);
  // See sale/add/page.tsx for why this ref exists — lets handleEditLine restore a
  // line's own values without the item-select auto-fill effect immediately overwriting them.
  const skipAutoFillRef = useRef(false);

  useEffect(() => {
    if (!companyId) return;
    itemService.getItems(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setItems(list.filter((i: ItemRecord) => i.isActive !== false));
    });
    supplierService.getSuppliers(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setSuppliers(list.filter((s: SupplierRecord & { isActive?: boolean }) => (s as any).isActive !== false));
    });
    godownService.getGodowns(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setGodowns(list.filter((g: any) => g.isActive !== false));
    });
  }, [companyId]);

  useEffect(() => {
    if (!purchaseId) return;
    purchaseService
      .getPurchaseById(purchaseId)
      .then((p: any) => {
        setInvoiceNo(p.invoiceNo || "");
        setInvoiceDate(toDateInputValue(p.invoiceDate));
        setReceivingDate(toDateInputValue(p.receivingDate));
        setGodownId(typeof p.godownId === "string" ? p.godownId : p.godownId?._id || "");
        setNotes(p.notes || "");
        setPaidAmount(String(p.paidAmount ?? 0));
        setDueDate(toDateInputValue(p.dueDate));
        setLines(
          (p.items || []).map((it: any, idx: number) => ({
            key: `${it.itemId}-${idx}`,
            itemId: it.itemId,
            itemName: it.itemName,
            packing: it.packing,
            purchaseQty: it.purchaseQty,
            mrp: it.mrp,
            caseQty: it.caseQty,
            pcsQty: it.pcsQty,
            freeQty: it.freeQty,
            totalPieces: it.totalPieces,
            beforeGstRate: it.beforeGstRate,
            lessPercent: it.lessPercent,
            lessRs: it.lessRs,
            cdPercent: it.cdPercent,
            cdRs: it.cdRs,
            afterGstRate: it.afterGstRate,
            amount: it.amount,
            taxableValue: it.taxableValue,
            gstPercent: it.gstPercent,
            gstAmount: it.gstAmount,
            netValue: it.netValue,
          }))
        );
      })
      .catch((err: any) => {
        console.error(err);
        toast.error("Failed to load purchase");
      })
      .finally(() => setLoading(false));
  }, [purchaseId]);

  const supplierIdsWithItems = new Set(
    items.map((i) => (typeof i.supplierId === "string" ? i.supplierId : i.supplierId?._id)).filter(Boolean)
  );
  const suppliersWithItems = suppliers.filter((s) => supplierIdsWithItems.has(s._id));

  const itemsForSupplier = supplierId
    ? items.filter((i) => (typeof i.supplierId === "string" ? i.supplierId : i.supplierId?._id) === supplierId)
    : items;

  const selectedItem = items.find((i) => i._id === selectedItemId) || null;

  const activeRateEntries = (selectedItem?.mrpEntries || []).filter((e) => e.mrpActive !== false);

  useEffect(() => {
    if (skipAutoFillRef.current) {
      skipAutoFillRef.current = false;
      return;
    }
    if (!selectedItem) return;
    if (activeRateEntries.length > 0) {
      setSelectedRateIndex(0);
      setMrp(String(activeRateEntries[0].mrp ?? 0));
      setBeforeGstRate(String(activeRateEntries[0].purchaseRate ?? 0));
    } else {
      setSelectedRateIndex(null);
      setMrp(String(selectedItem.mrp ?? 0));
      setBeforeGstRate(String(selectedItem.purchaseRate ?? 0));
    }
  }, [selectedItemId]);

  const handleRateSelect = (idxStr: string) => {
    const idx = parseInt(idxStr, 10);
    const entry = activeRateEntries[idx];
    if (!entry) return;
    setSelectedRateIndex(idx);
    setMrp(String(entry.mrp ?? 0));
    setBeforeGstRate(String(entry.purchaseRate ?? 0));
  };

  const selectedRateEntry = selectedRateIndex !== null ? activeRateEntries[selectedRateIndex] : null;

  const effectiveItem = selectedItem
    ? {
        ...selectedItem,
        packing: selectedRateEntry?.packing ?? selectedItem.packing,
        purchaseQty: selectedRateEntry?.purchaseQty ?? selectedItem.purchaseQty,
      }
    : null;

  const preview = useMemo(() => {
    if (!effectiveItem) return null;
    return computeLine(
      {
        caseQty: parseFloat(caseQty) || 0,
        pcsQty: parseFloat(pcsQty) || 0,
        freeQty: parseFloat(freeQty) || 0,
        beforeGstRate: parseFloat(beforeGstRate) || 0,
        lessPercent: parseFloat(lessPercent) || 0,
        lessRs: parseFloat(lessRs) || 0,
        cdPercent: parseFloat(cdPercent) || 0,
        cdRs: parseFloat(cdRs) || 0,
      },
      effectiveItem
    );
  }, [effectiveItem, caseQty, pcsQty, freeQty, beforeGstRate, lessPercent, lessRs, cdPercent, cdRs]);

  const resetEntryRow = () => {
    setSelectedItemId("");
    setSelectedRateIndex(null);
    setMrp("0");
    setCaseQty("0");
    setPcsQty("0");
    setFreeQty("0");
    setBeforeGstRate("0");
    setLessPercent("0");
    setLessRs("0");
    setCdPercent("0");
    setCdRs("0");
  };

  const handleAddLine = () => {
    if (!selectedItem) {
      toast.error("Select an item first");
      return;
    }
    const c = parseFloat(caseQty) || 0;
    const p = parseFloat(pcsQty) || 0;
    const fq = parseFloat(freeQty) || 0;
    const rate = parseFloat(beforeGstRate) || 0;
    const lessRsVal = parseFloat(lessRs) || 0;
    const cdRsVal = parseFloat(cdRs) || 0;
    if (c <= 0 && p <= 0) {
      toast.error("Enter Case or Pcs quantity");
      return;
    }
    if (c < 0 || p < 0 || fq < 0) {
      toast.error("Quantities cannot be negative");
      return;
    }
    if (rate < 0 || lessRsVal < 0 || cdRsVal < 0) {
      toast.error("Rate and discount values cannot be negative");
      return;
    }
    if (!preview) return;

    const line: Line = {
      key: `${selectedItem._id}-${Date.now()}`,
      itemId: selectedItem._id,
      itemName: selectedItem.itemName,
      packing: preview.packing,
      purchaseQty: preview.purchaseQty,
      mrp: parseFloat(mrp) || 0,
      caseQty: c,
      pcsQty: p,
      freeQty: parseFloat(freeQty) || 0,
      totalPieces: preview.totalPieces,
      beforeGstRate: parseFloat(beforeGstRate) || 0,
      lessPercent: parseFloat(lessPercent) || 0,
      lessRs: parseFloat(lessRs) || 0,
      cdPercent: parseFloat(cdPercent) || 0,
      cdRs: parseFloat(cdRs) || 0,
      afterGstRate: preview.afterGstRate,
      amount: preview.amount,
      taxableValue: preview.taxableValue,
      gstPercent: preview.gstPercent,
      gstAmount: preview.gstAmount,
      netValue: preview.netValue,
    };

    setLines((prev) => [...prev, line]);
    resetEntryRow();
  };

  const handleRemoveLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleEditLine = (line: Line) => {
    const targetItem = items.find((i) => i._id === line.itemId);
    const targetActiveEntries = (targetItem?.mrpEntries || []).filter((e) => e.mrpActive !== false);
    const idx = targetActiveEntries.findIndex((e) => Math.abs((e.mrp ?? 0) - line.mrp) < 0.001);
    const targetSupplierId = typeof targetItem?.supplierId === "string" ? targetItem.supplierId : targetItem?.supplierId?._id;

    skipAutoFillRef.current = true;
    if (targetSupplierId) setSupplierId(targetSupplierId);
    setSelectedItemId(line.itemId);
    setSelectedRateIndex(idx >= 0 ? idx : null);
    setMrp(String(line.mrp));
    setCaseQty(String(line.caseQty));
    setPcsQty(String(line.pcsQty));
    setFreeQty(String(line.freeQty));
    setBeforeGstRate(String(line.beforeGstRate));
    setLessPercent(String(line.lessPercent));
    setLessRs(String(line.lessRs));
    setCdPercent(String(line.cdPercent));
    setCdRs(String(line.cdRs));

    handleRemoveLine(line.key);
  };

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        acc.totalItems += 1;
        acc.totalCase += l.caseQty;
        acc.totalPcs += l.pcsQty;
        acc.totalQty += l.totalPieces;
        acc.totalTaxableValue += l.taxableValue;
        acc.totalGstAmount += l.gstAmount;
        acc.totalAmount += l.amount;
        acc.netAmount += l.netValue;
        return acc;
      },
      { totalItems: 0, totalCase: 0, totalPcs: 0, totalQty: 0, totalTaxableValue: 0, totalGstAmount: 0, totalAmount: 0, netAmount: 0 }
    );
  }, [lines]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId) return;
    if (savingRef.current) return;

    if (!invoiceNo.trim() || !invoiceDate) {
      toast.error("Please fill Invoice No and Invoice Date");
      return;
    }
    if (!godownId) {
      toast.error("Please select a Godown");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await purchaseService.updatePurchase(purchaseId, {
        invoiceNo: invoiceNo.trim(),
        invoiceDate,
        receivingDate: receivingDate || null,
        godownId,
        notes,
        paidAmount: parseFloat(paidAmount) || 0,
        dueDate: dueDate || null,
        items: lines.map((l) => ({
          itemId: l.itemId,
          mrp: l.mrp,
          caseQty: l.caseQty,
          pcsQty: l.pcsQty,
          freeQty: l.freeQty,
          beforeGstRate: l.beforeGstRate,
          lessPercent: l.lessPercent,
          lessRs: l.lessRs,
          cdPercent: l.cdPercent,
          cdRs: l.cdRs,
        })),
      });
      toast.success("Purchase updated");
      router.push("/purchase");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update purchase");
    } finally {
      savingRef.current = false;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const inputClass = "!h-[32px] !py-1 !px-2 !text-sm !rounded-md !bg-white";
  const selectClass = "!h-[32px] !py-1 !px-2 !text-sm !rounded-md !bg-white flex items-center";
  const rowLabel = "w-[150px] align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap";
  const unitLabel = "inline-block w-10 shrink-0 text-xs text-gray-500 font-medium";

  // Stock is now split per godown — once a Godown is picked at the header level, show
  // that godown's own bucket (0 if it has none there yet) instead of the company-wide
  // rollup, since that's what actually matters for deciding how much to purchase in.
  const selectedGodownBucket = godownId
    ? selectedRateEntry?.godownStock?.find((g) => String(g.godownId) === String(godownId))
    : undefined;
  const stockPcs = godownId
    ? selectedGodownBucket?.openingStockFreshPcs ?? 0
    : selectedRateEntry?.openingStockFreshPcs ?? selectedItem?.openingStockFreshPcs ?? 0;
  const stockPacking = selectedRateEntry?.packing ?? selectedItem?.packing ?? 1;
  const stockCase = Math.floor(stockPcs / stockPacking);
  const stockLoose = stockPcs - stockCase * stockPacking;
  const stockDamagedPcs = godownId
    ? selectedGodownBucket?.openingStockDamagedPcs ?? 0
    : selectedRateEntry?.openingStockDamagedPcs ?? selectedItem?.openingStockDamagedPcs ?? 0;
  const lastCostPerPiece = selectedRateEntry
    ? selectedRateEntry.netCostSelfPerPiece ?? 0
    : selectedItem
    ? (selectedItem.lastCostRate || 0) / (selectedItem.packing || 1)
    : 0;
  const liveCostPerPiece = preview ? preview.afterGstRate / (preview.packing || 1) : 0;

  const gridColumns = [
    { key: "idx", header: "#", accessor: (_: Line, i: number) => i + 1 },
    { key: "item", header: "Item Name", accessor: (l: Line) => l.itemName },
    { key: "mrp", header: "MRP Rs", align: "right" as const, accessor: (l: Line) => l.mrp.toFixed(2) },
    { key: "case", header: "Case", align: "right" as const, accessor: (l: Line) => l.caseQty },
    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (l: Line) => l.pcsQty },
    { key: "fq", header: "FQ", align: "right" as const, accessor: (l: Line) => l.freeQty },
    { key: "rate", header: "Rate Rs", align: "right" as const, accessor: (l: Line) => l.beforeGstRate.toFixed(2) },
    { key: "amount", header: "Amount Rs", align: "right" as const, accessor: (l: Line) => l.netValue.toFixed(2) },
    {
      key: "actions",
      header: "",
      accessor: (l: Line) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => handleEditLine(l)} className="text-blue-500 hover:text-blue-700" title="Edit this line">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={() => handleRemoveLine(l.key)} className="text-red-500 hover:text-red-700" title="Remove this line">
            <X size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto bg-[#f0f0f0] min-h-screen font-sans">
      <FormToolbar
        title="Purchase - Edit"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/purchase")}
        onClose={() => router.push("/purchase")}
      />

      <div className="p-3 flex flex-col xl:flex-row gap-4 max-w-[1500px] mx-auto text-sm">
        {/* Left Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Header */}
          <div className="border border-gray-300 bg-white p-4 rounded-md shadow-sm">
            <table className="w-full border-separate" style={{ borderSpacing: "0 10px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Invoice No. <span className="text-red-500 font-bold">*</span></td>
                  <td>
                    <div className="w-48">
                      <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className={inputClass} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Invoice Date <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[65]">
                    <div className="w-48">
                      <DatePicker value={invoiceDate} onChange={setInvoiceDate} className={inputClass} placeholder="Select date" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Receiving Date</td>
                  <td className="relative z-[64]">
                    <div className="w-48">
                      <DatePicker value={receivingDate} onChange={setReceivingDate} className={inputClass} placeholder="Select date" minDate={invoiceDate} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Godown <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[63]">
                    <div className="w-48">
                      <Select
                        options={godowns.map((g) => ({ value: g._id, label: g.name }))}
                        value={godownId}
                        onChange={setGodownId}
                        className={selectClass}
                        placeholder="Select Godown"
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Notes</td>
                  <td>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} w-full`} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Entry row */}
          <div className="border border-gray-300 bg-white p-4 rounded-md shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Add Purchase Item</h3>
            <table className="w-full border-separate" style={{ borderSpacing: "0 8px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Supplier</td>
                  <td className="relative z-[60]">
                    <Select
                      options={suppliersWithItems.map((s) => ({ value: s._id, label: s.name }))}
                      value={supplierId}
                      onChange={(val) => {
                        setSupplierId(val);
                        setSelectedItemId("");
                      }}
                      className={selectClass}
                      placeholder="Select Supplier"
                    />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Item Name</td>
                  <td className="relative z-[55]">
                    <Select
                      options={itemsForSupplier.map((i) => ({ value: i._id, label: `${i.itemName}${i.hsnCode ? ` (${i.hsnCode})` : ""}` }))}
                      value={selectedItemId}
                      onChange={setSelectedItemId}
                      className={selectClass}
                      placeholder={!supplierId ? "Select Supplier first" : itemsForSupplier.length === 0 ? "No items for this supplier" : "Select Item"}
                      disabled={!supplierId || itemsForSupplier.length === 0}
                    />
                  </td>
                </tr>
                {selectedItem && activeRateEntries.length > 0 && (
                  <tr>
                    <td className={rowLabel}>Rate</td>
                    <td className="relative z-[52]">
                      <Select
                        options={activeRateEntries.map((e, i) => ({
                          value: String(i),
                          label: `MRP ₹${(e.mrp || 0).toFixed(2)} - Rate ₹${(e.purchaseRate || 0).toFixed(2)}`,
                        }))}
                        value={selectedRateIndex !== null ? String(selectedRateIndex) : ""}
                        onChange={handleRateSelect}
                        className={selectClass}
                        placeholder="Select Rate"
                      />
                    </td>
                  </tr>
                )}
                <tr>
                  <td className={rowLabel}>M.R.P. Rs.</td>
                  <td>
                    <Input type="number" value={mrp} onChange={(e) => setMrp(e.target.value)} className={`${inputClass} text-right w-full`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Quantity</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap mr-2 w-8">Case</span>
                        <Input type="number" value={caseQty} onChange={(e) => setCaseQty(e.target.value)} className={`${inputClass} text-right w-full`} />
                      </div>
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap mr-2 w-6">Pcs</span>
                        <Input type="number" value={pcsQty} onChange={(e) => setPcsQty(e.target.value)} className={`${inputClass} text-right w-full`} />
                      </div>
                      <div className="flex items-center flex-[1.2]">
                        <span className="text-xs text-gray-500 font-medium whitespace-nowrap mr-2 w-14">FQ (Free)</span>
                        <Input type="number" value={freeQty} onChange={(e) => setFreeQty(e.target.value)} className={`${inputClass} text-right w-full`} />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Before GST Rate</td>
                  <td>
                    <Input type="number" value={beforeGstRate} onChange={(e) => setBeforeGstRate(e.target.value)} className={`${inputClass} text-right w-full`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Less %age / Rs</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium mr-2 w-4">%</span>
                        <Input type="number" value={lessPercent} onChange={(e) => setLessPercent(e.target.value)} className={`${inputClass} text-right w-full`} />
                      </div>
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium mr-2 w-4">Rs</span>
                        <Input type="number" value={lessRs} onChange={(e) => setLessRs(e.target.value)} className={`${inputClass} text-right w-full`} />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>C.D. %age / Rs</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium mr-2 w-4">%</span>
                        <Input type="number" value={cdPercent} onChange={(e) => setCdPercent(e.target.value)} className={`${inputClass} text-right w-full`} />
                      </div>
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium mr-2 w-4">Rs</span>
                        <Input type="number" value={cdRs} onChange={(e) => setCdRs(e.target.value)} className={`${inputClass} text-right w-full`} />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={`${rowLabel} font-bold text-red-700`}>After GST Rate</td>
                  <td>
                    <Input readOnly value={preview ? preview.afterGstRate.toFixed(4) : "0.0000"} className={`${inputClass} text-right bg-gray-50 text-red-600 font-bold w-full`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Amount</td>
                  <td>
                    <Input readOnly value={preview ? preview.amount.toFixed(2) : "0.00"} className={`${inputClass} text-right bg-gray-50 w-full`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Taxable Value</td>
                  <td>
                    <Input readOnly value={preview ? preview.taxableValue.toFixed(2) : "0.00"} className={`${inputClass} text-right bg-gray-50 w-full`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>GST Category</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium mr-2 w-4">%</span>
                        <Input readOnly value={preview ? preview.gstPercent.toFixed(2) : "0.00"} className={`${inputClass} text-right bg-gray-50 w-full`} />
                      </div>
                      <div className="flex items-center flex-1">
                        <span className="text-xs text-gray-500 font-medium mr-2 w-6">Amt</span>
                        <Input readOnly value={preview ? preview.gstAmount.toFixed(2) : "0.00"} className={`${inputClass} text-right bg-gray-50 w-full`} />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={`${rowLabel} font-bold text-blue-900`}>Net Value</td>
                  <td>
                    <Input readOnly value={preview ? preview.netValue.toFixed(2) : "0.00"} className={`${inputClass} text-right bg-gray-100 font-bold text-blue-900 w-full`} />
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <Button type="button" onClick={handleAddLine} leftIcon={<Plus size={16} />} size="sm">
                Add Line
              </Button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Grid */}
          <div className="border border-gray-300 bg-white rounded-md shadow-sm overflow-hidden">
            <Table columns={gridColumns as any} data={lines} emptyMessage="No items added yet" />
          </div>

          {/* Item Reference Panel */}
          <div className="border border-gray-300 bg-white rounded-md shadow-sm h-fit overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
              <Package size={16} className="text-gray-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Item Reference</h3>
            </div>
            {!selectedItem ? (
              <p className="text-sm text-gray-400 p-4">Select an item to see its rates and stock.</p>
            ) : (
              <div className="p-4 space-y-4">
                {/* Pricing */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">MRP</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">₹{(selectedRateEntry?.mrp ?? selectedItem.mrp ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Purc. Rate</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">₹{(selectedRateEntry?.purchaseRate ?? selectedItem.purchaseRate ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Sale Rate</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">₹{(selectedRateEntry?.retailRate ?? selectedItem.retailRate ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Packing</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedRateEntry?.packing ?? selectedItem.packing ?? 1}</div>
                  </div>
                </div>

                {/* Stock */}
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">
                    <Boxes size={12} />
                    Stock
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-green-50 border border-green-100 rounded-lg py-2">
                      <div className="text-sm font-bold text-green-700">{stockPcs.toFixed(1)}</div>
                      <div className="text-[10px] text-green-600">Total Pcs</div>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-lg py-2">
                      <div className="text-sm font-bold text-green-700">{stockCase}</div>
                      <div className="text-[10px] text-green-600">Case</div>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-lg py-2">
                      <div className="text-sm font-bold text-green-700">{stockLoose.toFixed(1)}</div>
                      <div className="text-[10px] text-green-600">Loose</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg py-2">
                      <div className="text-sm font-bold text-amber-700">{stockDamagedPcs.toFixed(1)}</div>
                      <div className="text-[10px] text-amber-600">Damaged</div>
                    </div>
                  </div>
                </div>

                {/* Cost comparison */}
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">
                    <TrendingUp size={12} />
                    Cost Impact
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <div className="text-[10px] text-gray-500 font-medium">Last Cost (Per Pc)</div>
                      <div className="text-base font-bold text-gray-800 mt-0.5">₹{lastCostPerPiece.toFixed(2)}</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                      <div className="text-[10px] text-red-600 font-medium">New Cost (After Purchase)</div>
                      <div className="text-base font-bold text-red-700 mt-0.5">₹{liveCostPerPiece.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border border-gray-300 bg-white p-4 rounded-md shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">No. of Items</div>
                <div className="font-bold text-lg">{totals.totalItems}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Case</div>
                <div className="font-bold text-lg">{totals.totalCase}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Qty (Pcs)</div>
                <div className="font-bold text-lg">{totals.totalQty}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Pcs (Loose)</div>
                <div className="font-bold text-lg">{totals.totalPcs}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">Taxable Value</div>
                <div className="font-semibold">₹{totals.totalTaxableValue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">GST Amount</div>
                <div className="font-semibold">₹{totals.totalGstAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Net Amount</div>
                <div className="font-bold text-blue-900 text-lg">₹{totals.netAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="border border-gray-300 bg-white p-4 rounded-md shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Payment</h3>
            <table className="w-full border-separate" style={{ borderSpacing: "0 8px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Paid Amount</td>
                  <td>
                    <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className={`${inputClass} text-right w-48`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Pending Amount</td>
                  <td>
                    <Input
                      readOnly
                      value={(totals.netAmount - (parseFloat(paidAmount) || 0)).toFixed(2)}
                      className={`${inputClass} text-right bg-gray-50 font-bold text-red-600 w-48`}
                    />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Due Date</td>
                  <td className="relative z-[30]">
                    <div className="w-48">
                      <DatePicker value={dueDate} onChange={setDueDate} className={inputClass} placeholder="Select date" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
