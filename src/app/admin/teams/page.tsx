"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Search, Edit2, RotateCcw, AlertCircle, Plus } from "lucide-react";

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Status Edit Modal
    const [editingTeam, setEditingTeam] = useState<any>(null);
    const [newStatus, setNewStatus] = useState("");

    // New Team Modal
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newTeamPayload, setNewTeamPayload] = useState({
        team_id: "",
        password: "",
        team_name: "",
        college_name: "",
        department: "",
        year: "1st Year",
        status: "Active"
    });

    const fetchTeams = async () => {
        // Get teams joined with problem statement title
        const { data, error } = await supabase
            .from('teams')
            .select('*, problem_statements(title)')
            .order('created_at', { ascending: false });

        if (data) setTeams(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleUpdateStatus = async () => {
        if (!editingTeam) return;
        await supabase.from("teams").update({ status: newStatus }).eq("id", editingTeam.id);
        setEditingTeam(null);
        fetchTeams(); // refresh list
    };

    const handleResetSelection = async (teamId: string, teamName: string) => {
        if (confirm(`Are you sure you want to completely clear the selection for ${teamName}? This frees up their slot.`)) {
            await supabase.from("team_selections").delete().eq("team_ref_id", teamId);
            fetchTeams();
        }
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);

        const { error } = await supabase.from('teams').insert({
            team_id: newTeamPayload.team_id,
            password: newTeamPayload.password,
            team_name: newTeamPayload.team_name,
            college_name: newTeamPayload.college_name,
            department: newTeamPayload.department,
            year: newTeamPayload.year,
            status: newTeamPayload.status
        });

        setAddLoading(false);

        if (error) {
            alert("Error creating team: " + error.message);
        } else {
            setIsAddingTeam(false);
            setNewTeamPayload({ team_id: "", password: "", team_name: "", college_name: "", department: "", year: "1st Year", status: "Active" });
            fetchTeams();
        }
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
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-1">Team Management</h2>
                    <p className="text-muted-foreground">Monitor teams, edit status, and reset selections.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:border-accent"
                        />
                    </div>
                    <button
                        onClick={() => setIsAddingTeam(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-lg font-medium text-sm hover:bg-accent/90 shadow-sm shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Create Team
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold whitespace-nowrap">
                            <tr>
                                <th className="px-6 py-4">Team ID</th>
                                <th className="px-6 py-4">Team Name</th>
                                <th className="px-6 py-4">Selected Problem</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTeams.map((team) => (
                                <tr key={team.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">{team.team_id}</td>
                                    <td className="px-6 py-4 font-medium whitespace-nowrap">{team.team_name}</td>
                                    <td className="px-6 py-4">
                                        {team.problem_statements ? (
                                            <span className="text-foreground line-clamp-1 max-w-[200px]" title={team.problem_statements.title}>
                                                {team.problem_statements.title}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground italic">None Base</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(team.status)}`}>
                                            {team.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                                        {team.selected_problem_id && (
                                            <button
                                                onClick={() => handleResetSelection(team.id, team.team_name)}
                                                className="p-1.5 text-orange-500 hover:bg-orange-500/10 rounded-md transition-colors"
                                                title="Reset Problem Selection"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setEditingTeam(team); setNewStatus(team.status); }}
                                            className="p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors"
                                            title="Edit Stage Status"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTeams.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No teams found matching your search. Add a new team to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingTeam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-sm border border-border rounded-xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-border">
                            <h3 className="font-semibold text-lg">Edit Team Status</h3>
                            <p className="text-sm text-muted-foreground mt-1">Changing status for {editingTeam.team_name}</p>
                        </div>
                        <div className="p-5">
                            <label className="block text-sm font-medium mb-2">Hackathon State</label>
                            <select
                                value={newStatus}
                                onChange={e => setNewStatus(e.target.value)}
                                className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                            >
                                <option value="Active">Active</option>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Eliminated">Eliminated</option>
                                <option value="Frozen">Frozen (Locked)</option>
                            </select>

                            {newStatus === "Eliminated" && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-xs rounded-lg flex gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>They will see an elimination notice on their dashboard.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                            <button onClick={() => setEditingTeam(null)} className="px-4 py-2 text-sm bg-card border border-border rounded-lg hover:bg-muted">Cancel</button>
                            <button onClick={handleUpdateStatus} className="px-4 py-2 text-sm bg-accent text-accent-foreground font-medium rounded-lg hover:bg-accent/90 shadow-md">Update Status</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE TEAM MODAL */}
            {isAddingTeam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleCreateTeam} className="bg-card w-full max-w-lg border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-accent" /> Create New Team</h3>
                            <button type="button" onClick={() => setIsAddingTeam(false)} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Team Login ID</label>
                                    <input required type="text" value={newTeamPayload.team_id} placeholder="TEAM005" onChange={e => setNewTeamPayload({ ...newTeamPayload, team_id: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Team Password</label>
                                    <input required type="text" value={newTeamPayload.password} placeholder="SecurePass!" onChange={e => setNewTeamPayload({ ...newTeamPayload, password: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Team Name / Title</label>
                                <input required type="text" value={newTeamPayload.team_name} placeholder="Quantum Hackers" onChange={e => setNewTeamPayload({ ...newTeamPayload, team_name: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">College/Institution</label>
                                    <input type="text" value={newTeamPayload.college_name} placeholder="Tech University" onChange={e => setNewTeamPayload({ ...newTeamPayload, college_name: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Department</label>
                                    <input type="text" value={newTeamPayload.department} placeholder="Computer Science" onChange={e => setNewTeamPayload({ ...newTeamPayload, department: e.target.value })} className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent" />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 bg-muted/50 border-t border-border flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsAddingTeam(false)} className="px-5 py-2.5 text-sm bg-card border border-border rounded-xl hover:bg-muted font-medium transition-colors">Cancel</button>
                            <button type="submit" disabled={addLoading} className="px-5 py-2.5 text-sm bg-accent text-accent-foreground font-semibold rounded-xl hover:bg-accent/90 shadow-md shadow-accent/20 transition-all flex items-center gap-2">
                                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Create Team"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
}
