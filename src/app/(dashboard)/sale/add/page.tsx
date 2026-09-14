"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { saleService } from "@/services/saleService";
import { itemService } from "@/services/itemService";
import { customerService } from "@/services/customerService";
import { godownService } from "@/services/godownService";
import { toast } from "@/lib/toast";
import { Plus, X, Pencil, Package, Boxes } from "lucide-react";

// "YYYY-MM-DD" for today, in local time — used to default required date fields
// so the user doesn't have to open the picker just to pick "today" (still editable).
function todayValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "Godown Name - Group Name" — auto-derived from the godown's own godownGroupId
// (already populated by godownService.getGodowns), instead of relying on the group
// being manually typed into the godown's name.
function godownLabel(g: { name: string; godownGroupId?: { _id: string; name: string } | string | null }) {
  const groupName = typeof g.godownGroupId === "object" && g.godownGroupId ? g.godownGroupId.name : "";
  return groupName ? `${g.name} - ${groupName}` : g.name;
}

// Same item name can legitimately repeat across different Sub Groups — include the
// Sub Group in the Item Name dropdown's own label so two "Namkeen"s are distinguishable
// without having to already know which HSN code belongs to which.
function itemLabel(i: { itemName: string; hsnCode?: string; codeBarCode?: string; itemSubGroupId?: { _id: string; name: string } | string }) {
  const subGroupName = typeof i.itemSubGroupId === "object" && i.itemSubGroupId ? i.itemSubGroupId.name : "";
  const namePart = subGroupName ? `${i.itemName} - ${subGroupName}` : i.itemName;
  const withHsn = i.hsnCode ? `${namePart} (${i.hsnCode})` : namePart;
  return i.codeBarCode ? `[${i.codeBarCode}] ${withHsn}` : withHsn;
}

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
  codeBarCode?: string;
  itemSubGroupId?: { _id: string; name: string } | string;
  mrp?: number;
  salesRate?: number;
  retailRate?: number;
  salesQty?: number;
  packing?: number;
  gstPercentage?: number;
  openingStockFreshPcs?: number;
  openingStockDamagedPcs?: number;
  lastCostRate?: number;
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
  creditLimit?: number;
  creditDays?: number;
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
  godownId: string;
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

  // Mirrors saleController.js's computeLine exactly so this preview never lies.
  const beforeGstRate =
    billedPieces > 0
      ? (taxableValue / billedPieces) * salesQty
      : (entry.afterGstRate / (1 + gstPercent / 100)) -
        ((entry.afterGstRate / (1 + gstPercent / 100)) * (entry.lessPercent + entry.cdPercent)) / 100;

  return { packing, salesQty, gstPercent, totalPieces, amount, taxableValue, gstAmount, netValue, beforeGstRate };
}

