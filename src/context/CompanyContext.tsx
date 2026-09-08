"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface Company {
  _id: string;
  name: string;
  code: string;
}

interface CompanyContextType {
  companies: Company[];
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  activeCompany: Company | null;
  isContextLoading: boolean;
  companiesError: boolean;
  reloadCompanies: () => void;
  // Only a super_admin is actually free to pick between companies — company_admin
  // and staff are always locked to their own companyId (see loadCompanies below).
  canSwitchCompany: boolean;
}

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompanyId";

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string>("");
  const [isContextLoading, setIsContextLoading] = useState<boolean>(true);
  const [companiesError, setCompaniesError] = useState<boolean>(false);
  const [canSwitchCompany, setCanSwitchCompany] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState(0);

  const setSelectedCompanyId = useCallback((id: string) => {
    setSelectedCompanyIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, id);
    }
  }, []);

  const reloadCompanies = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanies() {
      setIsContextLoading(true);
      setCompaniesError(false);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const res = await fetch(`${apiUrl}/companies`, {
          headers: {
            "Content-Type": "application/json",
            ...(typeof window !== "undefined" && localStorage.getItem("token")
              ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
              : {}),
          },
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(`Failed to load companies (HTTP ${res.status})`);

        const data = await res.json();
        // Backend returns { success: true, companies: [...] }
        const list: Company[] = Array.isArray(data) ? data : data.companies || [];
        if (list.length === 0) throw new Error("No companies returned");

        setCompanies(list);

        let defaultId = list[0]._id;
        let switchable = true;
        if (typeof window !== "undefined") {
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const user = JSON.parse(userStr);
              // company_admin AND staff must always be scoped to their own company —
              // defaulting either of them to list[0] (whichever company happens to be
              // newest, since the backend's list is unfiltered and sorted newest-first)
              // silently mixes one tenant's session with another tenant's data.
              if ((user.role === "company_admin" || user.role === "staff") && user.companyId) {
                defaultId = user.companyId;
                switchable = false;
              } else if (user.role === "super_admin") {
                // Only super_admin may resume a previously-picked company across reloads.
                const stored = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
                if (stored && list.some((c) => c._id === stored)) {
                  defaultId = stored;
                }
              }
            }
          } catch (e) {
            console.error("Error parsing user from localStorage", e);
          }
        }

        setCanSwitchCompany(switchable);
        setSelectedCompanyIdState(defaultId);
        if (typeof window !== "undefined") {
          localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, defaultId);
        }
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to load companies:", e);
        setCompanies([]);
        setSelectedCompanyIdState("");
        setCompaniesError(true);
      } finally {
        if (!cancelled) setIsContextLoading(false);
      }
    }

    loadCompanies();
    return () => {
      cancelled = true;
    };
    // reloadToken deliberately included as a dependency so reloadCompanies() (e.g. a
    // "Retry" button after a transient network failure) re-runs this effect —
    // previously a single failed initial fetch left company state empty for the rest
    // of the session with no way to try again short of a full page reload.
  }, [reloadToken]);

  const activeCompany = companies.find((c) => c._id === selectedCompanyId) || null;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        activeCompany,
        isContextLoading,
        companiesError,
        reloadCompanies,
        canSwitchCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};
