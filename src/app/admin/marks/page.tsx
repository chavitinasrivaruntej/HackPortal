"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { logAdminAction } from "@/lib/logAdminAction";
import {
    Loader2,
    Download,
    Save,
    Medal,
    CheckCircle2,
    AlertCircle,
    Trophy,
} from "lucide-react";

type Team = {
    id: string;
    team_id: string;
    team_name: string;
    status: string;
    ps_serial: number | null;
    ps_title: string | null;
};

type MarksMap = Record<string, { round1: string; round2: string; round3: string; dbId?: string }>;

type ToastState = { type: "success" | "error"; message: string } | null;

const ROUNDS = [
    { key: "round1", label: "Round 1", active: true },
    { key: "round2", label: "Round 2", active: false },
    { key: "round3", label: "Round 3", active: false },
];

export default function AdminMarksPage() {
    const { user } = useAuthStore();
    const [teams, setTeams] = useState<Team[]>([]);
    const [marks, setMarks] = useState<MarksMap>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeRound] = useState("round1");
    const [toast, setToast] = useState<ToastState>(null);
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: teamsData } = await supabase
            .from("teams")
            .select("id, team_id, team_name, status, problem_statements(serial_number, title)");

        const { data: marksData } = await supabase
            .from("team_marks")
            .select("*");

        if (teamsData) {
            const sorted = (teamsData as any[]).sort((a, b) => {
                const getNum = (id: string) => {
                    const match = id?.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 0;
                };
                return getNum(a.team_id) - getNum(b.team_id);
            }).map((t: any) => ({
                ...t,
                ps_serial: t.problem_statements?.serial_number ?? null,
                ps_title: t.problem_statements?.title ?? null,
            }));
            setTeams(sorted);

            const marksMap: MarksMap = {};
            sorted.forEach((t) => {
                const existing = marksData?.find((m: any) => m.team_ref_id === t.id);
                marksMap[t.id] = {
                    round1: existing?.round1_marks != null ? String(existing.round1_marks) : "",
                    round2: existing?.round2_marks != null ? String(existing.round2_marks) : "",
                    round3: existing?.round3_marks != null ? String(existing.round3_marks) : "",
                    dbId: existing?.id,
                };
            });
            setMarks(marksMap);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();

        // Real-time sync: any admin saving marks triggers a refresh for all admins
        const channel = supabase
            .channel("admin_marks_realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "team_marks" },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const updateMark = (teamId: string, round: string, value: string) => {
        // Allow empty or valid numbers 0-5 with one decimal
        if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
        const num = parseFloat(value);
        if (value !== "" && (num < 0 || num > 5)) return;

        setMarks((prev) => ({
            ...prev,
            [teamId]: { ...prev[teamId], [round]: value },
        }));
        // Remove from saved highlight when editing
        setSavedRows((prev) => {
            const next = new Set(prev);
            next.delete(teamId);
            return next;
        });
    };

    const upsertSingleMark = async (teamId: string) => {
        const entry = marks[teamId];
        if (!entry) return;

        const payload: any = {
            team_ref_id: teamId,
            round1_marks: entry.round1 !== "" ? parseFloat(entry.round1) : null,
            round2_marks: entry.round2 !== "" ? parseFloat(entry.round2) : null,
            round3_marks: entry.round3 !== "" ? parseFloat(entry.round3) : null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from("team_marks")
            .upsert(payload, { onConflict: "team_ref_id" });

        if (!error) {
            setSavedRows((prev) => new Set([...prev, teamId]));
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const payloads = teams.map((t) => {
                const entry = marks[t.id] || { round1: "", round2: "", round3: "" };
                return {
                    team_ref_id: t.id,
                    round1_marks: entry.round1 !== "" ? parseFloat(entry.round1) : null,
                    round2_marks: entry.round2 !== "" ? parseFloat(entry.round2) : null,
                    round3_marks: entry.round3 !== "" ? parseFloat(entry.round3) : null,
                    updated_at: new Date().toISOString(),
                };
            });

            const { error } = await supabase
                .from("team_marks")
                .upsert(payloads, { onConflict: "team_ref_id" });

            if (error) throw error;
            setSavedRows(new Set(teams.map((t) => t.id)));
            showToast("success", `All ${teams.length} teams' marks saved successfully!`);
            // Log this action
            if (user?.id) {
                await logAdminAction(`Saved Round 1 marks for all ${teams.length} teams`, user.id);
            }
        } catch (err: any) {
            showToast("error", `Save failed: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleExportExcel = () => {
        const csvRows: string[] = [];
        csvRows.push(["#", "Login ID", "Team Name", "PS#", "Status", "Round 1 (/5)", "Round 2 (/5)", "Round 3 (/5)", "Total"].join(","));

        teams.forEach((t, i) => {
            const m = marks[t.id] || { round1: "", round2: "", round3: "" };
            const r1 = m.round1 !== "" ? parseFloat(m.round1) : 0;
            const r2 = m.round2 !== "" ? parseFloat(m.round2) : 0;
            const r3 = m.round3 !== "" ? parseFloat(m.round3) : 0;
            const total = r1 + r2 + r3;
            const escape = (s: string) => `"${String(s || "").replace(/"/g, '""')}"`;
            csvRows.push(
                [
                    i + 1,
                    escape(t.team_id),
                    escape(t.team_name),
                    t.ps_serial != null ? t.ps_serial : "Unassigned",
                    escape(t.status),
                    m.round1 !== "" ? r1 : "N/A",
                    m.round2 !== "" ? r2 : "N/A",
                    m.round3 !== "" ? r3 : "N/A",
                    total.toFixed(1),
                ].join(",")
            );
        });

        const csv = "\uFEFF" + csvRows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Hackathon_Marks_${new Date().toISOString().split("T")[0]}.csv`;
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("success", "Excel sheet downloaded!");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Active": return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
            case "Shortlisted": return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
            case "Eliminated": return "bg-red-500/15 text-red-400 border border-red-500/20";
            case "Frozen": return "bg-orange-500/15 text-orange-400 border border-orange-500/20";
            default: return "bg-muted text-muted-foreground border border-border";
        }
    };

    const getMarkColor = (val: string) => {
        if (val === "") return "";
        const n = parseFloat(val);
        if (n >= 4) return "text-emerald-400";
        if (n >= 2.5) return "text-yellow-400";
        return "text-red-400";
    };

    const filledCount = teams.filter((t) => marks[t.id]?.round1 !== "").length;

    if (loading)
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );

    return (
        <div className="space-y-6 pb-24">
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-6 right-6 z-[500] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-top-2 transition-all duration-300 ${
                        toast.type === "success"
                            ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300 shadow-emerald-500/20"
                            : "bg-red-950/90 border-red-500/40 text-red-300 shadow-red-500/20"
                    }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-accent" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Marks Entry</h2>
                    </div>
                    <p className="text-muted-foreground ml-12">
                        Enter evaluation scores for each team across rounds.
                    </p>
                </div>

                {/* Stats pill */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-muted-foreground">Filled:</span>
                        <span className="font-bold text-accent">{filledCount}</span>
                        <span className="text-muted-foreground">/ {teams.length}</span>
                    </div>
                </div>
            </div>

            {/* Round Tabs */}
            <div className="flex gap-2 p-1 bg-muted/40 border border-border rounded-xl w-max">
                {ROUNDS.map((r) => (
                    <button
                        key={r.key}
                        disabled={!r.active}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeRound === r.key
                                ? "bg-accent text-accent-foreground shadow-md shadow-accent/20"
                                : r.active
                                ? "text-foreground hover:bg-muted/70"
                                : "text-muted-foreground/40 cursor-not-allowed"
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Medal className="w-4 h-4" />
                            {r.label}
                            {!r.active && (
                                <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-sm">
                                    SOON
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Table heading accent strip */}
                <div className="h-1 w-full bg-gradient-to-r from-accent via-emerald-400 to-accent/30" />

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-bold tracking-wider whitespace-nowrap">
                            <tr>
                                <th className="px-5 py-4 w-10">#</th>
                                <th className="px-5 py-4">Login ID</th>
                                <th className="px-5 py-4">Team Name</th>
                                <th className="px-5 py-4">Problem Statement</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4 text-center">
                                    <span className="flex items-center justify-center gap-1.5">
                                        <Medal className="w-3.5 h-3.5 text-accent" />
                                        Round 1
                                        <span className="text-accent/70 font-normal normal-case tracking-normal">
                                            (out of 5)
                                        </span>
                                    </span>
                                </th>
                                <th className="px-5 py-4 text-center text-muted-foreground/40">Round 2</th>
                                <th className="px-5 py-4 text-center text-muted-foreground/40">Round 3</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {teams.map((team, idx) => {
                                const m = marks[team.id] || { round1: "", round2: "", round3: "" };
                                const isSaved = savedRows.has(team.id);
                                return (
                                    <tr
                                        key={team.id}
                                        className={`transition-colors group ${
                                            isSaved
                                                ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                                                : "hover:bg-muted/30"
                                        }`}
                                    >
                                        {/* # */}
                                        <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
                                            {idx + 1}
                                        </td>

                                        {/* Login ID */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span className="font-mono text-xs font-bold bg-muted px-2.5 py-1 rounded-md border border-border/50 text-foreground">
                                                {team.team_id}
                                            </span>
                                        </td>

                                        {/* Team Name */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[15px] text-foreground">
                                                    {team.team_name}
                                                </span>
                                                {isSaved && (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                                )}
                                            </div>
                                        </td>

                                        {/* Problem Statement */}
                                        <td className="px-5 py-3.5 max-w-[220px]">
                                            {team.ps_serial != null ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="shrink-0 text-[11px] font-black px-2 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/30 tracking-wide">
                                                        PS#{team.ps_serial}
                                                    </span>
                                                    <span className="text-[13px] text-foreground font-medium leading-snug line-clamp-2" title={team.ps_title ?? ""}>
                                                        {team.ps_title}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-3.5 whitespace-nowrap">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getStatusColor(team.status)}`}
                                            >
                                                {team.status}
                                            </span>
                                        </td>

                                        {/* Round 1 — ACTIVE */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={5}
                                                        step={0.5}
                                                        placeholder="—"
                                                        value={m.round1}
                                                        onChange={(e) =>
                                                            updateMark(team.id, "round1", e.target.value)
                                                        }
                                                        onBlur={() => upsertSingleMark(team.id)}
                                                        className={`w-20 py-2 px-3 text-center text-base font-black rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition-all ${getMarkColor(m.round1)} ${
                                                            m.round1 !== ""
                                                                ? "border-accent/30 bg-accent/5 shadow-[0_0_10px_rgba(var(--accent-rgb),0.15)]"
                                                                : "border-border hover:border-accent/30"
                                                        }`}
                                                    />
                                                    {m.round1 !== "" && (
                                                        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-accent text-accent-foreground rounded-full px-1 leading-tight">
                                                            /5
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Mini bar */}
                                                {m.round1 !== "" && (
                                                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                parseFloat(m.round1) >= 4
                                                                    ? "bg-emerald-400"
                                                                    : parseFloat(m.round1) >= 2.5
                                                                    ? "bg-yellow-400"
                                                                    : "bg-red-400"
                                                            }`}
                                                            style={{
                                                                width: `${(parseFloat(m.round1) / 5) * 100}%`,
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Round 2 — disabled */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-center">
                                                <input
                                                    type="number"
                                                    disabled
                                                    placeholder="—"
                                                    className="w-20 py-2 px-3 text-center text-base font-black rounded-lg border border-border/30 bg-muted/20 text-muted-foreground/30 cursor-not-allowed"
                                                />
                                            </div>
                                        </td>

                                        {/* Round 3 — disabled */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-center">
                                                <input
                                                    type="number"
                                                    disabled
                                                    placeholder="—"
                                                    className="w-20 py-2 px-3 text-center text-base font-black rounded-lg border border-border/30 bg-muted/20 text-muted-foreground/30 cursor-not-allowed"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {teams.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <Trophy className="w-8 h-8 opacity-20" />
                                            <p>No teams found. Register teams first.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-4">
                {/* Save All */}
                <button
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-accent hover:bg-accent/90 text-accent-foreground border border-accent/50 rounded-xl font-black shadow-[0_0_20px_rgba(var(--accent-rgb),0.35)] hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.55)] hover:-translate-y-1 transition-all group w-full sm:w-auto uppercase tracking-wider text-sm"
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    {saving ? "Saving…" : "Save All Marks"}
                </button>

                {/* Export */}
                <button
                    onClick={handleExportExcel}
                    className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400/50 rounded-xl font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] hover:-translate-y-1 transition-all group w-full sm:w-auto uppercase tracking-wider text-sm"
                >
                    <Download className="w-5 h-5 group-hover:scale-110 transition-transform text-black" />
                    Export as Excel
                </button>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-400" /> High (4–5)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" /> Medium (2.5–3.9)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-400" /> Low (0–2.4)
                </span>
            </div>
        </div>
    );
}
