"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertTriangle, CheckCircle2, LockIcon } from "lucide-react";
// We are using a custom modal below, no need for shadcn dialog import

export default function ProblemStatementsPage() {
    const user = useAuthStore((state) => state.user);
    const [problems, setProblems] = useState<any[]>([]);
    const [hasSelection, setHasSelection] = useState(false);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedProblem, setSelectedProblem] = useState<any | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchProblems = async () => {
        // Check team selection
        if (user?.id) {
            const { data: selection } = await supabase
                .from("team_selections")
                .select("*")
                .eq("team_ref_id", user.id)
                .single();
            if (selection) setHasSelection(true);
        }

        // Fetch all problems
        const { data } = await supabase
            .from("problem_statements")
            .select("*")
            .order("serial_number", { ascending: true });

        if (data) {
            setProblems(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProblems();

        // 1. Subscribe to problem statement changes (counts, limits, content)
        const probSub = supabase
            .channel('realtime:problem_statements')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'problem_statements' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    setProblems(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
                } else {
                    // For INSERT/DELETE, it's safer to refetch to maintain ordering
                    fetchProblems();
                }
            })
            .subscribe();

        // 2. Subscribe to team selections for the CURRENT team
        // This ensures if an admin resets the selection, the UI unlocks instantly
        let selectionSub: any = null;
        if (user?.id) {
            selectionSub = supabase
                .channel(`realtime:team_selection:${user.id}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'team_selections',
                    filter: `team_ref_id=eq.${user.id}`
                }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setHasSelection(true);
                        fetchProblems();
                    } else if (payload.eventType === 'DELETE') {
                        setHasSelection(false);
                        fetchProblems();
                    }
                })
                .subscribe();
        }

        return () => {
            supabase.removeChannel(probSub);
            if (selectionSub) supabase.removeChannel(selectionSub);
        };
    }, [user?.id]);

    const handleSelect = async () => {
        if (!selectedProblem || !user?.id) return;
        setActionLoading(true);
        setErrorMsg("");

        try {
            // 1. Double check selection
            const { data: existing } = await supabase.from('team_selections').select('*').eq('team_ref_id', user.id).single();
            if (existing) {
                setErrorMsg("Your team has already selected a problem statement.");
                setHasSelection(true);
                setActionLoading(false);
                return;
            }

            // 2. Double check capacity
            const { data: pData } = await supabase.from('problem_statements').select('selected_count, selection_limit').eq('id', selectedProblem.id).single();
            if (pData && pData.selected_count >= pData.selection_limit) {
                setErrorMsg("This problem statement is now full. Please choose another one.");
                setActionLoading(false);
                fetchProblems();
                return;
            }

            // 3. Insert Selection (Triggers handle counters)
            const { error } = await supabase.from('team_selections').insert({
                team_ref_id: user.id,
                problem_ref_id: selectedProblem.id
            });

            if (error) throw error;

            setHasSelection(true);
            setConfirming(false);
            setSelectedProblem(null);
            fetchProblems(); // refresh counts

        } catch (err: any) {
            setErrorMsg(err.message || "Failed to confirm selection.");
        } finally {
            setActionLoading(false);
        }
    };

    const getProgressColor = (count: number, limit: number) => {
        if (count >= limit) return "bg-destructive";
        if (count === limit - 1) return "bg-orange-500";
        return "bg-green-500";
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
    }

    return (
        <div className="space-y-6  pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Problem Statements</h2>
                <p className="text-muted-foreground">Select a challenge for your team. Selection is final and locked once confirmed.</p>
            </div>

            {hasSelection && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <p className="font-medium text-sm">Your team has successfully confirmed a problem statement. You cannot change your selection.</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {problems.map((prob) => {
                    const isFull = prob.selected_count >= prob.selection_limit;

                    return (
                        <div key={prob.id} className={`bg-card border rounded-2xl p-6 transition-all ${isFull ? 'border-border/50 opacity-70' : 'border-border shadow-sm hover:border-accent/40'}`}>
                            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">

                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-sm font-black font-mono shadow-sm">
                                            #{String(prob.serial_number || 0).padStart(2, '0')}
                                        </span>
                                        <h3 className="text-xl font-bold">{prob.title}</h3>
                                    </div>
                                    <p className="text-muted-foreground text-sm max-w-3xl leading-relaxed line-clamp-3">
                                        {prob.full_description}
                                    </p>
                                </div>

                                <div className="w-full lg:w-48 shrink-0 flex flex-col items-center lg:items-end gap-3">
                                    <div className="w-full text-right">
                                        <p className="text-sm font-semibold mb-1.5 flex justify-between lg:justify-end gap-2">
                                            <span>Slots:</span> <span>{prob.selected_count} / {prob.selection_limit}</span>
                                        </p>
                                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(prob.selected_count, prob.selection_limit)}`}
                                                style={{ width: `${Math.min((prob.selected_count / prob.selection_limit) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedProblem(prob)}
                                        className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-lg transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
                                    >
                                        Choose Problem
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Custom Modal overlay since we didn't install shadcn dialog yet */}
            {selectedProblem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-2xl border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-border">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="bg-emerald-500 text-white px-3 py-1 rounded-xl text-lg font-black font-mono shadow-md">
                                            #{String(selectedProblem.serial_number || 0).padStart(2, '0')}
                                        </span>
                                        <h2 className="text-2xl font-bold">{selectedProblem.title}</h2>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedProblem(null); setConfirming(false); setErrorMsg(""); }} className="p-2 bg-muted text-muted-foreground rounded-full hover:bg-accent hover:text-white transition-colors">
                                    &times;
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div>
                                <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{selectedProblem.full_description}</p>
                            </div>

                            {confirming && (
                                <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-3">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-orange-600 dark:text-orange-400">Are you absolutely sure?</p>
                                            <p className="text-sm text-orange-600/80 dark:text-orange-400/80 mt-1">
                                                You are about to lock in <strong>{selectedProblem.title}</strong>. This selection cannot be reversed or changed by your team unless an admin explicitly resets it.
                                            </p>
                                        </div>
                                    </div>
                                    {errorMsg && (
                                        <p className="text-sm font-semibold text-destructive mt-2">{errorMsg}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border bg-muted/30 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => { setSelectedProblem(null); setConfirming(false); setErrorMsg(""); }}
                                className="px-5 py-2.5 rounded-xl font-medium text-sm text-foreground bg-card border border-border hover:bg-muted transition-colors"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>

                            {selectedProblem.selected_count >= selectedProblem.selection_limit ? (
                                <button disabled className="px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 bg-muted text-muted-foreground cursor-not-allowed border border-border">
                                    <LockIcon className="w-4 h-4" /> Selection Closed (Full)
                                </button>
                            ) : hasSelection ? (
                                <button disabled className="px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 bg-muted text-muted-foreground cursor-not-allowed border border-border">
                                    <LockIcon className="w-4 h-4" /> Already Selected
                                </button>
                            ) : confirming ? (
                                <button
                                    onClick={handleSelect}
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Final Selection"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setConfirming(true)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20"
                                >
                                    Choose This Problem
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
