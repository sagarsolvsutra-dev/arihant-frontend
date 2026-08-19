"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Trash2, Edit, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Table } from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useCompany } from "@/context/CompanyContext";
import { hsnService } from "@/services/hsnService";

interface HsnCodeRecord {
  id: string;
  _id?: string;
  hsnCode: string;
  description: string;
  uqcUnit: string;
}

const uqcOptions = [
  { value: "BAG-BAGS", label: "BAG-BAGS" },
  { value: "BAL-BALE", label: "BAL-BALE" },
  { value: "BDL-BUNDLES", label: "BDL-BUNDLES" },
  { value: "BKL-BUCKLES", label: "BKL-BUCKLES" },
  { value: "BOU-BILLION OF UNITS", label: "BOU-BILLION OF UNITS" },
  { value: "BOX-BOX", label: "BOX-BOX" },
  { value: "BTL-BOTTLES", label: "BTL-BOTTLES" },
  { value: "BUN-BUNCHES", label: "BUN-BUNCHES" },
  { value: "CAN-CANS", label: "CAN-CANS" },
  { value: "CBM-CUBIC METERS", label: "CBM-CUBIC METERS" },
  { value: "CCM-CUBIC CENTIMETERS", label: "CCM-CUBIC CENTIMETERS" },
  { value: "CMS-CENTIMETERS", label: "CMS-CENTIMETERS" },
  { value: "CTN-CARTONS", label: "CTN-CARTONS" },
  { value: "DOZ-DOZENS", label: "DOZ-DOZENS" },
  { value: "DRM-DRUMS", label: "DRM-DRUMS" },
  { value: "FTS-FEET", label: "FTS-FEET" },
  { value: "GGR-GREAT GROSS", label: "GGR-GREAT GROSS" },
  { value: "GMS-GRAMMES", label: "GMS-GRAMMES" },
  { value: "GRS-GROSS", label: "GRS-GROSS" },
  { value: "GYD-GROSS YARDS", label: "GYD-GROSS YARDS" },
  { value: "KGS-KILOGRAMS", label: "KGS-KILOGRAMS" },
  { value: "KLR-KILOLITRE", label: "KLR-KILOLITRE" },
  { value: "KME-KILOMETRE", label: "KME-KILOMETRE" },
  { value: "LBS-POUNDS", label: "LBS-POUNDS" },
  { value: "LTR-LITRES", label: "LTR-LITRES" },
  { value: "MLT-MILILITRE", label: "MLT-MILILITRE" },
  { value: "MTR-METERS", label: "MTR-METERS" },
  { value: "MTS-METRIC TONNES", label: "MTS-METRIC TONNES" },
  { value: "NOS-NUMBERS", label: "NOS-NUMBERS" },
  { value: "OTH-OTHERS", label: "OTH-OTHERS" },
  { value: "PAC-PACKS", label: "PAC-PACKS" },
  { value: "PCS-PIECES", label: "PCS-PIECES" },
  { value: "QTL-QUINTAL", label: "QTL-QUINTAL" },
  { value: "ROL-ROLLS", label: "ROL-ROLLS" },
  { value: "SET-SETS", label: "SET-SETS" },
  { value: "SQF-SQUARE FEET", label: "SQF-SQUARE FEET" },
  { value: "SQM-SQUARE METERS", label: "SQM-SQUARE METERS" },
  { value: "SQY-SQUARE YARDS", label: "SQY-SQUARE YARDS" },
  { value: "TBS-TABLETS", label: "TBS-TABLETS" },
  { value: "TGM-TEN GROSS", label: "TGM-TEN GROSS" },
  { value: "THD-THOUSANDS", label: "THD-THOUSANDS" },
  { value: "TON-TONNES", label: "TON-TONNES" },
  { value: "TUB-TUBES", label: "TUB-TUBES" },
  { value: "UGS-US GALLONS", label: "UGS-US GALLONS" },
  { value: "UNT-UNITS", label: "UNT-UNITS" },
  { value: "YDS-YARDS", label: "YDS-YARDS" },
];



