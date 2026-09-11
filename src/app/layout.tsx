import type { Metadata } from "next";
import { Geist, Geist_Mono, Anek_Gujarati } from "next/font/google";
import "./globals.css";
import { CompanyProvider } from "@/context/CompanyContext";
import { AppToaster } from "@/components/ui/AppToaster";

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
        <AppToaster />
      </body>
    </html>
  );
}