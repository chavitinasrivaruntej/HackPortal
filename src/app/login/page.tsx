"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, User, Terminal, ScanLine, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";

export default function LoginPage() {
    const [idValue, setIdValue] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [loginSuccess, setLoginSuccess] = useState<{name: string} | null>(null);
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

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
                setLoginSuccess({ name: "Master Admin" });
                setTimeout(() => router.push("/admin/dashboard"), 5500);
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
                setLoginSuccess({ name: "Administrator" });
                setTimeout(() => router.push("/admin/dashboard"), 5500);
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
                setLoginSuccess({ name: teamData.team_name });
                setTimeout(() => router.push("/participant/dashboard"), 5500);
                return;
            }

            // 3. Neither matched
            setError("Authentication Failed. Invalid Credentials.");
        } catch (err) {
            setError("Connection Error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loginSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden font-mono">
                {/* Cyber grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00bc7d05_1px,transparent_1px),linear-gradient(to_bottom,#00bc7d05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 fade-in duration-700 w-full max-w-lg p-8">
                    
                    <div className="w-full flex justify-center mb-8 relative">
                        {/* Shield Scanner Animation */}
                        <div className="relative border border-emerald-500/30 bg-emerald-500/10 p-5 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,188,125,0.15)] group" style={{ animation: 'bgActivate 0.5s ease-out 1.2s forwards' }}>
                            <ShieldCheck className="w-14 h-14 text-slate-600 relative z-10" style={{ animation: 'shieldActivate 0.5s ease-out 1.2s forwards' }} />
                            {/* Scanning scanner line effect */}
                            <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_15px_#34d399] z-20 opacity-0" style={{ animation: 'scanSweep 1.2s ease-in-out forwards', top: '-10px' }}></div>
                        </div>
                    </div>

                    <div className="text-center space-y-4 w-full">
                        {/* Access Granted Text Animation */}
                        <h1 className="text-3xl font-bold text-emerald-500 tracking-widest uppercase flex items-center justify-center gap-3">
                            <span className="w-2 h-6 bg-emerald-500 mt-1 opacity-0" style={{ animation: 'fadeIn 0.1s 1.5s forwards, pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span>
                            <span className="opacity-0 blur-sm tracking-[0.3em]" style={{ animation: 'cyberReveal 0.5s cubic-bezier(0.1, 0.8, 0.2, 1) 1.6s forwards' }}>
                                Access Granted
                            </span>
                        </h1>
                        {/* Secure Connection Text Animation */}
                        <p className="text-emerald-500/60 text-sm uppercase tracking-[0.2em] border-y border-emerald-500/20 py-2 inline-block opacity-0 translate-y-2" style={{ animation: 'slightUpFade 0.4s ease-out 2.2s forwards' }}>
                            Secure Connection Established
                        </p>
                    </div>

                    <div className="w-full bg-black/60 border border-emerald-500/20 rounded-xl p-6 mt-8 font-mono shadow-[inset_0_0_20px_rgba(0,188,125,0.05)] backdrop-blur-xl">
                        {/* Terminal Status Lines Animation */}
                        <div className="flex items-start gap-3 text-emerald-400 mb-3">
                            <Terminal className="w-4 h-4 mt-1 shrink-0 opacity-0" style={{ animation: 'fadeIn 0.1s 2.5s forwards' }} />
                            <div className="text-sm">
                                <p className="opacity-0 mb-1" style={{ animation: 'fadeIn 0.1s 2.6s forwards' }}>&gt; Authenticating credentials...</p>
                                <p className="opacity-0 mb-1" style={{ animation: 'fadeIn 0.1s 3.1s forwards' }}>&gt; Checking permissions...</p>
                                <p className="text-emerald-300 font-bold opacity-0" style={{ animation: 'fadeIn 0.1s 3.6s forwards' }}>&gt; Identity verified: {loginSuccess.name}</p>
                            </div>
                        </div>
                        {/* Progress Bar Animation */}
                        <div className="w-full bg-emerald-950/50 rounded-full h-1 mt-6 overflow-hidden border border-emerald-500/10 relative opacity-0" style={{ animation: 'fadeIn 0.3s 3.8s forwards' }}>
                            <div className="h-full bg-emerald-500 rounded-full relative" style={{ width: '0%', animation: 'terminalProgress 1.2s cubic-bezier(0.4, 0, 0.2, 1) 4.0s forwards' }}>
                                <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/40 blur-[3px]" style={{ transform: 'translateX(50%)' }}></div>
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-emerald-500/50 mt-3 uppercase tracking-widest opacity-0" style={{ animation: 'fadeIn 0.3s 3.8s forwards, pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                            Initializing Portal Environments
                        </p>
                    </div>

                    <style>{`
                        @keyframes scanSweep {
                            0% { top: -10px; opacity: 0; }
                            10% { opacity: 1; }
                            90% { top: 100%; opacity: 1; }
                            100% { top: 100%; opacity: 0; }
                        }
                        @keyframes shieldActivate {
                            to { color: #34d399; filter: drop-shadow(0 0 8px rgba(52,211,153,0.6)); }
                        }
                        @keyframes bgActivate {
                            to { background-color: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); }
                        }
                        @keyframes cyberReveal {
                            from { opacity: 0; filter: blur(4px); letter-spacing: 0.3em; }
                            to { opacity: 1; filter: blur(0px); letter-spacing: 0.1em; }
                        }
                        @keyframes fadeIn {
                            to { opacity: 1; }
                        }
                        @keyframes slightUpFade {
                            to { opacity: 1; transform: translateY(0); }
                        }
                        @keyframes terminalProgress {
                            0% { width: 0%; box-shadow: 0 0 0px #00bc7d; }
                            95% { width: 100%; box-shadow: 0 0 10px #00bc7d; }
                            100% { width: 100%; box-shadow: 0 0 20px #34d399; }
                        }
                    `}</style>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030712] text-slate-300">
            {/* Dark mode only cyber background layer */}
            <div className="absolute inset-0 bg-[#030712]">
                {/* Horizontal & Vertical grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00bc7d10_1px,transparent_1px),linear-gradient(to_bottom,#00bc7d10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] "></div>
                {/* Ambient glow blobs */}
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-800/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
            </div>

            <div className="relative w-full max-w-[420px] z-10 px-4">
                <div className="bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_80px_rgba(0,188,125,0.07)] rounded-[24px] overflow-hidden transition-all duration-500 ring-1 ring-white/5">
                    
                    {/* Header Region */}
                    <div className="px-8 pt-10 pb-6 text-center border-b border-white/5 relative bg-gradient-to-b from-white/[0.02] to-transparent">
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>
                        
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(0,188,125,0.15)] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                {mounted ? (
                                    <Image
                                        src="/logo-darkmode.png"
                                        alt="CTF JNTUK"
                                        width={48}
                                        height={48}
                                        className="object-contain relative z-10 drop-shadow-md"
                                    />
                                ) : (
                                    <div className="w-12 h-12"></div>
                                )}
                            </div>
                        </div>
                        
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>CTF <span className="text-emerald-500">–</span> JNTUK</h1>
                        <p className="text-sm font-mono text-emerald-400/80 uppercase tracking-widest flex items-center justify-center gap-2">
                            <ScanLine className="w-3.5 h-3.5" />
                            Secure Access Panel
                        </p>
                    </div>

                    {/* Form Region */}
                    <div className="p-8 bg-black/50">
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">
                                    Identity Document (ID)
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40 group-focus-within:text-emerald-400 transition-colors">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={idValue}
                                        onChange={(e) => setIdValue(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all focus:bg-white/10"
                                        placeholder="ENTER YOUR ID"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-mono text-white/50 uppercase tracking-wider">
                                    Security Key
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40 group-focus-within:text-emerald-400 transition-colors">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all focus:bg-white/10"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-mono font-medium text-center animate-in slide-in-from-top-2 flex items-center justify-center gap-2">
                                    <ScanLine className="w-3.5 h-3.5" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,188,125,0.3)] hover:shadow-[0_0_30px_rgba(0,188,125,0.5)] mt-6 uppercase tracking-wider"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" />
                                        Authenticating...
                                    </>
                                ) : (
                                    "Initialize Connection"
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-4 bg-black/80 border-t border-white/5 text-center">
                        <p className="text-[10px] sm:text-xs text-white/30 font-mono tracking-widest uppercase">
                            Authorized Personnel Only
                        </p>
                    </div>
                </div>
            </div>
            {/* Inject Global Animation Styles */}
            <style jsx global>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                @keyframes progress {
                    0% { width: 0%; }
                    20% { width: 30%; }
                    40% { width: 45%; }
                    60% { width: 80%; }
                    100% { width: 100%; }
                }
            `}</style>
        </div>
    );
}
