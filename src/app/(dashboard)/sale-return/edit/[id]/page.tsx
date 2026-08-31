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
import { saleReturnService } from "@/services/saleReturnService";
import { itemService } from "@/services/itemService";
import { customerService } from "@/services/customerService";
import { godownService } from "@/services/godownService";
import { toast } from "sonner";
import { Plus, X, Pencil, Package, Boxes, Search } from "lucide-react";

interface MrpEntry {
  mrp?: number;
  mrpActive?: boolean;
  salesQty?: number;
  packing?: number;
  purchaseQty?: number;
  retailRate?: number;
  wholeSaleRate?: number;
  distributorRate?: number;
  netCostRetailer?: number;
  netCostWholesaler?: number;
  netCostDistributor?: number;
  openingStockFreshPcs?: number;
  openingStockDamagedPcs?: number;
  godownStock?: {
    godownId: string;
    openingStockFreshPcs?: number;
    openingStockDamagedPcs?: number;
  }[];
}

interface ItemRecord {
  _id: string;
  itemName: string;
  hsnCode?: string;
  codeBarCode?: string;
  mrp?: number;
  salesRate?: number;
  retailRate?: number;
  salesQty?: number;
  packing?: number;
  gstPercentage?: number;
  openingStockFreshPcs?: number;
  openingStockDamagedPcs?: number;
  isActive?: boolean;
  mrpEntries?: MrpEntry[];
}

interface CustomerRecord {
  _id: string;
  name: string;
  customerType?: string;
  gstNo?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface Line {
  key: string;
  itemId: string;
  itemName: string;
  packing: number;
  salesQty: number;
  mrp: number;
  caseQty: number;
  pcsQty: number;
  freeQty: number;
  totalPieces: number;
  afterGstRate: number;
  lessPercent: number;
  lessRs: number;
  cdPercent: number;
  cdRs: number;
  beforeGstRate: number;
  amount: number;
  taxableValue: number;
  gstPercent: number;
  gstAmount: number;
  netValue: number;
  // Fresh = resellable, gets added back into the sellable Fresh stock bucket.
  // Damaged = recorded (visible in the Damaged stock figures) but NOT added
  // back to sellable inventory. See saleReturnController.applyStockDelta.
  condition: "Fresh" | "Damaged";
}

function computeLine(entry: {
  caseQty: number; pcsQty: number; freeQty: number; afterGstRate: number;
  lessPercent: number; lessRs: number; cdPercent: number; cdRs: number;
}, item: ItemRecord) {
  const packing = item.packing || 1;
  const salesQty = item.salesQty || 1;
  const gstPercent = item.gstPercentage || 0;

  const billedPieces = entry.caseQty * packing + entry.pcsQty;
  const totalPieces = billedPieces + entry.freeQty;
  const pricePerPiece = salesQty > 0 ? entry.afterGstRate / salesQty : 0;

  const amount = pricePerPiece * billedPieces;
  const lessAmt = (amount * entry.lessPercent) / 100 + entry.lessRs;
  const cdAmt = (amount * entry.cdPercent) / 100 + entry.cdRs;
  const netValue = amount - lessAmt - cdAmt;
  const taxableValue = gstPercent > 0 ? netValue / (1 + gstPercent / 100) : netValue;
  const gstAmount = netValue - taxableValue;

  const beforeGstRate =
    billedPieces > 0
      ? (taxableValue / billedPieces) * salesQty
      : (entry.afterGstRate / (1 + gstPercent / 100)) -
        ((entry.afterGstRate / (1 + gstPercent / 100)) * (entry.lessPercent + entry.cdPercent)) / 100;

  return { packing, salesQty, gstPercent, totalPieces, amount, taxableValue, gstAmount, netValue, beforeGstRate };
}

function toDateInputValue(d: any) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function EditSaleReturnPage() {
  const router = useRouter();
  const params = useParams();
  const saleReturnId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // See purchase/add/page.tsx for why this ref exists — blocks a rapid double-click
  // from firing two concurrent saves that could race on the same item's stock update.
  const savingRef = useRef(false);
  const [looking, setLooking] = useState(false);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string }[]>([]);

