"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { schemeService } from "@/services/schemeService";
import { customerService } from "@/services/customerService";
import { itemGroupService } from "@/services/itemGroupService";
import { Save, X, Plus, Edit, List } from "lucide-react";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const FieldRow = ({ label, children, required }: any) => (
  <div className="flex items-center text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50/50 min-h-[44px]">
    <div className="w-40 flex-shrink-0 px-4 py-2 font-medium text-gray-700 bg-gray-50 flex items-center h-full border-r border-gray-100">
      {label}
    </div>
    <div className="flex-1 px-4 py-1.5 flex items-center gap-2">
      {children}
      {required && <span className="text-red-500 font-bold text-lg leading-none">*</span>}
    </div>
  </div>
);

export default function EditSchemePage() {
  const router = useRouter();
  const { id } = useParams();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Data sources for dropdowns
  const [customers, setCustomers] = useState<{ _id: string; name: string }[]>([]);
  const [itemGroups, setItemGroups] = useState<{ _id: string; name: string }[]>([]);

  // Form State
  const [itemGroupId, setItemGroupId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lessPercentage, setLessPercentage] = useState("0.00");
  const [cdPercentage, setCdPercentage] = useState("0.00");

  useEffect(() => {
    if (companyId && id) {
      loadData();
    }
  }, [companyId, id]);

  async function loadData() {
    setLoading(true);
    try {
      // We don't have a getSchemeById currently, so we'll fetch from the list and find it
      const [custRes, groupRes, schemesRes] = await Promise.all([
        customerService.getCustomers(companyId!, 1, 1000),
        itemGroupService.getItemGroups(companyId!, 1, 1000),
        schemeService.getSchemes(companyId!, 1, 1000)
      ]);
      setCustomers(Array.isArray(custRes) ? custRes : custRes.data || []);
      setItemGroups(Array.isArray(groupRes) ? groupRes : groupRes.data || []);

      const allSchemes = Array.isArray(schemesRes) ? schemesRes : schemesRes.data || [];
      const scheme = allSchemes.find((s: any) => s._id === id);
      
      if (scheme) {
        setItemGroupId(scheme.itemGroupId?._id || scheme.itemGroupId || "");
        setCustomerId(scheme.customerId?._id || scheme.customerId || "");
        setLessPercentage(scheme.lessPercentage?.toFixed(2) || "0.00");
        setCdPercentage(scheme.cdPercentage?.toFixed(2) || "0.00");
      } else {
        setErrors({ form: "Scheme not found" });
      }
    } catch (err) {
      console.error("Failed to load data", err);
      setErrors({ form: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    
    setSaving(true);
    try {
      const payload: any = {
        itemGroupId: itemGroupId || null,
        customerId: customerId || null,
        lessPercentage: parseFloat(lessPercentage) || 0,
        cdPercentage: parseFloat(cdPercentage) || 0,
      };

      await schemeService.updateScheme(id as string, payload);
      router.push("/schemes");
    } catch (err: any) {
      console.error(err);
      setErrors({ form: err.message || "Failed to update scheme" });
    } finally {
      setSaving(false);
    }
  };

  if (!companyId) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <FormToolbar
        title="Schemes - Edit"
        onSave={handleSave}
        onCancel={() => router.push("/schemes")}
        saving={saving || loading}
      />

      <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
        <div className="w-full max-w-2xl bg-white border border-gray-300 shadow-md">
          {errors.form && (
            <div className="p-3 bg-red-50 text-red-600 text-sm border-b border-red-100">
              {errors.form}
            </div>
          )}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading scheme data...</div>
          ) : (
            <div className="flex flex-col w-full">
              <FieldRow label="Item Group">
                <div className="w-full max-w-sm">
                  <Select
                    value={itemGroupId}
                    onChange={(val) => setItemGroupId(val)}
                    options={[{ value: "", label: "Select Item Group.." }, ...itemGroups.map(g => ({ value: g._id, label: g.name }))]}
                    className="w-full"
                  />
                </div>
              </FieldRow>

              <FieldRow label="Customer Name">
                <div className="w-full max-w-sm">
                  <Select
                    value={customerId}
                    onChange={(val) => setCustomerId(val)}
                    options={[{ value: "", label: "Select Customer Name.." }, ...customers.map(c => ({ value: c._id, label: c.name }))]}
                    className="w-full"
                  />
                </div>
              </FieldRow>

              <FieldRow label="Less %age">
                <div className="w-48">
                  <Input
                    type="number"
                    step="0.01"
                    value={lessPercentage}
                    onChange={(e) => setLessPercentage(e.target.value)}
                    className="text-right text-blue-600 font-medium"
                  />
                </div>
              </FieldRow>

              <FieldRow label="C.D. %age">
                <div className="w-48">
                  <Input
                    type="number"
                    step="0.01"
                    value={cdPercentage}
                    onChange={(e) => setCdPercentage(e.target.value)}
                    className="text-right text-blue-600 font-medium"
                  />
                </div>
              </FieldRow>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
