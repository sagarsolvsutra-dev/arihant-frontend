"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useCompany } from "@/context/CompanyContext";
import { reportService } from "@/services/reportService";
import { supplierService } from "@/services/supplierService";
import { toast } from "@/lib/toast";

interface FullStockRow {
  itemId: string;
  itemCode: string;
  hsnCode: string;
  itemName: string;
  unit: string;
  weight: number;
  packing: number;
  openingPcs: number;
  purchasePcs: number;
  salePcs: number;
  closingPcs: number;
  openingCase: number;
  openingLoosePcs: number;
  purchaseCase: number;
  purchaseLoosePcs: number;
  saleCase: number;
  saleLoosePcs: number;
  closingCase: number;
  closingLoosePcs: number;
  mrpRate: number;
  rate: number;
  value: number;
}

interface FullStockTotal {
  openingPcs: number;
  purchasePcs: number;
  salePcs: number;
  closingPcs: number;
  openingCase: number;
  openingLoosePcs: number;
  purchaseCase: number;
  purchaseLoosePcs: number;
  saleCase: number;
  saleLoosePcs: number;
  closingCase: number;
  closingLoosePcs: number;
  value: number;
}

interface FullStockGroup {
  groupName: string;
  rows: FullStockRow[];
  total: FullStockTotal;
}

function money(n: number) {
  return `₹${(n || 0).toFixed(2)}`;
}

function CaseCell({ caseQty, pcs, total }: { caseQty: number; pcs: number; total: number }) {
  return (
    <div className="whitespace-nowrap">
      <div className="font-medium text-gray-900">
        {caseQty} <span className="text-gray-400">Case</span> {pcs} <span className="text-gray-400">Pcs</span>
      </div>
      <div className="text-[11px] text-gray-400">= {total} pcs</div>
    </div>
  );
}

const TOTAL_COLSPAN_BEFORE_QTY = 6; // Item Code, HSN, Item Name, Unit, Weight, Packing

