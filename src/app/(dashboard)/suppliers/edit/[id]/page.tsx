"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { supplierService } from "@/services/supplierService";
import { supplierGroupService } from "@/services/supplierGroupService";
import { Save, X, Plus, Edit, List } from "lucide-react";
import { FormToolbar } from "@/components/ui/FormToolbar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const FieldRow = ({ label, children, required }: any) => (
  <div className="flex items-center text-sm border-b border-gray-100 last:border-0 hover:bg-blue-50/30 min-h-[44px]">
    <div className="w-40 px-4 py-2 font-medium text-gray-700 bg-gray-50 flex items-center h-full border-r border-gray-100">
      {label}
    </div>
    <div className="flex-1 px-4 py-1.5 flex items-center gap-2">
      {children}
      {required && <span className="text-red-500 font-bold text-lg">*</span>}
    </div>
  </div>
);

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Data sources for dropdowns
  const [supplierGroups, setSupplierGroups] = useState<{ _id: string; name: string }[]>([]);

  // Form State
  const [supplierGroupId, setSupplierGroupId] = useState("");
  const [supplierActive, setSupplierActive] = useState(true);
  
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [alias, setAlias] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  
  const [mobile, setMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [email, setEmail] = useState("");
  
  const [gstNo, setGstNo] = useState("");
  const [panNo, setPanNo] = useState("");
  
  const [balanceMethod, setBalanceMethod] = useState("Bill by bill");
  const [creditDays, setCreditDays] = useState("0");

  useEffect(() => {
    if (companyId && supplierId) {
      loadData();
    }
  }, [companyId, supplierId]);

  async function loadData() {
    setLoading(true);
    try {
      const [groupsRes, supplierDataRes] = await Promise.all([
        supplierGroupService.getSupplierGroups(companyId!, 1, 1000),
        supplierService.getSuppliers(companyId!)
      ]);
      
      setSupplierGroups(Array.isArray(groupsRes) ? groupsRes : groupsRes.data || []);
      
      const list = Array.isArray(supplierDataRes) ? supplierDataRes : supplierDataRes.data || [];
      const record = list.find((c: any) => c._id === supplierId);
      
      if (record) {
        setName(record.name || "");
        setSupplierGroupId(record.supplierGroupId?._id || record.supplierGroupId || "");
        setAlias(record.alias || "");
        setPhone(record.phone || "");
        setPhone2(record.phone2 || "");
        setMobile(record.mobile || "");
        setContactPerson(record.contactPerson || "");
        setEmail(record.email || "");
        setAddress(record.address || "");
        setCity(record.city || "");
        setStateName(record.state || "");
        setGstNo(record.gstNo || "");
        setPanNo(record.panNo || "");
        setBalanceMethod(record.balanceMethod || "Bill by bill");
        setCreditDays(record.creditDays?.toString() || "0");
        setSupplierActive(record.isActive !== false);
      }
    } catch (err) {
      console.error("Failed to load supplier", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrors({});
    if (!companyId || !name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        isActive: supplierActive,
        balanceMethod,
      };
      if (supplierGroupId) payload.supplierGroupId = supplierGroupId;
      if (alias.trim()) payload.alias = alias.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (phone2.trim()) payload.phone2 = phone2.trim();
      if (mobile.trim()) payload.mobile = mobile.trim();
      if (contactPerson.trim()) payload.contactPerson = contactPerson.trim();
      if (email.trim()) payload.email = email.trim();
      if (address.trim()) payload.address = address.trim();
      if (city.trim()) payload.city = city.trim();
      if (stateName.trim()) payload.state = stateName.trim();
      if (gstNo.trim()) payload.gstNo = gstNo.trim();
      if (panNo.trim()) payload.panNo = panNo.trim();
      if (creditDays) payload.creditDays = Number(creditDays);

      await supplierService.updateSupplier(supplierId, payload);
      router.push("/suppliers");
    } catch (err) {
      console.error(err);
      alert("Failed to save supplier");
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
        <p className="text-gray-500 animate-pulse">Loading supplier details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50/50">
      <FormToolbar 
        title="Suppliers - Edit"
        onSave={handleSave}
        onCancel={() => router.push("/suppliers")}
        saving={saving}
      />

      <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
        <div className="w-full max-w-4xl bg-white border border-gray-300 shadow-md">
          <div className="flex flex-col w-full">
            
            <div className="flex items-start border-b border-gray-200">
              <div className="flex-1 border-r border-gray-200">
                <FieldRow label="Group Name">
                  <div className="max-w-xl w-full flex gap-2 items-center">
                    <Select
                      options={supplierGroups.map(g => ({ value: g._id, label: g.name }))}
                      value={supplierGroupId}
                      onChange={setSupplierGroupId}
                      placeholder="Select Group..."
                      className="!h-9"
                    />
                    <span className="font-bold text-gray-400">Z</span>
                    <button className="text-red-500 font-bold hover:bg-red-50 px-1 rounded transition-colors">
                      +
                    </button>
                  </div>
                </FieldRow>

                <FieldRow label="Name" required>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="!h-9"
                    error={errors.name}
                  />
                </FieldRow>
              </div>

              <div className="w-48 p-4 flex flex-col items-center justify-center h-[100px]">
                <span className="text-sm text-gray-700 mb-2 font-medium">Supplier Active</span>
                <input
                  type="checkbox"
                  className="w-5 h-5 border-gray-400 rounded cursor-pointer accent-blue-600"
                  checked={supplierActive}
                  onChange={e => setSupplierActive(e.target.checked)}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <FieldRow label="Address">
                <div className="max-w-xl w-full">
                  <Input value={address} onChange={e => setAddress(e.target.value)} className="!h-9" />
                </div>
              </FieldRow>

              <FieldRow label="Area Address">
                <div className="max-w-xl w-full">
                  <Input value={alias} onChange={e => setAlias(e.target.value)} className="!h-9 text-blue-800 font-medium" />
                </div>
              </FieldRow>

              <FieldRow label="City / Town">
                <div className="max-w-xl w-full">
                  <Input value={city} onChange={e => setCity(e.target.value)} className="!h-9 text-blue-800 font-medium" />
                </div>
              </FieldRow>

              <FieldRow label="State Name/Cod">
                <div className="max-w-xl w-full">
                  <Select
                    options={[
                      { value: "Jammu and Kashmir 01", label: "Jammu and Kashmir 01" },
                      { value: "Himachal Pradesh 02", label: "Himachal Pradesh 02" },
                      { value: "Punjab 03", label: "Punjab 03" },
                      { value: "Chandigarh 04", label: "Chandigarh 04" },
                      { value: "Uttarakhand 05", label: "Uttarakhand 05" },
                      { value: "Haryana 06", label: "Haryana 06" },
                      { value: "Delhi 07", label: "Delhi 07" },
                      { value: "Rajasthan 08", label: "Rajasthan 08" },
                      { value: "Uttar Pradesh 09", label: "Uttar Pradesh 09" },
                      { value: "Bihar 10", label: "Bihar 10" },
                      { value: "Sikkim 11", label: "Sikkim 11" },
                      { value: "Arunachal Pradesh 12", label: "Arunachal Pradesh 12" },
                      { value: "Nagaland 13", label: "Nagaland 13" },
                      { value: "Manipur 14", label: "Manipur 14" },
                      { value: "Mizoram 15", label: "Mizoram 15" },
                      { value: "Tripura 16", label: "Tripura 16" },
                      { value: "Meghalaya 17", label: "Meghalaya 17" },
                      { value: "Assam 18", label: "Assam 18" },
                      { value: "West Bengal 19", label: "West Bengal 19" },
                      { value: "Jharkhand 20", label: "Jharkhand 20" },
                      { value: "Odisha 21", label: "Odisha 21" },
                      { value: "Chhattisgarh 22", label: "Chhattisgarh 22" },
                      { value: "Madhya Pradesh 23", label: "Madhya Pradesh 23" },
                      { value: "Gujarat 24", label: "Gujarat 24" },
                      { value: "Daman and Diu 25", label: "Daman and Diu 25" },
                      { value: "Dadra and Nagar Haveli 26", label: "Dadra and Nagar Haveli 26" },
                      { value: "Maharashtra 27", label: "Maharashtra 27" },
                      { value: "Andhra Pradesh (Old) 28", label: "Andhra Pradesh (Old) 28" },
                      { value: "Karnataka 29", label: "Karnataka 29" },
                      { value: "Goa 30", label: "Goa 30" },
                      { value: "Lakshadweep 31", label: "Lakshadweep 31" },
                      { value: "Kerala 32", label: "Kerala 32" },
                      { value: "Tamil Nadu 33", label: "Tamil Nadu 33" },
                      { value: "Puducherry 34", label: "Puducherry 34" },
                      { value: "Andaman and Nicobar Islands 35", label: "Andaman and Nicobar Islands 35" },
                      { value: "Telangana 36", label: "Telangana 36" },
                      { value: "Andhra Pradesh (New) 37", label: "Andhra Pradesh (New) 37" },
                      { value: "Ladakh 38", label: "Ladakh 38" },
                      { value: "Other Territory 97", label: "Other Territory 97" }
                    ]}
                    value={stateName}
                    onChange={setStateName}
                    placeholder="Select State..."
                    className="!h-9"
                  />
                </div>
              </FieldRow>

              <FieldRow label="Contact Person">
                <div className="max-w-xl w-full">
                  <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="!h-9" />
                </div>
              </FieldRow>

              <FieldRow label={<span className="text-base font-bold">Mobile No.</span>}>
                <div className="max-w-xl w-full">
                  <Input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} className="!h-11 !text-lg !font-bold !text-blue-900" />
                </div>
              </FieldRow>

              <FieldRow label="Phone [1]">
                <div className="max-w-xl w-full">
                  <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} className="!h-9" />
                </div>
              </FieldRow>
              
              <FieldRow label="Phone [2]">
                <div className="max-w-xl w-full">
                  <Input value={phone2} onChange={e => setPhone2(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} className="!h-9" />
                </div>
              </FieldRow>

              <FieldRow label="email">
                <div className="max-w-xl w-full">
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="!h-9" />
                </div>
              </FieldRow>

              {/* Bold Large GSTIN */}
              <FieldRow label={<span className="text-lg font-bold">GSTIN No.</span>}>
                <div className="max-w-xl w-full">
                  <Input value={gstNo} onChange={e => setGstNo(e.target.value)} maxLength={15} className="!h-11 !text-lg !font-bold !text-blue-900 uppercase" />
                </div>
              </FieldRow>

              <FieldRow label="PAN No.">
                <div className="w-64">
                  <Input value={panNo} onChange={e => setPanNo(e.target.value)} maxLength={10} className="!h-9 uppercase" />
                </div>
              </FieldRow>
              
              <FieldRow label="Balance Method">
                <div className="w-64">
                  <Select
                    options={[
                      { value: "Bill by bill", label: "Bill by bill" },
                      { value: "On Account", label: "On Account" }
                    ]}
                    value={balanceMethod}
                    onChange={setBalanceMethod}
                    className="!h-9"
                  />
                </div>
              </FieldRow>
              
              <FieldRow label="Default Due Days">
                <div className="w-24">
                  <Input type="number" value={creditDays} onChange={e => setCreditDays(e.target.value)} className="!h-9 text-right" />
                </div>
              </FieldRow>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
