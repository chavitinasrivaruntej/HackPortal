"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, FileText, CheckCircle2, Clock, UserX, AlertTriangle, Send, Target } from "lucide-react";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [announcementMsg, setAnnouncementMsg] = useState("");
    const [announcing, setAnnouncing] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            const getCount = async (table: string, filters?: { col: string; val: string }) => {
                let q = supabase.from(table).select('*', { count: 'exact', head: true });
                if (filters) q = q.eq(filters.col, filters.val);
                const { count } = await q;
                return count || 0;
            };

            try {
                const [
                    totalTeams,
                    totalPS,
                    teamsSelected,
                    eliminated,
                    frozen,
                    shortlisted,
                ] = await Promise.all([
                    getCount('teams'),
                    getCount('problem_statements'),
                    getCount('team_selections'),
                    getCount('teams', { col: 'status', val: 'Eliminated' }),
                    getCount('teams', { col: 'status', val: 'Frozen' }),
                    getCount('teams', { col: 'status', val: 'Shortlisted' }),
                ]);

                setStats({
                    totalTeams,
                    totalPS,
                    teamsSelected,
                    pendingSelection: totalTeams - teamsSelected,
                    eliminated,
                    frozen,
                    shortlisted,
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleSendAnnouncement = async () => {
        if (!announcementMsg.trim()) return;
        setAnnouncing(true);
        await supabase.from("announcements").insert({ message: announcementMsg });
        setAnnouncementMsg("");
        setAnnouncing(false);
        alert("Announcement broadcasted successfully to all teams.");
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
    }

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                <h2 className="text-3xl font-bold tracking-tight">Overview Dashboard</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Teams" value={stats?.totalTeams} icon={Users} color="bg-blue-500/10 text-blue-500" />
                <StatCard title="Problem Statements" value={stats?.totalPS} icon={FileText} color="bg-purple-500/10 text-purple-500" />
                <StatCard title="Teams Selected" value={stats?.teamsSelected} icon={CheckCircle2} color="bg-green-500/10 text-green-500" />
                <StatCard title="Pending Selection" value={stats?.pendingSelection} icon={Clock} color="bg-orange-500/10 text-orange-500" />
                <StatCard title="Shortlisted" value={stats?.shortlisted} icon={Target} color="bg-teal-500/10 text-teal-500" />
                <StatCard title="Eliminated" value={stats?.eliminated} icon={UserX} color="bg-red-500/10 text-red-500" />
                <StatCard title="Frozen" value={stats?.frozen} icon={AlertTriangle} color="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500" />
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mt-8">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Global Announcement Broadcast</h3>
                <p className="text-sm text-muted-foreground mb-4">Send an alert directly to all participant dashboard screens via Realtime.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={announcementMsg}
                        onChange={(e) => setAnnouncementMsg(e.target.value)}
                        placeholder="Type your important announcement here..."
                        className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                    />
                    <button
                        onClick={handleSendAnnouncement}
                        disabled={announcing || !announcementMsg.trim()}
                        className="px-6 py-2.5 bg-accent text-accent-foreground font-medium text-sm rounded-lg hover:bg-accent/90 transition-colors shadow-md disabled:opacity-70 flex items-center justify-center gap-2 shrink-0"
                    >
                        {announcing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Broadcast</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
