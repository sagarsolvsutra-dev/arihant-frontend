"use client";

import React, { useState } from "react";
import { Plus, RefreshCw, Layers, Sliders, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  StatusBadge,
  QtyBadge,
  ProductNameCell,
  ProductImageCell,
  ActionsCell,
} from "@/components/ui/Table";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface Product {
  id: string;
  srNo: number;
  code: string;
  image?: string;
  name: string;
  hsn: string;
  mrp: string;
  qty: number;
  alertQty: number;
  gst: string;
  brand: string;
  category: string;
  expiry: string;
  status: "Active" | "Inactive";
}

const mockProducts: Product[] = [
  {
    id: "1",
    srNo: 1,
    code: "FI-0003",
    name: "Weight Bench Pro",
    hsn: "950691",
    mrp: "₹12,000",
    qty: 10,
    alertQty: 10,
    gst: "18%",
    brand: "Fitnee",
    category: "Fitnee",
    expiry: "NA",
    status: "Active",
  },
  {
    id: "2",
    srNo: 2,
    code: "FI-0002",
    name: "Adjustable Dumbbell 20kg",
    hsn: "950691",
    mrp: "₹3,500",
    qty: 29,
    alertQty: 5,
    gst: "18%",
    brand: "Fitnee",
    category: "Fitnee",
    expiry: "NA",
    status: "Active",
  },
  {
    id: "3",
    srNo: 3,
    code: "FI-0001",
    name: "Treadmill Motorized 2HP",
    hsn: "950691",
    mrp: "₹45,000",
    qty: 25,
    alertQty: 5,
    gst: "18%",
    brand: "Fitnee",
    category: "Fitnee",
    expiry: "NA",
    status: "Active",
  },
  {
    id: "4",
    srNo: 4,
    code: "SP-0001",
    name: "Sports/Fitness",
    hsn: "950691",
    mrp: "₹1,000",
    qty: 120,
    alertQty: 10,
    gst: "18%",
    brand: "sport",
    category: "sport",
    expiry: "NA",
    status: "Active",
  },
  {
    id: "5",
    srNo: 5,
    code: "RE-0002",
    name: "arrings",
    hsn: "950691",
    mrp: "₹5,000",
    qty: 15,
    alertQty: 5,
    gst: "18%",
    brand: "real99",
    category: "errings",
    expiry: "NA",
    status: "Inactive",
  },
  {
    id: "6",
    srNo: 6,
    code: "RE-0001",
    name: "nacklash",
    hsn: "950691",
    mrp: "₹20,000",
    qty: 20,
    alertQty: 10,
    gst: "18%",
    brand: "real99",
    category: "nacklash",
    expiry: "NA",
    status: "Active",
  },
];

