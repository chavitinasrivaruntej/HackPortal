"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, UserRole } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}) {
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            if (!user || user.role === null) {
                router.push("/login");
            } else if (!allowedRoles.includes(user.role)) {
                if (user.role === "admin") router.push("/admin/dashboard");
                if (user.role === "team") router.push("/participant/dashboard");
            }
        }
    }, [isMounted, user, router, allowedRoles]);

    if (!isMounted) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