export default function HsnPage() {
  const { selectedCompanyId } = useCompany();
  const [hsnCodes, setHsnCodes] = useState<HsnCodeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HsnCodeRecord | null>(null);
  const [hsnInput, setHsnInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [uqcInput, setUqcInput] = useState("UNT-UNITS");
  
  // Errors
  const [hsnError, setHsnError] = useState("");
  const [descError, setDescError] = useState("");
  const [formAlert, setFormAlert] = useState("");

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<HsnCodeRecord | null>(null);

  // Load HSN records whenever selected company changes
  useEffect(() => {
    if (!selectedCompanyId) return;
    loadHsnCodes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  async function loadHsnCodes() {
    setIsLoading(true);
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(selectedCompanyId || "");

    if (!isValidObjectId) {
      setHsnCodes([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await hsnService.getHsnCodes(selectedCompanyId);
      // Standardize _id to id for our UI Table key
      setHsnCodes(data.map((item: any) => ({ ...item, id: item._id })));
    } catch (e) {
      console.error(e);
      setHsnCodes([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle form validations
  const validateForm = () => {
    let valid = true;
    setHsnError("");
    setDescError("");
    setFormAlert("");

    if (!hsnInput.trim()) {
      setHsnError("HSN Code is required");
      valid = false;
    } else if (!/^\d{4,8}$/.test(hsnInput)) {
      setHsnError("HSN Code must be a 4 to 8 digit number");
      valid = false;
    }

    if (!descInput.trim()) {
      setDescError("Description is required");
      valid = false;
    } else if (/[()\[\]{}|\\^%`]/.test(descInput)) {
      setDescError("Special characters like ( ), [ ], { } are not allowed");
      valid = false;
    }

    return valid;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      companyId: selectedCompanyId,
      hsnCode: hsnInput.trim(),
      description: descInput.trim(),
      uqcUnit: uqcInput,
    };

    try {
      if (editingRecord) {
        await hsnService.updateHsnCode(editingRecord.id, {
          description: payload.description,
          uqcUnit: payload.uqcUnit,
        });
      } else {
        await hsnService.createHsnCode(payload);
      }
      setIsFormOpen(false);
      resetForm();
      loadHsnCodes();
    } catch (e: any) {
      setFormAlert(e.message || "Failed to save HSN Code");
    }
  };

  const handleEditClick = (record: HsnCodeRecord) => {
    setEditingRecord(record);
    setHsnInput(record.hsnCode);
    setDescInput(record.description);
    setUqcInput(record.uqcUnit);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: HsnCodeRecord) => {
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;

    try {
      await hsnService.deleteHsnCode(deletingRecord.id);
      setIsDeleteOpen(false);
      setDeletingRecord(null);
      loadHsnCodes();
    } catch (e: any) {
      alert(e.message || "Failed to delete HSN code");
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setHsnInput("");
    setDescInput("");
    setUqcInput("UNT-UNITS");
    setHsnError("");
    setDescError("");
    setFormAlert("");
  };

  const filteredHsn = hsnCodes.filter(
    (item) =>
      item.hsnCode.includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      key: "srNo",
      header: "Sr. No.",
      align: "center" as const,
      render: (_: HsnCodeRecord, index: number) => <span>{index + 1}</span>,
    },
    { key: "hsnCode", header: "HSN Code", align: "center" as const },
    {
      key: "description",
      header: "Description",
      align: "left" as const,
      render: (row: HsnCodeRecord) => (
        <div className="max-w-md truncate font-medium text-gray-700" title={row.description}>
          {row.description}
        </div>
      ),
    },
    { key: "uqcUnit", header: "UQC - Unit", align: "center" as const },
    {
      key: "actions",
      header: "Actions",
      align: "center" as const,
      render: (row: HsnCodeRecord) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" className="p-1 h-8 w-8 hover:bg-blue-50" onClick={() => handleEditClick(row)}>
            <Edit className="h-4 w-4 text-blue-600" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1 h-8 w-8 hover:bg-red-50" onClick={() => handleDeleteClick(row)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Section Header Cards */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">HSN કોડ્સ લિસ્ટ (HSN Codes)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Government tax rates matching HSN libraries for items.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <SearchInput
              placeholder="Search HSN code or description..."
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={loadHsnCodes}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="h-9 px-4 bg-black hover:bg-gray-900 border-none"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
          >
            Add HSN Code
          </Button>
        </div>
      </div>

      {/* Main Table area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-6">
        <Table columns={columns} data={filteredHsn} isLoading={isLoading} />
      </div>

      {/* Add / Edit Form Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingRecord ? "Edit HSN Code" : "Add HSN Code"}
        overflowVisible
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" className="bg-black hover:bg-gray-900 text-white border-none" onClick={handleSave}>
              Save
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          {formAlert && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {formAlert}
            </div>
          )}

          <Input
            label="HSN Code"
            placeholder="e.g. 85071000"
            value={hsnInput}
            onChange={(e) => {
              setHsnInput(e.target.value);
              if (e.target.value) setHsnError("");
            }}
            isRequired
            error={hsnError}
            disabled={!!editingRecord}
          />

          <div className="flex flex-col gap-1">
            <Input
              label="Description"
              placeholder="kind used for starting piston engine"
              value={descInput}
              onChange={(e) => {
                setDescInput(e.target.value);
                if (e.target.value) setDescError("");
              }}
              isRequired
              error={descError}
            />
            <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider mt-1 block">
              * PLEASE DON'T USE SPECIAL CHARACTERS IN DESCRIPTION FIELD : ( ), ETC.
            </span>
          </div>

          <Select
            label="UQC - Unit"
            options={uqcOptions}
            selectedValue={uqcInput}
            onChange={(val) => setUqcInput(val)}
            isRequired
          />
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete HSN Code"
        message={`Are you sure you want to delete HSN Code "${deletingRecord?.hsnCode}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