const categoryOptions = [
  { value: "bowflex", label: "Bowflex" },
  { value: "fitnee", label: "Fitnee" },
  { value: "proform", label: "ProForm" },
  { value: "errings", label: "errings" },
  { value: "nacklash", label: "nacklash" },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productCode, setProductCode] = useState("");
  const [codeError, setCodeError] = useState("");
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const toggleLoading = () => {
    setIsTableLoading(true);
    setTimeout(() => setIsTableLoading(false), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productCode.trim()) {
      setCodeError("Product code is required");
      return;
    }
    setCodeError("");
    setIsFormModalOpen(false);
    alert("Form submitted successfully!");
  };

  const handleActionClick = (product: Product) => {
    setSelectedProduct(product);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      setProducts(products.filter((p) => p.id !== selectedProduct.id));
      setIsConfirmOpen(false);
      setSelectedProduct(null);
    }
  };

  const columns = [
    { key: "srNo", header: "Sr. No.", align: "center" as const },
    { key: "code", header: "Product Code", align: "center" as const },
    {
      key: "image",
      header: "Product Image",
      align: "center" as const,
      render: (row: Product) => <ProductImageCell src={row.image} />,
    },
    {
      key: "name",
      header: "Product Name",
      align: "center" as const,
      render: (row: Product) => <ProductNameCell name={row.name} hsn={row.hsn} />,
    },
    {
      key: "mrp",
      header: "M.R.P",
      align: "center" as const,
      render: (row: Product) => <span className="font-semibold text-gray-800">{row.mrp}</span>,
    },
    {
      key: "qty",
      header: "Available Qty",
      align: "center" as const,
      render: (row: Product) => <QtyBadge qty={row.qty} alertQty={row.alertQty} />,
    },
    { key: "alertQty", header: "Alert Qty", align: "center" as const },
    { key: "gst", header: "GST (%)", align: "center" as const },
    { key: "brand", header: "Brand", align: "center" as const },
    { key: "category", header: "Category", align: "center" as const },
    { key: "expiry", header: "Expiry Date", align: "center" as const },
    {
      key: "status",
      header: "Status",
      align: "center" as const,
      render: (row: Product) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "center" as const,
      render: (row: Product) => <ActionsCell onClick={() => handleActionClick(row)} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Arihant Enterprise</h1>
            <p className="text-sm text-gray-500 mt-1">Reusable components showcase and product inventory management dashboard.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={toggleLoading}>
              Toggle Skeleton Loader (2s)
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsFormModalOpen(true)}>
              Add Product Form
            </Button>
          </div>
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form and Selection Demo block */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Sliders className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-800">Form Fields & Search Select</h2>
            </div>
            
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <Input
                label="Product Code"
                placeholder="e.g. FI-0004"
                value={productCode}
                onChange={(e) => {
                  setProductCode(e.target.value);
                  if (e.target.value) setCodeError("");
                }}
                isRequired
                error={codeError}
              />

              <Select
                label="Category"
                placeholder="Select category"
                options={categoryOptions}
                selectedValue={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
              />

              <Button type="submit" variant="primary" className="w-full mt-2">
                Validate & Submit Form
              </Button>
            </form>
          </div>

          {/* Button states Block */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Layers className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-800">Button Component Variants</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="primary" size="sm">Primary SM</Button>
              <Button variant="secondary" size="sm">Secondary SM</Button>
              <Button variant="outline" size="sm">Outline SM</Button>
              <Button variant="danger" size="sm">Danger SM</Button>
              <Button variant="ghost" size="sm">Ghost SM</Button>
              <Button variant="primary" size="sm" isLoading>Loading State</Button>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <Button variant="primary" size="md" className="w-full">Medium Width</Button>
              <Button variant="secondary" size="lg" className="w-full">Large Width</Button>
            </div>
          </div>

          {/* Interactive Modals Block */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-800">Modals & Confirms</h2>
            </div>
            
            <div className="flex flex-col gap-3 h-full justify-center">
              <Button variant="outline" className="w-full py-3" onClick={() => setIsFormModalOpen(true)}>
                Open Dialog Modal
              </Button>
              <Button variant="danger" className="w-full py-3" onClick={() => {
                setSelectedProduct(mockProducts[0]);
                setIsConfirmOpen(true);
              }}>
                Open Delete Confirm Dialog
              </Button>
            </div>
          </div>
        </div>

        {/* Main Table section */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Product List UI (Screenshot Match)</h2>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {products.length} Products
            </span>
          </div>
          
          <Table columns={columns} data={products} isLoading={isTableLoading} />
        </div>

      </div>

      {/* Reusable Form Dialog */}
      <Dialog
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Add New Product Form"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleFormSubmit}>
              Save Product
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Product Name"
            placeholder="Weight Bench Pro"
            isRequired
          />
          <Input
            label="Product Code"
            placeholder="FI-0003"
            isRequired
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="M.R.P"
              placeholder="12000"
              type="number"
            />
            <Input
              label="Available Qty"
              placeholder="10"
              type="number"
            />
          </div>
          <Select
            label="Category"
            placeholder="Select category"
            options={categoryOptions}
            selectedValue={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
          />
        </div>
      </Dialog>

      {/* Reusable Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete ${selectedProduct?.name || "this product"}? This action is permanent and cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
