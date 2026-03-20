"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LayoutDashboard, Users, FileText, BarChart3, UserMinus } from "lucide-react";

const adminMenu = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Teams", href: "/admin/teams", icon: Users },
    { name: "Problem Statements", href: "/admin/problems", icon: FileText },
    { name: "Allocations", href: "/admin/allocations", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout menuItems={adminMenu} title="Admin Portal">
                {children}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
