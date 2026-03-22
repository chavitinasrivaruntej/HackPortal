"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, UserMinus, RotateCcw, ShieldCheck } from "lucide-react";

export default function AdminEliminationsPage() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEliminatedTeams = async () => {
        // Only fetch eliminated and frozen teams
        const { data } = await supabase
            .from('teams')
            .select('*')
            .in('status', ['Eliminated', 'Frozen'])
            .order('updated_at', { ascending: false, nullsFirst: false });

        if (data) setTeams(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchEliminatedTeams();
    }, []);

    const restoreTeam = async (id: string, name: string) => {
        if (confirm(`Restore ${name} back to Active status?`)) {
            await supabase.from("teams").update({ status: "Active" }).eq("id", id);
            fetchEliminatedTeams();
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

    return (
        <div className="space-y-6  pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-1 text-destructive flex items-center gap-3">
                        <UserMinus className="w-8 h-8" /> Eliminations & Suspensions
                    </h2>
                    <p className="text-muted-foreground">Manage teams that have been eliminated or have frozen accounts.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => (
                    <div key={team.id} className="bg-card border border-destructive/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:border-destructive/40 transition-colors">
                        <div className={`absolute top-0 right-0 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider ${team.status === 'Eliminated' ? 'bg-destructive text-destructive-foreground' : 'bg-orange-500 text-white'}`}>
                            {team.status}
                        </div>

                        <h3 className="text-xl font-bold mb-1">{team.team_name}</h3>
                        <p className="text-muted-foreground text-sm font-mono tracking-wide mb-4 whitespace-nowrap overflow-hidden text-ellipsis mr-16 border-b border-border/50 pb-2">
                            ID: {team.team_id}
                        </p>

                        <div className="space-y-2 mb-6 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Dept</span>
                                <span className="font-medium">{team.department || "N/A"}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => restoreTeam(team.id, team.team_name)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-background border border-border hover:bg-muted text-foreground text-sm font-medium rounded-xl transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" /> Restore to Active
                        </button>
                    </div>
                ))}

                {teams.length === 0 && (
                    <div className="col-span-full py-20 px-6 text-center border border-dashed border-border rounded-2xl bg-muted/20">
                        <ShieldCheck className="w-12 h-12 text-accent/50 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2 text-foreground">All Clear</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">There are no eliminated or frozen teams right now. Every team is active or shortlisted.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
