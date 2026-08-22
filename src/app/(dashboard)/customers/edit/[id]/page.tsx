"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCompany } from "@/context/CompanyContext";
import { customerService } from "@/services/customerService";
import { customerGroupService } from "@/services/customerGroupService";
import { salesmanService } from "@/services/salesmanService";
import { Save, X, Plus, Edit } from "lucide-react";
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

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;
  const { activeCompany } = useCompany();
  const companyId = activeCompany?._id;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Data sources for dropdowns
  const [customerGroups, setCustomerGroups] = useState<{ _id: string; name: string }[]>([]);
  const [salesmen, setSalesmen] = useState<{ _id: string; name: string }[]>([]);

  // Form State
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [custActive, setCustActive] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [alias, setAlias] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [stateName, setStateName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [panNo, setPanNo] = useState("");
  const [uniqueIdNo, setUniqueIdNo] = useState("");
  const [drugLicNo, setDrugLicNo] = useState("");
  const [customerType, setCustomerType] = useState("Retailer");
  const [balanceMethod, setBalanceMethod] = useState("Bill by bill");
  const [creditLimit, setCreditLimit] = useState("");
  const [creditDays, setCreditDays] = useState("0");
  const [salesmanId, setSalesmanId] = useState("");
  const [routeNo, setRouteNo] = useState("");

  useEffect(() => {
    if (companyId && customerId) {
      loadData();
    }
  }, [companyId, customerId]);

  async function loadData() {
    setLoading(true);
    try {
      const [groupsRes, salesmenRes, customerDataRes] = await Promise.all([
        customerGroupService.getCustomerGroups(companyId!, 1, 1000),
        salesmanService.getSalesmen(companyId!, 1, 1000),
        customerService.getCustomers(companyId!) // Replace with getCustomerById if available
      ]);

      setCustomerGroups(Array.isArray(groupsRes) ? groupsRes : groupsRes.data || []);
      setSalesmen(Array.isArray(salesmenRes) ? salesmenRes : salesmenRes.data || []);

      const list = Array.isArray(customerDataRes) ? customerDataRes : customerDataRes.data || [];
      const record = list.find((c: any) => c._id === customerId);

      if (record) {
        setCustomerGroupId(record.customerGroupId?._id || record.customerGroupId || "");
        setCustActive(record.isActive ?? true);
        setName(record.name || "");
        setAddress(record.address || "");
        setAlias(record.alias || "");
        setCity(record.city || "");
        setPincode(record.pincode || "");
        setStateName(record.state || "");
        setContactPerson(record.contactPerson || "");
        setMobile(record.mobile || "");
        setPhone(record.phone || "");
        setEmail(record.email || "");
        setGstNo(record.gstNo || "");
        setPanNo(record.panNo || "");
        setUniqueIdNo(record.uniqueIdNo || "");
        setDrugLicNo(record.drugLicNo || "");
        setCustomerType(record.customerType || "Retailer");
        setBalanceMethod(record.balanceMethod || "Bill by bill");
        setCreditLimit(record.creditLimit?.toString() || "");
        setCreditDays(record.creditDays?.toString() || "0");
        setSalesmanId(record.salesmanId || "");
        setRouteNo(record.routeNo || "");
      } else {
        alert("Customer not found");
        router.push("/customers");
      }
    } catch (err) {
      console.error("Failed to load customer data", err);
      alert("Failed to load customer");
      router.push("/customers");
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
        isActive: custActive,
        customerGroupId: customerGroupId || undefined,
        alias: alias.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        state: stateName.trim(),
        contactPerson: contactPerson.trim(),
        mobile: mobile.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstNo: gstNo.trim(),
        panNo: panNo.trim(),
        uniqueIdNo: uniqueIdNo.trim(),
        drugLicNo: drugLicNo.trim(),
        customerType: customerType,
        balanceMethod: balanceMethod,
        salesmanId: salesmanId || null,
        routeNo: routeNo.trim(),
        creditLimit: parseFloat(creditLimit) || 0,
        creditDays: parseInt(creditDays) || 0,
      };

      await customerService.updateCustomer(customerId, payload);
      router.push("/customers");
    } catch (err) {
      console.error(err);
      alert("Failed to update customer");
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
        <p className="text-gray-500">Loading customer...</p>
      </div>
    );
  }

  // Helper component for the form rows removed from here

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <FormToolbar 
        title="Customers - Edit"
        onSave={handleSave}
        onCancel={() => router.push("/customers")}
        saving={saving}
      />

      <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
        <div className="w-full max-w-4xl bg-white border border-gray-300 shadow-md">
          <div className="flex flex-col w-full">

            <div className="flex items-start border-b border-gray-200">
              <div className="flex-1 border-r border-gray-200">
                <FieldRow label="Group Name">
                  <div className="flex-1 flex gap-2 items-center">
                    <Select
                      options={customerGroups.map(g => ({ value: g._id, label: g.name }))}
                      value={customerGroupId}
                      onChange={setCustomerGroupId}
                      placeholder="Select Group..."
                      className="!h-9"
                    />
                    <button className="h-9 px-3 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 font-bold text-red-600 flex-shrink-0">
                      5+
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
                <span className="text-sm text-gray-700 mb-2 font-medium">Customer Active</span>
                <input
                  type="checkbox"
                  className="w-5 h-5 border-gray-400 rounded cursor-pointer accent-blue-600"
                  checked={custActive}
                  onChange={e => setCustActive(e.target.checked)}
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
                  <Input value={alias} onChange={e => setAlias(e.target.value)} className="!h-9" />
                </div>
              </FieldRow>
              <FieldRow label="City / Town">
                <div className="w-64">
                  <Input value={city} onChange={e => setCity(e.target.value)} className="!h-9" />
                </div>
                <span className="text-sm font-medium text-gray-700 px-3 border-l border-gray-300 ml-2">Pin</span>
                <div className="w-32">
                  <Input value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} className="!h-9" />
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

              {/* Bold Large Mobile */}
              <FieldRow label={<span className="text-lg font-bold">Mobile No.</span>}>
                <div className="max-w-xl w-full">
                  <Input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} className="!h-11 !text-lg !font-bold !text-blue-900" />
                </div>
              </FieldRow>

              <FieldRow label="Phone">
                <div className="max-w-xl w-full">
                  <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} className="!h-9" />
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
              <FieldRow label="Unique ID No.">
                <div className="w-64">
                  <Input value={uniqueIdNo} onChange={e => setUniqueIdNo(e.target.value)} className="!h-9" />
                </div>
              </FieldRow>
              <FieldRow label="Drug Lic. No.">
                <div className="max-w-xl w-full">
                  <Input value={drugLicNo} onChange={e => setDrugLicNo(e.target.value)} className="!h-9" />
                </div>
              </FieldRow>

              <FieldRow label="Customer Type" required>
                <div className="w-64">
                  <Select
                    options={[
                      { value: "Retailer", label: "Retailer" },
                      { value: "Wholesaler", label: "Wholesaler" }
                    ]}
                    value={customerType}
                    onChange={setCustomerType}
                    className="!h-9"
                  />
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
                <span className="text-sm font-medium text-gray-700 mx-2">Credit Limit</span>
                <div className="w-36">
                  <Input type="number" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="0.00" className="!h-9 text-right font-medium text-blue-700" />
                </div>
                <span className="text-sm font-medium text-gray-700 mx-2">Default Due Days</span>
                <div className="w-24">
                  <Input type="number" value={creditDays} onChange={e => setCreditDays(e.target.value)} className="!h-9 text-right" />
                </div>
              </FieldRow>

              <FieldRow label="Default Salesman">
                <div className="w-64">
                  <Select
                    options={salesmen.map(s => ({ value: s._id, label: s.name }))}
                    value={salesmanId}
                    onChange={setSalesmanId}
                    placeholder="Select Salesman..."
                    className="!h-9"
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 mx-2">Route No.</span>
                <div className="w-40">
                  <Input value={routeNo} onChange={e => setRouteNo(e.target.value)} className="!h-9" />
                </div>
              </FieldRow>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
