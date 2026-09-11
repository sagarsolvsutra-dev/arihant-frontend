"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { itemService } from "@/services/itemService";
import { supplierService } from "@/services/supplierService";
import { itemNameService } from "@/services/itemNameService";
import { itemSubGroupService } from "@/services/itemSubGroupService";
import { hsnService } from "@/services/hsnService";
import { splitCasePcs } from "@/lib/stock";

// All fields an MRP entry carries — used to detect whether the form fields have
// actually diverged from the currently selected grid row (not just MRP/rate/discount).
const MRP_ENTRY_FIELDS = [
  "mrp", "mrpActive", "purchaseRate", "discountPercentage",
  "marginToCostRetailer", "marginToCostWholesaler", "marginToCostDistributor",
  "marginToMrpRetailer", "marginToMrpWholesaler", "marginToMrpDistributor",
  "retailRate", "wholeSaleRate", "distributorRate",
  "packing", "purchaseQty", "salesQty", "minStockQty", "weightPerPiece", "schemeRemark",
  "openingStockFreshCase", "openingStockFreshPcs", "openingStockDamagedCase", "openingStockDamagedPcs",
];

function mrpEntriesEqual(a: any, b: any) {
  if (!a || !b) return false;
  return MRP_ENTRY_FIELDS.every((key) => a[key] === b[key]);
}

