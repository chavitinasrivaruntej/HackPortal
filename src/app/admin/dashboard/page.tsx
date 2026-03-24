"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, FileText, CheckCircle2, Clock, UserX, AlertTriangle, Send, Target, Paperclip, ExternalLink, MessageSquare, Trash2, ListTree, Activity, Zap } from "lucide-react";
import { useIssuesStore } from "@/store/useIssuesStore";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const issues = useIssuesStore((state) => state.issues);
    const fetchIssues = useIssuesStore((state) => state.fetchIssues);
    const currentRound = useSettingsStore((state) => state.currentRound);
    const fetchSettings = useSettingsStore((state) => state.fetchSettings);
    const updateRound = useSettingsStore((state) => state.updateRound);
    const [roundUpdating, setRoundUpdating] = useState(false);
    const [roundInput, setRoundInput] = useState("");
    const lastFetchRef = useRef(0);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);
    const totalIssues = issues.length;
    const openIssues = issues.filter(i => i.status === "Open" || i.status === "In Progress").length;
    const resolvedIssues = issues.filter(i => i.status === "Resolved" || i.status === "Closed").length;

    // UI states
    const [loading, setLoading] = useState(true);
    const [announcementMsg, setAnnouncementMsg] = useState("");
    const [announcementAttachment, setAnnouncementAttachment] = useState<File | null>(null);
    const [announcing, setAnnouncing] = useState(false);

    // Modal states
    const [selectedStat, setSelectedStat] = useState<{ title: string; filterKey: string | null; val: string | null } | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const fetchData = async () => {
        // Throttle: Don't fetch more than once every 2 seconds during the rush
        const now = Date.now();
        if (now - lastFetchRef.current < 2000) return;
        lastFetchRef.current = now;

        try {
            // Teams with problems
            const { data: teamsData } = await supabase.from('teams').select('*, problem_statements(title)');
            if (teamsData) setAllTeams(teamsData);

            // Problem Statements count
            const { count: psCount } = await supabase.from('problem_statements').select('*', { count: 'exact', head: true });

            // Past Announcements
            const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
            if (annData) setAnnouncements(annData);

            // Computing stats based on raw teams data instead of multiple queries
            const selected = teamsData?.filter(t => t.selected_problem_id) || [];
            const eliminated = teamsData?.filter(t => t.status === 'Eliminated') || [];
            const frozen = teamsData?.filter(t => t.status === 'Frozen') || [];
            const shortlisted = teamsData?.filter(t => t.status === 'Shortlisted') || [];
            const total = teamsData?.length || 0;

            setStats({
                totalTeams: total,
                totalPS: psCount || 0,
                teamsSelected: selected.length,
                pendingSelection: total - selected.length,
                eliminated: eliminated.length,
                frozen: frozen.length,
                shortlisted: shortlisted.length,
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // 1. Listen to announcements (already exists)
        const annChannel = supabase.channel('admin_announcements')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
            })
            .subscribe();

        // 2. Listen to problem selection events (TEAM SELECTIONS)
        // This affects the "Teams Selected" and "Pending Selection" stats
        const selectionChannel = supabase.channel('admin_selection_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_selections' }, () => {
                fetchData(); // Simplest way to recompute all derived stats
            })
            .subscribe();

        // 3. Listen to problem statement changes (limits, domain, etc.)
        const psChannel = supabase.channel('admin_ps_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'problem_statements' }, () => {
                fetchData();
            })
            .subscribe();

        // 4. Listen to team status changes (Shortlisted, Eliminated, etc.)
        const teamsChannel = supabase.channel('admin_teams_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, () => {
                fetchData();
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(annChannel);
            supabase.removeChannel(selectionChannel);
            supabase.removeChannel(psChannel);
            supabase.removeChannel(teamsChannel);
        };
    }, []);

    const handleSendAnnouncement = async () => {
        if (!announcementMsg.trim() && !announcementAttachment) return;
        setAnnouncing(true);

        let finalMessage = announcementMsg.trim();

        try {
            if (announcementAttachment) {
                const fileExt = announcementAttachment.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { data, error } = await supabase.storage.from('announcement-attachments').upload(`public/${fileName}`, announcementAttachment);
                
                if (data) {
                    const { data: publicUrlData } = supabase.storage.from('announcement-attachments').getPublicUrl(`public/${fileName}`);
                    finalMessage = `${finalMessage}|||ATTACHMENT:${publicUrlData.publicUrl}`;
                }
            }

            if (finalMessage) {
                await supabase.from("announcements").insert({ message: finalMessage });
            }
            
            setAnnouncementMsg("");
            setAnnouncementAttachment(null);
        } catch (err) {
            console.error("Failed to broadcast:", err);
            alert("Failed to send broadcast");
        } finally {
            setAnnouncing(false);
        }
    };

    const handleDeleteAnnouncement = async () => {
        if (!deleteConfirmId) return;
        await supabase.from("announcements").delete().eq("id", deleteConfirmId);
        setAnnouncements(prev => prev.filter(a => a.id !== deleteConfirmId));
        setDeleteConfirmId(null);
    };

    // Helper to extract message and link
    const parseMessage = (msg: string) => {
        const parts = msg.split('|||ATTACHMENT:');
        return { text: parts[0], url: parts[1] || null };
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

    // Determine which teams to show in stat modal
    let modalTeams = [];
    if (selectedStat?.filterKey === "status") {
        modalTeams = allTeams.filter(t => t.status === selectedStat.val);
    } else if (selectedStat?.filterKey === "selected") {
        modalTeams = selectedStat.val === "yes" ? allTeams.filter(t => t.selected_problem_id) : allTeams.filter(t => !t.selected_problem_id);
    } else if (selectedStat?.filterKey === "all") {
        modalTeams = allTeams;
    }

    const StatCard = ({ title, value, icon: Icon, color, filterKey, val }: any) => (
        <div
            onClick={() => setSelectedStat({ title, filterKey, val })}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:border-accent hover:shadow-md transition-all group"
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8  pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Overview Dashboard</h2>
                    <p className="text-muted-foreground mt-1">Click any statistic card to view the associated teams.</p>
                </div>
            </div>

            {/* Round Control */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Zap className="w-5 h-5" /></div>
                    <h3 className="text-xl font-bold text-foreground">Competition Round Control</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-5 ml-11">Currently showing <span className="font-bold text-emerald-500">{currentRound}</span> to all participants.</p>
                <div className="flex flex-wrap gap-2">
                    {["Round 1", "Round 2", "Round 3", "Finals", "Completed"].map((round) => (
                        <button
                            key={round}
                            onClick={async () => { setRoundUpdating(true); await updateRound(round); setRoundUpdating(false); }}
                            disabled={roundUpdating}
                            className={`px-5 py-2 rounded-xl font-semibold text-sm border transition-all ${
                                currentRound === round
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                    : "bg-background border-border hover:border-emerald-500 hover:text-emerald-500"
                            }`}
                        >
                            {roundUpdating && currentRound !== round ? round : round}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Teams" value={stats?.totalTeams} icon={Users} color="bg-blue-500/10 text-blue-500" filterKey="all" val={null} />

                {/* Problem Statements stat does not filter teams directly */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Problem Statements</p>
                        <p className="text-2xl font-bold">{stats?.totalPS}</p>
                    </div>
                </div>

                <StatCard title="Teams Selected" value={stats?.teamsSelected} icon={CheckCircle2} color="bg-green-500/10 text-green-500" filterKey="selected" val="yes" />
                <StatCard title="Pending Selection" value={stats?.pendingSelection} icon={Clock} color="bg-orange-500/10 text-orange-500" filterKey="selected" val="no" />
                <StatCard title="Shortlisted" value={stats?.shortlisted} icon={Target} color="bg-teal-500/10 text-teal-500" filterKey="status" val="Shortlisted" />
                <StatCard title="Eliminated" value={stats?.eliminated} icon={UserX} color="bg-red-500/10 text-red-500" filterKey="status" val="Eliminated" />
                <StatCard title="Frozen" value={stats?.frozen} icon={AlertTriangle} color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500" filterKey="status" val="Frozen" />
            </div>

            {/* Issue Tracking Mini-Dashboard */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4">
                <div>
                    <h3 className="text-xl font-bold tracking-tight">Participant Support Tickets</h3>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-accent transition-colors">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                        <ListTree className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Total Issues</p>
                        <p className="text-2xl font-bold">{totalIssues}</p>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-accent transition-colors">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-500">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Action Required</p>
                        <p className="text-2xl font-bold">{openIssues}</p>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-accent transition-colors">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Resolved Tickets</p>
                        <p className="text-2xl font-bold">{resolvedIssues}</p>
                    </div>
                </div>
            </div>

            {/* Broadcast Form */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Send className="w-5 h-5" /></div>
                    <h3 className="text-xl font-bold text-foreground">Broadcast Global Announcement</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Send an immediate, high-priority green banner to all participant screens universally.</p>

                <div className="flex flex-col gap-4">
                    <textarea
                        value={announcementMsg}
                        onChange={(e) => setAnnouncementMsg(e.target.value)}
                        placeholder="Type your important announcement here (e.g. 'Lunch is now being served in the main hall!')..."
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none h-24"
                    />

                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="relative flex-1 w-full border border-border rounded-lg bg-background hover:bg-muted/30 transition-colors overflow-hidden flex items-center h-[42px]">
                            <input
                                type="file"
                                onChange={(e) => setAnnouncementAttachment(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center gap-2 px-3 pointer-events-none w-full">
                                <Paperclip className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-sm font-medium text-muted-foreground truncate flex-1 text-left">
                                    {announcementAttachment ? announcementAttachment.name : "Optional: Attach File or Image (Up to 5MB)"}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleSendAnnouncement}
                            disabled={announcing || !announcementMsg.trim()}
                            className="w-full sm:w-auto px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-md shadow-emerald-500/20 disabled:opacity-70 flex items-center justify-center gap-2 shrink-0 transition-all focus:ring-4 focus:ring-emerald-500/30"
                        >
                            {announcing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Broadcast Now"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Announcement History */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><MessageSquare className="w-4 h-4" /></div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Broadcast History</h3>
                            <p className="text-xs text-muted-foreground">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''} sent</p>
                        </div>
                    </div>
                </div>
                <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
                    {announcements.length === 0 ? (
                        <div className="p-16 text-center">
                            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground text-sm font-medium">No announcements sent yet.</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Broadcasts will appear here instantly.</p>
                        </div>
                    ) : (
                        announcements.map((ann) => {
                            const { text, url } = parseMessage(ann.message);
                            const t = new Date(ann.created_at);
                            return (
                                <div key={ann.id} className="group flex gap-4 items-start p-5 hover:bg-muted/30 transition-colors">
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mt-0.5">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{text}</p>
                                        {url && (
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md transition-colors">
                                                <Paperclip className="w-3 h-3" /> View Attachment
                                            </a>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[11px] text-muted-foreground font-medium">
                                                {t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDeleteConfirmId(ann.id)}
                                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                        title="Delete announcement"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-foreground">Delete Announcement?</h4>
                                <p className="text-sm text-muted-foreground mt-1">Are you sure you want to delete this announcement? It will immediately disappear for all participants.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-5 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground rounded-xl border border-border transition-colors">Cancel</button>
                            <button onClick={handleDeleteAnnouncement} className="px-5 py-2 text-sm font-bold bg-destructive hover:bg-destructive/90 text-white rounded-xl shadow-sm transition-colors">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CLICKED STAT FILTER MODAL (Shows actual filtered teams) */}
            {selectedStat && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-4xl border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                            <div>
                                <h3 className="font-bold text-2xl flex items-center gap-3 text-foreground">{selectedStat.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">Showing {modalTeams.length} matching team(s)</p>
                            </div>
                            <button onClick={() => setSelectedStat(null)} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-0 bg-muted/5">
                            {modalTeams.length === 0 ? (
                                <div className="p-16 text-center text-muted-foreground">No teams found for this category.</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold whitespace-nowrap sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-6 py-4">Team ID</th>
                                            <th className="px-6 py-4">Team Name</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Selected Problem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {modalTeams.map((team) => (
                                            <tr key={team.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs">{team.team_id}</td>
                                                <td className="px-6 py-4 font-bold">{team.team_name}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${team.status === 'Eliminated' ? 'bg-red-500/10 text-red-500' :
                                                        team.status === 'Frozen' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
                                                            team.status === 'Shortlisted' ? 'bg-teal-500/10 text-teal-500' :
                                                                'bg-blue-500/10 text-blue-500'
                                                        }`}>
                                                        {team.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {team.problem_statements?.title || <span className="italic opacity-50">Not selected yet</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
                            <button onClick={() => setSelectedStat(null)} className="px-6 py-2.5 bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 shadow-sm transition-colors">Close View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
