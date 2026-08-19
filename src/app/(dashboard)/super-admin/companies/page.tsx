"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  Users,
  Phone,
  MapPin,
  Mail,
  Calendar,
  Hash,
  UserCog,
  RotateCcw,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { companyService } from "@/services/companyService";
import { userService } from "@/services/userService";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";


type Company = {
  _id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNo?: string;
  panNo?: string;
  isActive?: boolean;
  createdAt?: string;
  adminCount?: number;
};

type CompanyAdmin = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  companyId?: string;
  isActive?: boolean;
  password?: string;
};

type DialogMode = "create" | "edit" | null;
type ViewMode = "table";

type FormErrors = Partial<Record<keyof typeof initialForm, string>>;

const initialForm = {
  companyName: "",
  companyCode: "",
  address: "",
  phone: "",
  email: "",
  gstNo: "",
  panNo: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
};

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<CompanyAdmin | null>(null);
  const [admins, setAdmins] = useState<CompanyAdmin[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [viewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Company | null>(null);
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] =
    useState<CompanyAdmin | null>(null);

  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await companyService.getCompanies();
      setCompanies(res.companies || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await userService.getUsers();
      const companyAdmins = (res.users || []).filter(
        (u: any) => u.role === "company_admin"
      );
      // Normalize companyId to string
      const normalized = companyAdmins.map((u: any) => ({
        ...u,
        companyId:
          typeof u.companyId === "string" ? u.companyId : u.companyId?._id,
      }));
      setAdmins(normalized);
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchAdmins();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setFormErrors({});
    setSubmitError("");
    setShowPassword(false);
  };

  const validate = (mode: DialogMode): boolean => {
    const errs: FormErrors = {};
    if (!form.companyName.trim()) errs.companyName = "Company name is required";
    if (!form.companyCode.trim()) errs.companyCode = "Company code is required";
    else if (!/^[a-z0-9-]+$/.test(form.companyCode))
      errs.companyCode = "Lowercase letters, numbers and dashes only";

    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      errs.email = "Invalid email format";

    if (form.gstNo && form.gstNo.length !== 15)
      errs.gstNo = "GST must be 15 characters";
    if (form.panNo && form.panNo.length !== 10)
      errs.panNo = "PAN must be 10 characters";

    if (form.phone && form.phone.length !== 10)
      errs.phone = "Phone must be exactly 10 digits";

    if (mode === "create") {
      if (!form.adminName.trim()) errs.adminName = "Admin name is required";
      if (!form.adminEmail.trim()) errs.adminEmail = "Admin email is required";
      else if (!/^\S+@\S+\.\S+$/.test(form.adminEmail))
        errs.adminEmail = "Invalid admin email";
      if (form.adminPhone && form.adminPhone.length !== 10)
        errs.adminPhone = "Phone must be exactly 10 digits";
      if (!form.adminPassword) errs.adminPassword = "Password is required";
      else if (form.adminPassword.length < 6)
        errs.adminPassword = "Min 6 characters";
    } else if (mode === "edit") {
      if (form.adminPassword && form.adminPassword.length < 6)
        errs.adminPassword = "Min 6 characters";
      if (form.adminPhone && form.adminPhone.length !== 10)
        errs.adminPhone = "Phone must be exactly 10 digits";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openCreate = () => {
    resetForm();
    setEditingCompany(null);
    setEditingAdmin(null);
    setDialogMode("create");
  };

  const openEdit = async (company: Company) => {
    let admin = adminsByCompany[company._id] || null;

    // If no cached admin, always fetch fresh from backend
    if (!admin) {
      try {
        const res = await userService.getUsers();
        const allUsers: any[] = res.users || [];
        // Normalize companyId
        const fresh = allUsers
          .filter((u: any) => u.role === "company_admin")
          .map((u: any) => ({
            ...u,
            companyId:
              typeof u.companyId === "string" ? u.companyId : u.companyId?._id,
          }))
          .find((u: any) => u.companyId === company._id);
        admin = fresh || null;
        // Update local cache
        setAdmins(
          allUsers
            .filter((u: any) => u.role === "company_admin")
            .map((u: any) => ({
              ...u,
              companyId:
                typeof u.companyId === "string"
                  ? u.companyId
                  : u.companyId?._id,
            }))
        );
      } catch {
        // silent
      }
    }

    setForm({
      companyName: company.name || "",
      companyCode: company.code || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      gstNo: company.gstNo || "",
      panNo: company.panNo || "",
      adminName: admin?.name || "",
      adminEmail: admin?.email || "",
      adminPhone: admin?.phone || "",
      adminPassword: admin?.password || "",
    });
    setEditingCompany(company);
    setEditingAdmin(admin);
    setFormErrors({});
    setSubmitError("");
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingCompany(null);
    setEditingAdmin(null);
    setFormErrors({});
    setSubmitError("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate(dialogMode)) return;

    if (dialogMode === "create") {
      try {
        setSubmitting(true);
        await companyService.createCompany({
          company: {
            name: form.companyName,
            code: form.companyCode,
            address: form.address,
            phone: form.phone,
            email: form.email,
            gstNo: form.gstNo,
            panNo: form.panNo,
          },
          admin: {
            name: form.adminName,
            email: form.adminEmail,
            phone: form.adminPhone,
            password: form.adminPassword,
          },
        });
        toast.success(`${form.companyName} created successfully`);
        setDialogMode(null);
        await fetchCompanies();
        await fetchAdmins();
      } catch (err: any) {
        setSubmitError(err.message || "Failed to create company");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (dialogMode === "edit" && editingCompany) {
      try {
        setSubmitting(true);
        const adminPayload: any = {};
        if (form.adminName) adminPayload.name = form.adminName;
        if (form.adminEmail) adminPayload.email = form.adminEmail;
        if (form.adminPhone !== undefined) adminPayload.phone = form.adminPhone;
        if (form.adminPassword) adminPayload.password = form.adminPassword;

        await companyService.updateCompany(editingCompany._id, {
          company: {
            name: form.companyName,
            address: form.address,
            phone: form.phone,
            email: form.email,
            gstNo: form.gstNo,
            panNo: form.panNo,
          },
          admin: adminPayload,
        });
        toast.success(`${form.companyName} updated successfully`);
        setDialogMode(null);
        await fetchCompanies();
        await fetchAdmins();
      } catch (err: any) {
        setSubmitError(err.message || "Failed to update");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const name = confirmDelete.name;
    try {
      await companyService.deleteCompany(confirmDelete._id);
      toast.success(`${name} deleted successfully`);
      await fetchCompanies();
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!confirmDeleteAdmin) return;
    const name = confirmDeleteAdmin.name;
    try {
      await userService.deleteUser(confirmDeleteAdmin._id);
      toast.success(`Admin ${name} deleted successfully`);
      await fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setConfirmDeleteAdmin(null);
    }
  };



  const adminsByCompany = useMemo(() => {
    const map: Record<string, CompanyAdmin> = {};
    admins.forEach((a) => {
      // companyId may be populated as object { _id, name, code } from backend
      const cid =
        typeof a.companyId === "string"
          ? a.companyId
          : (a.companyId as any)?._id;
      if (cid) map[cid] = a;
    });
    return map;
  }, [admins]);

  // Filter companies by search + active/inactive
  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }
    return list;
  }, [companies, searchQuery]);



  const isCreate = dialogMode === "create";
  const isEdit = dialogMode === "edit";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            કંપનીઓ (Companies)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All registered companies in the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={openCreate}
            leftIcon={<Plus size={18} />}
          >
            Create Company
          </Button>
        </div>
      </div>

      {/* Search */}
      {companies.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput
            placeholder="Search companies by name, code, email..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
          />
        </div>
      )}

      {/* List */}
      {companies.length === 0 ? (
        <div className="card text-center py-10">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No companies yet</p>
          <Button
            onClick={openCreate}
            leftIcon={<Plus size={18} />}
          >
            Create your first company
          </Button>
        </div>
      ) : (
        <TableView
          companies={filteredCompanies}
          adminsByCompany={adminsByCompany}
          onEdit={openEdit}
          onDelete={setConfirmDelete}
        />
      )}

      {/* Form Dialog */}
      <Dialog
        isOpen={!!dialogMode}
        onClose={closeDialog}
        title={isCreate ? "Create New Company" : "Edit Company"}
        size="lg"
        key={editingCompany?._id || "create"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className="alert alert-error">
              <span>{submitError}</span>
            </div>
          )}

          {/* Company Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} />
              <h3 className="font-semibold text-gray-900">Company Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                isRequired
                placeholder="e.g., Arihant Enterprise"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
                error={formErrors.companyName}
              />

              <Input
                label="Company Code"
                isRequired
                placeholder="e.g., enterprise"
                value={form.companyCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    companyCode: e.target.value.toLowerCase(),
                  })
                }
                error={formErrors.companyCode}
                disabled={isEdit}
                helperText={
                  isCreate ? "Unique code (lowercase, no spaces)" : undefined
                }
              />



              <Input
                label="Address"
                placeholder="Full address"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                className="md:col-span-2"
              />

              <Input
                label="Phone"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, phone: digitsOnly });
                }}
                maxLength={10}
                error={formErrors.phone}
              />

              <Input
                label="Email"
                type="email"
                placeholder="company@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={formErrors.email}
              />

              <Input
                label="GST No."
                placeholder="15-digit GST number"
                maxLength={15}
                value={form.gstNo}
                onChange={(e) =>
                  setForm({ ...form, gstNo: e.target.value.toUpperCase() })
                }
                error={formErrors.gstNo}
              />

              <Input
                label="PAN No."
                placeholder="10-digit PAN"
                maxLength={10}
                value={form.panNo}
                onChange={(e) =>
                  setForm({ ...form, panNo: e.target.value.toUpperCase() })
                }
                error={formErrors.panNo}
              />
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Admin Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} />
              <h3 className="font-semibold text-gray-900">
                {isCreate ? "First Company Admin" : "Company Admin"}
              </h3>
            </div>

            {isEdit && editingAdmin && (
              <div className="alert alert-info mb-3">
                <span>
                  Editing existing admin. Leave password blank to keep current.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Admin Name"
                isRequired={isCreate}
                placeholder="e.g., Ajitbhai"
                value={form.adminName}
                onChange={(e) =>
                  setForm({ ...form, adminName: e.target.value })
                }
                error={formErrors.adminName}
                key={`adminName-${editingAdmin?._id || "new"}-${dialogMode}`}
              />

              <Input
                label="Admin Email"
                type="email"
                isRequired={isCreate}
                placeholder="admin@example.com"
                value={form.adminEmail}
                onChange={(e) =>
                  setForm({ ...form, adminEmail: e.target.value })
                }
                error={formErrors.adminEmail}
                key={`adminEmail-${editingAdmin?._id || "new"}-${dialogMode}`}
              />

              <Input
                label="Phone"
                placeholder="Phone number"
                value={form.adminPhone}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, adminPhone: digitsOnly });
                }}
                maxLength={10}
                error={formErrors.adminPhone}
                key={`adminPhone-${editingAdmin?._id || "new"}-${dialogMode}`}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  isRequired={isCreate}
                  placeholder={
                    isEdit ? "Enter password" : "Min 6 characters"
                  }
                  value={form.adminPassword}
                  onChange={(e) =>
                    setForm({ ...form, adminPassword: e.target.value })
                  }
                  error={formErrors.adminPassword}
                  key={`adminPwd-${editingAdmin?._id || "new"}-${dialogMode}`}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[32px] text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {isCreate ? "Create Company & Admin" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Delete Company */}
      <ConfirmationDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Company"
        message={`Delete "${confirmDelete?.name}" and its admin? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Confirm Delete Admin */}
      <ConfirmationDialog
        isOpen={!!confirmDeleteAdmin}
        onClose={() => setConfirmDeleteAdmin(null)}
        onConfirm={handleConfirmDeleteAdmin}
        title="Delete Admin"
        message={`Delete admin "${confirmDeleteAdmin?.name}" (${confirmDeleteAdmin?.email})?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />


    </div>
  );
}

// ============================================================================
// Table View Component
// ============================================================================
function TableView({
  companies,
  adminsByCompany,
  onEdit,
  onDelete,
}: {
  companies: Company[];
  adminsByCompany: Record<string, CompanyAdmin>;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  return (
    <div className="card overflow-hidden p-0 border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Company</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Code</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Contact</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">GST / PAN</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Admin</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Status</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Created</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm font-medium text-gray-500">
                  No companies found
                </td>
              </tr>
            ) : (
              companies.map((c, index) => {
                const admin = adminsByCompany[c._id];
                const isInactive = c.isActive === false;
                return (
                  <tr
                    key={c._id}
                    className={`hover:bg-gray-50/80 transition-colors ${isInactive ? "opacity-60 bg-gray-50" : ""}`}
                  >
                  <td className="px-4 py-3.5 border-r border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isInactive
                              ? "bg-gray-300 text-gray-500"
                              : "bg-gray-900 text-white"
                          }`}
                        >
                          <Building2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">
                            {c.name}
                          </div>
                          {c.address && (
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">
                              {c.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 border-r border-gray-200">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {c.code}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 border-r border-gray-200">
                    <div className="text-xs space-y-0.5">
                      {c.phone && (
                        <div className="flex items-center gap-1 text-gray-700 font-medium">
                          <Phone size={11} />
                          {c.phone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Mail size={11} />
                          <span className="truncate max-w-[160px]">
                            {c.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 border-r border-gray-200">
                    <div className="flex flex-col gap-1">
                      {c.gstNo && (
                        <span className="text-xs font-mono text-green-700 font-semibold">GST: {c.gstNo}</span>
                      )}
                      {c.panNo && (
                        <span className="text-xs font-mono text-red-600 font-semibold">PAN: {c.panNo}</span>
                      )}
                      {!c.gstNo && !c.panNo && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 border-r border-gray-200">
                    {admin ? (
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-xs truncate max-w-[160px]">
                          {admin.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[160px]">
                          {admin.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-r border-gray-200">
                    <span className="badge-outline">
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 border-r border-gray-200 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={11} />
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <EditButton onClick={() => onEdit(c)} />
                      <DeleteButton
                        onClick={() => onDelete(c)}
                        title="Delete company"
                      />
                    </div>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}