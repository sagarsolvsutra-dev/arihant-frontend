"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  const checkAuth = useCallback(async () => {
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
        // Write the fresh copy back to localStorage — AdminLayout reads `user` from
        // localStorage directly (not from this component's state/props), so without
        // this it kept showing whatever name/role was cached at login even after an
        // admin edited this user, or after the token was refreshed.
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        // Token expired
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      }
    } catch (err) {
      // Keep using cached user
    }
  }, [router]);

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

    // Next's App Router doesn't remount this shared layout on client-side
    // navigation, so without an explicit re-check, a token that expires (or a
    // logout in another tab, or an admin edit to this user) mid-session was
    // invisible until a hard reload. Re-validate whenever the tab regains focus —
    // a low-cost, natural trigger point rather than a polling timer.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkAuth();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Cross-tab logout: another tab's `handleLogout` clears `token`/`user` from
    // localStorage, which fires a `storage` event in every OTHER open tab (not the
    // one that made the change) — previously nothing listened for it, so a logged-
    // out-elsewhere tab kept rendering the full dashboard indefinitely.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        if (!localStorage.getItem("token") || !localStorage.getItem("user")) {
          router.push("/login");
        } else {
          checkAuth();
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, [checkAuth, router]);

  if (!isMounted || !user) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