  const [returnNo, setReturnNo] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [godownId, setGodownId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState("");
  const [originalSaleId, setOriginalSaleId] = useState("");
  // Set (or re-set) whenever "Fetch" resolves an original invoice — a return can't
  // predate the sale it's returning against. Not populated on initial load from the
  // saved record; re-fetch via the button if this needs to be enforced again.
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");

  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedRateIndex, setSelectedRateIndex] = useState<number | null>(null);
  const [mrp, setMrp] = useState("0");
  const [caseQty, setCaseQty] = useState("0");
  const [pcsQty, setPcsQty] = useState("0");
  const [freeQty, setFreeQty] = useState("0");
  const [afterGstRate, setAfterGstRate] = useState("0");
  const [lessPercent, setLessPercent] = useState("0");
  const [lessRs, setLessRs] = useState("0");
  const [cdPercent, setCdPercent] = useState("0");
  const [cdRs, setCdRs] = useState("0");
  const [condition, setCondition] = useState<"Fresh" | "Damaged">("Fresh");

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
    customerService.getCustomers(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setCustomers(list.filter((c: CustomerRecord & { isActive?: boolean }) => (c as any).isActive !== false));
    });
    godownService.getGodowns(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setGodowns(list.filter((g: any) => g.isActive !== false));
    });
  }, [companyId]);

  useEffect(() => {
    if (!saleReturnId) return;
    saleReturnService
      .getSaleReturnById(saleReturnId)
      .then((r: any) => {
        setReturnNo(r.returnNo || "");
        setReturnDate(toDateInputValue(r.returnDate));
        setGodownId(typeof r.godownId === "string" ? r.godownId : r.godownId?._id || "");
        setCustomerId(typeof r.customerId === "string" ? r.customerId : r.customerId?._id || "");
        setOriginalInvoiceNo(r.originalInvoiceNo || "");
        setOriginalSaleId(r.originalSaleId || "");
        setNotes(r.notes || "");
        setRefundAmount(String(r.refundAmount ?? 0));
        setDueDate(toDateInputValue(r.dueDate));
        setLines(
          (r.items || []).map((it: any, idx: number) => ({
            key: `${it.itemId}-${idx}`,
            itemId: it.itemId,
            itemName: it.itemName,
            packing: it.packing,
            salesQty: it.salesQty,
            mrp: it.mrp,
            caseQty: it.caseQty,
            pcsQty: it.pcsQty,
            freeQty: it.freeQty,
            totalPieces: it.totalPieces,
            afterGstRate: it.afterGstRate,
            lessPercent: it.lessPercent,
            lessRs: it.lessRs,
            cdPercent: it.cdPercent,
            cdRs: it.cdRs,
            beforeGstRate: it.beforeGstRate,
            amount: it.amount,
            taxableValue: it.taxableValue,
            gstPercent: it.gstPercent,
            gstAmount: it.gstAmount,
            netValue: it.netValue,
            condition: it.condition === "Damaged" ? "Damaged" : "Fresh",
          }))
        );
      })
      .catch((err: any) => {
        console.error(err);
        toast.error("Failed to load sale return");
      })
      .finally(() => setLoading(false));
  }, [saleReturnId]);

  const selectedCustomer = customers.find((c) => c._id === customerId) || null;
  const customerType = selectedCustomer?.customerType || "Retailer";

  const selectedItem = items.find((i) => i._id === selectedItemId) || null;

  const activeRateEntries = (selectedItem?.mrpEntries || []).filter((e) => e.mrpActive !== false);

  const netCostForCustomerType = (entry: MrpEntry | null | undefined, item: ItemRecord | null) => {
    if (entry) {
      if (customerType === "Wholesaler") return entry.netCostWholesaler ?? 0;
      if (customerType === "Distributor") return entry.netCostDistributor ?? 0;
      return entry.netCostRetailer ?? 0;
    }
    return item?.retailRate ?? item?.salesRate ?? 0;
  };

  useEffect(() => {
    if (skipAutoFillRef.current) {
      skipAutoFillRef.current = false;
      return;
    }
    if (!selectedItem) return;
    if (activeRateEntries.length > 0) {
      setSelectedRateIndex(0);
      setMrp(String(activeRateEntries[0].mrp ?? 0));
      setAfterGstRate(String(netCostForCustomerType(activeRateEntries[0], selectedItem)));
    } else {
      setSelectedRateIndex(null);
      setMrp(String(selectedItem.mrp ?? 0));
      setAfterGstRate(String(netCostForCustomerType(null, selectedItem)));
    }
  }, [selectedItemId]);

  const handleRateSelect = (idxStr: string) => {
    const idx = parseInt(idxStr, 10);
    const entry = activeRateEntries[idx];
    if (!entry) return;
    setSelectedRateIndex(idx);
    setMrp(String(entry.mrp ?? 0));
    setAfterGstRate(String(netCostForCustomerType(entry, selectedItem)));
  };

  const selectedRateEntry = selectedRateIndex !== null ? activeRateEntries[selectedRateIndex] : null;

  const effectiveItem = selectedItem
    ? {
        ...selectedItem,
        packing: selectedRateEntry?.packing ?? selectedItem.packing,
        salesQty: selectedRateEntry?.salesQty ?? selectedItem.salesQty,
      }
    : null;

  const preview = useMemo(() => {
    if (!effectiveItem) return null;
    return computeLine(
      {
        caseQty: parseFloat(caseQty) || 0,
        pcsQty: parseFloat(pcsQty) || 0,
        freeQty: parseFloat(freeQty) || 0,
        afterGstRate: parseFloat(afterGstRate) || 0,
        lessPercent: parseFloat(lessPercent) || 0,
        lessRs: parseFloat(lessRs) || 0,
        cdPercent: parseFloat(cdPercent) || 0,
        cdRs: parseFloat(cdRs) || 0,
      },
      effectiveItem
    );
  }, [effectiveItem, caseQty, pcsQty, freeQty, afterGstRate, lessPercent, lessRs, cdPercent, cdRs]);

  const resetEntryRow = () => {
    setSelectedItemId("");
    setSelectedRateIndex(null);
    setMrp("0");
    setCaseQty("0");
    setPcsQty("0");
    setFreeQty("0");
    setAfterGstRate("0");
    setLessPercent("0");
    setLessRs("0");
    setCdPercent("0");
    setCdRs("0");
    setCondition("Fresh");
  };

  const handleAddLine = () => {
    if (!selectedItem) {
      toast.error("Select an item first");
      return;
    }
    const c = parseFloat(caseQty) || 0;
    const p = parseFloat(pcsQty) || 0;
    const fq = parseFloat(freeQty) || 0;
    const rate = parseFloat(afterGstRate) || 0;
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
      salesQty: preview.salesQty,
      mrp: parseFloat(mrp) || 0,
      caseQty: c,
      pcsQty: p,
      freeQty: parseFloat(freeQty) || 0,
      totalPieces: preview.totalPieces,
      afterGstRate: parseFloat(afterGstRate) || 0,
      lessPercent: parseFloat(lessPercent) || 0,
      lessRs: parseFloat(lessRs) || 0,
      cdPercent: parseFloat(cdPercent) || 0,
      cdRs: parseFloat(cdRs) || 0,
      beforeGstRate: preview.beforeGstRate,
      amount: preview.amount,
      taxableValue: preview.taxableValue,
      gstPercent: preview.gstPercent,
      gstAmount: preview.gstAmount,
      netValue: preview.netValue,
      condition,
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

    skipAutoFillRef.current = true;
    setSelectedItemId(line.itemId);
    setSelectedRateIndex(idx >= 0 ? idx : null);
    setMrp(String(line.mrp));
    setCaseQty(String(line.caseQty));
    setPcsQty(String(line.pcsQty));
    setFreeQty(String(line.freeQty));
    setAfterGstRate(String(line.afterGstRate));
    setLessPercent(String(line.lessPercent));
    setLessRs(String(line.lessRs));
    setCdPercent(String(line.cdPercent));
    setCdRs(String(line.cdRs));
    setCondition(line.condition || "Fresh");

    handleRemoveLine(line.key);
  };

  const handleLookupInvoice = async () => {
    if (!companyId || !originalInvoiceNo.trim()) {
      toast.error("Enter an invoice number to look up");
      return;
    }
    setLooking(true);
    try {
      const original: any = await saleReturnService.lookupOriginalInvoice(companyId, originalInvoiceNo.trim());
      setOriginalSaleId(original._id);
      setGodownId(original.godownId);
      setCustomerId(typeof original.customerId === "string" ? original.customerId : original.customerId?._id || "");
      setOriginalInvoiceDate(original.invoiceDate ? new Date(original.invoiceDate).toISOString().slice(0, 10) : "");

      const loadedLines: Line[] = (original.items || []).map((l: any, idx: number) => ({
        key: `orig-${idx}-${Date.now()}`,
        itemId: l.itemId,
        itemName: l.itemName,
        packing: l.packing,
        salesQty: l.salesQty,
        mrp: l.mrp,
        caseQty: l.caseQty,
        pcsQty: l.pcsQty,
        freeQty: l.freeQty,
        totalPieces: l.totalPieces,
        afterGstRate: l.afterGstRate,
        lessPercent: l.lessPercent,
        lessRs: l.lessRs,
        cdPercent: l.cdPercent,
        cdRs: l.cdRs,
        beforeGstRate: l.beforeGstRate,
        amount: l.amount,
        taxableValue: l.taxableValue,
        gstPercent: l.gstPercent,
        gstAmount: l.gstAmount,
        netValue: l.netValue,
        condition: "Fresh" as const,
      }));
      setLines(loadedLines);
      toast.success(`Loaded ${loadedLines.length} item(s) from invoice ${original.invoiceNo}`);
    } catch (err: any) {
      toast.error(err.message || "No sale invoice found with that number");
    } finally {
      setLooking(false);
    }
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

    if (!returnNo.trim() || !returnDate) {
      toast.error("Please fill Return No and Return Date");
      return;
    }
    if (!godownId) {
      toast.error("Please select a Godown");
      return;
    }
    // A Sale Return must be linked to a real original Sale — otherwise the Customer
    // select was free to pick anyone, including a customer nothing was ever actually
    // sold to. Enforced by requiring a successful "Fetch" (which resolves
    // originalSaleId) before a save is allowed.
    if (!originalSaleId) {
      toast.error("Please fetch the original invoice first — a sale return must be linked to a real sale");
      return;
    }
    if (!customerId) {
      toast.error("Please select a Customer");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await saleReturnService.updateSaleReturn(saleReturnId, {
        returnNo: returnNo.trim(),
        returnDate,
        godownId,
        customerId,
        originalInvoiceNo: originalInvoiceNo.trim(),
        originalSaleId: originalSaleId || null,
        notes,
        refundAmount: parseFloat(refundAmount) || 0,
        dueDate: dueDate || null,
        items: lines.map((l) => ({
          itemId: l.itemId,
          mrp: l.mrp,
          caseQty: l.caseQty,
          pcsQty: l.pcsQty,
          freeQty: l.freeQty,
          afterGstRate: l.afterGstRate,
          lessPercent: l.lessPercent,
          lessRs: l.lessRs,
          cdPercent: l.cdPercent,
          cdRs: l.cdRs,
          condition: l.condition,
        })),
      });
      toast.success("Sale Return updated");
      router.push("/sale-return");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update sale return");
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

  const gridColumns = [
    { key: "idx", header: "#", accessor: (_: Line, i: number) => i + 1 },
    { key: "item", header: "Item Name", accessor: (l: Line) => l.itemName },
    { key: "mrp", header: "MRP Rs", align: "right" as const, accessor: (l: Line) => l.mrp.toFixed(2) },
    { key: "case", header: "Case", align: "right" as const, accessor: (l: Line) => l.caseQty },
    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (l: Line) => l.pcsQty },
    {
      key: "condition",
      header: "Condition",
      accessor: (l: Line) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.condition === "Damaged" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          {l.condition === "Damaged" ? "Expired" : "Fresh"}
        </span>
      ),
    },
    { key: "rate", header: "Rate Rs", align: "right" as const, accessor: (l: Line) => l.afterGstRate.toFixed(2) },
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
        title="Sale Return - Edit"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/sale-return")}
        onClose={() => router.push("/sale-return")}
      />

      <div className="p-3 flex flex-col xl:flex-row gap-4 max-w-[1500px] mx-auto text-sm">
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Header */}
          <div className="border border-gray-300 bg-white p-4 rounded-md shadow-sm">
            <table className="w-full border-separate" style={{ borderSpacing: "0 10px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Original Invoice No. <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[70]">
                    <div className="flex items-center gap-2 w-72">
                      <Input value={originalInvoiceNo} onChange={(e) => setOriginalInvoiceNo(e.target.value)} className={`${inputClass} flex-1`} placeholder="Enter invoice number and Fetch" />
                      <Button type="button" size="sm" variant="outline" onClick={handleLookupInvoice} disabled={looking} leftIcon={<Search size={14} />}>
                        {looking ? "..." : "Fetch"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">A sale return must be linked to a real sale — fetch it here first.</p>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Customer <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[68]">
                    <div className="w-64">
                      <Select
                        options={customers.map((c) => ({ value: c._id, label: c.name }))}
                        value={customerId}
                        onChange={setCustomerId}
                        className={selectClass}
                        placeholder="Select Customer"
                        disabled={!!originalSaleId}
                      />
                    </div>
                    {originalSaleId && (
                      <p className="text-[11px] text-gray-400 mt-1">Locked — comes from the fetched invoice above.</p>
                    )}
                  </td>
                </tr>
                {selectedCustomer && (
                  <tr>
                    <td></td>
                    <td>
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5">
                        <div className="font-bold text-blue-900 text-sm">{selectedCustomer.name}</div>
                        {selectedCustomer.address && (
                          <div className="text-xs text-gray-600 mt-0.5">{selectedCustomer.address}</div>
                        )}
                        {(selectedCustomer.city || selectedCustomer.state) && (
                          <div className="text-xs text-gray-600">
                            {[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-semibold">
                          {(selectedCustomer.phone || selectedCustomer.mobile) && (
                            <span className="text-gray-700">{selectedCustomer.phone || selectedCustomer.mobile}</span>
                          )}
                          {selectedCustomer.gstNo && (
                            <span className="text-blue-700">GST: {selectedCustomer.gstNo}</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                <tr>
                  <td className={rowLabel}>Return No. <span className="text-red-500 font-bold">*</span></td>
                  <td>
                    <div className="w-48">
                      <Input value={returnNo} onChange={(e) => setReturnNo(e.target.value)} className={inputClass} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Return Date <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[65]">
                    <div className="w-48">
                      <DatePicker
                        value={returnDate}
                        onChange={setReturnDate}
                        className={inputClass}
                        placeholder="Select date"
                        minDate={originalInvoiceDate}
                        helperText={originalInvoiceDate ? `Cannot be before the original invoice (${originalInvoiceDate.split("-").reverse().join("-")})` : undefined}
                      />
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
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Add Return Item</h3>
            <table className="w-full border-separate" style={{ borderSpacing: "0 8px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Item Name</td>
                  <td className="relative z-[55]">
                    <Select
                      options={items.map((i) => ({ value: i._id, label: `${i.codeBarCode ? `[${i.codeBarCode}] ` : ""}${i.itemName}${i.hsnCode ? ` (${i.hsnCode})` : ""}` }))}
                      value={selectedItemId}
                      onChange={setSelectedItemId}
                      className={selectClass}
                      placeholder="Select Item"
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
                          label: `MRP ₹${(e.mrp || 0).toFixed(2)} - Rate ₹${netCostForCustomerType(e, selectedItem).toFixed(2)}`,
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
                  <td className={rowLabel}>Condition</td>
                  <td className="relative z-[50]">
                    <div className="w-48">
                      <Select
                        options={[
                          { value: "Fresh", label: "Fresh (resellable)" },
                          { value: "Damaged", label: "Expired" },
                        ]}
                        value={condition}
                        onChange={(v) => setCondition(v as "Fresh" | "Damaged")}
                        className={selectClass}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>After GST Rate</td>
                  <td>
                    <Input type="number" value={afterGstRate} onChange={(e) => setAfterGstRate(e.target.value)} className={`${inputClass} text-right w-full`} />
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
                  <td className={`${rowLabel} font-bold text-red-700`}>Before GST Rate</td>
                  <td>
                    <Input readOnly value={preview ? preview.beforeGstRate.toFixed(4) : "0.0000"} className={`${inputClass} text-right bg-gray-50 text-red-600 font-bold w-full`} />
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
          <div className="border border-gray-300 bg-white rounded-md shadow-sm overflow-hidden">
            <Table columns={gridColumns as any} data={lines} emptyMessage="No items added yet. Fetch an original invoice or add a line manually." />
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">MRP</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">₹{(selectedRateEntry?.mrp ?? selectedItem.mrp ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Sale Rate ({customerType})</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">₹{netCostForCustomerType(selectedRateEntry, selectedItem).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Packing</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedRateEntry?.packing ?? selectedItem.packing ?? 1}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">GST %</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedItem.gstPercentage ?? 0}%</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">
                    <Boxes size={12} />
                    Stock in this Godown — returning as <span className={condition === "Damaged" ? "text-amber-700" : "text-green-700"}>{condition === "Damaged" ? "Expired" : "Fresh"}</span> adds to that bucket only
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className={`bg-green-50 border rounded-lg py-2 ${condition === "Fresh" ? "border-green-400 ring-1 ring-green-300" : "border-green-100"}`}>
                      <div className="text-sm font-bold text-green-700">{stockPcs.toFixed(1)}</div>
                      <div className="text-[10px] text-green-600">Total Pcs</div>
                    </div>
                    <div className={`bg-green-50 border rounded-lg py-2 ${condition === "Fresh" ? "border-green-400 ring-1 ring-green-300" : "border-green-100"}`}>
                      <div className="text-sm font-bold text-green-700">{stockCase}</div>
                      <div className="text-[10px] text-green-600">Case</div>
                    </div>
                    <div className={`bg-green-50 border rounded-lg py-2 ${condition === "Fresh" ? "border-green-400 ring-1 ring-green-300" : "border-green-100"}`}>
                      <div className="text-sm font-bold text-green-700">{stockLoose.toFixed(1)}</div>
                      <div className="text-[10px] text-green-600">Loose</div>
                    </div>
                    <div className={`bg-amber-50 border rounded-lg py-2 ${condition === "Damaged" ? "border-amber-400 ring-1 ring-amber-300" : "border-amber-100"}`}>
                      <div className="text-sm font-bold text-amber-700">{stockDamagedPcs.toFixed(1)}</div>
                      <div className="text-[10px] text-amber-600">Expired</div>
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
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Refund</h3>
            <table className="w-full border-separate" style={{ borderSpacing: "0 8px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Refund Amount</td>
                  <td>
                    <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className={`${inputClass} text-right w-48`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Pending Amount</td>
                  <td>
                    <Input
                      readOnly
                      value={(totals.netAmount - (parseFloat(refundAmount) || 0)).toFixed(2)}
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
