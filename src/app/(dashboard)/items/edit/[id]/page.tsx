"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { useCompany } from "@/context/CompanyContext";
import { itemService } from "@/services/itemService";
import { itemGroupService } from "@/services/itemGroupService";
import { itemSubGroupService } from "@/services/itemSubGroupService";
import { hsnService } from "@/services/hsnService";
import { itemNameService } from "@/services/itemNameService";

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Master Data
  const [groups, setGroups] = useState<any[]>([]);
  const [subGroups, setSubGroups] = useState<any[]>([]);
  const [itemNamesList, setItemNamesList] = useState<any[]>([]);
  const [hsnCodesList, setHsnCodesList] = useState<any[]>([]);

  // General fields
  const [name, setName] = useState("");
  const [itemGroupId, setItemGroupId] = useState("");
  const [itemSubGroupId, setItemSubGroupId] = useState("");
  const [gstPercentage, setGstPercentage] = useState("18");
  const [hsnCode, setHsnCode] = useState("");
  const [uqcUnit, setUqcUnit] = useState("NOS");
  const [hsnPrint, setHsnPrint] = useState("");
  const [codeBarCode, setCodeBarCode] = useState("");
  const [packing, setPacking] = useState("1");
  const [weightPerPiece, setWeightPerPiece] = useState("0");
  const [schemeRemark, setSchemeRemark] = useState("");
  const [itemActive, setItemActive] = useState(true);

  // Pricing fields
  const [purchaseType, setPurchaseType] = useState("Carton");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [salesType, setSalesType] = useState("Pieces");
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

  // Stock fields
  const [openingStockFreshCase, setOpeningStockFreshCase] = useState("0");
  const [openingStockFreshPcs, setOpeningStockFreshPcs] = useState("0");
  const [openingStockDamagedCase, setOpeningStockDamagedCase] = useState("0");
  const [openingStockDamagedPcs, setOpeningStockDamagedPcs] = useState("0");
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

  useEffect(() => {
    if (companyId && itemId) {
      loadData();
    }
  }, [companyId, itemId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [grpRes, subGrpRes, hsnRes, itemsRes] = await Promise.all([
        itemGroupService.getItemGroups(companyId!),
        itemSubGroupService.getItemSubGroups(companyId!),
        hsnService.getHsnCodes(companyId!),
        itemService.getItems(companyId!),
      ]);
      
      setGroups(Array.isArray(grpRes) ? grpRes : grpRes.data || []);
      setSubGroups(Array.isArray(subGrpRes) ? subGrpRes : subGrpRes.data || []);
      setHsnCodesList(Array.isArray(hsnRes) ? hsnRes : hsnRes.data || []);

      const list = Array.isArray(itemsRes) ? itemsRes : itemsRes.data || [];
      const record = list.find((i: any) => i._id === itemId);
      
      if (record) {
        setName(record.itemName || "");
        
        const grpId = record.itemGroupId?._id || record.itemGroupId || "";
        setItemGroupId(grpId);
        if (grpId) {
          loadItemNames(grpId);
        }
        setItemSubGroupId(record.itemSubGroupId?._id || record.itemSubGroupId || "");
        setGstPercentage(record.gstPercentage?.toString() || "0");
        setHsnCode(record.hsnCode || "");
        setUqcUnit(record.uqcUnit || "NOS");
        setHsnPrint(record.hsnPrint || "");
        setCodeBarCode(record.codeBarCode || "");
        setPacking(record.packing?.toString() || "1");
        setWeightPerPiece(record.weightPerPiece?.toString() || "0");
        setSchemeRemark(record.schemeRemark || "");
        setItemActive(record.isActive ?? true);
        
        setMrp(record.mrp?.toString() || "0");
        setMrpActive(record.mrpActive ?? true);
        setPurchaseRate(record.purchaseRate?.toString() || "0");
        setPurchaseType(record.purchaseType || "Carton");
        setPurchaseQty(record.purchaseQty?.toString() || "1");
        setSalesType(record.salesType || "Pieces");
        setSalesQty(record.salesQty?.toString() || "1");
        setDiscountPercentage(record.discountPercentage?.toString() || "0");
        setMarginToCostRetailer(record.marginToCostRetailer?.toString() || "0");
        setMarginToCostWholesaler(record.marginToCostWholesaler?.toString() || "0");
        setMarginToCostDistributor(record.marginToCostDistributor?.toString() || "0");
        setMarginToMrpRetailer(record.marginToMrpRetailer?.toString() || "0");
        setMarginToMrpWholesaler(record.marginToMrpWholesaler?.toString() || "0");
        setMarginToMrpDistributor(record.marginToMrpDistributor?.toString() || "0");
        
        setSalesRateRetailer(record.retailRate?.toString() || "0");
        setSalesRateWholesaler(record.wholeSaleRate?.toString() || "0");
        setSalesRateDistributor(record.distributorRate?.toString() || "0");
        
        setOpeningStockFreshCase(record.openingStockFreshCase?.toString() || "0");
        setOpeningStockFreshPcs(record.openingStockFreshPcs?.toString() || "0");
        setOpeningStockDamagedCase(record.openingStockDamagedCase?.toString() || "0");
        setOpeningStockDamagedPcs(record.openingStockDamagedPcs?.toString() || "0");
        setLastCostRate(record.lastCostRate?.toString() || "0");
      } else {
        alert("Item not found");
        router.push("/items");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load item data");
      router.push("/items");
    } finally {
      setLoading(false);
    }
  };

  const loadItemNames = async (groupId: string) => {
    try {
      const data = await itemNameService.getItemNames(companyId!, "", groupId);
      const list = Array.isArray(data) ? data : data.data || [];
      setItemNamesList(list);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Dynamic Calculations Effect ---
  useEffect(() => {
    const pRate = parseFloat(purchaseRate) || 0;
    const pack = parseFloat(packing) || 1;
    const disc = parseFloat(discountPercentage) || 0;
    const gst = parseFloat(gstPercentage) || 0;
    const pQty = parseFloat(purchaseQty) || 1;
    const sQty = parseFloat(salesQty) || 1;

    let totalPurchasePieces = 0;
    if (purchaseType === "Carton") {
      totalPurchasePieces = pQty * pack;
    } else {
      totalPurchasePieces = pQty;
    }

    let totalSalesPieces = 0;
    if (salesType === "Carton") {
      totalSalesPieces = sQty * pack;
    } else {
      totalSalesPieces = sQty;
    }

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
  }, [purchaseRate, packing, discountPercentage, gstPercentage, purchaseType, purchaseQty, salesType, salesQty]);

  useEffect(() => {
    const baseRate = parseFloat(purchaseRatePerPiece) || 0;
    const ncSelf1Pc = parseFloat(netCostSelfPerPiece) || 0;

    const margCostRet = parseFloat(marginToCostRetailer) || 0;
    if (margCostRet > 0) {
      setSalesRateRetailer((baseRate + (baseRate * (margCostRet / 100))).toFixed(4));
    }

    const margCostWhole = parseFloat(marginToCostWholesaler) || 0;
    if (margCostWhole > 0) {
      setSalesRateWholesaler((baseRate + (baseRate * (margCostWhole / 100))).toFixed(4));
    }

    const margCostDist = parseFloat(marginToCostDistributor) || 0;
    if (margCostDist > 0) {
      setSalesRateDistributor((baseRate + (baseRate * (margCostDist / 100))).toFixed(4));
    }
  }, [marginToCostRetailer, marginToCostWholesaler, marginToCostDistributor, purchaseRatePerPiece]);

  useEffect(() => {
    const srRet = parseFloat(salesRateRetailer) || 0;
    const srWhole = parseFloat(salesRateWholesaler) || 0;
    const srDist = parseFloat(salesRateDistributor) || 0;
    
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
    if (!itemGroupId) newErrors.itemGroupId = "Group is required";
    if (!name.trim()) newErrors.name = "Item Name is required";
    if (!hsnCode) newErrors.hsnCode = "HSN Code is required";
    if (!hsnPrint.trim()) newErrors.hsnPrint = "HSN (Print) is required";
    if (!packing || parseFloat(packing) < 1) newErrors.packing = "Packing is required";
    if (!purchaseRate) newErrors.purchaseRate = "Purchase Rate is required";
    if (!salesRateRetailer) newErrors.salesRateRetailer = "Sale Rate is required";
    if (!mrp) newErrors.mrp = "M.R.P. is required";

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
      const payload: any = {
        companyId,
        itemName: name.trim(),
        itemGroupId: itemGroupId || undefined,
        itemSubGroupId: itemSubGroupId || undefined,
        gstPercentage: parseFloat(gstPercentage) || 0,
        hsnCode: hsnCode.trim(),
        hsnPrint: hsnPrint.trim(),
        codeBarCode: codeBarCode.trim(),
        uqcUnit: uqcUnit.trim(),
        packing: parseFloat(packing) || 1,
        weightPerPiece: parseFloat(weightPerPiece) || 0,
        schemeRemark: schemeRemark.trim(),
        isActive: itemActive,
        
        mrp: parseFloat(mrp) || 0,
        mrpActive,
        purchaseRate: parseFloat(purchaseRate) || 0,
        purchaseType,
        purchaseQty: parseFloat(purchaseQty) || 1,
        salesType,
        salesQty: parseFloat(salesQty) || 1,
        discountPercentage: parseFloat(discountPercentage) || 0,
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
        openingStockFreshCase: parseFloat(openingStockFreshCase) || 0,
        openingStockFreshPcs: parseFloat(openingStockFreshPcs) || 0,
        openingStockDamagedCase: parseFloat(openingStockDamagedCase) || 0,
        openingStockDamagedPcs: parseFloat(openingStockDamagedPcs) || 0,
        lastCostRate: parseFloat(lastCostRate) || 0,
      };

      await itemService.updateItem(itemId, payload);
      router.push("/items");
    } catch (err) {
      console.error(err);
      alert("Failed to update item");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading item...</p>
      </div>
    );
  }

  const inputClass = "!h-[32px] !py-1 !px-2 !text-sm !rounded-md !bg-white";
  const selectClass = "!h-[32px] !py-1 !px-2 !text-sm !rounded-md !bg-white flex items-center";
  
  const salesUnitLabel = `${salesQty} ${salesType}`;

  const getPurchaseCalculation = () => {
    const pQty = parseFloat(purchaseQty) || 0;
    const pack = parseFloat(packing) || 1;
    if (purchaseType === "Carton") {
      return `= ${pQty * pack} Pieces`;
    } else {
      return `= ${(pQty / pack).toFixed(2)} Cartons`;
    }
  };

  const getSalesCalculation = () => {
    const sQty = parseFloat(salesQty) || 0;
    const pack = parseFloat(packing) || 1;
    if (salesType === "Carton") {
      return `= ${sQty * pack} Pieces`;
    } else {
      return `= ${(sQty / pack).toFixed(2)} Cartons`;
    }
  };

  return (
    <div className="mx-auto bg-[#f0f0f0] min-h-screen font-sans">
      <FormToolbar
        title="Item - Edit"
        onSave={handleSave}
        isSaving={saving}
        onCancel={() => router.push("/items")}
        onClose={() => router.push("/items")}
      />

      <div className="p-3 flex flex-col xl:flex-row gap-4 max-w-[1350px] mx-auto text-sm">
        
        {/* Left Column - General Details */}
        <div className="flex-[1.15] border border-gray-300 bg-white p-4 rounded-md shadow-sm">
          
          <table className="w-full border-separate" style={{ borderSpacing: '0 10px' }}>
            <tbody>
              <tr>
                <td className="w-[180px] align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Group</td>
                <td className="flex gap-2 items-start relative z-[60]">
                  <div className="w-72">
                    <Select 
                      options={groups
                        .filter(g => g.isActive !== false || g._id === itemGroupId)
                        .map(g => ({ value: g._id, label: g.name }))}
                      value={itemGroupId} 
                      onChange={(val) => {
                        setItemGroupId(val);
                        setName(""); // Reset item name when group changes
                        if (val) loadItemNames(val);
                        else setItemNamesList([]);
                      }}
                      error={errors.itemGroupId}
                      className={selectClass}
                      placeholder="Select Group"
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
                  <div className="w-full">
                    <Select 
                      options={itemNamesList
                        .filter(inm => inm.isActive !== false || inm.name === name)
                        .map(inm => ({ value: inm.name, label: inm.name }))}
                      value={name} 
                      onChange={setName} 
                      error={errors.name} 
                      className={selectClass}
                      placeholder="Select Item Name"
                      disabled={!itemGroupId}
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
                        if (selectedHsn) setHsnPrint(selectedHsn.hsnCode);
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
                <td className="pr-4">
                  <Input value={codeBarCode} onChange={e => setCodeBarCode(e.target.value)} className={inputClass} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Sub Group</td>
                <td className="flex items-start gap-2 relative z-[30]">
                  <div className="w-72">
                    <Select 
                      options={subGroups
                        .filter(s => {
                          if (itemGroupId && s.itemGroupId !== itemGroupId) return false;
                          if (name && s.itemNameId?.name !== name) return false;
                          return s.isActive !== false || s._id === itemSubGroupId;
                        })
                        .map(s => ({ value: s._id, label: s.name }))}
                      value={itemSubGroupId} 
                      onChange={setItemSubGroupId}
                      className={selectClass}
                      placeholder="Select Sub Group"
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Packing (Pieces in 1 Carton)</td>
                <td className="flex items-start gap-2">
                  <div className="w-32">
                    <Input type="number" min="1" value={packing} onChange={e => setPacking(e.target.value)} error={errors.packing} className={`${inputClass} text-right`} />
                  </div>
                  <span className="text-red-500 font-bold mt-1.5">*</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Purchase Type</td>
                <td className="flex items-start gap-2 relative z-[20]">
                  <div className="w-24">
                    <Select
                      options={[
                        { value: "Carton", label: "Carton" },
                        { value: "Pieces", label: "Pieces" },
                      ]}
                      value={purchaseType}
                      onChange={setPurchaseType}
                      className={selectClass}
                    />
                  </div>
                  <div className="w-20">
                    <Input type="number" min="1" value={purchaseQty} onChange={e => setPurchaseQty(e.target.value)} className={`${inputClass} text-right`} />
                  </div>
                  <div className="pt-1.5 text-sm font-medium text-blue-600 whitespace-nowrap">
                    {getPurchaseCalculation()}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Sales Type</td>
                <td className="flex items-start gap-2 relative z-[10]">
                  <div className="w-24">
                    <Select
                      options={[
                        { value: "Carton", label: "Carton" },
                        { value: "Pieces", label: "Pieces" },
                      ]}
                      value={salesType}
                      onChange={setSalesType}
                      className={selectClass}
                    />
                  </div>
                  <div className="w-20">
                    <Input type="number" min="1" value={salesQty} onChange={e => setSalesQty(e.target.value)} className={`${inputClass} text-right`} />
                  </div>
                  <div className="pt-1.5 text-sm font-medium text-blue-600 whitespace-nowrap">
                    {getSalesCalculation()}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Reorder Level (in Pieces)</td>
                <td className="pr-4">
                  <Input type="number" value="0" readOnly className={`${inputClass} w-full bg-gray-50 text-gray-600`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Weight (Per 1 Piece) (Kg.)</td>
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
          <table className="w-full mt-2 border-separate" style={{ borderSpacing: '0 10px' }}>
            <tbody>
              <tr>
                <td className="w-44 align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Opng. Stock - Fresh</td>
                <td className="flex items-center justify-end gap-2 pr-2">
                  <span className="font-medium text-gray-600">Qty.</span>
                  <div className="w-16">
                    <Input 
                      type="number" 
                      value={openingStockFreshCase} 
                      onChange={e => {
                        const val = e.target.value;
                        setOpeningStockFreshCase(val);
                        const c = parseFloat(val) || 0;
                        const p = parseFloat(packing) || 1;
                        setOpeningStockFreshPcs((c * p).toFixed(0));
                      }} 
                      className={`${inputClass} text-right`} 
                    />
                  </div>
                  <span className="font-medium text-gray-600">Carton</span>
                  <div className="w-16">
                    <Input 
                      type="number" 
                      value={openingStockFreshPcs} 
                      onChange={e => {
                        const val = e.target.value;
                        setOpeningStockFreshPcs(val);
                        const pcs = parseFloat(val) || 0;
                        const p = parseFloat(packing) || 1;
                        setOpeningStockFreshCase((pcs / p).toFixed(2));
                      }} 
                      className={`${inputClass} text-right`} 
                    />
                  </div>
                  <span className="font-medium text-gray-600">Pcs</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Opng. Stock - Damaged</td>
                <td className="flex items-center justify-end gap-2 pr-2">
                  <span className="font-medium text-gray-600">Qty.</span>
                  <div className="w-16">
                    <Input 
                      type="number" 
                      value={openingStockDamagedCase} 
                      onChange={e => {
                        const val = e.target.value;
                        setOpeningStockDamagedCase(val);
                        const c = parseFloat(val) || 0;
                        const p = parseFloat(packing) || 1;
                        setOpeningStockDamagedPcs((c * p).toFixed(0));
                      }} 
                      className={`${inputClass} text-right`} 
                    />
                  </div>
                  <span className="font-medium text-gray-600">Carton</span>
                  <div className="w-16">
                    <Input 
                      type="number" 
                      value={openingStockDamagedPcs} 
                      onChange={e => {
                        const val = e.target.value;
                        setOpeningStockDamagedPcs(val);
                        const pcs = parseFloat(val) || 0;
                        const p = parseFloat(packing) || 1;
                        setOpeningStockDamagedCase((pcs / p).toFixed(2));
                      }} 
                      className={`${inputClass} text-right`} 
                    />
                  </div>
                  <span className="font-medium text-gray-600">Pcs</span>
                </td>
              </tr>
              <tr>
                <td className="align-top pt-3 font-medium text-gray-700 whitespace-nowrap">Last Cost Rate</td>
                <td className="pt-2 flex justify-end pr-2">
                  <div className="w-40"><Input type="number" value={lastCostRate} readOnly className={`${inputClass} text-right text-blue-700`} /></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column - Pricing/Stock Details */}
        <div className="flex-1 border border-gray-300 bg-white p-4 rounded-md shadow-sm flex flex-col gap-6">
          
          {/* Top small MRP table (mock) */}
          <div className="flex gap-2">
            <div className="flex-1 border border-gray-300 overflow-hidden bg-white rounded-md h-32">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                    <th className="border-r border-gray-300 py-1.5 font-medium w-6"></th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">MRP Rate</th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">Self Cost</th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">Rt.Cost</th>
                    <th className="border-r border-gray-300 py-1.5 font-medium">Wh.Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 text-blue-900 bg-blue-50">
                    <td className="border-r border-gray-300 py-1.5 text-[10px]">▶</td>
                    <td className="border-r border-gray-300 py-1.5 font-semibold">{parseFloat(mrp).toFixed(2)}</td>
                    <td className="border-r border-gray-300 py-1.5 font-semibold">{parseFloat(netCostSelf).toFixed(4)}</td>
                    <td className="border-r border-gray-300 py-1.5 font-semibold">{parseFloat(netCostCustomerRetailer).toFixed(4)}</td>
                    <td className="border-r border-gray-300 py-1.5 font-semibold">{parseFloat(netCostCustomerWholesaler).toFixed(4)}</td>
                  </tr>
                  <tr className="border-b border-gray-100"><td colSpan={5} className="py-3.5"></td></tr>
                  <tr className="border-b border-gray-100"><td colSpan={5} className="py-3.5"></td></tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1.5 w-20 shrink-0">
              <button type="button" className="bg-gray-50 border border-gray-300 py-1.5 rounded text-gray-700 hover:bg-gray-100 transition">Plus</button>
              <button type="button" className="bg-gray-50 border border-gray-300 py-1.5 rounded text-gray-700 hover:bg-gray-100 transition">Minus</button>
              <button type="button" className="bg-gray-50 border border-gray-300 py-1.5 rounded text-gray-700 hover:bg-gray-100 transition">Modify</button>
            </div>
          </div>

          {/* Pricing inputs */}
          <table className="w-full border-separate" style={{ borderSpacing: '0 10px' }}>
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
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Purchase Rate</td>
                <td className="pr-2">
                  <Input type="number" value={purchaseRate} onChange={e => setPurchaseRate(e.target.value)} className={`${inputClass} w-48 text-right ml-auto block`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Purchase Rate ({salesUnitLabel})</td>
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
                <td className="align-top pt-1.5 font-bold text-blue-900 whitespace-nowrap">Net Cost - Self</td>
                <td className="pr-2">
                  <Input value={netCostSelf} readOnly className={`${inputClass} w-48 text-right ml-auto block font-bold text-blue-900 bg-gray-100`} />
                </td>
              </tr>
              <tr>
                <td className="align-top pt-1.5 font-bold text-gray-800 whitespace-nowrap">Net Cost - Self ({salesUnitLabel})</td>
                <td className="pr-2">
                  <Input value={netCostSelfPerPiece} readOnly className={`${inputClass} w-48 text-right ml-auto block font-bold bg-gray-100`} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Margins table-like section */}
          <div className="mt-2">
            <table className="w-full border-separate" style={{ borderSpacing: '0 10px' }}>
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
                  <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Margin %age (Cost)</td>
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
                  <td className="align-top pt-1.5 font-medium text-gray-700 whitespace-nowrap">Sales Rate</td>
                  <td className="px-1"><Input type="number" value={salesRateRetailer} onChange={e => setSalesRateRetailer(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={salesRateWholesaler} onChange={e => setSalesRateWholesaler(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                  <td className="px-1"><Input type="number" value={salesRateDistributor} onChange={e => setSalesRateDistributor(e.target.value)} className={`${inputClass} text-right text-blue-700`} /></td>
                </tr>
                <tr>
                  <td className="align-top pt-1.5 font-bold text-blue-900 whitespace-nowrap">Net Cost</td>
                  <td className="px-1"><Input value={netCostCustomerRetailer} readOnly className={`${inputClass} text-right font-bold text-blue-900 bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerWholesaler} readOnly className={`${inputClass} text-right font-bold text-blue-900 bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerDistributor} readOnly className={`${inputClass} text-right font-bold text-blue-900 bg-gray-100`} /></td>
                </tr>
                <tr>
                  <td className="align-top pt-1.5 font-bold text-gray-800 whitespace-nowrap">Net Cost ({salesUnitLabel})</td>
                  <td className="px-1"><Input value={netCostCustomerRetailerPerPiece} readOnly className={`${inputClass} text-right font-bold bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerWholesalerPerPiece} readOnly className={`${inputClass} text-right font-bold bg-gray-100`} /></td>
                  <td className="px-1"><Input value={netCostCustomerDistributorPerPiece} readOnly className={`${inputClass} text-right font-bold bg-gray-100`} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          

        </div>

      </div>
    </div>
  );
}