export default function AddSalePage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  // See purchase/add/page.tsx for why this ref exists — blocks a rapid double-click
  // from firing two concurrent saves that could race on the same item's stock update.
  const savingRef = useRef(false);
  // Non-null message = "over the customer's credit limit, confirm before saving".
  // A soft warning, not a hard block — see handleSave.
  const [creditWarning, setCreditWarning] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRecord[]>([]);
  // Unfiltered — see purchase/add/page.tsx for why this exists alongside `items`.
  const [allItems, setAllItems] = useState<ItemRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  // Unfiltered — see allItems above for why this exists alongside `customers`.
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string; godownGroupId?: { _id: string; name: string } | string | null }[]>([]);
  // Unfiltered — same reason as allItems, but per-line (see godownDropdownOptions below).
  const [allGodowns, setAllGodowns] = useState<{ _id: string; name: string; godownGroupId?: { _id: string; name: string } | string | null }[]>([]);

  // Header
  const [invoiceType, setInvoiceType] = useState("Tax Invoice");
  const [paymentType, setPaymentType] = useState("Credit");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayValue);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");

  // Entry row
  // Per-line, not header-level — each added line carries its own godown, so a single
  // Sale can move different items out of different godowns.
  const [godownId, setGodownId] = useState("");
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

  const [lines, setLines] = useState<Line[]>([]);
  // Set right before setSelectedItemId() inside handleEditLine, so the auto-fill
  // effect below (which normally defaults the rate/qty fields to the item's first
  // active MRP tier whenever selectedItemId changes) skips itself exactly once —
  // otherwise it would immediately stomp over the line's own values we're restoring.
  const skipAutoFillRef = useRef(false);

  useEffect(() => {
    if (!companyId) return;
    itemService.getItems(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setAllItems(list);
      setItems(list.filter((i: ItemRecord) => i.isActive !== false));
    });
    customerService.getCustomers(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setAllCustomers(list);
      setCustomers(list.filter((c: CustomerRecord & { isActive?: boolean }) => (c as any).isActive !== false));
    });
    godownService.getGodowns(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setAllGodowns(list);
      setGodowns(list.filter((g: any) => g.isActive !== false));
    });
  }, [companyId]);

  // Auto-generate the next Invoice No. as (highest existing numeric invoice no.) + 1,
  // starting from 1 if this is the company's first sale. Still editable — this is a
  // convenience default, not a locked field.
  useEffect(() => {
    if (!companyId) return;
    saleService.getSales(companyId, 1, 1000, "").then((res: any) => {
      const list = res.data || res || [];
      const maxNo = list.reduce((max: number, s: any) => {
        const n = parseInt(s.invoiceNo, 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      setInvoiceNo(String(maxNo + 1));
    }).catch(() => setInvoiceNo("1"));
  }, [companyId]);

  // Same "keep a deactivated-but-referenced record selectable" fallback as items below —
  // Customer is a single, header-level value here, so inject it back as an extra option
  // if it's been filtered out by the active-only filter (e.g. deactivated after this
  // sale was created).
  const selectedCustomerFallback =
    customerId && !customers.some((c) => c._id === customerId)
      ? allCustomers.find((c) => c._id === customerId)
      : undefined;
  const customerDropdownOptions = selectedCustomerFallback ? [...customers, selectedCustomerFallback] : customers;

  const selectedCustomer = customers.find((c) => c._id === customerId) || allCustomers.find((c) => c._id === customerId) || null;
  const customerType = selectedCustomer?.customerType || "Retailer";

  // Defaults Due Date from the customer's own Default Due Days (creditDays) the
  // moment they're selected — only when Due Date is still blank, so it never
  // stomps a value the user already picked. 0/unset creditDays means the
  // customer has no due-date policy configured, so nothing is defaulted.
  useEffect(() => {
    if (!selectedCustomer || !selectedCustomer.creditDays || !invoiceDate || dueDate) return;
    const d = new Date(`${invoiceDate}T00:00:00`);
    d.setDate(d.getDate() + selectedCustomer.creditDays);
    setDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Item Name is unscoped (no supplier-style filter, see quirk #26), so the only way
  // a currently-loaded item can be missing from `items` is deactivation — inject it
  // back as an extra option so it stays visible/selectable instead of vanishing.
  const selectedItemFallback =
    selectedItemId && !items.some((i) => i._id === selectedItemId)
      ? allItems.find((i) => i._id === selectedItemId)
      : undefined;
  const itemDropdownOptions = selectedItemFallback ? [...items, selectedItemFallback] : items;

  // Same fallback as items, applied to Godown. Godown is per-line here, so the
  // "referenced" set isn't just one value — it's every grid line's own godownId plus
  // whatever's currently selected in the entry row.
  const referencedGodownIds = new Set([...lines.map((l) => l.godownId), godownId].filter(Boolean));
  const missingGodowns = allGodowns.filter(
    (g) => referencedGodownIds.has(g._id) && !godowns.some((gd) => gd._id === g._id)
  );
  const godownDropdownOptions = missingGodowns.length ? [...godowns, ...missingGodowns] : godowns;

  const selectedItem = items.find((i) => i._id === selectedItemId) || allItems.find((i) => i._id === selectedItemId) || null;

  const activeRateEntries = (selectedItem?.mrpEntries || []).filter((e) => e.mrpActive !== false);

  // Defaults the entered rate from the customer's tier (Retailer/Wholesaler/Distributor)
  // net-cost — the GST-inclusive price for that tier, per the selected MRP entry.
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

  // See purchase/add/page.tsx — memoized so it only changes reference when
  // selectedItem/selectedRateEntry actually do, instead of defeating the `preview`
  // useMemo below by being a fresh object literal every render.
  const effectiveItem = useMemo(() => {
    if (!selectedItem) return null;
    return {
      ...selectedItem,
      packing: selectedRateEntry?.packing ?? selectedItem.packing,
      salesQty: selectedRateEntry?.salesQty ?? selectedItem.salesQty,
    };
  }, [selectedItem, selectedRateEntry]);

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
    if (!godownId) {
      toast.error("Select a Godown for this line");
      return;
    }
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
    // See purchase/add/page.tsx — nothing previously capped combined discounts
    // against the line's own amount.
    if (preview.taxableValue < 0) {
      toast.error("Discounts cannot exceed the line amount");
      return;
    }

    const line: Line = {
      key: `${selectedItem._id}-${Date.now()}`,
      itemId: selectedItem._id,
      itemName: selectedItem.itemName,
      packing: preview.packing,
      salesQty: preview.salesQty,
      mrp: parseFloat(mrp) || 0,
      godownId,
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
    };

    setLines((prev) => [...prev, line]);
    resetEntryRow();
  };

  const handleRemoveLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  // Loads an already-added line back into the entry row for editing, and removes it
  // from the grid — adjusting values and clicking "Add Line" again re-adds it in
  // place of the original, instead of only being able to delete-and-retype from scratch.
  const handleEditLine = (line: Line) => {
    const targetItem = items.find((i) => i._id === line.itemId) || allItems.find((i) => i._id === line.itemId);
    const targetActiveEntries = (targetItem?.mrpEntries || []).filter((e) => e.mrpActive !== false);
    const idx = targetActiveEntries.findIndex((e) => Math.abs((e.mrp ?? 0) - line.mrp) < 0.001);

    skipAutoFillRef.current = true;
    setSelectedItemId(line.itemId);
    setSelectedRateIndex(idx >= 0 ? idx : null);
    setGodownId(line.godownId);
    setMrp(String(line.mrp));
    setCaseQty(String(line.caseQty));
    setPcsQty(String(line.pcsQty));
    setFreeQty(String(line.freeQty));
    setAfterGstRate(String(line.afterGstRate));
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

  // See purchase/add/page.tsx — negative means a genuine advance/credit balance,
  // not an error; left unclamped, shown as a clearly-labeled Advance instead.
  const pendingAmountValue = totals.netAmount - (parseFloat(receivedAmount) || 0);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId) return;
    if (savingRef.current) return;

    if (!invoiceNo.trim() || !invoiceDate) {
      toast.error("Please fill Invoice No and Invoice Date");
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

    // Credit limit is a soft warning, not a hard block — 0/unset means the
    // customer has no limit configured at all, so nothing to check.
    if (selectedCustomer && (selectedCustomer.creditLimit || 0) > 0) {
      try {
        const status: any = await customerService.getCustomerOutstanding(customerId, companyId);
        const thisSalePending = totals.netAmount - (parseFloat(receivedAmount) || 0);
        const projected = (status.outstanding || 0) + thisSalePending;
        if (projected > selectedCustomer.creditLimit!) {
          setCreditWarning(
            `${selectedCustomer.name}'s credit limit is ₹${selectedCustomer.creditLimit!.toFixed(2)}. This sale would bring their outstanding to ₹${projected.toFixed(2)} — over the limit by ₹${(projected - selectedCustomer.creditLimit!).toFixed(2)}. Save this sale anyway?`
          );
          return;
        }
      } catch (err) {
        // A failed check shouldn't block a sale the user can otherwise complete —
        // just skip the warning and proceed.
        console.error("Credit limit check failed", err);
      }
    }

    await performSave();
  };

  const performSave = async () => {
    if (!companyId) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await saleService.createSale({
        companyId,
        invoiceType,
        paymentType,
        invoiceNo: invoiceNo.trim(),
        invoiceDate,
        deliveryDate: deliveryDate || undefined,
        customerId,
        notes,
        receivedAmount: parseFloat(receivedAmount) || 0,
        dueDate: dueDate || undefined,
        items: lines.map((l) => ({
          itemId: l.itemId,
          mrp: l.mrp,
          godownId: l.godownId,
          caseQty: l.caseQty,
          pcsQty: l.pcsQty,
          freeQty: l.freeQty,
          afterGstRate: l.afterGstRate,
          lessPercent: l.lessPercent,
          lessRs: l.lessRs,
          cdPercent: l.cdPercent,
          cdRs: l.cdRs,
        })),
      });
      toast.success("Sale saved");
      router.push("/sale");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save sale");
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
    {
      key: "subGroup",
      header: "Sub Group",
      accessor: (l: Line) => {
        const item = allItems.find((i) => i._id === l.itemId);
        const sub = item && typeof item.itemSubGroupId === "object" ? item.itemSubGroupId?.name : "";
        return sub || "-";
      },
    },
    {
      key: "godown",
      header: "Godown",
      accessor: (l: Line) => {
        // allGodowns, not the active-only `godowns` — a line can reference a
        // godown that's since been deactivated, and this grid row must still
        // show its real name instead of silently falling back to "-".
        const g = allGodowns.find((gd) => gd._id === l.godownId);
        return g ? godownLabel(g) : "-";
      },
    },
    { key: "mrp", header: "MRP Rs", align: "right" as const, accessor: (l: Line) => l.mrp.toFixed(2) },
    { key: "case", header: "Case", align: "right" as const, accessor: (l: Line) => l.caseQty },
    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (l: Line) => l.pcsQty },
    { key: "fq", header: "FQ", align: "right" as const, accessor: (l: Line) => l.freeQty },
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
        title="Sale - Add"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/sale")}
        onClose={() => router.push("/sale")}
      />

      <div className="p-3 flex flex-col xl:flex-row gap-4 text-sm">
        {/* Left Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Header */}
          <div className="border border-gray-300 bg-white p-4 rounded-md shadow-sm">
            <table className="w-full border-separate" style={{ borderSpacing: "0 10px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Customer <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[70]">
                    <div className="w-64">
                      <Select
                        options={customerDropdownOptions.map((c) => ({ value: c._id, label: c.name }))}
                        value={customerId}
                        onChange={setCustomerId}
                        className={selectClass}
                        placeholder="Select Customer"
                      />
                    </div>
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
                  <td className={rowLabel}>Invoice Type</td>
                  <td className="relative z-[62]">
                    <div className="w-48">
                      <Select
                        options={[
                          { value: "Tax Invoice", label: "Tax Invoice" },
                          { value: "Performa Invoice", label: "Performa Invoice" },
                        ]}
                        value={invoiceType}
                        onChange={setInvoiceType}
                        className={selectClass}
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Payment Type</td>
                  <td className="relative z-[61]">
                    <div className="w-48">
                      <Select
                        options={[
                          { value: "Cash", label: "Cash" },
                          { value: "Credit", label: "Credit" },
                          { value: "Bank", label: "Bank" },
                          { value: "UPI", label: "UPI" },
                        ]}
                        value={paymentType}
                        onChange={setPaymentType}
                        className={selectClass}
                      />
                    </div>
                  </td>
                </tr>
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
                  <td className={rowLabel}>Delivery Date</td>
                  <td className="relative z-[64]">
                    <div className="w-48">
                      <DatePicker value={deliveryDate} onChange={setDeliveryDate} className={inputClass} placeholder="Select date" minDate={invoiceDate} />
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
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Add Sale Item</h3>
            <table className="w-full border-separate" style={{ borderSpacing: "0 8px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Item Name</td>
                  <td className="relative z-[55]">
                    <Select
                      options={itemDropdownOptions.map((i) => ({ value: i._id, label: itemLabel(i) }))}
                      value={selectedItemId}
                      onChange={setSelectedItemId}
                      className={selectClass}
                      placeholder="Select Item"
                    />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Godown <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[54]">
                    <Select
                      options={godownDropdownOptions.map((g) => ({ value: g._id, label: godownLabel(g) }))}
                      value={godownId}
                      onChange={setGodownId}
                      className={selectClass}
                      placeholder="Select Godown"
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

                {/* Stock */}
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">
                    <Boxes size={12} />
                    Stock {godownId ? "(selected godown)" : ""}
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
                  <td className={rowLabel}>Received Amount</td>
                  <td>
                    <Input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} className={`${inputClass} text-right w-48`} />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>{pendingAmountValue < 0 ? "Advance (Overpaid)" : "Pending Amount"}</td>
                  <td>
                    <Input
                      readOnly
                      value={Math.abs(pendingAmountValue).toFixed(2)}
                      className={`${inputClass} text-right bg-gray-50 font-bold w-48 ${pendingAmountValue < 0 ? "text-green-600" : "text-red-600"}`}
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

      <ConfirmationDialog
        isOpen={creditWarning !== null}
        onClose={() => setCreditWarning(null)}
        onConfirm={() => {
          setCreditWarning(null);
          performSave();
        }}
        title="Credit Limit Exceeded"
        message={creditWarning || ""}
        confirmText="Save Anyway"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
}
