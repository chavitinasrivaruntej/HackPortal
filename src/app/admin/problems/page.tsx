"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Edit2, Trash2, RotateCcw, Save } from "lucide-react";

export default function AdminProblemsPage() {
    const [problems, setProblems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editId, setEditId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const defaultPayload = {
        title: "",
        domain: "",
        short_summary: "",
        full_description: "",
        constraints: "",
        expected_direction: "",
        notes: "",
        selection_limit: 4,
        serial_number: 0
    };

    const [payload, setPayload] = useState({ ...defaultPayload });

    const fetchProblems = async () => {
        const { data } = await supabase.from("problem_statements").select("*").order("serial_number", { ascending: true });
        if (data) setProblems(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProblems();

        // Subscribe to problem statement changes (counts, limits, content)
        const channel = supabase
            .channel('admin:problem_statements_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'problem_statements' }, () => {
                fetchProblems();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_selections' }, () => {
                fetchProblems();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (confirm(`CRITICAL: Delete '${title}'? This will officially remove this problem statement forever and wipe any active team selections attached to it.`)) {
            await supabase.from("team_selections").delete().eq("problem_ref_id", id);
            const { error } = await supabase.from("problem_statements").delete().eq("id", id);
            if (error) alert("Error deleting: " + error.message);
            else fetchProblems();
        }
    };

    const handleReset = async (id: string, title: string) => {
        if (confirm(`Are you absolutely sure you want to forcibly detach ALL teams currently working on '${title}'? This will reset the selection count to 0.`)) {
            await supabase.from("team_selections").delete().eq("problem_ref_id", id);
            fetchProblems();
        }
    };

    const openCreateModal = () => {
        setModalMode("create");
        setEditId(null);
        setPayload({ ...defaultPayload });
        setIsModalOpen(true);
    };

    const openEditModal = (prob: any) => {
        setModalMode("edit");
        setEditId(prob.id);
        setPayload({
            title: prob.title,
            domain: prob.domain,
            short_summary: prob.short_summary,
            full_description: prob.full_description,
            constraints: prob.constraints || "",
            expected_direction: prob.expected_direction || "",
            notes: prob.notes || "",
            selection_limit: prob.selection_limit,
            serial_number: prob.serial_number || 0
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            if (modalMode === "create") {
                const { error } = await supabase.from('problem_statements').insert({
                    ...payload,
                    selection_limit: Number(payload.selection_limit) || 4
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('problem_statements').update({
                    ...payload,
                    selection_limit: Number(payload.selection_limit) || 4
                }).eq('id', editId);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchProblems();
        } catch (err: any) {
            alert(`Action failed: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

    return (
        <div className="space-y-6  pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-1">Problem Statements</h2>
                    <p className="text-muted-foreground">Manage domains, capacities, and actively edit live hackathon challenges.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-xl hover:bg-accent/90 transition-colors shadow-md shadow-accent/20 text-sm font-semibold shrink-0"
                >
                    <Plus className="w-4 h-4" /> Create Problem
                </button>
            </div>

            <div className="grid gap-6">
                {problems.map((p) => (
                    <div key={p.id} className="bg-card border border-border shadow-sm rounded-2xl p-6 transition-all hover:border-accent/40 group">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="flex-1 w-full relative">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shrink-0">
                                        {p.domain}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-lg text-sm font-black font-mono">
                                            #{String(p.serial_number || 0).padStart(2, '0')}
                                        </span>
                                        <h3 className="text-xl font-bold truncate pr-12">{p.title}</h3>
                                    </div>
                                </div>
                                <p className="text-muted-foreground text-sm line-clamp-2 max-w-4xl">{p.short_summary}</p>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-5 flex-wrap w-full md:w-auto mt-4 md:mt-0">
                                <div className="text-center px-6 py-2 bg-muted rounded-xl border border-border shrink-0">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Selections</p>
                                    <p className="text-xl font-bold">
                                        <span className={p.selected_count >= p.selection_limit ? "text-destructive" : "text-foreground"}>
                                            {p.selected_count || 0}
                                        </span>
                                        <span className="text-muted-foreground text-sm"> / {p.selection_limit}</span>
                                    </p>
                                </div>

                                <div className="flex bg-muted/50 p-1.5 rounded-xl border border-border shrink-0 opacity-100 lg:opacity-30 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal(p)} className="p-2.5 text-foreground hover:bg-card hover:shadow-sm rounded-lg transition-all" title="Edit Problem Details">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <div className="w-[1px] bg-border my-2 mx-1"></div>
                                    <button onClick={() => handleReset(p.id, p.title)} className="p-2.5 text-orange-500 hover:bg-orange-500/10 hover:shadow-sm rounded-lg transition-all" title="Force Reset All Selections to 0">
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(p.id, p.title)} className="p-2.5 text-destructive hover:bg-destructive/10 hover:shadow-sm rounded-lg transition-all" title="Permanently Delete Statement">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {problems.length === 0 && (
                    <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-muted/20">
                        <h3 className="text-xl font-semibold mb-2 text-foreground">No problems created yet!</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">Click 'Create Problem' above to add your first hackathon challenge.</p>
                    </div>
                )}
            </div>

            {/* MASTER CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleSubmit} className="bg-card w-full max-w-3xl border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold text-xl flex items-center gap-2 text-foreground">
                                {modalMode === "create" ? <><Plus className="w-5 h-5 text-accent" /> Publish New Challenge</> : <><Edit2 className="w-5 h-5 text-accent" /> Edit Live Challenge</>}
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar bg-muted/5">
                            <div className="bg-accent/5 p-4 rounded-xl border border-accent/20 mb-2">
                                <p className="text-xs text-accent font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                                    Live Sync Enabled: Any edits saved here will instantly update on all connected participant screens globally without them needing to refresh!
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Problem Title</label>
                                    <input required type="text" value={payload.title} placeholder="Gen-AI Customer Support" onChange={e => setPayload({ ...payload, title: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent font-semibold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Domain Focus</label>
                                        <input required type="text" value={payload.domain} placeholder="FinTech" onChange={e => setPayload({ ...payload, domain: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Team Limit</label>
                                        <input required type="number" min="1" value={payload.selection_limit} onChange={e => setPayload({ ...payload, selection_limit: parseInt(e.target.value) })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Serial No.</label>
                                        <input required type="number" min="0" value={payload.serial_number} onChange={e => setPayload({ ...payload, serial_number: parseInt(e.target.value) })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Short Summary (Visible on Dashboard Card)</label>
                                <textarea required value={payload.short_summary} placeholder="A 2-sentence hook to capture participant attention." rows={2} onChange={e => setPayload({ ...payload, short_summary: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent resize-none text-sm" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Complete Description (Visible in Modal)</label>
                                <textarea required value={payload.full_description} placeholder="The massive wall of text detailing the entire scope of the hackathon problem..." rows={5} onChange={e => setPayload({ ...payload, full_description: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent resize-y text-sm leading-relaxed" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Required Constraints</label>
                                    <textarea value={payload.constraints} rows={3} placeholder="E.g., Must use React and OpenAI API..." onChange={e => setPayload({ ...payload, constraints: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent resize-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Expected Outome / Direction</label>
                                    <textarea value={payload.expected_direction} rows={3} placeholder="E.g., A fully working web prototype..." onChange={e => setPayload({ ...payload, expected_direction: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent resize-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Admin / Sponsor Notes (Optional)</label>
                                <input type="text" value={payload.notes} placeholder="Extra hints or data links..." onChange={e => setPayload({ ...payload, notes: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent text-sm" />
                            </div>

                        </div>
                        <div className="p-5 bg-card border-t border-border flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm bg-muted border border-border rounded-xl hover:bg-muted/80 font-medium transition-colors">Cancel Check</button>
                            <button type="submit" disabled={actionLoading} className="px-8 py-2.5 text-sm bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 shadow-md shadow-accent/20 transition-all flex items-center gap-2">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {modalMode === "create" ? "Publish Problem" : "Sync Edits Live"}</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
