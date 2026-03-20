"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, Building2, UserCircle2, Mail, Phone, GraduationCap } from "lucide-react";

export default function TeamDetailsPage() {
    const user = useAuthStore((state) => state.user);
    const [teamData, setTeamData] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            if (!user?.id) return;

            const { data: team } = await supabase
                .from("teams")
                .select("*")
                .eq("id", user.id)
                .single();

            const { data: teamMembers } = await supabase
                .from("team_members")
                .select("*")
                .eq("team_ref_id", user.id)
                .order("member_role", { ascending: false }); // "Team Lead" > "Member x" string sorting trick

            if (team) setTeamData(team);
            if (teamMembers) {
                // Sort to ensure Team Lead is first
                const sorted = teamMembers.sort((a, b) => a.member_role === "Team Lead" ? -1 : 1);
                setMembers(sorted);
            }

            setLoading(false);
        };

        fetchTeam();
    }, [user]);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8 text-accent" />
                <h2 className="text-3xl font-bold tracking-tight">Team Profile</h2>
            </div>

            {/* College Info Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Academic Details
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">College/Institution</p>
                                <p className="font-medium">{teamData?.college_name || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Department</p>
                                    <p className="font-medium">{teamData?.department || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Year of Study</p>
                                    <p className="font-medium">{teamData?.year || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-5 border border-border/50 flex flex-col justify-center">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5 whitespace-nowrap">
                            Team Status
                        </p>
                        <p className="text-xl font-bold mb-3">{teamData?.status || "Active"}</p>
                        <p className="text-xs text-muted-foreground mb-1 whitespace-nowrap">Registered On</p>
                        <p className="text-sm font-medium">{new Date(teamData?.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Members Grid */}
            <h3 className="text-xl font-semibold mb-4 px-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Team Members
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member) => (
                    <div key={member.id} className="bg-card border border-border hover:border-accent/50 transition-colors rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                        {member.member_role === "Team Lead" && (
                            <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                Leader
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                <UserCircle2 className="w-7 h-7" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg leading-tight">{member.name}</h4>
                                <p className="text-xs text-muted-foreground font-medium">{member.member_role}</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Mail className="w-4 h-4 shrink-0" />
                                <span className="text-foreground truncate">{member.email || "No email"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Phone className="w-4 h-4 shrink-0" />
                                <span className="text-foreground">{member.phone || "No phone"}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {members.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                        No team members found.
                    </div>
                )}
            </div>
        </div>
    );
}
