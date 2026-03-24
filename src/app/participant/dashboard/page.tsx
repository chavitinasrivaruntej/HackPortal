"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { FileText, CheckCircle2, Trophy, Users, Link as LinkIcon, Megaphone, Paperclip, X, UploadCloud, ChevronRight, Loader2, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { useIssuesStore, IssuePriority } from "@/store/useIssuesStore";
import { useSettingsStore } from "@/store/useSettingsStore";

const parseMsg = (msg: string) => {
    const parts = msg.split('|||ATTACHMENT:');
    return { text: parts[0], url: parts[1] || null };
};

export default function ParticipantDashboard() {
    const user = useAuthStore((state) => state.user);
    const [selectedProblem, setSelectedProblem] = useState<any>(null);
    const [latestAnn, setLatestAnn] = useState<any>(null);
    const [stats, setStats] = useState({ problems: 0, members: 0 });
    const [loading, setLoading] = useState(true);

    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [issueTitle, setIssueTitle] = useState("");
    const [issueCategory, setIssueCategory] = useState("Technical Bug");
    const [issueDescription, setIssueDescription] = useState("");
    const [issuePriority, setIssuePriority] = useState<IssuePriority>("Medium");
    const [issueAttachment, setIssueAttachment] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [issueSuccess, setIssueSuccess] = useState(false);
    const addIssue = useIssuesStore((state) => state.addIssue);
    const fetchIssues = useIssuesStore((state) => state.fetchIssues);
    const allIssues = useIssuesStore((state) => state.issues);
    const currentRound = useSettingsStore((state) => state.currentRound);
    const fetchSettings = useSettingsStore((state) => state.fetchSettings);
    
    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);
    const userIssues = allIssues.filter(i => i.teamId === user?.display_id);

    const handleReportIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        let attachmentUrl = "";

        try {
            if (issueAttachment) {
                const fileExt = issueAttachment.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { data, error } = await supabase.storage.from('issue-attachments').upload(`public/${fileName}`, issueAttachment);
                
                if (data) {
                    const { data: publicUrlData } = supabase.storage.from('issue-attachments').getPublicUrl(`public/${fileName}`);
                    attachmentUrl = publicUrlData.publicUrl;
                }
            }

            await addIssue({
                teamName: user?.name || "Unknown Team",
                teamId: user?.display_id || "Unknown ID",
                title: issueTitle,
                category: issueCategory,
                description: issueDescription,
                priority: issuePriority,
                attachment_url: attachmentUrl || undefined,
            });

            setIssueSuccess(true);
            setTimeout(() => {
                setIssueSuccess(false);
                setIsIssueModalOpen(false);
                setIssueTitle("");
                setIssueDescription("");
                setIssueAttachment(null);
            }, 2000);
        } catch (err) {
            console.error(err);
            alert("Failed to report issue");
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (user?.id) {
                const [
                    { data: selectionData },
                    { count: psCount },
                    { count: memberCount }
                ] = await Promise.all([
                    supabase.from("team_selections").select("*, problem_statements(*)").eq("team_ref_id", user.id).maybeSingle(),
                    supabase.from("problem_statements").select('*', { count: 'exact', head: true }),
                    supabase.from("team_members").select('*', { count: 'exact', head: true }).eq("team_ref_id", user.id)
                ]);

                if (selectionData?.problem_statements) setSelectedProblem(selectionData.problem_statements);
                setStats({ problems: psCount || 0, members: memberCount || 0 });
            }

            const { data: latestAnnouncement } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (latestAnnouncement) setLatestAnn(latestAnnouncement);
            setLoading(false);
        };

        fetchDashboardData();

        // 1. Announcements listener
        const annChannel = supabase.channel('dashboard_ann_preview')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
                setLatestAnn(payload.new);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, () => {
                supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
                    setLatestAnn(data || null);
                });
            })
            .subscribe();

        // 2. Team Selections listener (for current team)
        let selectionChannel: any = null;
        if (user?.id) {
            selectionChannel = supabase.channel(`dashboard_selection_${user.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'team_selections',
                    filter: `team_ref_id=eq.${user.id}`
                }, async (payload: any) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const { data } = await supabase.from("problem_statements").select("*").eq("id", payload.new.problem_ref_id).single();
                        if (data) setSelectedProblem(data);
                    } else if (payload.eventType === 'DELETE') {
                        setSelectedProblem(null);
                    }
                })
                .subscribe();
        }

        // 3. Problem Statements count listener
        const psChannel = supabase.channel('dashboard_ps_count')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'problem_statements' }, () => {
                supabase.from("problem_statements").select('*', { count: 'exact', head: true }).then(({ count }) => {
                    setStats(prev => ({ ...prev, problems: count || 0 }));
                });
            })
            .subscribe();

        // 4. Issues sync listener (for current participant)
        const issuesChannel = supabase.channel('dashboard_issues_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
                fetchIssues();
            })
            .subscribe();


        return () => { 
            supabase.removeChannel(annChannel);
            if (selectionChannel) supabase.removeChannel(selectionChannel);
            supabase.removeChannel(psChannel);
            supabase.removeChannel(issuesChannel);
        };
    }, [user?.id, fetchIssues]);

    const getStatusInfo = () => {
        switch (user?.status) {
            case "Shortlisted": return { text: "Shortlisted", color: "text-yellow-400", dot: "bg-yellow-400", badge: "bg-yellow-400/10 text-yellow-400", msg: "Your team has been shortlisted!" };
            case "Eliminated": return { text: "Eliminated", color: "text-red-500", dot: "bg-red-500", badge: "bg-red-500/10 text-red-500", msg: "Thank you for participating." };
            case "Frozen": return { text: "Frozen", color: "text-orange-500", dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-500", msg: "Account locked by Admin." };
            default: return { text: "Active", color: "text-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500", msg: "Competition is ongoing." };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <div className="space-y-6  pb-12">

            {/* HERO SECTION WITH 3D INTERACTION */}
            <div className="perspective-2000">
                <div className="hero-card-animate preserve-3d relative bg-[#030712] border border-emerald-500/20 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,188,125,0.05)] ring-1 ring-white/5 group/hero">
                    {/* Cyber Event Background Layer */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00bc7d08_1px,transparent_1px),linear-gradient(to_bottom,#00bc7d08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
                    
                    <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen"></div>

                    <div className="relative p-8 sm:p-12 z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 items-end">
                            
                            {/* LEFT COLUMN — Content + Status Cards */}
                            <div className="flex flex-col gap-8 content-lift">
                                {/* Badge */}
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 backdrop-blur-md rounded-full border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest shadow-[0_0_15px_rgba(0,188,125,0.1)] w-fit">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Secure Environment
                                </div>

                                {/* Heading Structure Update: Welcome + Team Name */}
                                <div className="space-y-2">
                                    <p className="text-lg sm:text-xl font-black text-emerald-500/60 uppercase tracking-[0.4em] ml-1">Welcome,</p>
                                    <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[0.85] uppercase drop-shadow-2xl whitespace-nowrap">
                                        {user?.name}
                                    </h1>
                                    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 text-sm font-mono text-emerald-100/70 shadow-inner mt-4">
                                        <span className="uppercase text-[10px] font-bold text-emerald-500 tracking-wider">TEAM ID //</span>
                                        <span className="tracking-wider">{user?.display_id}</span>
                                    </div>
                                </div>

                                {/* Status Cards — vertical stack */}
                                <div className="flex flex-col gap-4 w-full max-w-lg">
                                    {/* Current Round Card */}
                                    <div className="bg-black/30 rounded-2xl border border-emerald-500/20 backdrop-blur-sm px-5 py-4 flex items-center gap-5 group/status transition-colors hover:bg-emerald-500/5">
                                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                                            <Zap className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-emerald-500/60 text-[10px] font-mono uppercase tracking-widest mb-0.5">Current Round</p>
                                            <p className="text-emerald-400 text-base font-black uppercase tracking-wide">{currentRound}</p>
                                        </div>
                                        <span className="text-[10px] font-mono text-white/90 shrink-0 opacity-40 group-hover/status:opacity-100 transition-opacity">Admin controlled</span>
                                    </div>

                                    {/* Team Status Card */}
                                    <div className="bg-black/30 rounded-2xl border border-white/5 backdrop-blur-sm px-5 py-4 flex items-center gap-5 group/status transition-colors hover:bg-white/5">
                                        <div className="p-2 bg-white/5 rounded-xl">
                                            <Shield className="w-4 h-4 text-white/40" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-0.5">Team Status</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${statusInfo.dot}`} />
                                                <span className={`text-base font-black uppercase tracking-wide ${statusInfo.color}`}>{statusInfo.text}</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-white/90 shrink-0 max-w-[120px] text-right leading-relaxed opacity-60 group-hover/status:opacity-100 transition-opacity">{statusInfo.msg}</span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN — Action Buttons anchored bottom */}
                            <div className="flex flex-col items-end justify-end gap-3 self-end pb-0.5 content-lift">
                                <Link href="/participant/problems" className="px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1 uppercase tracking-wider text-sm flex items-center justify-center gap-2 w-full sm:w-[220px] whitespace-nowrap">
                                    Access Problems
                                </Link>
                                <Link href="/participant/team" className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all backdrop-blur-xl border border-white/10 hover:border-white/20 hover:-translate-y-1 uppercase tracking-wider text-sm w-full sm:w-[220px] text-center whitespace-nowrap flex items-center justify-center">
                                    View Roster
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LATEST ANNOUNCEMENT CARD — shows only if there is one */}
            {latestAnn && (() => {
                const { text, url } = parseMsg(latestAnn.message);
                return (
                    <div className="bg-card/40 backdrop-blur-sm border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,188,125,0.05)] flex gap-5 items-start  relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-3xl"></div>
                        <div className="shrink-0 p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl relative shadow-[inset_0_0_15px_rgba(0,188,125,0.1)]">
                            <Megaphone className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Latest Announcement</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                            </div>
                            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">{text}</p>
                            {url && (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-500 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 px-4 py-2 rounded-xl transition-all shadow-sm">
                                    <Paperclip className="w-4 h-4" /> View Associated Payload
                                </a>
                            )}
                            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
                                    Broadcasted: {new Date(latestAnn.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 4-COLUMN STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-4 right-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500">Live</span></div>
                    <Trophy className="w-5 h-5 text-muted-foreground mb-4" />
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Problem Selected</p>
                    {selectedProblem ? (
                        <p className="text-xl font-bold truncate pr-8" title={selectedProblem.title}>
                            <span className="text-accent mr-2 font-mono">#{selectedProblem.serial_number || 0}</span>
                            {selectedProblem.title}
                        </p>
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

            {/* ACTION ROWS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-start hover:border-accent/40 transition-colors">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Report Issues?</h3>
                        <p className="text-sm text-muted-foreground mb-6">Facing technical difficulties or selection errors? Let the admins know immediately.</p>
                    </div>
                    <button 
                        onClick={() => setIsIssueModalOpen(true)}
                        className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors text-sm border border-border"
                    >
                        Contact Operations
                    </button>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between items-start hover:border-accent/40 transition-colors">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Rules</h3>
                        <p className="text-sm text-muted-foreground mb-6">Check out the official hackathon documentation for guidelines and rules.</p>
                    </div>
                    <a href="/Hackathon%20Rules%20and%20Guidelines.pdf" target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors text-sm border border-border flex items-center justify-center gap-2">
                        <LinkIcon className="w-4 h-4" /> View Guidelines
                    </a>
                </div>
            </div>

            {/* ISSUE REPORTING MODAL */}
            {isIssueModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-card w-full max-w-2xl border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 sm:p-6 border-b border-border flex justify-between items-center bg-muted/10">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Report an Issue</h2>
                                <p className="text-sm text-muted-foreground mt-1">Submit technical difficulties or portal bugs to Admin Hub.</p>
                            </div>
                            <button onClick={() => setIsIssueModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                            {issueSuccess ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center animate-in zoom-in-90 duration-300">
                                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-foreground mb-2">Issue Reported</h3>
                                    <p className="text-muted-foreground">Your issue has been reported successfully.</p>
                                </div>
                            ) : (
                                <form id="issue-form" onSubmit={handleReportIssue} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase opacity-80">Team ID</label>
                                            <div className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm font-mono text-muted-foreground">{user?.display_id}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground uppercase opacity-80">Team Name</label>
                                            <div className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground truncate">{user?.name}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">Issue Title Let's change</label>
                                        <input type="text" required value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} placeholder="e.g. Unable to select problem statement" className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">Category</label>
                                            <select value={issueCategory} onChange={(e) => setIssueCategory(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none">
                                                <option>Login Issue</option>
                                                <option>Problem Statement Issue</option>
                                                <option>Dashboard Issue</option>
                                                <option>Technical Bug</option>
                                                <option>Submission Issue</option>
                                                <option>Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-foreground">Priority</label>
                                            <select value={issuePriority} onChange={(e) => setIssuePriority(e.target.value as IssuePriority)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none">
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">Issue Description</label>
                                        <textarea required value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="Explain the issue clearly..." className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent transition-colors h-28 resize-none" />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-foreground">Attachment (Screenshot or PDF)</label>
                                        <div className="relative w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer group">
                                            <input type="file" onChange={(e) => setIssueAttachment(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf" />
                                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <UploadCloud className="w-5 h-5 text-muted-foreground group-hover:text-accent" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">{issueAttachment ? issueAttachment.name : "Click to upload or drag and drop"}</p>
                                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF up to 5MB</p>
                                        </div>
                                    </div>
                                </form>
                            )}

                            {/* Recent Issues Context */}
                            {!issueSuccess && userIssues.length > 0 && (
                                <div className="mt-8 border-t border-border pt-6">
                                    <h3 className="text-sm font-bold text-foreground mb-4">Your Recent Submitted Issues</h3>
                                    <div className="space-y-3">
                                        {userIssues.slice(0, 3).map((issue) => (
                                            <div key={issue.id} className="flex items-center justify-between p-3 border border-border rounded-xl bg-card">
                                                <div className="flex flex-col min-w-0 pr-4">
                                                    <span className="text-xs font-mono text-muted-foreground font-semibold">{issue.id}</span>
                                                    <span className="text-sm font-medium truncate">{issue.title}</span>
                                                </div>
                                                <span className={`shrink-0 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${issue.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' : issue.status === 'In Progress' ? 'bg-orange-500/10 text-orange-500' : issue.status === 'Closed' ? 'bg-muted text-muted-foreground' : 'bg-red-500/10 text-red-500'}`}>
                                                    {issue.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {!issueSuccess && (
                            <div className="p-4 sm:p-5 border-t border-border bg-muted/20 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsIssueModalOpen(false)} className="px-5 py-2 text-sm font-semibold bg-transparent hover:bg-muted text-foreground border border-border rounded-xl transition-colors">Cancel</button>
                                <button type="submit" form="issue-form" disabled={isUploading} className="px-5 py-2 text-sm font-bold bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-md shadow-accent/20 transition-all flex items-center gap-2 disabled:opacity-50">
                                    {isUploading ? <><Loader2 className="w-4 h-4 animate-spin"/> Submitting...</> : <>Submit Issue <ChevronRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Inject Global Animation Styles */}
            <style jsx global>{`
                .perspective-2000 {
                    perspective: 2000px;
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
                .hero-card-animate {
                    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.6s ease-out;
                    will-change: transform;
                }
                .hero-card-animate:hover {
                    transform: rotate3d(0.5, 1, 0, 4deg) translateY(-2px);
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, #030712 50%);
                    border-color: rgba(16, 185, 129, 0.4);
                }
                .content-lift {
                    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
                    will-change: transform;
                }
                .hero-card-animate:hover .content-lift {
                    transform: translate3d(0, 0, 30px);
                }
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
