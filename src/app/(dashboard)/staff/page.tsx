"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCog, UserPlus, Mail, Phone, Eye, EyeOff } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/date";
import {
  PERMISSION_MODULES,
  PERMISSION_LABELS,
  MODULE_ACTIONS,
  ACTION_LABELS,
  PermissionsMap,
} from "@/lib/permissions";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Table } from "@/components/ui/Table";
import { EditButton, DeleteButton } from "@/components/ui/ActionButtons";
import { PermissionMatrix } from "@/components/ui/PermissionMatrix";
import { userService } from "@/services/userService";

interface StaffRecord {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  permissions: PermissionsMap;
  lastLogin?: string;
  createdAt?: string;
}

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  permissions: {} as PermissionsMap,
  isActive: true,
};

export default function StaffPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<StaffRecord | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(userData);
    // Staff management is company_admin-only — a staff member (even one who
    // somehow guesses this URL) gets bounced, same self-check pattern
    // /super-admin/users already uses for role-gating a page.
    if (parsed.role !== "company_admin") {
      router.push("/dashboard");
      return;
    }
    setUser(parsed);
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await userService.getUsers();
      setStaff(Array.isArray(res) ? res : res.users || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load staff");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormErrors({});
    setShowPassword(false);
  };

  const openCreate = () => {
    resetForm();
    setEditingStaff(null);
    setDialogMode("create");
  };

  const openEdit = (s: StaffRecord) => {
    setEditingStaff(s);
    setForm({
      name: s.name || "",
      email: s.email || "",
      phone: s.phone || "",
      password: "",
      permissions: s.permissions || {},
      isActive: s.isActive !== false,
    });
    setFormErrors({});
    setShowPassword(false);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditingStaff(null);
    resetForm();
  };

  const isCreate = dialogMode === "create";
  const isEdit = dialogMode === "edit";

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (isCreate) {
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email format";
      if (!form.password || form.password.length < 6) errs.password = "Min 6 characters";
    } else if (form.password && form.password.length < 6) {
      errs.password = "Min 6 characters";
    }
    if (form.phone && form.phone.length !== 10) errs.phone = "Phone must be exactly 10 digits";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isCreate) {
        await userService.createStaff({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          permissions: form.permissions,
        });
        toast.success(`${form.name} added as Staff`);
      } else if (editingStaff) {
        const payload: any = {
          name: form.name,
          phone: form.phone,
          permissions: form.permissions,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await userService.updateStaff(editingStaff._id, payload);
        toast.success(`${form.name} updated`);
      }
      closeDialog();
      await fetchStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await userService.deleteUser(confirmDelete._id);
      toast.success(`${confirmDelete.name} removed`);
      await fetchStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove staff");
    } finally {
      setConfirmDelete(null);
    }
  };

  const filteredStaff = staff.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.phone?.includes(q);
  });

  const grantedModuleCount = (perms: PermissionsMap) => Object.keys(perms || {}).length;

  const columns = [
    {
      key: "user",
      header: "Staff",
      render: (s: StaffRecord, index: number) => (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
            {index + 1}
          </div>
          <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900">{s.name}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Last login: {formatDate(s.lastLogin, "Never")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (s: StaffRecord) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-sm text-gray-800 font-medium">
            <Mail className="h-3 w-3 text-gray-400" />
            {s.email}
          </div>
          {s.phone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Phone className="h-3 w-3 text-gray-400" />
              {s.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (s: StaffRecord) =>
        grantedModuleCount(s.permissions) > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[320px]">
            {PERMISSION_MODULES.filter((m) => s.permissions?.[m]?.view).map((m) => {
              const grant = s.permissions[m] || {};
              const actionAbbrev = MODULE_ACTIONS[m]
                .filter((a) => grant[a])
                .map((a) => a.charAt(0).toUpperCase())
                .join("");
              return (
                <span
                  key={m}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-gray-100 text-gray-700 border-gray-200"
                  title={MODULE_ACTIONS[m].filter((a) => grant[a]).map((a) => ACTION_LABELS[a]).join(", ")}
                >
                  {PERMISSION_LABELS[m].split(" (")[0]} ({actionAbbrev})
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">No access granted</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (s: StaffRecord) => (
        <span className="badge-outline">{s.isActive ? "Active" : "Inactive"}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center" as const,
      render: (s: StaffRecord) => (
        <div className="flex items-center justify-center gap-2">
          <EditButton onClick={() => openEdit(s)} title="Edit staff" />
          <DeleteButton onClick={() => setConfirmDelete(s)} title="Remove staff" />
        </div>
      ),
    },
  ];

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              સ્ટાફ (Staff)
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Create staff accounts for your company and control exactly what each one can view, create, edit, and delete.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} leftIcon={<UserPlus size={16} />}>
          Add Staff
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          placeholder="Search staff by name, email, phone..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="!py-1.5 !text-xs max-w-xs"
        />
        <div className="text-xs text-gray-500">
          {filteredStaff.length} staff{filteredStaff.length !== 1 ? "" : ""}
        </div>
      </div>

      <Table columns={columns} data={filteredStaff.map((s) => ({ ...s, id: s._id }))} isLoading={isLoading} emptyMessage="No staff yet — click Add Staff to create one" />

      <Dialog
        isOpen={!!dialogMode}
        onClose={closeDialog}
        title={isCreate ? "Add Staff" : "Edit Staff"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name"
              isRequired
              placeholder="e.g., Ajitbhai"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={formErrors.name}
              name="staff-name"
              autoComplete="off"
            />
            <Input
              label="Phone"
              placeholder="10-digit phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              error={formErrors.phone}
              maxLength={10}
              name="staff-phone"
              autoComplete="off"
            />
          </div>

          <Input
            label="Email"
            type="email"
            isRequired={isCreate}
            placeholder="staff@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={formErrors.email}
            disabled={isEdit}
            helperText={isEdit ? "Email can't be changed after the account is created" : undefined}
            name="staff-email"
            autoComplete="off"
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              isRequired={isCreate}
              placeholder={isEdit ? "Leave blank to keep current password" : "Min 6 characters"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={formErrors.password}
              className="pr-10"
              name="staff-password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[32px] text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          )}

          <PermissionMatrix
            permissions={form.permissions}
            onChange={(next) => setForm((f) => ({ ...f, permissions: next }))}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" type="button" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} leftIcon={<UserPlus size={14} />}>
              {isCreate ? "Create Staff" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Remove Staff"
        message={`Remove "${confirmDelete?.name}" (${confirmDelete?.email})? Their login will be deactivated immediately.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
