import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Box,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  MapPin,
  Shield,
  Wrench,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  hint: string;
};

export const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Fleet overview" },
  { to: "/masters", label: "Masters", icon: ClipboardList, hint: "Reference data" },
  { to: "/operations", label: "Operations", icon: Box, hint: "Asset inventory" },
  { to: "/maintenance", label: "Maintenance", icon: Wrench, hint: "Repair queue" },
  { to: "/cycle-counts", label: "Cycle Counts", icon: ClipboardCheck, hint: "Physical stocktake" },
  { to: "/tracking", label: "Tracking", icon: MapPin, hint: "Control tower" },
  { to: "/reports", label: "Reports", icon: BarChart3, hint: "Analytics" },
  { to: "/hardware", label: "Hardware", icon: Cpu, hint: "Readers and devices" },
  { to: "/admin", label: "Administration", icon: Shield, hint: "Users and access" },
];

export const MASTER_TABS = [
  { id: "locations", label: "Locations & Departments" },
  { id: "categories", label: "Asset Categories & Rules" },
  { id: "movements", label: "Movement Types" },
  { id: "customers", label: "Customers" },
  { id: "suppliers", label: "Suppliers" },
  { id: "uom", label: "Units of Measure" },
  { id: "labels", label: "Label Templates" },
];

export const REPORT_TABS = [
  { id: "ops", label: "Operational Analytics" },
  { id: "roi", label: "Utilization & ROI" },
  { id: "log", label: "Movement Log" },
  { id: "maint", label: "Maintenance" },
  { id: "aging", label: "Asset Aging" },
  { id: "expiry", label: "Expiry Report" },
  { id: "lost", label: "Lost Assets" },
  { id: "cost", label: "Repair Cost" },
  { id: "notes", label: "Notifications" },
];

