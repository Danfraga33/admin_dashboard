/**
 * Ecommerce-operator pain taxonomy. Each topic has a label (for UI) and a set
 * of trigger keywords (for classification). Shared between the server pipeline
 * and client UI — no server-only imports here.
 */
export interface Topic {
  key: string;
  label: string;
  keywords: string[];
}

export const TOPICS: Topic[] = [
  {
    key: "inventory",
    label: "Inventory & Stock",
    keywords: [
      "inventory",
      "stock",
      "stockout",
      "out of stock",
      "oversell",
      "oversold",
      "restock",
      "sku",
      "stock count",
      "reorder",
    ],
  },
  {
    key: "fulfillment_shipping",
    label: "Fulfillment & Shipping",
    keywords: [
      "shipping",
      "fulfillment",
      "fulfilment",
      "fba",
      "freight",
      "carrier",
      "tracking",
      "delivery",
      "shipping label",
      "3pl",
      "warehouse",
      "ship out",
    ],
  },
  {
    key: "returns_refunds",
    label: "Returns & Refunds",
    keywords: [
      "return",
      "returns",
      "refund",
      "chargeback",
      "dispute",
      "rma",
      "exchange",
      "a-to-z",
    ],
  },
  {
    key: "ads_marketing",
    label: "Ads & Marketing",
    keywords: [
      "ads",
      "facebook ads",
      "meta ads",
      "google ads",
      "ppc",
      "roas",
      "cac",
      "acos",
      "tiktok ads",
      "campaign",
      "marketing",
      "seo",
      "email marketing",
      "klaviyo",
      "retargeting",
    ],
  },
  {
    key: "customer_service",
    label: "Customer Service",
    keywords: [
      "customer service",
      "support ticket",
      "support tickets",
      "response time",
      "angry customer",
      "complaints",
      "live chat",
      "help desk",
    ],
  },
  {
    key: "pricing_fees",
    label: "Pricing & Fees",
    keywords: [
      "fees",
      "pricing",
      "margin",
      "margins",
      "commission",
      "payout",
      "referral fee",
      "transaction fee",
      "processing fee",
      "subscription cost",
    ],
  },
  {
    key: "apps_integrations",
    label: "Apps & Integrations",
    keywords: [
      "app",
      "plugin",
      "integration",
      "api",
      "zapier",
      "sync",
      "syncing",
      "connect",
      "webhook",
      "no integration",
    ],
  },
  {
    key: "accounting_tax",
    label: "Accounting & Tax",
    keywords: [
      "tax",
      "vat",
      "sales tax",
      "accounting",
      "bookkeeping",
      "quickbooks",
      "reconcile",
      "reconciliation",
      "1099",
      "invoice",
    ],
  },
  {
    key: "analytics_reporting",
    label: "Analytics & Reporting",
    keywords: [
      "analytics",
      "report",
      "reporting",
      "dashboard",
      "metrics",
      "attribution",
      "profit tracking",
      "data export",
    ],
  },
  {
    key: "suppliers_sourcing",
    label: "Suppliers & Sourcing",
    keywords: [
      "supplier",
      "suppliers",
      "sourcing",
      "manufacturer",
      "alibaba",
      "moq",
      "lead time",
      "wholesale",
      "private label",
    ],
  },
  {
    key: "listings_catalog",
    label: "Listings & Catalog",
    keywords: [
      "listing",
      "listings",
      "product page",
      "catalog",
      "variant",
      "variants",
      "product description",
      "product photos",
      "images",
    ],
  },
  {
    key: "operations_ops",
    label: "Operations & Manual Work",
    keywords: [
      "order management",
      "workflow",
      "process",
      "operations",
      "manually",
      "by hand",
      "spreadsheet",
      "spreadsheets",
      "copy paste",
      "automation",
      "repetitive",
    ],
  },
];

export const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.key, t.label]),
);
TOPIC_LABELS["uncategorized"] = "Uncategorized";

export function topicLabel(key: string): string {
  return TOPIC_LABELS[key] ?? key;
}
