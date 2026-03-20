"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, User } from "lucide-react";

export default function LoginPage() {
    const [idValue, setIdValue] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 0. Emergency/Hardcoded Master Admin Login
            // This guarantees the admin can always get in, even if the database is empty.
            if (idValue === "admin@1234" && password === "admin@1234") {
                login({
                    id: "00000000-0000-0000-0000-000000000000",
                    role: "admin",
                    display_id: idValue,
                    name: "Master Admin",
                });
                router.push("/admin/dashboard");
                return;
            }

            // 1. Try Admin Login via DB
            const { data: adminData } = await supabase
                .from("admins")
                .select("*")
                .eq("admin_id", idValue)
                .eq("password", password)
                .maybeSingle();

            if (adminData) {
                login({
                    id: adminData.id,
                    role: "admin",
                    display_id: adminData.admin_id,
                    name: "Administrator",
                });
                router.push("/admin/dashboard");
                return;
            }

            // 2. Try Team Login via DB
            const { data: teamData } = await supabase
                .from("teams")
                .select("*")
                .eq("team_id", idValue)
                .eq("password", password)
                .maybeSingle();

            if (teamData) {
                login({
                    id: teamData.id,
                    role: "team",
                    display_id: teamData.team_id,
                    name: teamData.team_name,
                    status: teamData.status,
                });
                router.push("/participant/dashboard");
                return;
            }

            // 3. Neither matched
            setError("Invalid Login ID or Password.");
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] mix-blend-multiply opacity-50 dark:opacity-20 animate-pulse pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[100px] mix-blend-multiply opacity-50 dark:opacity-20 pointer-events-none" />

            <div className="relative w-full max-w-md">
                <div className="bg-card/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-8 z-10 transition-all duration-300">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">HackPortal</h1>
                        <p className="text-muted-foreground text-sm">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Login ID
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <User className="h-4 w-4" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={idValue}
                                    onChange={(e) => setIdValue(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                                    placeholder="e.g., TEAM001 or admin@1234"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-accent/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
