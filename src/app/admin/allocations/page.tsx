"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Users } from "lucide-react";

export default function AdminAllocationsPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch problems with their teams using the teams foreign key to selected_problem_id
            const { data: problems } = await supabase
                .from("problem_statements")
                .select("*, teams(team_id, team_name, status)")
                .order("domain", { ascending: true });

            if (problems) setData(problems);
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

    return (
        <div className="space-y-6  pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight mb-1">Allocation Status</h2>
                <p className="text-muted-foreground">Matrix view of teams assigned to problem statements.</p>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Problem Statement & Domain</th>
                                <th className="px-6 py-4 text-center">Limit</th>
                                <th className="px-6 py-4 text-center">Chosen</th>
                                <th className="px-6 py-4 text-center">Remaining</th>
                                <th className="px-6 py-4">Teams Allocated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.map((p) => {
                                const remaining = p.selection_limit - p.selected_count;
                                return (
                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-base mb-1">{p.title}</p>
                                            <span className="text-xs font-semibold px-2 py-0.5 bg-accent/10 text-accent rounded-md">{p.domain}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center font-bold text-muted-foreground">{p.selection_limit}</td>
                                        <td className="px-6 py-5 text-center font-bold text-foreground">{p.selected_count}</td>
                                        <td className="px-6 py-5 text-center font-bold">
                                            <span className={remaining <= 0 ? "text-destructive" : remaining <= 1 ? "text-orange-500" : "text-green-500"}>
                                                {remaining}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {p.teams?.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {p.teams.map((t: any) => (
                                                        <span key={t.team_id} className="px-2.5 py-1 bg-muted border border-border rounded-md text-xs font-medium flex items-center gap-1.5" title={`${t.team_id} - ${t.status}`}>
                                                            <Users className="w-3 h-3 opacity-60" /> {t.team_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground italic text-xs">No teams chosen yet</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
