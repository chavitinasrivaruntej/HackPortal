"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Edit2, Trash2, RotateCcw } from "lucide-react";

export default function AdminProblemsPage() {
    const [problems, setProblems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Modal State
    const [isAdding, setIsAdding] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newPayload, setNewPayload] = useState({
        title: "",
        domain: "",
        short_summary: "",
        full_description: "",
        constraints: "",
        expected_direction: "",
        notes: "",
        selection_limit: 4
    });

    const fetchProblems = async () => {
        const { data } = await supabase.from("problem_statements").select("*").order("created_at", { ascending: false });
        if (data) setProblems(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProblems();
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (confirm(`Delete '${title}'? This will also remove any team selections attached to it.`)) {
            await supabase.from("team_selections").delete().eq("problem_ref_id", id);
            const { error } = await supabase.from("problem_statements").delete().eq("id", id);
            if (error) alert("Error deleting: " + error.message);
            else fetchProblems();
        }
    };

    const handleReset = async (id: string, title: string) => {
        if (confirm(`Reset ALL team selections for '${title}'? This action cannot be undone.`)) {
            await supabase.from("team_selections").delete().eq("problem_ref_id", id);
            fetchProblems();
        }
    };

    const handleCreateProblem = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);

        const { error } = await supabase.from('problem_statements').insert({
            title: newPayload.title,
            domain: newPayload.domain,
            short_summary: newPayload.short_summary,
            full_description: newPayload.full_description,
            constraints: newPayload.constraints,
            expected_direction: newPayload.expected_direction,
            notes: newPayload.notes,
            selection_limit: Number(newPayload.selection_limit) || 4
        });

        setAddLoading(false);

        if (error) {
            alert("Error creating problem: " + error.message);
        } else {
            setIsAdding(false);
            setNewPayload({ title: "", domain: "", short_summary: "", full_description: "", constraints: "", expected_direction: "", notes: "", selection_limit: 4 });
            fetchProblems();
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-1">Problem Statements</h2>
                    <p className="text-muted-foreground">Manage domains, capacities, and view details.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-xl hover:bg-accent/90 transition-colors shadow-md shadow-accent/20 text-sm font-semibold"
                >
                    <Plus className="w-4 h-4" /> Create Problem
                </button>
            </div>

            <div className="grid gap-6">
                {problems.map((p) => (
                    <div key={p.id} className="bg-card border border-border shadow-sm rounded-2xl p-6 transition-all hover:border-accent/40">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="bg-accent/10 text-accent px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase shrink-0">
                                        {p.domain}
                                    </span>
                                    <h3 className="text-xl font-bold truncate">{p.title}</h3>
                                </div>
                                <p className="text-muted-foreground text-sm line-clamp-2 max-w-4xl">{p.short_summary}</p>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap w-full md:w-auto mt-2 md:mt-0">
                                <div className="text-center px-6 py-2 bg-muted rounded-xl border border-border shrink-0">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Selections</p>
                                    <p className="text-xl font-bold">
                                        <span className={p.selected_count >= p.selection_limit ? "text-destructive" : "text-foreground"}>
                                            {p.selected_count || 0}
                                        </span>
                                        <span className="text-muted-foreground text-sm"> / {p.selection_limit}</span>
                                    </p>
                                </div>

                                <div className="flex md:flex-col gap-2 shrink-0">
                                    <button onClick={() => handleDelete(p.id, p.title)} className="p-2.5 bg-card border border-border text-destructive hover:bg-destructive/10 rounded-xl transition-colors flex justify-center items-center" title="Delete Statement">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleReset(p.id, p.title)} className="p-2.5 bg-card border border-border text-orange-500 hover:bg-orange-500/10 rounded-xl transition-colors flex justify-center items-center" title="Reset All Selections">
                                        <RotateCcw className="w-4 h-4" />
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

            {/* CREATE PROBLEM MODAL */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleCreateProblem} className="bg-card w-full max-w-2xl border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-accent" /> Create New Problem</h3>
                            <button type="button" onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Problem Title</label>
                                    <input required type="text" value={newPayload.title} placeholder="Gen-AI Customer Support" onChange={e => setNewPayload({ ...newPayload, title: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Domain</label>
                                    <input required type="text" value={newPayload.domain} placeholder="FinTech" onChange={e => setNewPayload({ ...newPayload, domain: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Short Summary (1-2 sentences)</label>
                                <textarea required value={newPayload.short_summary} placeholder="A short description." rows={2} onChange={e => setNewPayload({ ...newPayload, short_summary: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent resize-none text-sm" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Full Description</label>
                                <textarea required value={newPayload.full_description} rows={4} onChange={e => setNewPayload({ ...newPayload, full_description: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent resize-y text-sm" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Selection Limit (Max Teams)</label>
                                    <input required type="number" min="1" value={newPayload.selection_limit} onChange={e => setNewPayload({ ...newPayload, selection_limit: parseInt(e.target.value) })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Constraints (Optional)</label>
                                    <input type="text" value={newPayload.constraints} placeholder="E.g., Must use React" onChange={e => setNewPayload({ ...newPayload, constraints: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg focus:outline-none focus:border-accent" />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 bg-muted/50 border-t border-border flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-sm bg-card border border-border rounded-xl hover:bg-muted font-medium transition-colors">Cancel</button>
                            <button type="submit" disabled={addLoading} className="px-5 py-2.5 text-sm bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 shadow-md shadow-accent/20 transition-all flex items-center gap-2">
                                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Problem"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}
