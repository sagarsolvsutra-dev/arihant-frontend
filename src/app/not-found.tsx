"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchX, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [homeHref, setHomeHref] = useState("/login");

  useEffect(() => {
    const token = localStorage.getItem("token");
    setHomeHref(token ? "/dashboard" : "/login");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Top Brand Section */}
        <div className="px-8 pt-10 pb-6 text-center border-b border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl shadow-lg mb-5">
            <span className="text-white font-black text-2xl tracking-tighter">
              AE
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Arihant Enterprise
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Inventory • Billing • Accounting • GST
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
            <SearchX size={26} className="text-gray-500" />
          </div>

          <p className="text-6xl font-black text-gray-900 tracking-tight leading-none">
            404
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-3">
            Page Not Found
          </h2>
          <p className="text-sm font-gujarati text-gray-500 mt-1">
            પેજ મળ્યું નથી
          </p>

          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or may have
            been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm py-3 rounded-lg transition-all active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
            <Link
              href={homeHref}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold text-sm py-3 rounded-lg transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <Home size={16} />
              Go Home
            </Link>
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
