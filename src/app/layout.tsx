import type { Metadata } from "next";
import { Geist, Geist_Mono, Anek_Gujarati } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { CompanyProvider } from "@/context/CompanyContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anekGujarati = Anek_Gujarati({
  variable: "--font-anek-gujarati",
  subsets: ["gujarati"],
});

export const metadata: Metadata = {
  title: "Arihant Enterprise ERP",
  description: "Bilingual Inventory, Billing, and Accounting ERP Suite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anekGujarati.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-[#f8f9fa] text-gray-800"
        suppressHydrationWarning
      >
        <CompanyProvider>{children}</CompanyProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          theme="light"
          toastOptions={{
            classNames: {
              toast: "group toast !bg-white !text-gray-900 !border !border-gray-200 !shadow-xl !rounded-xl !p-4 !font-sans !flex !items-center !gap-3 !text-sm",
              success: "!text-green-800 !bg-green-50 !border-green-200",
              error: "!text-red-800 !bg-red-50 !border-red-200",
              info: "!text-blue-800 !bg-blue-50 !border-blue-200",
              warning: "!text-yellow-800 !bg-yellow-50 !border-yellow-200",
              closeButton: "!bg-white !text-gray-400 hover:!text-gray-900 !border-gray-200",
            }
          }}
        />
      </body>
    </html>
  );
}