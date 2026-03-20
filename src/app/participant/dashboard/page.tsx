"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";

export default function ParticipantDashboard() {
    const user = useAuthStore((state) => state.user);
    const [selectedProblem, setSelectedProblem] = useState<any>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Fetch Selected Problem
            if (user?.id) {
                const { data: selectionData } = await supabase
                    .from("team_selections")
                    .select("*, problem_statements(*)")
                    .eq("team_ref_id", user.id)
                    .maybeSingle();
                if (selectionData?.problem_statements) {
                    setSelectedProblem(selectionData.problem_statements);
                }
            }
        };

        fetchDashboardData();
    }, [user]);

    const getStatusBanner = () => {
        switch (user?.status) {
            case "Shortlisted":
                return (
                    <div className="bg-green-500/10 text-green-600 border border-green-500/20 p-4 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5" />
                        <p className="font-medium">Congratulations. Your team is shortlisted for the next round.</p>
                    </div>
                );
            case "Eliminated":
                return (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5" />
                        <p className="font-medium">Your team is not shortlisted for the next round. Thank you for participating.</p>
                    </div>
                );
            case "Frozen":
                return (
                    <div className="bg-orange-500/10 text-orange-600 border border-orange-500/20 p-4 rounded-xl mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5" />
                        <p className="font-medium">Your team access is temporarily restricted by admin.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            {getStatusBanner()}

            <div>
                <h2 className="text-3xl font-bold mb-1 tracking-tight">Welcome, {user?.name}</h2>
                <p className="text-muted-foreground">Manage your hackathon journey here.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border hover:border-border/80 transition-colors rounded-2xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold mb-5 text-foreground">Team Details</h3>
                    <div className="space-y-4 text-sm flex-1">
                        <div className="flex justify-between items-center pb-3 border-b border-border/50">
                            <span className="text-muted-foreground">Team ID</span>
                            <span className="font-semibold px-2.5 py-1 bg-muted rounded-md">{user?.display_id}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <span className="font-semibold">{user?.status || "Active"}</span>
                        </div>
                    </div>
                    <Link
                        href="/participant/team"
                        className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-xl transition-colors"
                    >
                        View Full Team
                    </Link>
                </div>

                <div className="bg-card border border-border hover:border-border/80 transition-colors rounded-2xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold mb-5 text-foreground">Selected Problem Statement</h3>
                    {selectedProblem ? (
                        <div className="flex flex-col h-full">
                            <div className="flex-1">
                                <span className="inline-block px-2.5 py-1 bg-accent/10 text-accent text-xs font-semibold rounded-full mb-3">
                                    {selectedProblem.domain}
                                </span>
                                <p className="font-bold text-lg mb-2 leading-tight">{selectedProblem.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{selectedProblem.short_summary}</p>
                            </div>
                            <Link
                                href="/participant/problems"
                                className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-medium rounded-xl transition-colors shadow-md shadow-accent/20"
                            >
                                View Problem Statements <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-6">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground text-sm mb-4">No problem statement selected yet.</p>
                            <Link
                                href="/participant/problems"
                                className="flex items-center gap-2 py-2.5 px-6 bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-medium rounded-xl transition-colors shadow-md shadow-accent/20"
                            >
                                Select Now
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
