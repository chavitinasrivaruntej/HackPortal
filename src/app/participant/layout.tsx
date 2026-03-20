"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LayoutDashboard, Users, FileText } from "lucide-react";

const participantMenu = [
    { name: "Dashboard", href: "/participant/dashboard", icon: LayoutDashboard },
    { name: "View Team", href: "/participant/team", icon: Users },
    { name: "Problem Statements", href: "/participant/problems", icon: FileText },
];

export default function ParticipantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute allowedRoles={["team"]}>
            <DashboardLayout menuItems={participantMenu} title="Participant Portal">
                {children}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
