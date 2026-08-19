"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    
    // Read from localStorage on mount to avoid hydration mismatch
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        setUser(null);
      }
    }
    
    checkAuth();
  }, []);



  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token expired
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      }
    } catch (err) {
      // Keep using cached user
    }
  };

  if (!isMounted || !user) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}