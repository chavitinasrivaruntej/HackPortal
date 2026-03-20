"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, FileText, CheckCircle2, Clock, UserX, AlertTriangle, AlertCircle, Send, Target, Paperclip, MessageSquare, Trash2 } from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    // UI states
    const [loading, setLoading] = useState(true);
    const [announcementMsg, setAnnouncementMsg] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [announcing, setAnnouncing] = useState(false);

    // Modal states
    const [selectedStat, setSelectedStat] = useState<{ title: string; filterKey: string | null; val: string | null } | null>(null);
    const [deleteAnnId, setDeleteAnnId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchData = async () => {
        try {
            const { data: teamsData } = await supabase.from('teams').select('*, problem_statements(title)');
            if (teamsData) setAllTeams(teamsData);

            const { count: psCount } = await supabase.from('problem_statements').select('*', { count: 'exact', head: true });

            const { data: annData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
            if (annData) setAnnouncements(annData);

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

        const channel = supabase.channel('admin_announcements_db')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => [payload.new, ...prev]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleSendAnnouncement = async () => {
        if (!announcementMsg.trim()) return;
        setAnnouncing(true);

        let finalMessage = announcementMsg.trim();
        if (attachmentUrl.trim()) {
            finalMessage = `${finalMessage}|||ATTACHMENT:${attachmentUrl.trim()}`;
        }

        await supabase.from("announcements").insert({ message: finalMessage });
        setAnnouncementMsg("");
        setAttachmentUrl("");
        setAnnouncing(false);
    };

    const confirmDeleteAnnouncement = async () => {
        if (!deleteAnnId) return;
        setDeleting(true);
        const { error } = await supabase.from("announcements").delete().eq("id", deleteAnnId);
        if (!error) {
            setAnnouncements(prev => prev.filter(a => a.id !== deleteAnnId)); // Optimistic UI update
        }
        setDeleting(false);
        setDeleteAnnId(null);
    };

    const parseMessage = (msg: string) => {
        const parts = msg.split('|||ATTACHMENT:');
        return { text: parts[0], url: parts[1] || null };
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

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
            className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:border-accent hover:shadow-md transition-all group relative overflow-hidden"
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Overview Dashboard</h2>
                <p className="text-muted-foreground mt-1 text-sm">Monitor overall operations, team behaviors, and send crucial global notifications instantly.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Teams" value={stats?.totalTeams} icon={Users} color="bg-blue-500/10 text-blue-500" filterKey="all" val={null} />

                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Problem Statements</p>
                        <p className="text-2xl font-bold tracking-tight">{stats?.totalPS}</p>
                    </div>
                </div>

                <StatCard title="Teams Selected" value={stats?.teamsSelected} icon={CheckCircle2} color="bg-green-500/10 text-green-500" filterKey="selected" val="yes" />
                <StatCard title="Pending Selection" value={stats?.pendingSelection} icon={Clock} color="bg-orange-500/10 text-orange-500" filterKey="selected" val="no" />
                <StatCard title="Shortlisted" value={stats?.shortlisted} icon={Target} color="bg-teal-500/10 text-teal-500" filterKey="status" val="Shortlisted" />
                <StatCard title="Eliminated" value={stats?.eliminated} icon={UserX} color="bg-red-500/10 text-red-500" filterKey="status" val="Eliminated" />
                <StatCard title="Frozen" value={stats?.frozen} icon={AlertTriangle} color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500" filterKey="status" val="Frozen" />
            </div>

            {/* UPGRADED ANNOUNCEMENTS SECTION */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* Broadcast Form Panel */}
                <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm h-fit">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-500">
                            <Send className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground tracking-tight">Broadcast Center</h3>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Global Real-time Delivery</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="relative">
                            <textarea
                                value={announcementMsg}
                                onChange={(e) => setAnnouncementMsg(e.target.value)}
                                placeholder="Type the announcement to be pushed globally..."
                                className="w-full px-5 py-4 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none h-32 leading-relaxed"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full group">
                                <Paperclip className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
                                <input
                                    type="url"
                                    value={attachmentUrl}
                                    onChange={(e) => setAttachmentUrl(e.target.value)}
                                    placeholder="Optional Resource Link (e.g. Schedule PDF, Code Sandbox)"
                                    className="w-full pl-11 pr-4 py-3 bg-muted/20 border border-border rounded-xl text-sm focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleSendAnnouncement}
                                disabled={announcing || !announcementMsg.trim()}
                                className="w-full sm:w-auto px-10 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.25)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 shrink-0 transition-all focus:ring-4 focus:ring-violet-500/30"
                            >
                                {announcing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Broadcast"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sent Announcements History Panel with Delete Control */}
                <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col h-[500px] overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center border border-border/50">
                                <MessageSquare className="w-4 h-4 text-foreground/70" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Active History</h3>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded">
                            {announcements.length} Sent
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 bg-muted/5 custom-scrollbar">
                        {announcements.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                                <AlertCircle className="w-10 h-10 mb-3 text-muted-foreground" />
                                <p className="font-medium text-foreground text-sm">No Active Announcements</p>
                                <p className="text-xs text-muted-foreground">Broadcasted messages will appear here and can be deleted to instantly remove them from participant screens.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2 p-2">
                                {announcements.map((ann) => {
                                    const { text, url } = parseMessage(ann.message);
                                    return (
                                        <li key={ann.id} className="bg-card border border-border p-5 rounded-xl hover:shadow-md hover:border-violet-500/30 transition-all group flex flex-col sm:flex-row justify-between items-start gap-4">
                                            <div className="flex-1 pr-4">
                                                <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{text}</p>
                                                {url && (
                                                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-violet-500 hover:text-violet-600 hover:underline bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20">
                                                        <Paperclip className="w-3.5 h-3.5" /> Attached Link
                                                    </a>
                                                )}
                                                <div className="flex items-center gap-2 mt-4 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                                    <span className="w-1 h-1 rounded-full bg-border"></span>
                                                    <span>{new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>

                                            {/* Delete Action Button */}
                                            <button
                                                onClick={() => setDeleteAnnId(ann.id)}
                                                className="shrink-0 p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 border border-transparent rounded-xl transition-all shadow-sm"
                                                title="Delete Announcement Permanently"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                </div>

            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {deleteAnnId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-sm border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-foreground">Delete Announcement?</h3>
                            <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete this announcement? It will magically disappear from all participant devices globally in real-time.</p>

                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setDeleteAnnId(null)} className="py-2.5 text-sm bg-muted border border-border rounded-xl hover:bg-muted/80 font-bold transition-colors">
                                    Cancel
                                </button>
                                <button type="button" onClick={confirmDeleteAnnouncement} disabled={deleting} className="py-2.5 text-sm bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2">
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete"}
                                </button>
                            </div>
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
