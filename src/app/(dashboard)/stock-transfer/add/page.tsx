"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { useCompany } from "@/context/CompanyContext";
import { stockTransferService } from "@/services/stockTransferService";
import { itemService } from "@/services/itemService";
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
  packing?: number;
  godownStock?: {
    godownId: string;
    openingStockFreshPcs?: number;
  }[];
}

interface ItemRecord {
  _id: string;
  itemName: string;
  hsnCode?: string;
  codeBarCode?: string;
  itemSubGroupId?: { _id: string; name: string } | string;
  mrp?: number;
  packing?: number;
  isActive?: boolean;
  mrpEntries?: MrpEntry[];
}

interface Line {
  key: string;
  itemId: string;
  itemName: string;
  packing: number;
  mrp: number;
  caseQty: number;
  pcsQty: number;
  totalPieces: number;
}

export default function AddStockTransferPage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  // See purchase/add/page.tsx for why this ref exists — blocks a genuine rapid
  // double-click from firing two concurrent saves that could race on stock updates.
  const savingRef = useRef(false);
  const [items, setItems] = useState<ItemRecord[]>([]);
  // Unfiltered — see purchase/add/page.tsx for why this exists alongside `items`.
  const [allItems, setAllItems] = useState<ItemRecord[]>([]);
  const [godowns, setGodowns] = useState<{ _id: string; name: string; godownGroupId?: { _id: string; name: string } | string | null }[]>([]);
  // Unfiltered — see allItems above for why this exists alongside `godowns`.
  const [allGodowns, setAllGodowns] = useState<{ _id: string; name: string; godownGroupId?: { _id: string; name: string } | string | null }[]>([]);

  // Header
  const [transferNo, setTransferNo] = useState("");
  const [transferDate, setTransferDate] = useState(todayValue);
  const [fromGodownId, setFromGodownId] = useState("");
  const [toGodownId, setToGodownId] = useState("");
  const [notes, setNotes] = useState("");

  // Entry row
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedRateIndex, setSelectedRateIndex] = useState<number | null>(null);
  const [mrp, setMrp] = useState("0");
  const [caseQty, setCaseQty] = useState("0");
  const [pcsQty, setPcsQty] = useState("0");

  const [lines, setLines] = useState<Line[]>([]);
  // See sale/add/page.tsx for why this ref exists — lets handleEditLine restore a
  // line's own values without the item-select auto-fill effect immediately overwriting them.
  const skipAutoFillRef = useRef(false);

  useEffect(() => {
    if (!companyId) return;
    itemService.getItems(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setAllItems(list);
      setItems(list.filter((i: ItemRecord) => i.isActive !== false));
    });
    godownService.getGodowns(companyId, 1, 1000).then((res: any) => {
      const list = res.data || res || [];
      setAllGodowns(list);
      setGodowns(list.filter((g: any) => g.isActive !== false));
    });
  }, [companyId]);

  // Item Name is unscoped, so the only way a currently-loaded item can be missing
  // from `items` is deactivation — inject it back as an extra option so it stays
  // visible/selectable instead of vanishing.
  const selectedItemFallback =
    selectedItemId && !items.some((i) => i._id === selectedItemId)
      ? allItems.find((i) => i._id === selectedItemId)
      : undefined;
  const itemDropdownOptions = selectedItemFallback ? [...items, selectedItemFallback] : items;

  // Same fallback as items, applied to the header-level From/To Godown selects — each
  // is its own single value here (not per-line, unlike the other 4 transactional
  // modules), so each gets its own injected fallback option.
  const selectedFromGodownFallback =
    fromGodownId && !godowns.some((g) => g._id === fromGodownId)
      ? allGodowns.find((g) => g._id === fromGodownId)
      : undefined;
  const fromGodownDropdownOptions = selectedFromGodownFallback ? [...godowns, selectedFromGodownFallback] : godowns;

  const selectedToGodownFallback =
    toGodownId && !godowns.some((g) => g._id === toGodownId)
      ? allGodowns.find((g) => g._id === toGodownId)
      : undefined;
  const toGodownDropdownOptions = selectedToGodownFallback ? [...godowns, selectedToGodownFallback] : godowns;

  const selectedItem = items.find((i) => i._id === selectedItemId) || allItems.find((i) => i._id === selectedItemId) || null;
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
    } else {
      setSelectedRateIndex(null);
      setMrp(String(selectedItem.mrp ?? 0));
    }
  }, [selectedItemId]);

  const handleRateSelect = (idxStr: string) => {
    const idx = parseInt(idxStr, 10);
    const entry = activeRateEntries[idx];
    if (!entry) return;
    setSelectedRateIndex(idx);
    setMrp(String(entry.mrp ?? 0));
  };

  const selectedRateEntry = selectedRateIndex !== null ? activeRateEntries[selectedRateIndex] : null;
  const effectivePacking = selectedRateEntry?.packing ?? selectedItem?.packing ?? 1;

  const totalPiecesPreview = useMemo(() => {
    const c = parseFloat(caseQty) || 0;
    const p = parseFloat(pcsQty) || 0;
    return c * effectivePacking + p;
  }, [caseQty, pcsQty, effectivePacking]);

  const resetEntryRow = () => {
    setSelectedItemId("");
    setSelectedRateIndex(null);
    setMrp("0");
    setCaseQty("0");
    setPcsQty("0");
  };

  const handleAddLine = () => {
    if (!selectedItem) {
      toast.error("Select an item first");
      return;
    }
    if (!fromGodownId || !toGodownId) {
      toast.error("Select both From Godown and To Godown at the top first");
      return;
    }
    if (fromGodownId === toGodownId) {
      toast.error("From Godown and To Godown must be different");
      return;
    }
    const c = parseFloat(caseQty) || 0;
    const p = parseFloat(pcsQty) || 0;
    if (c <= 0 && p <= 0) {
      toast.error("Enter Case or Pcs quantity");
      return;
    }
    if (c < 0 || p < 0) {
      toast.error("Quantities cannot be negative");
      return;
    }

    const line: Line = {
      key: `${selectedItem._id}-${Date.now()}`,
      itemId: selectedItem._id,
      itemName: selectedItem.itemName,
      packing: effectivePacking,
      mrp: parseFloat(mrp) || 0,
      caseQty: c,
      pcsQty: p,
      totalPieces: totalPiecesPreview,
    };

    setLines((prev) => [...prev, line]);
    resetEntryRow();
  };

  const handleRemoveLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const handleEditLine = (line: Line) => {
    const targetItem = items.find((i) => i._id === line.itemId) || allItems.find((i) => i._id === line.itemId);
    const targetActiveEntries = (targetItem?.mrpEntries || []).filter((e) => e.mrpActive !== false);
    const idx = targetActiveEntries.findIndex((e) => Math.abs((e.mrp ?? 0) - line.mrp) < 0.001);

    skipAutoFillRef.current = true;
    setSelectedItemId(line.itemId);
    setSelectedRateIndex(idx >= 0 ? idx : null);
    setMrp(String(line.mrp));
    setCaseQty(String(line.caseQty));
    setPcsQty(String(line.pcsQty));

    handleRemoveLine(line.key);
  };

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, l) => {
        acc.totalItems += 1;
        acc.totalCase += l.caseQty;
        acc.totalPcs += l.pcsQty;
        acc.totalQty += l.totalPieces;
        return acc;
      },
      { totalItems: 0, totalCase: 0, totalPcs: 0, totalQty: 0 }
    );
  }, [lines]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId) return;
    if (savingRef.current) return;

    if (!transferNo.trim() || !transferDate) {
      toast.error("Please fill Transfer No and Transfer Date");
      return;
    }
    if (!fromGodownId || !toGodownId) {
      toast.error("Please select both From Godown and To Godown");
      return;
    }
    if (fromGodownId === toGodownId) {
      toast.error("From Godown and To Godown must be different");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      await stockTransferService.createStockTransfer({
        companyId,
        transferNo: transferNo.trim(),
        transferDate,
        fromGodownId,
        toGodownId,
        notes,
        items: lines.map((l) => ({
          itemId: l.itemId,
          mrp: l.mrp,
          caseQty: l.caseQty,
          pcsQty: l.pcsQty,
        })),
      });
      toast.success("Stock transfer saved");
      router.push("/stock-transfer");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save stock transfer");
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

  // Item Reference shows the FROM godown's current Fresh stock — that's what
  // determines how much of this item can actually be moved out — and, below it,
  // the TO godown's own current Fresh stock, so the user can see where it's landing.
  const selectedFromBucket = fromGodownId
    ? selectedRateEntry?.godownStock?.find((g) => String(g.godownId) === String(fromGodownId))
    : undefined;
  const stockPcs = selectedFromBucket?.openingStockFreshPcs ?? 0;
  const stockPacking = effectivePacking;
  const stockCase = Math.floor(stockPcs / stockPacking);
  const stockLoose = stockPcs - stockCase * stockPacking;

  const selectedToBucket = toGodownId
    ? selectedRateEntry?.godownStock?.find((g) => String(g.godownId) === String(toGodownId))
    : undefined;
  const toStockPcs = selectedToBucket?.openingStockFreshPcs ?? 0;
  const toStockCase = Math.floor(toStockPcs / stockPacking);
  const toStockLoose = toStockPcs - toStockCase * stockPacking;

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
    { key: "mrp", header: "MRP Rs", align: "right" as const, accessor: (l: Line) => l.mrp.toFixed(2) },
    { key: "case", header: "Case", align: "right" as const, accessor: (l: Line) => l.caseQty },
    { key: "pcs", header: "Pcs", align: "right" as const, accessor: (l: Line) => l.pcsQty },
    { key: "totalPieces", header: "Total Pcs", align: "right" as const, accessor: (l: Line) => l.totalPieces },
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
        title="Stock Transfer - Add"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/stock-transfer")}
        onClose={() => router.push("/stock-transfer")}
      />

      <div className="p-3 flex flex-col xl:flex-row gap-4 text-sm">
        {/* Left Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Header */}
          <div className="border border-gray-300 bg-white p-4 rounded-md shadow-sm">
            <table className="w-full border-separate" style={{ borderSpacing: "0 10px" }}>
              <tbody>
                <tr>
                  <td className={rowLabel}>Transfer No. <span className="text-red-500 font-bold">*</span></td>
                  <td>
                    <div className="w-48">
                      <Input value={transferNo} onChange={(e) => setTransferNo(e.target.value)} className={inputClass} />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>Transfer Date <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[65]">
                    <div className="w-48">
                      <DatePicker value={transferDate} onChange={setTransferDate} className={inputClass} placeholder="Select date" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>From Godown <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[62]">
                    <Select
                      options={fromGodownDropdownOptions.map((g) => ({ value: g._id, label: godownLabel(g) }))}
                      value={fromGodownId}
                      onChange={setFromGodownId}
                      className={selectClass}
                      placeholder="Select From Godown"
                    />
                  </td>
                </tr>
                <tr>
                  <td className={rowLabel}>To Godown <span className="text-red-500 font-bold">*</span></td>
                  <td className="relative z-[61]">
                    <Select
                      options={toGodownDropdownOptions.map((g) => ({ value: g._id, label: godownLabel(g) }))}
                      value={toGodownId}
                      onChange={setToGodownId}
                      className={selectClass}
                      placeholder="Select To Godown"
                    />
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
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Add Transfer Item</h3>
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
                {selectedItem && activeRateEntries.length > 0 && (
                  <tr>
                    <td className={rowLabel}>Rate</td>
                    <td className="relative z-[52]">
                      <Select
                        options={activeRateEntries.map((e, i) => ({
                          value: String(i),
                          label: `MRP ₹${(e.mrp || 0).toFixed(2)}`,
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
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={`${rowLabel} font-bold text-blue-900`}>Total Pcs</td>
                  <td>
                    <Input readOnly value={totalPiecesPreview} className={`${inputClass} text-right bg-gray-100 font-bold text-blue-900 w-full`} />
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
            ) : !fromGodownId ? (
              <p className="text-sm text-gray-400 p-4">Select a From Godown at the top to see stock available there.</p>
            ) : (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">MRP</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">₹{(selectedRateEntry?.mrp ?? selectedItem.mrp ?? 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Packing</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{stockPacking}</div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">
                    <Boxes size={12} />
                    Fresh Stock in From Godown — available to move out
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
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
                  </div>
                </div>

                {toGodownId ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-2">
                      <Boxes size={12} />
                      Fresh Stock in To Godown — already there
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg py-2">
                        <div className="text-sm font-bold text-blue-700">{toStockPcs.toFixed(1)}</div>
                        <div className="text-[10px] text-blue-600">Total Pcs</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg py-2">
                        <div className="text-sm font-bold text-blue-700">{toStockCase}</div>
                        <div className="text-[10px] text-blue-600">Case</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg py-2">
                        <div className="text-sm font-bold text-blue-700">{toStockLoose.toFixed(1)}</div>
                        <div className="text-[10px] text-blue-600">Loose</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Select a To Godown at the top to see stock already there.</p>
                )}
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
          </div>
        </div>
      </div>
    </div>
  );
}
