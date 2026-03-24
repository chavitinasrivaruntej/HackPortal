"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { logAdminAction } from "@/lib/logAdminAction";
import { Loader2, Search, Edit2, RotateCcw, AlertCircle, Plus, Trash2, Save, User as UserIcon, XCircle, Download } from "lucide-react";

export default function AdminTeamsPage() {
    const { user } = useAuthStore();
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Unified Modal State: Create and Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editTeamId, setEditTeamId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [teamToEliminate, setTeamToEliminate] = useState<{ id: string, name: string } | null>(null);

    // Form State
    const defaultTeam = { team_id: "", password: "", team_name: "", status: "Active" };
    const defaultMembers = [
        { member_role: "Team Lead", name: "", email: "", phone: "", gender: "Male" },
        { member_role: "Member 2", name: "", email: "", phone: "", gender: "Male" },
        { member_role: "Member 3", name: "", email: "", phone: "", gender: "Male" }
    ];

    const [teamData, setTeamData] = useState({ ...defaultTeam });
    const [membersData, setMembersData] = useState([...defaultMembers]);

    const fetchTeams = async () => {
        const { data } = await supabase
            .from('teams')
            .select('*, problem_statements(title)');
        if (data) {
            const sortedData = data.sort((a, b) => {
                const getNum = (id: string) => {
                    const match = id?.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 0;
                };
                return getNum(a.team_id) - getNum(b.team_id);
            });
            setTeams(sortedData);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTeams();

        const channel = supabase.channel('admin_teams_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_selections' }, () => {
                fetchTeams();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
                fetchTeams();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const openCreateModal = () => {
        setModalMode("create");
        setTeamData({ ...defaultTeam });
        setMembersData(JSON.parse(JSON.stringify(defaultMembers)));
        setEditTeamId(null);
        setIsModalOpen(true);
    };

    const openEditModal = async (team: any) => {
        setModalMode("edit");
        setEditTeamId(team.id);

        // Set basic details
        setTeamData({
            team_id: team.team_id,
            password: team.password,
            team_name: team.team_name,
            status: team.status
        });

        // Fetch members for this team
        const { data: dbMembers } = await supabase.from('team_members').select('*').eq('team_ref_id', team.id);

        // Merge DB members into our 3-slot structure
        let newMembers = JSON.parse(JSON.stringify(defaultMembers));
        if (dbMembers && dbMembers.length > 0) {
            newMembers = newMembers.map((slot: any) => {
                const found = dbMembers.find((m: any) => m.member_role === slot.member_role);
                return found ? { ...slot, name: found.name, email: found.email || "", phone: found.phone || "", gender: found.gender || "Male" } : slot;
            });
        }
        setMembersData(newMembers);
        setIsModalOpen(true);
    };

    const handleResetSelection = async (teamId: string, teamName: string) => {
        if (confirm(`Are you sure you want to completely clear the selection for ${teamName}? This frees up their slot.`)) {
            await supabase.from("team_selections").delete().eq("team_ref_id", teamId);
            fetchTeams();
        }
    };

    const handleDeleteTeam = async (teamId: string, teamName: string) => {
        if (confirm(`CRITICAL: Are you sure you want to permanently delete team ${teamName}? This wipes all their members and selections.`)) {
            await supabase.from("team_selections").delete().eq("team_ref_id", teamId);
            await supabase.from("team_members").delete().eq("team_ref_id", teamId);
            await supabase.from("activity_logs").delete().eq("team_ref_id", teamId);
            const { error } = await supabase.from("teams").delete().eq("id", teamId);
            if (error) alert(error.message);
            else {
                if (user?.id) await logAdminAction(`Deleted team: ${teamName}`, user.id);
                fetchTeams();
            }
        }
    };

    const confirmEliminate = async () => {
        if (!teamToEliminate) return;
        setActionLoading(true);
        const { error } = await supabase.from('teams').update({ status: 'Eliminated' }).eq('id', teamToEliminate.id);
        if (error) alert(error.message);
        else {
            fetchTeams();
            if (user?.id) await logAdminAction(`Eliminated team: ${teamToEliminate.name}`, user.id, teamToEliminate.id);
        }
        setActionLoading(false);
        setTeamToEliminate(null);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && teamToEliminate && !actionLoading) {
                e.preventDefault();
                confirmEliminate();
            }
            if (e.key === "Escape" && teamToEliminate) {
                setTeamToEliminate(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [teamToEliminate, actionLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!membersData[0].name.trim() || !membersData[1].name.trim()) {
            alert("Team Lead and Member 2 are strictly required!");
            return;
        }

        setActionLoading(true);
        let currentTeamId = editTeamId;

        try {
            if (modalMode === "create") {
                // Check if team_id already exists to prevent duplicate key crashes
                const { data: existing } = await supabase.from("teams").select("id").eq("team_id", teamData.team_id).maybeSingle();
                if (existing) throw new Error("A team with this Login ID already exists!");

                const { data, error } = await supabase.from('teams').insert(teamData).select("id").single();
                if (error) throw error;
                currentTeamId = data.id;
            } else {
                const { error } = await supabase.from('teams').update(teamData).eq('id', currentTeamId);
                if (error) throw error;
            }

            // Wipe old members and re-insert new ones (safest way to handle arrays)
            if (modalMode === "edit") {
                await supabase.from('team_members').delete().eq('team_ref_id', currentTeamId);
            }

            // Filter out empty members (Member 3 is optional)
            const validMembers = membersData
                .filter(m => m.name.trim() !== "")
                .map(m => ({ ...m, team_ref_id: currentTeamId }));

            if (validMembers.length > 0) {
                const { error: memberErr } = await supabase.from('team_members').insert(validMembers);
                if (memberErr) throw memberErr;
            }

            setIsModalOpen(false);
            fetchTeams();
            if (user?.id) {
                await logAdminAction(
                    modalMode === "create"
                        ? `Registered new team: ${teamData.team_name} (${teamData.team_id})`
                        : `Edited team: ${teamData.team_name} (${teamData.team_id})`,
                    user.id,
                    currentTeamId ?? undefined
                );
            }
        } catch (err: any) {
            alert(`Action failed: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadExcel = async () => {
        setActionLoading(true);
        try {
            // Fetch comprehensive data
            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select('*, problem_statements(title), team_members(*)');
                
            if (teamsError) throw teamsError;

            // Sort teamData numerically by team_id
            const sortedData = (teamsData || []).sort((a, b) => {
                const getNum = (id: string) => {
                    const match = id?.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 0;
                };
                return getNum(a.team_id) - getNum(b.team_id);
            });

            // Format data into CSV rows
            const csvRows = [];
            // Headers
            csvRows.push([
                "Login ID", "Password", "Team Name", "Status", "Problem Statement", 
                "Team Lead Name", "Team Lead Email", "Team Lead Phone", "Team Lead Gender",
                "Member 2 Name", "Member 2 Email", "Member 2 Phone", "Member 2 Gender",
                "Member 3 Name", "Member 3 Email", "Member 3 Phone", "Member 3 Gender"
            ].join(","));

            // Data Rows
            sortedData.forEach(team => {
                const members = team.team_members || [];
                const lead = members.find((m: any) => m.member_role === "Team Lead") || {};
                const mem2 = members.find((m: any) => m.member_role === "Member 2") || {};
                const mem3 = members.find((m: any) => m.member_role === "Member 3") || {};

                const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

                const row = [
                    escapeCsv(team.team_id),
                    escapeCsv(team.password),
                    escapeCsv(team.team_name),
                    escapeCsv(team.status),
                    escapeCsv(team?.problem_statements?.title || "Unassigned"),
                    escapeCsv(lead.name), escapeCsv(lead.email), escapeCsv(lead.phone), escapeCsv(lead.gender),
                    escapeCsv(mem2.name), escapeCsv(mem2.email), escapeCsv(mem2.phone), escapeCsv(mem2.gender),
                    escapeCsv(mem3.name), escapeCsv(mem3.email), escapeCsv(mem3.phone), escapeCsv(mem3.gender),
                ];
                csvRows.push(row.join(","));
            });

            const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel UTF-8
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `CTF_Teams_Export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err: any) {
            alert(`Download failed: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const updateMember = (index: number, field: string, value: string) => {
        const newM = [...membersData];
        newM[index] = { ...newM[index], [field]: value };
        setMembersData(newM);
    };

    const filteredTeams = teams.filter(t =>
        t.team_name.toLowerCase().includes(search.toLowerCase()) ||
        t.team_id.toLowerCase().includes(search.toLowerCase()) ||
        t.status.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Active": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
            case "Shortlisted": return "bg-green-500/10 text-green-600 dark:text-green-400";
            case "Eliminated": return "bg-red-500/10 text-red-600 dark:text-red-400";
            case "Frozen": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
            default: return "bg-muted text-muted-foreground";
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;

    return (
        <div className="space-y-6  pb-24">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-1">Team Management</h2>
                    <p className="text-muted-foreground">Comprehensive control over teams, members, credentials, and hacking status.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search teams..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-accent shadow-sm"
                        />
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium text-sm hover:bg-accent/90 shadow-sm shrink-0 transition-colors focus:ring-2 focus:ring-accent/50 focus:ring-offset-2"
                    >
                        <Plus className="w-4 h-4" /> Create Team
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mix-blend-normal">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/70 text-muted-foreground uppercase text-xs font-bold tracking-wider whitespace-nowrap">
                            <tr>
                                <th className="px-5 py-4">Credentials</th>
                                <th className="px-5 py-4">Team Name</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4 max-w-xs">Selected Problem</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTeams.map((team) => (
                                <tr key={team.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded w-max border border-border/50">{team.team_id}</span>
                                            <span className="text-[11px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Pass: <span className="font-mono">{team.password}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="font-bold text-[15px]">{team.team_name}</div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${getStatusColor(team.status)}`}>
                                            {team.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 max-w-xs">
                                        {team.problem_statements ? (
                                            <span className="text-foreground line-clamp-2 leading-snug font-medium text-[13px]" title={team.problem_statements.title}>
                                                {team.problem_statements.title}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground italic text-xs">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(team)} className="p-2 border border-border bg-background hover:bg-accent/10 hover:text-accent hover:border-accent/30 rounded-lg transition-all" title="Edit Full Team Details">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { if (team.status !== "Eliminated") setTeamToEliminate({ id: team.id, name: team.team_name }); }} className={`p-2 border border-border transition-all rounded-lg ${team.status === "Eliminated" ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "bg-background hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"}`} title={team.status === "Eliminated" ? "Already Eliminated" : "Instantly Eliminate Team"} disabled={team.status === "Eliminated"}>
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                        {team.selected_problem_id && (
                                            <button onClick={() => handleResetSelection(team.id, team.team_name)} className="p-2 border border-border bg-background hover:bg-orange-500/10 hover:text-orange-600 hover:border-orange-500/30 rounded-lg transition-all" title="Force Reset Problem Selection">
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteTeam(team.id, team.team_name)} className="p-2 border border-border bg-background hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 rounded-lg transition-all" title="Permanently Delete Team">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTeams.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <UserIcon className="w-8 h-8 opacity-20" />
                                            <p>No teams found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-center mt-6">
                <button
                    onClick={handleDownloadExcel}
                    disabled={actionLoading}
                    className="flex justify-center items-center gap-2.5 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-400/50 rounded-xl font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] hover:-translate-y-1 transition-all group w-full sm:w-auto uppercase tracking-wider text-sm"
                >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 group-hover:scale-110 transition-transform text-black" />}
                    Download All Teams as Excel
                </button>
            </div>

            {/* MASTER CREATE / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleSubmit} className="bg-card w-full max-w-4xl border border-border rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">

                        {/* Header */}
                        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-muted/20">
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2 text-foreground">
                                    {modalMode === "create" ? <><Plus className="w-5 h-5 text-accent" /> Register New Team</> : <><Edit2 className="w-5 h-5 text-accent" /> Edit Team: {teamData.team_name}</>}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">Configure credentials, demographics, and roster.</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-background hover:bg-destructive/10 hover:text-destructive rounded-full border border-transparent hover:border-destructive/20 transition-all focus:outline-none">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-8 flex-1 bg-muted/5 custom-scrollbar">

                            {/* SECTION 1: Core Controls */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <div className="w-6 h-6 rounded bg-accent/20 text-accent flex items-center justify-center font-bold text-xs">1</div>
                                    <h4 className="font-semibold uppercase tracking-wider text-sm text-foreground">Team Identity & Access</h4>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Login ID</label>
                                        <input required type="text" value={teamData.team_id} placeholder="e.g. T-999" onChange={e => setTeamData({ ...teamData, team_id: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Password</label>
                                        <input required type="text" value={teamData.password} placeholder="SecretPass123" onChange={e => setTeamData({ ...teamData, password: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Hackathon Status</label>
                                        <select value={teamData.status} onChange={e => setTeamData({ ...teamData, status: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent font-semibold">
                                            <option value="Active">🟢 Active</option>
                                            <option value="Shortlisted">🌟 Shortlisted</option>
                                            <option value="Frozen">⏸️ Frozen (Locked)</option>
                                            <option value="Eliminated">❌ Eliminated</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Public Team Name</label>
                                        <input required type="text" value={teamData.team_name} placeholder="Neural Hackers" onChange={e => setTeamData({ ...teamData, team_name: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent" />
                                    </div>

                                </div>


                            </div>

                            {/* SECTION 2: Members */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <div className="w-6 h-6 rounded bg-accent/20 text-accent flex items-center justify-center font-bold text-xs">2</div>
                                    <h4 className="font-semibold uppercase tracking-wider text-sm text-foreground">Team Roster (Max 3)</h4>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {membersData.map((member, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${i <= 1 ? 'border-border bg-card shadow-sm' : 'border-dashed border-border/60 bg-transparent'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h5 className="font-bold text-sm tracking-tight">{member.member_role}</h5>
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm bg-muted text-muted-foreground">{i <= 1 ? "Required" : "Optional"}</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                                                    <input required={i <= 1} type="text" value={member.name} placeholder={i === 0 ? "Jane Doe" : ""} onChange={e => updateMember(i, 'name', e.target.value)} className="w-full p-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-accent" />
                                                </div>
                                                {i === 0 && (
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Email</label>
                                                        <input type="email" value={member.email} placeholder="jane@example.com" onChange={e => updateMember(i, 'email', e.target.value)} className="w-full p-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-accent" />
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Phone</label>
                                                        <input type="text" value={member.phone} placeholder="555-0192" onChange={e => updateMember(i, 'phone', e.target.value)} className="w-full p-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-accent" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                                                        <select value={member.gender} onChange={e => updateMember(i, 'gender', e.target.value)} className="w-full p-2 bg-background border border-border rounded-md text-xs focus:ring-1 focus:ring-accent">
                                                            <option>Male</option>
                                                            <option>Female</option>
                                                            <option>Other</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-5 bg-card border-t border-border flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm bg-muted border border-border rounded-xl hover:bg-muted/80 font-medium transition-colors">Cancel</button>
                            <button type="submit" disabled={actionLoading} className="px-8 py-2.5 text-sm bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 shadow-md shadow-accent/20 transition-all flex items-center gap-2">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {modalMode === "create" ? "Register Team" : "Save Changes"}</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* QUICK ELIMINATE CONFIRMATION MODAL */}
            {teamToEliminate && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in" 
                    onClick={() => setTeamToEliminate(null)}
                >
                    <div className="bg-card w-full max-w-sm border-2 border-red-500/20 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)] p-6 relative animate-in zoom-in-95 flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Eliminate Team?</h3>
                        <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
                            Are you absolutely sure you want to eliminate <span className="font-bold text-foreground block mt-1 text-base">{teamToEliminate.name}</span>
                        </p>
                        
                        <div className="bg-muted px-4 py-2 rounded-lg mb-6 flex items-center gap-2 border border-border">
                            <span className="text-xs font-mono text-muted-foreground">Press</span>
                            <kbd className="px-2 py-0.5 bg-background border border-border rounded font-bold text-xs shadow-sm">Enter</kbd>
                            <span className="text-xs font-mono text-muted-foreground">to confirm</span>
                        </div>
                        
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setTeamToEliminate(null)} className="flex-1 py-2.5 bg-muted text-foreground font-semibold rounded-xl hover:bg-muted/80 transition-colors text-sm border border-border">Cancel</button>
                            <button onClick={confirmEliminate} disabled={actionLoading} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 flex flex-row items-center justify-center gap-2 text-sm">
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin text-white/70" /> : "Eliminate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
