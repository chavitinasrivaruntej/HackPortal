"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import {
    Loader2,
    ShieldAlert,
    Clock,
    User,
    RefreshCw,
    Search,
    Trash2,
    Filter,
} from "lucide-react";

const LOG_ADMIN_ID = "4518";

type LogEntry = {
    id: string;
    action: string;
    timestamp: string;
    admin_ref_id: string | null;
    team_ref_id: string | null;
    admins?: { admin_id: string } | null;
    teams?: { team_name: string; team_id: string } | null;
};

export default function AdminLogsPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [adminFilter, setAdminFilter] = useState("all");
    const [adminList, setAdminList] = useState<string[]>([]);

    // Access guard — only admin "4518" can view this page
    useEffect(() => {
        if (user && user.display_id !== LOG_ADMIN_ID) {
            router.replace("/admin/dashboard");
        }
    }, [user, router]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from("activity_logs")
            .select("*, admins(admin_id), teams(team_name, team_id)")
            .order("timestamp", { ascending: false })
            .limit(500);

        if (data) {
            setLogs(data as LogEntry[]);
            // Build unique admin list for filter
            const ids = [...new Set(
                data
                    .map((l: any) => l.admins?.admin_id)
                    .filter(Boolean)
            )] as string[];
            setAdminList(ids);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!user || user.display_id !== LOG_ADMIN_ID) return;
        fetchLogs();

        // Real-time updates
        const channel = supabase
            .channel("admin_logs_realtime")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchLogs, user]);

    const handleClearLogs = async () => {
        if (!confirm("Are you sure you want to clear ALL activity logs? This cannot be undone.")) return;
        await supabase.from("activity_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        fetchLogs();
    };

    const getActionColor = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes("delet") || a.includes("eliminat") || a.includes("reset")) return "text-red-400 bg-red-500/10 border-red-500/20";
        if (a.includes("creat") || a.includes("register") || a.includes("add")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        if (a.includes("mark") || a.includes("save") || a.includes("updat") || a.includes("edit")) return "text-blue-400 bg-blue-500/10 border-blue-500/20";
        if (a.includes("login")) return "text-purple-400 bg-purple-500/10 border-purple-500/20";
        if (a.includes("announcement")) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
        return "text-muted-foreground bg-muted/30 border-border";
    };

    const getActionDot = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes("delet") || a.includes("eliminat") || a.includes("reset")) return "bg-red-400";
        if (a.includes("creat") || a.includes("register") || a.includes("add")) return "bg-emerald-400";
        if (a.includes("mark") || a.includes("save") || a.includes("updat") || a.includes("edit")) return "bg-blue-400";
        if (a.includes("login")) return "bg-purple-400";
        if (a.includes("announcement")) return "bg-orange-400";
        return "bg-muted-foreground";
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: true,
        });
    };

    const filtered = logs.filter(l => {
        const matchSearch =
            l.action.toLowerCase().includes(search.toLowerCase()) ||
            (l.admins?.admin_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (l.teams?.team_name ?? "").toLowerCase().includes(search.toLowerCase());
        const matchAdmin = adminFilter === "all" || l.admins?.admin_id === adminFilter;
        return matchSearch && matchAdmin;
    });

    // Access denied screen
    if (user && user.display_id !== LOG_ADMIN_ID) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                    The Activity Log is restricted to authorized personnel only.
                </p>
            </div>
        );
    }

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
    );

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-accent" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md tracking-widest uppercase">
                            Restricted
                        </span>
                    </div>
                    <p className="text-muted-foreground ml-12">
                        Full audit trail of all admin actions on the platform.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold text-accent">{logs.length}</span>
                        <span className="text-muted-foreground">logs</span>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                        onClick={handleClearLogs}
                        className="p-2.5 bg-card border border-red-500/20 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Clear all logs"
                    >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search actions, teams, admins..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-accent"
                    />
                </div>
                <div className="relative flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                    <select
                        value={adminFilter}
                        onChange={e => setAdminFilter(e.target.value)}
                        className="py-2.5 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-accent pr-8"
                    >
                        <option value="all">All Admins</option>
                        {adminList.map(id => (
                            <option key={id} value={id}>{id}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Log Feed */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-accent via-purple-400 to-accent/30" />

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <Clock className="w-8 h-8 opacity-20" />
                        <p className="text-sm">No activity logs found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map((log) => (
                            <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group">
                                {/* Dot */}
                                <div className="mt-1.5 shrink-0">
                                    <span className={`block w-2.5 h-2.5 rounded-full ${getActionDot(log.action)}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        {/* Admin badge */}
                                        <span className="flex items-center gap-1 text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md">
                                            <User className="w-3 h-3" />
                                            {log.admins?.admin_id ?? "System"}
                                        </span>

                                        {/* Action tag */}
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>

                                        {/* Team tag */}
                                        {log.teams && (
                                            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                                                {log.teams.team_id} · {log.teams.team_name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(log.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {filtered.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                    Showing {filtered.length} of {logs.length} logs · Auto-refreshes in real-time
                </p>
            )}
        </div>
    );
}
