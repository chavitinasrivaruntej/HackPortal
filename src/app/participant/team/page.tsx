"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, Shield, Mail, Phone, User as UserIcon } from "lucide-react";

export default function ParticipantTeamPage() {
    const user = useAuthStore((state) => state.user);
    const [teamData, setTeamData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            if (user?.id) {
                const { data, error } = await supabase
                    .from("teams")
                    .select("*, team_members(*)")
                    .eq("id", user.id)
                    .single();

                if (data && !error) {
                    // Sort members by role logic: Lead -> Member 2 -> Member 3
                    const sortedMembers = data.team_members.sort((a: any, b: any) => {
                        if (a.member_role === "Team Lead") return -1;
                        if (b.member_role === "Team Lead") return 1;
                        return a.member_role.localeCompare(b.member_role);
                    });

                    data.team_members = sortedMembers;
                    setTeamData(data);
                }
            }
            setLoading(false);
        };

        fetchTeam();
    }, [user]);

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
    }

    if (!teamData) {
        return <div className="p-12 text-center text-muted-foreground">Team data not found.</div>;
    }

    const isEliminated = teamData.status === "Eliminated" || teamData.status === "Frozen";
    const statusColor = isEliminated
        ? "bg-red-500/10 text-red-600 border-red-500/20"
        : "bg-green-500/10 text-green-600 border-green-500/20";

    return (
        <div className="space-y-8  pb-12">
            <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Team Overview</h2>
                <p className="text-muted-foreground">Comprehensive details of your team registration and member roster.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Master Team Status Card */}
                <div className={`col-span-1 lg:col-span-3 border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-colors shadow-sm ${statusColor}`}>
                    <div>
                        <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">Current Status</p>
                        <div className="flex items-center gap-3">
                            <Shield className="w-8 h-8" />
                            <h3 className="text-3xl font-black tracking-tight">{teamData.status}</h3>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">Login ID</p>
                        <p className="text-2xl font-mono font-bold tracking-tight">{teamData.team_id}</p>
                    </div>
                </div>

                {/* Team Roster List (Takes up full width now since Academic Details is removed) */}
                <div className="col-span-1 lg:col-span-3 space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold">Official Team Roster</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teamData.team_members.map((member: any, i: number) => {
                            const isLead = member.member_role === "Team Lead";
                            return (
                                <div key={member.id} className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col h-full transform transition-transform hover:-translate-y-1 hover:shadow-md">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${isLead ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border/50'}`}>
                                            {member.member_role}
                                        </div>
                                    </div>

                                    <div className="mb-6 flex-1">
                                        <h4 className="font-bold text-xl mb-1">{member.name}</h4>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-2">
                                            <UserIcon className="w-4 h-4" /> {member.gender || "Not specified"}
                                        </p>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-border/50 text-sm">
                                        {member.email && (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground">
                                                <Mail className="w-4 h-4 shrink-0 text-foreground/50" />
                                                <span className="truncate">{member.email}</span>
                                            </div>
                                        )}
                                        {member.phone && (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground">
                                                <Phone className="w-4 h-4 shrink-0 text-foreground/50" />
                                                <span>{member.phone}</span>
                                            </div>
                                        )}
                                        {!member.email && !member.phone && (
                                            <div className="text-muted-foreground italic text-xs">No contact details provided.</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* If they only have 2 members, show an empty slot to emphasize the 3 limit */}
                        {teamData.team_members.length < 3 && (
                            <div className="border-2 border-dashed border-border/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-50 h-full min-h-[220px]">
                                <UserIcon className="w-8 h-8 mb-3 text-muted-foreground/50" />
                                <h4 className="font-semibold text-muted-foreground mb-1">Slot Available</h4>
                                <p className="text-xs text-muted-foreground max-w-[150px]">This team registered with 2 members. Optional 3rd member slot is vacant.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
