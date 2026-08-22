// API Configuration - Backend connection
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  ME: `${API_BASE_URL}/auth/me`,
  LOGOUT: `${API_BASE_URL}/auth/logout`,

  // Companies
  COMPANIES: `${API_BASE_URL}/companies`,
  CREATE_COMPANY: `${API_BASE_URL}/companies`,

  // Users
  USERS: `${API_BASE_URL}/users`,

  // Masters
  WAREHOUSES: `${API_BASE_URL}/warehouses`,
  ITEMS: `${API_BASE_URL}/items`,
  HSN: `${API_BASE_URL}/hsn`,
  CUSTOMERS: `${API_BASE_URL}/customers`,
  SUPPLIERS: `${API_BASE_URL}/suppliers`,
  SALESMEN: `${API_BASE_URL}/salesmen`,
  SCHEMES: `${API_BASE_URL}/schemes`,
  ITEM_GROUPS: `${API_BASE_URL}/item-groups`,
  ITEM_NAMES: `${API_BASE_URL}/item-names`,
  ITEM_SUB_GROUPS: `${API_BASE_URL}/item-sub-groups`,
  CUSTOMER_GROUPS: `${API_BASE_URL}/customer-groups`,
  SUPPLIER_GROUPS: `${API_BASE_URL}/supplier-groups`,
  COMPANIES_BRANDS: `${API_BASE_URL}/companies-brands`,
  OPENING_BILLS: `${API_BASE_URL}/opening-bills`,

  // Sales
  SALES: `${API_BASE_URL}/sales`,
  SALES_RETURN: `${API_BASE_URL}/sales-return`,

  // Purchase
  PURCHASES: `${API_BASE_URL}/purchases`,
  PURCHASE_RETURN: `${API_BASE_URL}/purchase-return`,

  // Inventory
  STOCK: `${API_BASE_URL}/stock`,
  STOCK_TRANSFER: `${API_BASE_URL}/stock-transfer`,
  STOCK_ADJUSTMENT: `${API_BASE_URL}/stock-adjustment`,
  STOCK_LEDGER: `${API_BASE_URL}/stock-ledger`,

  // Accounts
  ACCOUNTS: `${API_BASE_URL}/accounts`,
  CASH_RECEIPT: `${API_BASE_URL}/cash-receipt`,
  CASH_PAYMENT: `${API_BASE_URL}/cash-payment`,
  BANK_RECEIPT: `${API_BASE_URL}/bank-receipt`,
  BANK_PAYMENT: `${API_BASE_URL}/bank-payment`,
  CONTRA: `${API_BASE_URL}/contra`,
  JOURNAL: `${API_BASE_URL}/journal`,

  // Reports
  REPORTS: `${API_BASE_URL}/reports`,
  GST_R1: `${API_BASE_URL}/gstr1`,
  GST_R3B: `${API_BASE_URL}/gstr3b`,
};

export default API_BASE_URL;