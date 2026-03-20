"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { FileText, CheckCircle2, Trophy, Users, Link as LinkIcon, Megaphone, Paperclip, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export default function ParticipantDashboard() {
    const user = useAuthStore((state) => state.user);
    const [selectedProblem, setSelectedProblem] = useState<any>(null);
    const [stats, setStats] = useState({ problems: 0, members: 0 });
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [showAllAnn, setShowAllAnn] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user?.id) {
                const [
                    { data: selectionData },
                    { count: psCount },
                    { count: memberCount },
                    { data: annData }
                ] = await Promise.all([
                    supabase.from("team_selections").select("*, problem_statements(*)").eq("team_ref_id", user.id).maybeSingle(),
                    supabase.from("problem_statements").select('*', { count: 'exact', head: true }),
                    supabase.from("team_members").select('*', { count: 'exact', head: true }).eq("team_ref_id", user.id),
                    supabase.from("announcements").select("*").order("created_at", { ascending: false })
                ]);

                if (selectionData?.problem_statements) setSelectedProblem(selectionData.problem_statements);
                setStats({ problems: psCount || 0, members: memberCount || 0 });
                if (annData) setAnnouncements(annData);
            }
            setLoading(false);
        };

        fetchDashboardData();

        // Realtime subscription for announcements (INSERT + DELETE)
        const channel = supabase.channel('participant_dashboard_ann')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const getStatusInfo = () => {
        switch (user?.status) {
            case "Shortlisted": return { text: "Shortlisted", color: "text-green-500", dot: "bg-green-500", badge: "bg-green-500/10 text-green-500", msg: "Congratulations! Your team advanced." };
            case "Eliminated": return { text: "Eliminated", color: "text-destructive", dot: "bg-destructive", badge: "bg-destructive/10 text-destructive", msg: "Thank you for participating." };
            case "Frozen": return { text: "Frozen", color: "text-orange-500", dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-500", msg: "Account locked by Admin." };
            default: return { text: "Active", color: "text-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500", msg: "Competition is ongoing." };
        }
    };

    const parseMessage = (msg: string) => {
        const parts = msg.split('|||ATTACHMENT:');
        return { text: parts[0], url: parts[1] || null };
    };

    const statusInfo = getStatusInfo();
    const visibleAnn = showAllAnn ? announcements : announcements.slice(0, 1);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in pb-12">

            {/* HERO SECTION */}
            <div className="relative bg-[#111116] dark:bg-[#0a0a0c] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="relative p-6 sm:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                    <div className="space-y-6 flex-1">
                        <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/5 text-[11px] font-bold text-white/80 uppercase tracking-widest">
                            HackPortal 2024
                        </div>

                        <div>
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-2">
                                Welcome back, <span className="text-emerald-400">{user?.name}</span>
                            </h1>
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-md border border-white/10 text-sm font-mono text-white/70 mt-3">
                                <span className="uppercase text-[10px] font-bold opacity-60">TEAM ID</span>
                                {user?.display_id}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-white/60 font-medium">Research the challenges. Build the future.</p>
                            <p className="text-sm font-medium" style={{ color: statusInfo.color }}>{statusInfo.msg}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                            <Link href="/participant/problems" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-[#000000] font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                View Problem Statements
                            </Link>
                            <Link href="/participant/team" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors backdrop-blur-md border border-white/10">
                                Maintain Roster
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4-COLUMN STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-4 right-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-500">Live</span></div>
                    <Trophy className="w-5 h-5 text-muted-foreground mb-4" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Problem Selected</p>
                    {selectedProblem ? (
                        <p className="text-xl font-bold truncate pr-8" title={selectedProblem.title}>{selectedProblem.title}</p>
                    ) : (
                        <p className="text-xl font-bold text-muted-foreground">Not Yet</p>
                    )}
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-4 right-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusInfo.badge}`}>{user?.status || "Active"}</span></div>
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground mb-4" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Evt. Status</p>
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`}></span>
                        <p className="text-xl font-bold">{statusInfo.text}</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-4 right-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500">Published</span></div>
                    <FileText className="w-5 h-5 text-muted-foreground mb-4" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Problems Released</p>
                    <p className="text-3xl font-black">{stats.problems}</p>
                </div>

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-4 right-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500">Max 3</span></div>
                    <Users className="w-5 h-5 text-muted-foreground mb-4" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Roster Filled</p>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-3xl font-black">{stats.members}</p>
                        <p className="text-sm font-semibold text-muted-foreground uppercase opacity-80">/ 3 Slots</p>
                    </div>
                </div>
            </div>

            {/* LIVE ANNOUNCEMENTS CARD */}
            {announcements.length > 0 && (
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-border bg-violet-500/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-500/10 text-violet-500 rounded-xl">
                                <Megaphone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-foreground tracking-tight">Official Announcements</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">{announcements.length} broadcast{announcements.length !== 1 && 's'} from Admin Operations</p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-violet-500/10 text-violet-500 border border-violet-500/20 rounded-full animate-pulse">
                            LIVE
                        </span>
                    </div>

                    <div className="divide-y divide-border">
                        {visibleAnn.map((ann, i) => {
                            const { text, url } = parseMessage(ann.message);
                            const t = new Date(ann.created_at);
                            return (
                                <div key={ann.id} className={`p-5 sm:p-6 flex items-start gap-4 hover:bg-muted/30 transition-colors ${i === 0 ? 'bg-violet-500/5' : ''}`}>
                                    <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-12px font-black ${i === 0 ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                        {announcements.length - i}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {i === 0 && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2 block">Latest</span>
                                        )}
                                        <p className="text-sm sm:text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">{text}</p>
                                        {url && (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-violet-500 hover:text-violet-600 bg-violet-500/10 hover:bg-violet-500/15 px-3 py-1.5 rounded-lg border border-violet-500/20 transition-colors">
                                                <Paperclip className="w-3.5 h-3.5" /> Attached Document
                                            </a>
                                        )}
                                        <p className="text-[11px] text-muted-foreground mt-3 font-medium">
                                            {t.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {announcements.length > 1 && (
                        <button
                            onClick={() => setShowAllAnn(prev => !prev)}
                            className="w-full py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2 border-t border-border"
                        >
                            {showAllAnn ? (
                                <><ChevronUp className="w-4 h-4" /> Collapse Announcements</>
                            ) : (
                                <><ChevronDown className="w-4 h-4" /> View {announcements.length - 1} More Announcement{announcements.length - 1 !== 1 && 's'}</>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* ACTION ROWS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-start hover:border-accent/40 transition-colors">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Report Issues?</h3>
                        <p className="text-sm text-muted-foreground mb-6">Facing technical difficulties or selection errors? Let the admins know immediately.</p>
                    </div>
                    <button className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors text-sm border border-border">
                        Contact Operations
                    </button>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-start hover:border-accent/40 transition-colors">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Need Help?</h3>
                        <p className="text-sm text-muted-foreground mb-6">Check out the official hackathon documentation for guidelines and submission rules.</p>
                    </div>
                    <button className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors text-sm border border-border flex items-center justify-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Official Guidelines
                    </button>
                </div>
            </div>

        </div>
    );
}
