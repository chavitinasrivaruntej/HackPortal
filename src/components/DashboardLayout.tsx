"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, Menu, X, LucideIcon, Sun, Moon, User, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { AnnouncementsDrawer } from "./AnnouncementsDrawer";
import Image from "next/image";
import BorderGlow from "./BorderGlow";

export interface MenuItem {
    name: string;
    href: string;
    icon: LucideIcon;
}

export function DashboardLayout({
    children,
    menuItems,
    title,
}: {
    children: React.ReactNode;
    menuItems: MenuItem[];
    title: string;
}) {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogout = () => {
        logout();
        setIsNavigating(true);
        router.push("/login");
    };

    useEffect(() => {
        setIsNavigating(false);
    }, [pathname]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (isNavigating) {
            timeoutId = setTimeout(() => {
                setIsNavigating(false);
            }, 3000);
        }
        return () => clearTimeout(timeoutId);
    }, [isNavigating]);

    // Global Border Glow Tracker Setup
    useEffect(() => {
        let ticking = false;
        const handleMouseMove = (e: MouseEvent) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const cards = document.querySelectorAll(".bg-card");
                    for (let i = 0; i < cards.length; i++) {
                        const card = cards[i] as HTMLElement;
                        const rect = card.getBoundingClientRect();
                        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
                        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen flex bg-background">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 lg:static lg:block flex flex-col",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between h-16 px-4 border-b border-border gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Explicit controlled logo swapping for optimal visibility */}
                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center overflow-hidden">
                            {mounted ? (
                                <Image
                                    src={theme === 'dark' ? "/logo-darkmode.png" : "/logo-lightmode.png"}
                                    alt="CTF JNTUK"
                                    width={48}
                                    height={48}
                                    className="object-contain drop-shadow-sm"
                                />
                            ) : (
                                <div className="w-12 h-12 opacity-0"></div>
                            )}
                        </div>
                        <span className="font-black text-xl sm:text-2xl tracking-tighter leading-none truncate font-sans">
                            CTF <span className="text-emerald-500 mx-0.5">–</span> JNTUK
                        </span>
                    </div>
                    <button className="lg:hidden shrink-0" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <nav className="flex-1 px-4 text-sm py-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={(e) => {
                                        if (pathname !== item.href && !pathname.startsWith(item.href)) {
                                            setIsNavigating(true);
                                        }
                                        setSidebarOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium",
                                        isActive
                                            ? "bg-emerald-500/10 text-emerald-500 font-bold"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-500" : "opacity-70")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="bg-muted px-4 py-3 rounded-xl mb-4">
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                            Logged in as
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.display_id}</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5 opacity-80" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <BorderGlow
                as="main"
                className="flex-1 flex flex-col min-w-0 overflow-hidden"
                edgeSensitivity={30}
                glowColor="170 80 60"
                backgroundColor="transparent"
                borderRadius={0}
                glowRadius={30}
                glowIntensity={0.7}
                coneSpread={25}
                animated
                colors={['#00d9a5']}
            >
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-card border-b border-border sticky top-0 z-30">
                    <div className="flex items-center w-1/3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-md"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex justify-center flex-1 w-1/3">
                        <h1 className="text-lg font-bold text-foreground text-center tracking-tight">{title}</h1>
                    </div>

                    <div className="flex items-center justify-end gap-3 w-1/3">
                        <AnnouncementsDrawer />
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            <Sun className="h-5 w-5 dark:hidden" />
                            <Moon className="h-5 w-5 hidden dark:block" />
                        </button>
                    </div>
                </header>



                {/* Page Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </BorderGlow>

            {/* Global Tab Navigation Loading Overlay Removed for Instant Transitions */}
        </div >
    );
}
