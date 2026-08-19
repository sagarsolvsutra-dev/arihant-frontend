"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Server,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  React.useEffect(() => {
    fetch(`${API_BASE_URL.replace(/\/api$/, "")}/health`)
      .then((r) =>
        r.ok ? setBackendStatus("online") : setBackendStatus("offline")
      )
      .catch(() => setBackendStatus("offline"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password");
      setIsLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || "Login failed";
        setError(msg);
        toast.error(msg);
        setIsLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast.success(`Welcome back, ${data.user.name}!`);
      setTimeout(() => router.push("/dashboard"), 300);
    } catch (err) {
      const msg = "Network error — please try again";
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      {/* Main Card Container - Single white card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Top Brand Section */}
        <div className="px-8 pt-10 pb-6 text-center border-b border-gray-100">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl shadow-lg mb-5">
            <span className="text-white font-black text-2xl tracking-tighter">
              AE
            </span>
          </div>
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Arihant Enterprise
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Inventory • Billing • Accounting • GST
          </p>
          <p className="text-xs text-gray-400 mt-1 font-gujarati">
            �ન્વેન્ટરી • બ�લિંગ • એકાઉન્ટ�ંગ • GST
          </p>
        </div>

        {/* Form Section */}
        <div className="px-8 py-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={20} className="text-gray-900" />
              Sign in to your account
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Enter your credentials to access the ERP system
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold text-gray-700 block mb-1.5"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={isLoading}
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="text-xs font-semibold text-gray-700 block mb-1.5"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition-colors disabled:cursor-not-allowed"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-semibold text-sm py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Backend Status Bar */}
        <div
          className={`px-8 py-3 border-t border-gray-100 flex items-center justify-between text-xs ${
            backendStatus === "online"
              ? "bg-green-50"
              : backendStatus === "offline"
              ? "bg-red-50"
              : "bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Server size={12} className="text-gray-500" />
            <span className="text-gray-600 font-medium">Backend</span>
          </div>
          <div className="flex items-center gap-1.5">
            {backendStatus === "checking" ? (
              <>
                <Loader2 size={10} className="animate-spin text-gray-400" />
                <span className="text-gray-500">Checking...</span>
              </>
            ) : backendStatus === "online" ? (
              <>
                <Wifi size={10} className="text-green-600" />
                <span className="text-green-700 font-semibold">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={10} className="text-red-500" />
                <span className="text-red-600 font-semibold">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer outside card */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-gray-500">
          Powered by{" "}
          <span className="font-bold text-gray-900">SolvSutra Software</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          Multi-tenant ERP • GST Ready • Bilingual (EN/ગુજરાતી)
        </p>
      </div>
    </div>
  );
}