export default function FullStockReportPage() {
  const { selectedCompanyId, isContextLoading } = useCompany();
  const router = useRouter();

  const [groups, setGroups] = useState<FullStockGroup[]>([]);
  const [grandTotal, setGrandTotal] = useState<FullStockTotal | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    supplierService.getSuppliers(selectedCompanyId, 1, 1000).then((res: any) => {
      setSuppliers(res.data || res || []);
    });
  }, [selectedCompanyId]);

  useEffect(() => {
    if (isContextLoading || !selectedCompanyId) return;
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId, isContextLoading, search, dateFrom, dateTo, supplierId]);

  async function load() {
    setIsLoading(true);
    try {
      const res: any = await reportService.getFullStockReport({
        companyId: selectedCompanyId,
        search,
        dateFrom,
        dateTo,
        supplierId,
      });
      setGroups(res.groups || []);
      setGrandTotal(res.grandTotal || null);
      setItemCount(res.itemCount || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load full stock report");
      setGroups([]);
      setGrandTotal(null);
    } finally {
      setIsLoading(false);
    }
  }

  const handleExport = () => {
    reportService.exportReport("full-stock", {
      companyId: selectedCompanyId,
      search,
      dateFrom,
      dateTo,
      supplierId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/reports")} className="p-2 rounded-lg hover:bg-gray-100" title="Back to Reports">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Full Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Opening / Purchase / Sale / Closing stock per item, grouped by Supplier — with Case+Pcs and Group/Grand totals.
          </p>
        </div>
      </div>

      <div className="card p-4 flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1">
          <SearchInput placeholder="Search by item name..." value={search} onChange={setSearch} />
        </div>
        <div className="w-full sm:w-56">
          <label className="block text-xs font-medium text-gray-500 mb-1">Supplier (Group)</label>
          <Select
            options={[{ value: "", label: "All Suppliers" }, ...suppliers.map((s) => ({ value: s._id, label: s.name }))]}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="All Suppliers"
          />
        </div>
        <div className="w-full sm:w-40">
          <DatePicker label="From" value={dateFrom} onChange={setDateFrom} placeholder="From" />
        </div>
        <div className="w-full sm:w-40">
          <DatePicker label="To" value={dateTo} onChange={setDateTo} placeholder="To" minDate={dateFrom || undefined} />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} leftIcon={<FileSpreadsheet size={14} />}>
          Excel
        </Button>
      </div>

      {!dateFrom && (
        <p className="text-xs text-gray-500 -mt-2">
          No "From" date selected — Opening is each item's flat entered opening stock, and Purchase/Sale cover all-time.
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-[1400px] w-full text-xs">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left px-3 py-2 font-semibold">Item Code</th>
              <th className="text-left px-3 py-2 font-semibold">HSN</th>
              <th className="text-left px-3 py-2 font-semibold">Item Name</th>
              <th className="text-left px-3 py-2 font-semibold">Unit</th>
              <th className="text-right px-3 py-2 font-semibold">Weight</th>
              <th className="text-right px-3 py-2 font-semibold">Packing</th>
              <th className="text-left px-3 py-2 font-semibold">Opening</th>
              <th className="text-left px-3 py-2 font-semibold">Purchase</th>
              <th className="text-left px-3 py-2 font-semibold">Sale</th>
              <th className="text-left px-3 py-2 font-semibold">Closing</th>
              <th className="text-right px-3 py-2 font-semibold">MRP Rate</th>
              <th className="text-right px-3 py-2 font-semibold">Rate</th>
              <th className="text-right px-3 py-2 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={13} className="text-center py-10 text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!isLoading && groups.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center py-10 text-gray-400">
                  No items found
                </td>
              </tr>
            )}
            {!isLoading &&
              groups.map((g) => (
                <React.Fragment key={g.groupName}>
                  <tr className="bg-gray-100">
                    <td colSpan={13} className="px-3 py-1.5 font-bold text-gray-700">
                      {g.groupName}
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.itemId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600">{r.itemCode || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{r.hsnCode || "-"}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{r.itemName}</td>
                      <td className="px-3 py-2 text-gray-600">{r.unit || "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{r.weight}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{r.packing}</td>
                      <td className="px-3 py-2">
                        <CaseCell caseQty={r.openingCase} pcs={r.openingLoosePcs} total={r.openingPcs} />
                      </td>
                      <td className="px-3 py-2">
                        <CaseCell caseQty={r.purchaseCase} pcs={r.purchaseLoosePcs} total={r.purchasePcs} />
                      </td>
                      <td className="px-3 py-2">
                        <CaseCell caseQty={r.saleCase} pcs={r.saleLoosePcs} total={r.salePcs} />
                      </td>
                      <td className="px-3 py-2">
                        <CaseCell caseQty={r.closingCase} pcs={r.closingLoosePcs} total={r.closingPcs} />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{money(r.mrpRate)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{money(r.rate)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">{money(r.value)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <td colSpan={TOTAL_COLSPAN_BEFORE_QTY} className="px-3 py-2 font-bold text-gray-700">
                      {g.groupName} — Group Total
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <CaseCell caseQty={g.total.openingCase} pcs={g.total.openingLoosePcs} total={g.total.openingPcs} />
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <CaseCell caseQty={g.total.purchaseCase} pcs={g.total.purchaseLoosePcs} total={g.total.purchasePcs} />
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <CaseCell caseQty={g.total.saleCase} pcs={g.total.saleLoosePcs} total={g.total.salePcs} />
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <CaseCell caseQty={g.total.closingCase} pcs={g.total.closingLoosePcs} total={g.total.closingPcs} />
                    </td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{money(g.total.value)}</td>
                  </tr>
                </React.Fragment>
              ))}
          </tbody>
          {!isLoading && grandTotal && (
            <tfoot>
              <tr className="bg-gray-900 text-white">
                <td colSpan={TOTAL_COLSPAN_BEFORE_QTY} className="px-3 py-2.5 font-bold">
                  GRAND TOTAL ({itemCount} items)
                </td>
                <td className="px-3 py-2.5 font-semibold">
                  <div>{grandTotal.openingCase} Case {grandTotal.openingLoosePcs} Pcs</div>
                  <div className="text-[11px] text-gray-300">= {grandTotal.openingPcs} pcs</div>
                </td>
                <td className="px-3 py-2.5 font-semibold">
                  <div>{grandTotal.purchaseCase} Case {grandTotal.purchaseLoosePcs} Pcs</div>
                  <div className="text-[11px] text-gray-300">= {grandTotal.purchasePcs} pcs</div>
                </td>
                <td className="px-3 py-2.5 font-semibold">
                  <div>{grandTotal.saleCase} Case {grandTotal.saleLoosePcs} Pcs</div>
                  <div className="text-[11px] text-gray-300">= {grandTotal.salePcs} pcs</div>
                </td>
                <td className="px-3 py-2.5 font-semibold">
                  <div>{grandTotal.closingCase} Case {grandTotal.closingLoosePcs} Pcs</div>
                  <div className="text-[11px] text-gray-300">= {grandTotal.closingPcs} pcs</div>
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right font-bold">{money(grandTotal.value)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
