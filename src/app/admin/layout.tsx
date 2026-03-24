"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LayoutDashboard, Users, FileText, BarChart3, MessageSquare, Medal, ScrollText } from "lucide-react";
import { IssueNotificationListener } from "@/components/IssueNotificationListener";
import { useAuthStore } from "@/store/useAuthStore";

const baseAdminMenu = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Teams", href: "/admin/teams", icon: Users },
    { name: "Problem Statements", href: "/admin/problems", icon: FileText },
    { name: "Allocations", href: "/admin/allocations", icon: BarChart3 },
    { name: "Issues", href: "/admin/issues", icon: MessageSquare },
    { name: "Marks", href: "/admin/marks", icon: Medal },
];

const logsMenuItem = { name: "Activity Log", href: "/admin/logs", icon: ScrollText };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore();

    const menuItems = user?.display_id === "4518"
        ? [...baseAdminMenu, logsMenuItem]
        : baseAdminMenu;

    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout menuItems={menuItems} title="Admin Portal">
                <IssueNotificationListener />
                {children}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