export default function AddItemPage() {
  const router = useRouter();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Master Data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [itemNamesList, setItemNamesList] = useState<any[]>([]);
  const [subGroups, setSubGroups] = useState<any[]>([]);
  const [hsnCodesList, setHsnCodesList] = useState<any[]>([]);

  // General fields
  const [name, setName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [itemSubGroupId, setItemSubGroupId] = useState("");
  const [gstPercentage, setGstPercentage] = useState("18"); // Default 18%
  const [hsnCode, setHsnCode] = useState("");
  const [uqcUnit, setUqcUnit] = useState("NOS");
  const [hsnPrint, setHsnPrint] = useState("");
  const [codeBarCode, setCodeBarCode] = useState("");
  const [packing, setPacking] = useState("1");
  const [weightPerPiece, setWeightPerPiece] = useState("0");
  const [schemeRemark, setSchemeRemark] = useState("");
  const [itemActive, setItemActive] = useState(true);
  const [minStockQty, setMinStockQty] = useState("0");

  // Pricing fields
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [salesQty, setSalesQty] = useState("1");
  const [mrp, setMrp] = useState("0");
  const [mrpActive, setMrpActive] = useState(true);
  const [purchaseRate, setPurchaseRate] = useState("0");
  const [discountPercentage, setDiscountPercentage] = useState("0");

  // Margins
  const [marginToCostRetailer, setMarginToCostRetailer] = useState("0");
  const [marginToCostWholesaler, setMarginToCostWholesaler] = useState("0");
  const [marginToCostDistributor, setMarginToCostDistributor] = useState("0");
  const [marginToMrpRetailer, setMarginToMrpRetailer] = useState("0");
  const [marginToMrpWholesaler, setMarginToMrpWholesaler] = useState("0");
  const [marginToMrpDistributor, setMarginToMrpDistributor] = useState("0");

  // Sales Rates (derived or input)
  const [salesRateRetailer, setSalesRateRetailer] = useState("0");
  const [salesRateWholesaler, setSalesRateWholesaler] = useState("0");
  const [salesRateDistributor, setSalesRateDistributor] = useState("0");

  // Stock fields — Case and Loose Pcs are independent entry fields, exactly like
  // Purchase/Sale's Case+Pcs (loose pieces on top of full cases, not a total-pieces
  // value in disguise). The real backend field `openingStock*Pcs` is a pure total
  // piece count, so it's always derived (case*packing + loosePcs) at submit time —
  // never typed directly. See openingStockFreshTotalPcs/openingStockDamagedTotalPcs.
  const [openingStockFreshCase, setOpeningStockFreshCase] = useState("0");
  const [openingStockFreshLoosePcs, setOpeningStockFreshLoosePcs] = useState("0");
  const [openingStockDamagedCase, setOpeningStockDamagedCase] = useState("0");
  const [openingStockDamagedLoosePcs, setOpeningStockDamagedLoosePcs] = useState("0");
  const [lastCostRate, setLastCostRate] = useState("0");

  // Calculated fields (Display only)
  const [purchaseRatePerPiece, setPurchaseRatePerPiece] = useState("0");
  const [netCostSelf, setNetCostSelf] = useState("0");
  const [netCostSelfPerPiece, setNetCostSelfPerPiece] = useState("0");
  const [netCostCustomerRetailer, setNetCostCustomerRetailer] = useState("0");
  const [netCostCustomerWholesaler, setNetCostCustomerWholesaler] = useState("0");
  const [netCostCustomerDistributor, setNetCostCustomerDistributor] = useState("0");
  const [netCostCustomerRetailerPerPiece, setNetCostCustomerRetailerPerPiece] = useState("0");
  const [netCostCustomerWholesalerPerPiece, setNetCostCustomerWholesalerPerPiece] = useState("0");
  const [netCostCustomerDistributorPerPiece, setNetCostCustomerDistributorPerPiece] = useState("0");

  // Multi-MRP grid
  const [mrpEntries, setMrpEntries] = useState<any[]>([]);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);
  const [confirmDeleteMrp, setConfirmDeleteMrp] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadMasters();
    }
  }, [companyId]);

  const loadMasters = async () => {
    try {
      const [supRes, subGrpRes, hsnRes] = await Promise.all([
        supplierService.getSuppliers(companyId!, 1, 1000),
        itemSubGroupService.getItemSubGroups(companyId!, 1, 1000),
        hsnService.getHsnCodes(companyId!, 1, 1000),
      ]);
      setSuppliers(Array.isArray(supRes) ? supRes : supRes.data || []);
      setSubGroups(Array.isArray(subGrpRes) ? subGrpRes : subGrpRes.data || []);
      setHsnCodesList(Array.isArray(hsnRes) ? hsnRes : hsnRes.data || []);
    } catch (err) {
      console.error("Failed to load masters", err);
    }
  };

  useEffect(() => {
    if (companyId && supplierId) {
      loadItemNames(supplierId);
    } else {
      setItemNamesList([]);
    }
  }, [companyId, supplierId]);

  const loadItemNames = async (supplierId: string) => {
    try {
      const data = await itemNameService.getItemNames(companyId!, "", supplierId);
      const list = Array.isArray(data) ? data : data.data || [];
      setItemNamesList(list);
    } catch (err) {
      console.error(err);
    }
  };

  // The real stored field is a pure total piece count — Case/Loose-Pcs are only an
  // entry convenience, so the total is always derived here, never typed directly.
  const openingStockFreshTotalPcs =
    (parseFloat(openingStockFreshCase) || 0) * (parseFloat(packing) || 1) + (parseFloat(openingStockFreshLoosePcs) || 0);
  const openingStockDamagedTotalPcs =
    (parseFloat(openingStockDamagedCase) || 0) * (parseFloat(packing) || 1) + (parseFloat(openingStockDamagedLoosePcs) || 0);

  const buildEntryFromFields = () => ({
    mrp: parseFloat(mrp) || 0,
    mrpActive,
    purchaseRate: parseFloat(purchaseRate) || 0,
    discountPercentage: parseFloat(discountPercentage) || 0,
    netCostSelf: parseFloat(netCostSelf) || 0,
    netCostSelfPerPiece: parseFloat(netCostSelfPerPiece) || 0,
    marginToCostRetailer: parseFloat(marginToCostRetailer) || 0,
    marginToCostWholesaler: parseFloat(marginToCostWholesaler) || 0,
    marginToCostDistributor: parseFloat(marginToCostDistributor) || 0,
    marginToMrpRetailer: parseFloat(marginToMrpRetailer) || 0,
    marginToMrpWholesaler: parseFloat(marginToMrpWholesaler) || 0,
    marginToMrpDistributor: parseFloat(marginToMrpDistributor) || 0,
    retailRate: parseFloat(salesRateRetailer) || 0,
    wholeSaleRate: parseFloat(salesRateWholesaler) || 0,
    distributorRate: parseFloat(salesRateDistributor) || 0,
    netCostRetailer: parseFloat(netCostCustomerRetailer) || 0,
    netCostWholesaler: parseFloat(netCostCustomerWholesaler) || 0,
    netCostDistributor: parseFloat(netCostCustomerDistributor) || 0,
    netCostRetailerPerPiece: parseFloat(netCostCustomerRetailerPerPiece) || 0,
    netCostWholesalerPerPiece: parseFloat(netCostCustomerWholesalerPerPiece) || 0,
    netCostDistributorPerPiece: parseFloat(netCostCustomerDistributorPerPiece) || 0,
    packing: parseFloat(packing) || 1,
    purchaseQty: parseFloat(purchaseQty) || 1,
    salesQty: parseFloat(salesQty) || 1,
    minStockQty: parseFloat(minStockQty) || 0,
    weightPerPiece: parseFloat(weightPerPiece) || 0,
    schemeRemark: schemeRemark.trim(),
    openingStockFreshCase: parseFloat(openingStockFreshCase) || 0,
    openingStockFreshPcs: openingStockFreshTotalPcs,
    openingStockDamagedCase: parseFloat(openingStockDamagedCase) || 0,
    openingStockDamagedPcs: openingStockDamagedTotalPcs,
  });

  // Only resets the pricing side (MRP/Purchase Rate/Discount/Margins) after a rate is
  // added — Packing, Purchase/Sale Qty, Reorder Level, Weight, Scheme Remark, and
  // Opening Stock are left as-is, since they're typically identical across an item's
  // MRP tiers and the user shouldn't have to retype them for every new price point.
  const resetEntryFields = () => {
    setMrp("0");
    setMrpActive(true);
    setPurchaseRate("0");
    setDiscountPercentage("0");
    setMarginToCostRetailer("0");
    setMarginToCostWholesaler("0");
    setMarginToCostDistributor("0");
    setMarginToMrpRetailer("0");
    setMarginToMrpWholesaler("0");
    setMarginToMrpDistributor("0");
    setSalesRateRetailer("0");
    setSalesRateWholesaler("0");
    setSalesRateDistributor("0");
  };

  const handleAddMrpEntry = () => {
    const entry = buildEntryFromFields();
    if (entry.mrp <= 0 || entry.purchaseRate <= 0) {
      setSelectedEntryIndex(null);
      resetEntryFields();
      return;
    }
    // Fields still match the currently selected/loaded row untouched — nothing new to add yet.
    // Compares every field the entry carries, not just mrp/rate/discount, so an edit to e.g.
    // opening stock on a selected row isn't silently discarded just because MRP didn't change.
    const currentEntry = selectedEntryIndex !== null ? mrpEntries[selectedEntryIndex] : null;
    const isUnchanged = currentEntry && mrpEntriesEqual(currentEntry, entry);
    if (isUnchanged) {
      setSelectedEntryIndex(null);
      resetEntryFields();
      return;
    }
    const isDuplicate = mrpEntries.some((e) => e.mrp === entry.mrp);
    if (isDuplicate) {
      setSelectedEntryIndex(null);
      resetEntryFields();
      toast.error(`An MRP entry of ${entry.mrp} already exists`);
      return;
    }
    setMrpEntries((prev) => [...prev, entry]);
    setSelectedEntryIndex(null);
    resetEntryFields();
    toast.success("MRP entry added — enter a new price below");
  };

  const handleEditMrpEntry = () => {
    if (selectedEntryIndex === null) {
      toast.error("Select a row in the grid first");
      return;
    }
    const entry = buildEntryFromFields();
    const isDuplicate = mrpEntries.some((e, i) => i !== selectedEntryIndex && e.mrp === entry.mrp);
    if (isDuplicate) {
      toast.error(`An MRP entry of ${entry.mrp} already exists`);
      return;
    }
    setMrpEntries((prev) => prev.map((e, i) => (i === selectedEntryIndex ? entry : e)));
    toast.success("MRP entry updated");
  };

  const confirmDeleteMrpEntry = () => {
    if (selectedEntryIndex === null) return;
    setMrpEntries((prev) => prev.filter((_, i) => i !== selectedEntryIndex));
    setSelectedEntryIndex(null);
    setConfirmDeleteMrp(false);
    toast.success("MRP entry deleted");
  };

  const handleSelectMrpEntry = (index: number) => {
    const entry = mrpEntries[index];
    if (!entry) return;
    setSelectedEntryIndex(index);
    setMrp(String(entry.mrp ?? 0));
    setMrpActive(entry.mrpActive ?? true);
    setPurchaseRate(String(entry.purchaseRate ?? 0));
    setDiscountPercentage(String(entry.discountPercentage ?? 0));
    setMarginToCostRetailer(String(entry.marginToCostRetailer ?? 0));
    setMarginToCostWholesaler(String(entry.marginToCostWholesaler ?? 0));
    setMarginToCostDistributor(String(entry.marginToCostDistributor ?? 0));
    setMarginToMrpRetailer(String(entry.marginToMrpRetailer ?? 0));
    setMarginToMrpWholesaler(String(entry.marginToMrpWholesaler ?? 0));
    setMarginToMrpDistributor(String(entry.marginToMrpDistributor ?? 0));
    setPacking(String(entry.packing ?? 1));
    setPurchaseQty(String(entry.purchaseQty ?? 1));
    setSalesQty(String(entry.salesQty ?? 1));
    setMinStockQty(String(entry.minStockQty ?? 0));
    setWeightPerPiece(String(entry.weightPerPiece ?? 0));
    setSchemeRemark(entry.schemeRemark ?? "");
    // entry.openingStock*Pcs is a stored TOTAL piece count — split it back into
    // whole Case + remaining Loose Pcs for display, using the entry's own packing
    // (not the component's `packing` state, which setPacking above hasn't
    // committed yet in this same synchronous pass).
    const freshSplit = splitCasePcs(entry.openingStockFreshPcs ?? 0, entry.packing ?? 1);
    setOpeningStockFreshCase(String(freshSplit.case));
    setOpeningStockFreshLoosePcs(String(freshSplit.pcs));
    const damagedSplit = splitCasePcs(entry.openingStockDamagedPcs ?? 0, entry.packing ?? 1);
    setOpeningStockDamagedCase(String(damagedSplit.case));
    setOpeningStockDamagedLoosePcs(String(damagedSplit.pcs));
  };

  const handleToggleMrpEntryActive = (index: number) => {
    setMrpEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, mrpActive: !(e.mrpActive ?? true) } : e))
    );
    if (index === selectedEntryIndex) {
      setMrpActive((prevVal) => !prevVal);
    }
  };

  // --- Dynamic Calculations Effect ---
  useEffect(() => {
    const pRate = parseFloat(purchaseRate) || 0;
    const disc = parseFloat(discountPercentage) || 0;
    const gst = parseFloat(gstPercentage) || 0;
    const pQty = parseFloat(purchaseQty) || 1;
    const sQty = parseFloat(salesQty) || 1;

    let totalPurchasePieces = pQty > 0 ? pQty : 1;
    let totalSalesPieces = sQty > 0 ? sQty : 1;

    let pRateForSalesQty = 0;
    if (totalPurchasePieces > 0) {
      pRateForSalesQty = (pRate / totalPurchasePieces) * totalSalesPieces;
    }
    setPurchaseRatePerPiece(pRateForSalesQty.toFixed(4));

    const totalDiscountedRate = pRate - (pRate * (disc / 100));
    const ncSelfTotal = totalDiscountedRate + (totalDiscountedRate * (gst / 100));
    setNetCostSelf(ncSelfTotal.toFixed(4));

    let ncSelfForSalesQty = 0;
    if (totalPurchasePieces > 0) {
      ncSelfForSalesQty = (ncSelfTotal / totalPurchasePieces) * totalSalesPieces;
    }
    setNetCostSelfPerPiece(ncSelfForSalesQty.toFixed(4));
    
    setLastCostRate(ncSelfTotal.toFixed(4));
  }, [purchaseRate, packing, discountPercentage, gstPercentage, purchaseQty, salesQty]);

  useEffect(() => {
    const baseRate = parseFloat(purchaseRatePerPiece) || 0;
    const ncSelf1Pc = parseFloat(netCostSelfPerPiece) || 0;

    const margCostRet = parseFloat(marginToCostRetailer) || 0;
    setSalesRateRetailer((baseRate + (baseRate * (margCostRet / 100))).toFixed(4));

    const margCostWhole = parseFloat(marginToCostWholesaler) || 0;
    setSalesRateWholesaler((baseRate + (baseRate * (margCostWhole / 100))).toFixed(4));

    const margCostDist = parseFloat(marginToCostDistributor) || 0;
    setSalesRateDistributor((baseRate + (baseRate * (margCostDist / 100))).toFixed(4));
  }, [marginToCostRetailer, marginToCostWholesaler, marginToCostDistributor, purchaseRatePerPiece]);

  useEffect(() => {
    
    const margCostRet = parseFloat(marginToCostRetailer) || 0;
    const margCostWhole = parseFloat(marginToCostWholesaler) || 0;
    const margCostDist = parseFloat(marginToCostDistributor) || 0;
    
    const ncSelf1Pc = parseFloat(netCostSelfPerPiece) || 0;

    setNetCostCustomerRetailer((ncSelf1Pc + (ncSelf1Pc * (margCostRet / 100))).toFixed(4));
    setNetCostCustomerWholesaler((ncSelf1Pc + (ncSelf1Pc * (margCostWhole / 100))).toFixed(4));
    setNetCostCustomerDistributor((ncSelf1Pc + (ncSelf1Pc * (margCostDist / 100))).toFixed(4));

    setNetCostCustomerRetailerPerPiece((ncSelf1Pc + (ncSelf1Pc * (margCostRet / 100))).toFixed(4));
    setNetCostCustomerWholesalerPerPiece((ncSelf1Pc + (ncSelf1Pc * (margCostWhole / 100))).toFixed(4));
    setNetCostCustomerDistributorPerPiece((ncSelf1Pc + (ncSelf1Pc * (margCostDist / 100))).toFixed(4));
  }, [salesRateRetailer, salesRateWholesaler, salesRateDistributor, marginToCostRetailer, marginToCostWholesaler, marginToCostDistributor, netCostSelfPerPiece]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!supplierId) newErrors.supplierId = "Supplier is required";
    if (!name.trim()) newErrors.name = "Item Name is required";
    if (!hsnCode) newErrors.hsnCode = "HSN Code is required";
    if (!hsnPrint.trim()) newErrors.hsnPrint = "HSN (Print) is required";
    if (!codeBarCode.trim()) newErrors.codeBarCode = "Code/BarCode is required";
    if (!packing || parseFloat(packing) < 1) newErrors.packing = "Packing is required";
    // `!purchaseRate` etc. never caught a literal "0" — a non-empty string is
    // truthy in JS, so leaving these at their default "0" silently passed
    // validation despite the required red asterisk, creating an item with zero
    // pricing. Compare the parsed numeric value instead, matching the Packing
    // check above.
    if (!purchaseRate || parseFloat(purchaseRate) <= 0) newErrors.purchaseRate = "Purchase Rate is required";
    if (!salesRateRetailer || parseFloat(salesRateRetailer) <= 0) newErrors.salesRateRetailer = "Sale Rate is required";
    if (!mrp || parseFloat(mrp) <= 0) newErrors.mrp = "M.R.P. is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId) return;

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const finalMrpEntries = mrpEntries.length > 0 ? mrpEntries : [buildEntryFromFields()];
      const primaryEntry = finalMrpEntries[selectedEntryIndex ?? 0] || finalMrpEntries[0];

      const payload: any = {
        companyId,
        itemName: name.trim(),
        supplierId: supplierId || undefined,
        itemSubGroupId: itemSubGroupId || undefined,
        gstPercentage: parseFloat(gstPercentage) || 0,
        hsnCode: hsnCode.trim(),
        hsnPrint: hsnPrint.trim(),
        codeBarCode: codeBarCode.trim(),
        uqcUnit: uqcUnit.trim(),
        packing: primaryEntry.packing ?? 1,
        weightPerPiece: primaryEntry.weightPerPiece ?? 0,
        schemeRemark: primaryEntry.schemeRemark ?? "",
        isActive: itemActive,
        minStockQty: primaryEntry.minStockQty ?? 0,

        mrp: primaryEntry.mrp,
        mrpActive: primaryEntry.mrpActive,
        purchaseRate: primaryEntry.purchaseRate,
        purchaseType: "Carton", // Default to schema requirement
        purchaseQty: primaryEntry.purchaseQty ?? 1,
        salesType: "Pieces", // Default to schema requirement
        salesQty: primaryEntry.salesQty ?? 1,
        discountPercentage: primaryEntry.discountPercentage,
        marginToCostRetailer: primaryEntry.marginToCostRetailer,
        marginToCostWholesaler: primaryEntry.marginToCostWholesaler,
        marginToCostDistributor: primaryEntry.marginToCostDistributor,
        marginToMrpRetailer: primaryEntry.marginToMrpRetailer,
        marginToMrpWholesaler: primaryEntry.marginToMrpWholesaler,
        marginToMrpDistributor: primaryEntry.marginToMrpDistributor,
        retailRate: primaryEntry.retailRate,
        wholeSaleRate: primaryEntry.wholeSaleRate,
        distributorRate: primaryEntry.distributorRate,
        netCostRetailer: primaryEntry.netCostRetailer,
        netCostWholesaler: primaryEntry.netCostWholesaler,
        netCostDistributor: primaryEntry.netCostDistributor,
        netCostRetailerPerPiece: primaryEntry.netCostRetailerPerPiece,
        netCostWholesalerPerPiece: primaryEntry.netCostWholesalerPerPiece,
        netCostDistributorPerPiece: primaryEntry.netCostDistributorPerPiece,
        openingStockFreshCase: primaryEntry.openingStockFreshCase ?? 0,
        openingStockFreshPcs: primaryEntry.openingStockFreshPcs ?? 0,
        openingStockDamagedCase: primaryEntry.openingStockDamagedCase ?? 0,
        openingStockDamagedPcs: primaryEntry.openingStockDamagedPcs ?? 0,
        lastCostRate: parseFloat(lastCostRate) || 0,
        mrpEntries: finalMrpEntries,
      };

      await itemService.createItem(payload);
      toast.success("Item saved successfully");
      router.push("/items");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save item");
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

  const subGroupOptions = subGroups.filter(s => {
    if (!supplierId) return false;
    if (s.supplierId !== supplierId) return false;
    if (name && s.itemNameId?.name !== name) return false;
    return (s.isActive !== false || s._id === itemSubGroupId);
  });

  return (
    <div className="mx-auto bg-[#f0f0f0] min-h-screen font-sans">
      <FormToolbar
        title="Item - Add"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/items")}
        onClose={() => router.push("/items")}
      />

      <div className="p-3 flex flex-col xl:flex-row gap-4 max-w-[1350px] mx-auto text-sm">

        {/* Left Column - General Details */}
        <div className="flex-[1.15] border border-gray-300 bg-white p-4 rounded-md shadow-sm">

          <table className="w-full border-separate responsive-form-table" style={{ borderSpacing: '0 10px' }}>
            <tbody>
              <tr>
                <td className="w-[180px] align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Supplier</td>
                <td className="flex gap-2 items-start relative z-[60]">
                  <div className="w-48">
                    <Select
                      options={suppliers
                        .filter(s => s.isActive !== false || s._id === supplierId)
                        .map(s => ({ value: s._id, label: s.name }))}
                      value={supplierId}
                      onChange={(val) => {
                        setSupplierId(val);
                        setName(""); // Reset item name when supplier changes
                      }}
                      error={errors.supplierId}
                      className={selectClass}
                      placeholder="Select Supplier"
                    />
                  </div>
                  <div className="flex items-center gap-1 h-[32px] whitespace-nowrap font-medium text-gray-700 ml-4">
                    <span className="text-red-500 font-bold">*</span>
                    <span>Item Active</span>
                    <input type="checkbox" checked={itemActive} onChange={e => setItemActive(e.target.checked)} className="h-4 w-4 ml-1 rounded border-gray-300" />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Item Name <span className="text-red-500 font-bold">*</span></td>
                <td className="pr-4">
                  <div className="w-64">
                    <Select
                      options={itemNamesList
                        .filter(inm => inm.isActive !== false || inm.name === name)
                        .map(inm => ({ value: inm.name, label: inm.name }))}
                      value={name}
                      onChange={(val) => {
                        setName(val);
                        setItemSubGroupId(""); // Reset sub group when item name changes
                      }}
                      error={errors.name}
                      className={selectClass}
                      placeholder={!supplierId ? "Select Supplier first" : itemNamesList.length === 0 ? "No item names for this supplier" : "Select Item Name"}
                      disabled={!supplierId || itemNamesList.length === 0}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Sub Group</td>
                <td className="flex items-start gap-2 relative z-[55]">
                  <div className="w-72">
                    <Select
                      options={subGroupOptions.map(s => ({ value: s._id, label: s.name }))}
                      value={itemSubGroupId}
                      onChange={setItemSubGroupId}
                      className={selectClass}
                      placeholder={!supplierId ? "Select Supplier first" : subGroupOptions.length === 0 ? "No sub groups for this item" : "Select Sub Group"}
                      disabled={!supplierId || subGroupOptions.length === 0}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">GST %age</td>
                <td className="flex items-start gap-2 relative z-[50]">
                  <div className="w-72">
                    <Select
                      options={[
                        { value: "0", label: "GST @ 0%" },
                        { value: "5", label: "GST @ 5%" },
                        { value: "12", label: "GST @ 12%" },
                        { value: "18", label: "GST @ 18%" },
                        { value: "28", label: "GST @ 28%" },
                      ]}
                      value={gstPercentage}
                      onChange={setGstPercentage}
                      className={selectClass}
                    />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">HSN Code</td>
                <td className="flex items-start gap-2 pr-4 relative z-[40]">
                  <div className="w-72">
                    <Select
                      options={hsnCodesList.map(h => ({ value: h.hsnCode, label: `${h.hsnCode} ${h.description}` }))}
                      value={hsnCode}
                      onChange={(val) => {
                        setHsnCode(val);
                        const selectedHsn = hsnCodesList.find(h => h.hsnCode === val);
                        if (selectedHsn) {
                          setHsnPrint(selectedHsn.hsnCode);
                          if (selectedHsn.uqcUnit) setUqcUnit(selectedHsn.uqcUnit);
                        }
                      }}
                      error={errors.hsnCode}
                      className={selectClass}
                      placeholder="Select HSN"
                    />
                  </div>
                  <span className="mt-1.5 ml-2 font-medium text-gray-700">Unit</span>
                  <div className="w-24">
                    <Input value={uqcUnit} onChange={e => setUqcUnit(e.target.value)} className={inputClass} />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">HSN (Print)</td>
                <td className="flex items-start gap-2 pr-4">
                  <div className="w-full">
                    <Input value={hsnPrint} onChange={e => setHsnPrint(e.target.value)} error={errors.hsnPrint} className={inputClass} />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Code/BarCode</td>
                <td className="flex items-start gap-2 pr-4">
                  <div className="w-full">
                    <Input value={codeBarCode} onChange={e => setCodeBarCode(e.target.value)} error={errors.codeBarCode} className={inputClass} />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Packing (Pieces in 1 Case)</td>
                <td className="flex items-start gap-2">
                  <div className="w-32">
                    <Input type="number" min="1" value={packing} onChange={e => setPacking(e.target.value)} error={errors.packing} className={`${inputClass} text-right`} />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Purchase Rate (Price Per)</td>
                <td className="flex items-start gap-2 relative z-[20]">
                  <div className="w-32">
                    <Input type="number" min="1" value={purchaseQty} onChange={e => setPurchaseQty(e.target.value)} className={`${inputClass} text-right`} />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Sale Rate (Price Per)</td>
                <td className="flex items-start gap-2 relative z-[10]">
                  <div className="w-32">
                    <Input type="number" min="1" value={salesQty} onChange={e => setSalesQty(e.target.value)} className={`${inputClass} text-right`} />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Reorder Level (in Pieces)</td>
                <td className="flex items-start gap-2 pr-4">
                  <div className="w-32">
                    <Input type="number" min="0" value={minStockQty} onChange={e => setMinStockQty(e.target.value)} className={`${inputClass} text-right`} />
                  </div>
                  {parseFloat(minStockQty) > 0 && openingStockFreshTotalPcs <= parseFloat(minStockQty) && (
                    <span className="mt-1.5 text-xs font-semibold text-red-600 whitespace-nowrap">
                      Low Stock ({openingStockFreshTotalPcs} Pcs left)
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Weight (Per 1 {uqcUnit || 'Piece'}) (Kg.)</td>
                <td className="pr-4">
                  <Input type="number" step="0.001" value={weightPerPiece} onChange={e => setWeightPerPiece(e.target.value)} className={`${inputClass} w-full`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Scheme Remark</td>
                <td className="pr-4">
                  <Input value={schemeRemark} onChange={e => setSchemeRemark(e.target.value)} className={inputClass} />
                </td>
              </tr>
            </tbody>
          </table>
          <table className="w-full mt-4 border-separate responsive-form-table" style={{ borderSpacing: '0 10px' }}>
            <tbody>
              <tr>
                <td className="w-44 align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Opng. Stock - Fresh</td>
                <td className="flex items-center justify-end gap-2 pr-2">
                  <div className="w-16">
                    <Input
                      type="number"
                      min="0"
                      value={openingStockFreshCase}
                      onChange={e => setOpeningStockFreshCase(e.target.value)}
                      className={`${inputClass} text-right`}
                    />
                  </div>
                  <span className="font-medium text-gray-600">Case</span>
                  <div className="w-16">
                    <Input
                      type="number"
                      min="0"
                      value={openingStockFreshLoosePcs}
                      onChange={e => setOpeningStockFreshLoosePcs(e.target.value)}
                      className={`${inputClass} text-right`}
                    />
                  </div>
                  <span className="font-medium text-gray-600">Pcs</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-1">= {openingStockFreshTotalPcs} Pcs total</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Opng. Stock - Damaged</td>
                <td className="flex items-center justify-end gap-2 pr-2">
                  <div className="w-16">
                    <Input
                      type="number"
                      min="0"
                      value={openingStockDamagedCase}
                      onChange={e => setOpeningStockDamagedCase(e.target.value)}
                      className={`${inputClass} text-right`}
                    />
                  </div>
                  <span className="font-medium text-gray-600">Case</span>
                  <div className="w-16">
                    <Input
                      type="number"
                      min="0"
                      value={openingStockDamagedLoosePcs}
                      onChange={e => setOpeningStockDamagedLoosePcs(e.target.value)}
                      className={`${inputClass} text-right`}
                    />
                  </div>
                  <span className="font-medium text-gray-600">Pcs</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-1">= {openingStockDamagedTotalPcs} Pcs total</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-3 font-medium text-gray-700 whitespace-nowrap">Last Cost Rate</td>
                <td className="pt-2 flex justify-end pr-2">
                  <div className="w-40">
                    <Input type="number" value={lastCostRate} readOnly className={`${inputClass} text-right text-blue-700 bg-gray-50`} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column - Pricing/Stock Details */}
        <div className="flex-1 border border-gray-300 bg-white p-4 rounded-md shadow-sm flex flex-col gap-6">

          {/* Multi-MRP grid */}
          <div className="flex gap-2">
            <div className="flex-1 border border-gray-300 bg-white rounded-md h-32 overflow-y-auto overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 sticky top-0">
                    <th className="border-r border-gray-300 py-1.5 font-medium w-6"></th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">MRP Rate</th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">Self Cost</th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">Rt.Cost</th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">Wh.Cost</th>
                    <th className="py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mrpEntries.map((entry, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleSelectMrpEntry(idx)}
                      className={`border-b border-gray-200 cursor-pointer ${
                        idx === selectedEntryIndex ? "text-blue-900 bg-blue-50" : "text-gray-700 hover:bg-gray-50"
                      } ${entry.mrpActive === false ? "opacity-50" : ""}`}
                    >
                      <td className="border-r border-gray-300 py-1.5 text-[10px]">{idx === selectedEntryIndex ? "▶" : ""}</td>
                      <td className="border-r border-gray-300 py-1.5 font-semibold">{(entry.mrp || 0).toFixed(2)}</td>
                      <td className="border-r border-gray-300 py-1.5 font-semibold">{(entry.netCostSelf || 0).toFixed(4)}</td>
                      <td className="border-r border-gray-300 py-1.5 font-semibold">{(entry.netCostRetailer || 0).toFixed(4)}</td>
                      <td className="border-r border-gray-300 py-1.5 font-semibold">{(entry.netCostWholesaler || 0).toFixed(4)}</td>
                      <td className="py-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMrpEntryActive(idx);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                            entry.mrpActive !== false
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {entry.mrpActive !== false ? "Active" : "Inactive"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {mrpEntries.length === 0 && (
                    <tr><td colSpan={6} className="py-3.5 text-gray-400 text-xs">No MRP entries yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1.5 w-20 shrink-0">
              <button type="button" onClick={handleAddMrpEntry} className="bg-gray-50 border border-gray-300 py-1.5 rounded text-gray-700 hover:bg-gray-100 transition">Add</button>
              <button
                type="button"
                onClick={handleEditMrpEntry}
                disabled={selectedEntryIndex === null}
                className="bg-gray-50 border border-gray-300 py-1.5 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedEntryIndex === null) return;
                  setConfirmDeleteMrp(true);
                }}
                disabled={selectedEntryIndex === null || mrpEntries.length <= 1}
                className="bg-gray-50 border border-gray-300 py-1.5 rounded text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Pricing inputs */}
          <table className="w-full border-separate responsive-form-table" style={{ borderSpacing: '0 10px' }}>
            <tbody>
              <tr>
                <td className="font-bold text-gray-800 whitespace-nowrap">M.R.P. Rs.</td>
                <td className="flex items-start justify-end gap-2 pr-2">
                  <div className="w-40">
                    <Input type="number" value={mrp} onChange={e => setMrp(e.target.value)} error={errors.mrp} className={`${inputClass} text-right text-blue-800 font-bold`} />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                  <span className="ml-2 font-bold mt-1.5 text-gray-800">MRP Active</span>
                  <input type="checkbox" checked={mrpActive} onChange={e => setMrpActive(e.target.checked)} className="h-4 w-4 mt-1.5 rounded border-gray-300" />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Purchase Rate (Before GST)</td>
                <td className="pr-2">
                  <Input type="number" value={purchaseRate} onChange={e => setPurchaseRate(e.target.value)} className={`${inputClass} w-48 text-right ml-auto block`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Purchase Rate (Before GST, Per Piece)</td>
                <td className="pr-2">
                  <Input value={purchaseRatePerPiece} readOnly className={`${inputClass} w-48 text-right ml-auto block bg-gray-50 text-gray-600`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 flex items-center gap-2 font-medium text-gray-700 whitespace-nowrap">
                  <span>Disc. %age/Rate</span>
                  <div className="w-20">
                    <Input type="number" value={discountPercentage} onChange={e => setDiscountPercentage(e.target.value)} className={`${inputClass} text-right text-blue-700`} />
                  </div>
                </td>
                <td className="pr-2 align-top pt-1.5">
                  <Input value={(parseFloat(purchaseRate) * parseFloat(discountPercentage) / 100).toFixed(4)} readOnly className={`${inputClass} w-48 text-right ml-auto block text-blue-700 bg-gray-50`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-bold text-blue-900 whitespace-nowrap">Net Cost - Self (After GST)</td>
                <td className="pr-2">
                  <Input value={netCostSelf} readOnly className={`${inputClass} w-48 text-right ml-auto block font-bold text-blue-900 bg-gray-100`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-bold text-gray-800 whitespace-nowrap">Net Cost - Self (After GST, Per Piece)</td>
                <td className="pr-2">
                  <Input value={netCostSelfPerPiece} readOnly className={`${inputClass} w-48 text-right ml-auto block font-bold bg-gray-100`} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Margins table-like section */}
          <div className="mt-2">
            <table className="w-full border-separate responsive-form-table" style={{ borderSpacing: '0 10px' }}>
              <thead>
                <tr>
                  <th></th>
                  <th className="font-bold text-center w-28 text-[10px] text-gray-800 tracking-wider">RETAILER</th>
                  <th className="font-bold text-center w-28 text-[10px] text-gray-800 tracking-wider">WHOLESALER</th>
                  <th className="font-bold text-center w-28 text-[10px] text-gray-800 tracking-wider">DISTRIBUTOR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Margin %age (Before GST Cost)</td>
                  <td className="px-1"><Input type="number" value={marginToCostRetailer} onChange={e => setMarginToCostRetailer(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={marginToCostWholesaler} onChange={e => setMarginToCostWholesaler(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={marginToCostDistributor} onChange={e => setMarginToCostDistributor(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                </tr>
                <tr>
                  <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Margin %age (MRP)</td>
                  <td className="px-1"><Input type="number" value={marginToMrpRetailer} onChange={e => setMarginToMrpRetailer(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={marginToMrpWholesaler} onChange={e => setMarginToMrpWholesaler(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={marginToMrpDistributor} onChange={e => setMarginToMrpDistributor(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                </tr>
                <tr>
                  <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Sales Rate (Before GST)</td>
                  <td className="px-1"><Input type="number" value={salesRateRetailer} onChange={e => setSalesRateRetailer(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={salesRateWholesaler} onChange={e => setSalesRateWholesaler(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={salesRateDistributor} onChange={e => setSalesRateDistributor(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                </tr>
                <tr>
                  <td className="align-top pt-1.5 font-bold text-blue-900 whitespace-nowrap">Net Cost (After GST)</td>
                  <td className="px-1"><Input value={netCostCustomerRetailer} readOnly className={`${inputClass} text-right font-bold text-blue-900 bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerWholesaler} readOnly className={`${inputClass} text-right font-bold text-blue-900 bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerDistributor} readOnly className={`${inputClass} text-right font-bold text-blue-900 bg-gray-100`} /></td>
                </tr>
                <tr>
                  <td className="align-top pt-1.5 font-bold text-gray-800 whitespace-nowrap">Net Cost (After GST, Per Piece)</td>
                  <td className="px-1"><Input value={netCostCustomerRetailerPerPiece} readOnly className={`${inputClass} text-right font-bold bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerWholesalerPerPiece} readOnly className={`${inputClass} text-right font-bold bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerDistributorPerPiece} readOnly className={`${inputClass} text-right font-bold bg-gray-100`} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          

        </div>

      </div>

      <ConfirmationDialog
        isOpen={confirmDeleteMrp}
        onClose={() => setConfirmDeleteMrp(false)}
        onConfirm={confirmDeleteMrpEntry}
        title="Delete MRP Entry"
        message="Delete this MRP entry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
