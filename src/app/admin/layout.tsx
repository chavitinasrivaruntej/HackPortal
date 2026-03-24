"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LayoutDashboard, Users, FileText, BarChart3, UserMinus, MessageSquare, Medal } from "lucide-react";
import { IssueNotificationListener } from "@/components/IssueNotificationListener";

const adminMenu = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Teams", href: "/admin/teams", icon: Users },
    { name: "Problem Statements", href: "/admin/problems", icon: FileText },
    { name: "Allocations", href: "/admin/allocations", icon: BarChart3 },
    { name: "Issues", href: "/admin/issues", icon: MessageSquare },
    { name: "Marks", href: "/admin/marks", icon: Medal },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout menuItems={adminMenu} title="Admin Portal">
                <IssueNotificationListener />
                {children}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
