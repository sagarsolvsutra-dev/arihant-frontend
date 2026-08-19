"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
}



const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    async function loadCompanies() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const res = await fetch(`${apiUrl}/companies`, {
          headers: {
            "Content-Type": "application/json",
            ...(typeof window !== "undefined" && localStorage.getItem("token")
              ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
              : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          // Backend returns { success: true, companies: [...] }
          const list = Array.isArray(data) ? data : data.companies || [];
          if (list.length > 0) {
            setCompanies(list);
            
            let defaultId = list[0]._id;
            if (typeof window !== "undefined") {
              try {
                const userStr = localStorage.getItem("user");
                if (userStr) {
                  const user = JSON.parse(userStr);
                  if (user.role === "company_admin" && user.companyId) {
                    defaultId = user.companyId;
                  }
                }
              } catch (e) {
                console.error("Error parsing user from localStorage", e);
              }
            }
            
            setSelectedCompanyId(defaultId);
            return;
          }
        }
        throw new Error("Empty response");
      } catch (e) {
        console.error("Failed to load companies:", e);
        setCompanies([]);
        setSelectedCompanyId("");
      }
    }
    loadCompanies();
  }, []);

  const activeCompany = companies.find((c) => c._id === selectedCompanyId) || null;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        activeCompany,
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
