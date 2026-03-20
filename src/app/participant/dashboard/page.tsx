"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { FileText, CheckCircle2, Trophy, Users, Link as LinkIcon, Megaphone, Paperclip, X, UploadCloud, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useIssuesStore, IssuePriority } from "@/store/useIssuesStore";

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
    const [issueSuccess, setIssueSuccess] = useState(false);
    const addIssue = useIssuesStore((state) => state.addIssue);
    const fetchIssues = useIssuesStore((state) => state.fetchIssues);
    const allIssues = useIssuesStore((state) => state.issues);
    
    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);
    const userIssues = allIssues.filter(i => i.teamId === user?.display_id);

    const handleReportIssue = (e: React.FormEvent) => {
        e.preventDefault();
        addIssue({
            teamName: user?.name || "Unknown Team",
            teamId: user?.display_id || "Unknown ID",
            title: issueTitle,
            category: issueCategory,
            description: issueDescription,
            priority: issuePriority,
        });
        setIssueSuccess(true);
        setTimeout(() => {
            setIssueSuccess(false);
            setIsIssueModalOpen(false);
            setIssueTitle("");
            setIssueDescription("");
        }, 2000);
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

        return () => { supabase.removeChannel(annChannel); };
    }, [user]);

    const getStatusInfo = () => {
        switch (user?.status) {
            case "Shortlisted": return { text: "Shortlisted", color: "text-green-500", dot: "bg-green-500", badge: "bg-green-500/10 text-green-500", msg: "Congratulations! Your team advanced." };
            case "Eliminated": return { text: "Eliminated", color: "text-destructive", dot: "bg-destructive", badge: "bg-destructive/10 text-destructive", msg: "Thank you for participating." };
            case "Frozen": return { text: "Frozen", color: "text-orange-500", dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-500", msg: "Account locked by Admin." };
            default: return { text: "Active", color: "text-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500", msg: "Competition is ongoing." };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <div className="space-y-6  pb-12">

            {/* HERO SECTION */}
            <div className="relative bg-[#030712] border border-emerald-500/20 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,188,125,0.05)] ring-1 ring-white/5">
                {/* Cyber Event Background Layer */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00bc7d08_1px,transparent_1px),linear-gradient(to_bottom,#00bc7d08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
                
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen"></div>

                <div className="relative p-8 sm:p-12 z-10">
                    <div className="flex flex-col gap-10">
                        <div className="space-y-6 w-full">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 backdrop-blur-md rounded-full border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest shadow-[0_0_15px_rgba(0,188,125,0.1)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Secure Environment
                            </div>

                            <div className="space-y-3 w-full">
                                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white/90 w-full break-words leading-tight">
                                    Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">{user?.name}</span>
                                </h1>
                                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 text-sm font-mono text-emerald-100/70 shadow-inner">
                                    <span className="uppercase text-[10px] font-bold text-emerald-500 tracking-wider">TEAM ID //</span>
                                    <span className="tracking-wider">{user?.display_id}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5 bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm inline-block w-full max-w-md">
                                <p className="text-emerald-500/70 text-xs font-mono uppercase tracking-widest">System Status</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold tracking-wide text-white">{statusInfo.msg}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-4 pt-4 shrink-0">
                            <Link href="/participant/problems" className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1 uppercase tracking-wider text-sm flex items-center gap-2">
                                Access Problems
                            </Link>
                            <Link href="/participant/team" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all backdrop-blur-xl border border-white/10 hover:border-white/20 uppercase tracking-wider text-sm">
                                View Roster
                            </Link>
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
                        <h3 className="font-bold text-lg mb-1">Need Help?</h3>
                        <p className="text-sm text-muted-foreground mb-6">Check out the official hackathon documentation for guidelines and submission rules.</p>
                    </div>
                    <button className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors text-sm border border-border flex items-center justify-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Official Guidelines
                    </button>
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
                                        <label className="text-sm font-semibold text-foreground">Attachment (Screenshot)</label>
                                        <div className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-accent hover:bg-accent/5 transition-colors cursor-pointer group">
                                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <UploadCloud className="w-5 h-5 text-muted-foreground group-hover:text-accent" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB (Visual placeholder)</p>
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
                                <button type="submit" form="issue-form" className="px-5 py-2 text-sm font-bold bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-md shadow-accent/20 transition-all flex items-center gap-2">
                                    Submit Issue
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
