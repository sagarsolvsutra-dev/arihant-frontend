"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ArrowLeft,
  Loader2,
  Building2,
  Mail,
  Phone,
  UserPlus,
  Search,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

import { companyService } from "@/services/companyService";
import { userService } from "@/services/userService";

type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  companyId?: any;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
};

type Company = {
  _id: string;
  name: string;
  code: string;
  isActive?: boolean;
};

export default function UsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Admin dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    companyId: "",
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "super_admin") {
      router.push("/dashboard");
      return;
    }
    setUser(parsed);
    fetchUsers();
    fetchCompanies();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await companyService.getCompanies();
      setCompanies(res.companies || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Company options for select (with active filter)
  const activeCompanyOptions = useMemo(
    () =>
      companies
        .filter((c) => c.isActive !== false)
        .map((c) => ({ value: c._id, label: `${c.name} (${c.code})` })),
    [companies]
  );

  const filteredUsers = useMemo(() => {
    let list = users;
    if (filter !== "all") {
      const filterMap: Record<string, string> = {
        super: "super_admin",
        admin: "company_admin",
        staff: "staff",
      };
      const targetRole = filterMap[filter];
      if (targetRole) list = list.filter((u) => u.role === targetRole);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone?.includes(q) ||
          (typeof u.companyId === "object"
            ? u.companyId?.name?.toLowerCase().includes(q)
            : false)
      );
    }
    return list;
  }, [users, filter, searchQuery]);

  const validateAdd = (): boolean => {
    const errs: Record<string, string> = {};
    if (!addForm.name.trim()) errs.name = "Name is required";
    if (!addForm.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email))
      errs.email = "Invalid email format";
    if (!addForm.password || addForm.password.length < 6)
      errs.password = "Min 6 characters";
    if (!addForm.companyId) errs.companyId = "Please select a company";
    if (addForm.phone && addForm.phone.length !== 10)
      errs.phone = "Phone must be exactly 10 digits";
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAdd()) return;

    setAddSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const payload = {
        name: addForm.name,
        email: addForm.email,
        phone: addForm.phone || undefined,
        password: addForm.password,
        role: "company_admin",
        companyId: addForm.companyId,
      };

      await userService.createUser(payload);

      toast.success(`${addForm.name} created as Company Admin`);
      setShowAddDialog(false);
      setAddForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        companyId: "",
      });
      setAddErrors({});
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await userService.deleteUser(confirmDelete._id);
      toast.success(`${confirmDelete.name} deleted`);
      setConfirmDelete(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setConfirmDelete(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === "super_admin") return "bg-gray-900 text-white border-gray-900";
    if (role === "company_admin") return "bg-gray-200 text-gray-900 border-gray-300";
    return "bg-white text-gray-700 border-gray-300";
  };

  const getRoleLabel = (role: string) => {
    if (role === "super_admin") return "Super Admin";
    if (role === "company_admin") return "Company Admin";
    return "Staff";
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.back()}
            className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6" />
              All Users
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage all users across the system
            </p>
          </div>
        </div>

        <Button onClick={() => setShowAddDialog(true)} leftIcon={<UserPlus size={16} />}>
          Add User
        </Button>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tabs */}
        <div className="inline-flex items-center bg-white border border-gray-200 rounded-lg p-1">
          {[
            { id: "all", label: "All" },
            { id: "super", label: "Super Admins" },
            { id: "admin", label: "Company Admins" },
            { id: "staff", label: "Staff" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === tab.id
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SearchInput
          placeholder="Search users by name, email, phone..."
          value={searchQuery}
          onChange={(val) => setSearchQuery(val)}
        />

        <div className="text-xs text-gray-500">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full border-collapse">
          <thead className="bg-gray-900 text-white text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">User</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Contact</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Role</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Company</th>
              <th className="px-4 py-3 text-left font-semibold border-r border-white/20">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, index) => {
                const companyName =
                  typeof u.companyId === "object" ? u.companyId?.name : null;
                const isCurrentUser = user?._id === u._id;
                return (
                  <tr key={u._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3.5 border-r border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                          {index + 1}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">
                            {u.name}
                            {isCurrentUser && (
                              <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            Last login:{" "}
                            {u.lastLogin
                              ? new Date(u.lastLogin).toLocaleDateString()
                              : "Never"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 border-r border-gray-200">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-850 font-medium">
                          <Mail className="h-3 w-3 text-gray-400" />
                          {u.email}
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {u.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 border-r border-gray-200">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getRoleBadgeClass(u.role)}`}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-r border-gray-200">
                      {companyName ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-800 font-medium">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          {companyName}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 border-r border-gray-200">
                      <span className="badge-outline">
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {!isCurrentUser && (
                        <button
                          onClick={() => setConfirmDelete(u)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Dialog */}
      <Dialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setAddErrors({});
        }}
        title="Add New User"
        size="md"
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name"
              isRequired
              placeholder="e.g., Ajitbhai"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              error={addErrors.name}
            />
            <Input
              label="Phone"
              placeholder="10-digit phone"
              value={addForm.phone}
              onChange={(e) => {
                const digitsOnly = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                setAddForm({ ...addForm, phone: digitsOnly });
              }}
              error={addErrors.phone}
              maxLength={10}
            />
          </div>

          <Input
            label="Email"
            type="email"
            isRequired
            placeholder="user@example.com"
            value={addForm.email}
            onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            error={addErrors.email}
          />

          <div className="relative">
            <Input
              label="Password"
              id="user-password"
              type={showPassword ? "text" : "password"}
              isRequired
              placeholder="Min 6 characters"
              value={addForm.password}
              onChange={(e) =>
                setAddForm({ ...addForm, password: e.target.value })
              }
              error={addErrors.password}
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

          <Select
            label="Company"
            isRequired
            placeholder={
              activeCompanyOptions.length === 0
                ? "No active companies available"
                : "Select company..."
            }
            options={activeCompanyOptions}
            selectedValue={addForm.companyId}
            onChange={(val) => setAddForm({ ...addForm, companyId: val })}
            error={addErrors.companyId}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowAddDialog(false);
                setAddErrors({});
                setShowPassword(false);
              }}
              disabled={addSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={addSubmitting}
              leftIcon={<UserPlus size={14} />}
            >
              Create User
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Delete "${confirmDelete?.name}" (${confirmDelete?.email})? They will lose access immediately.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        userName={confirmDelete?.name}
        userEmail={confirmDelete?.email}
      />
    </div>
  );
}