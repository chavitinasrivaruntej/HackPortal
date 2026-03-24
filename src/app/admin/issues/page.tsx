"use client";

import { useState, useEffect } from "react";
import { useIssuesStore, Issue, IssueStatus } from "@/store/useIssuesStore";
import { Search, Filter, AlertCircle, Clock, CheckCircle2, XCircle, ChevronRight, X, User, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { logAdminAction } from "@/lib/logAdminAction";

export default function AdminIssuesPage() {
    const { user } = useAuthStore();
    const issues = useIssuesStore((state) => state.issues);
    const updateIssueStatus = useIssuesStore((state) => state.updateIssueStatus);
    const deleteIssue = useIssuesStore((state) => state.deleteIssue);
    const fetchIssues = useIssuesStore((state) => state.fetchIssues);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

    useEffect(() => {
        fetchIssues();

        const channel = supabase.channel('admin_issues_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
                fetchIssues();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchIssues]);


    const filteredIssues = issues.filter(issue => {
        const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              issue.teamName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              issue.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || issue.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "Open": return "bg-red-500/10 text-red-500 border border-red-500/20";
            case "In Progress": return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
            case "Resolved": return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
            case "Closed": return "bg-muted text-muted-foreground border border-border";
            default: return "bg-muted text-foreground";
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case "High": return "text-red-500 font-bold";
            case "Medium": return "text-orange-500 font-bold";
            case "Low": return "text-muted-foreground font-medium";
            default: return "text-foreground";
        }
    };

    const handleStatusUpdate = (id: string, newStatus: IssueStatus) => {
        updateIssueStatus(id, newStatus);
        if (selectedIssue && selectedIssue.id === id) {
            setSelectedIssue({ ...selectedIssue, status: newStatus });
        }
        if (user?.id) {
            const issue = issues.find(i => i.id === id);
            logAdminAction(
                `Updated issue ${id} status to "${newStatus}"${issue ? ` (${issue.teamName}: ${issue.title})` : ""}`,
                user.id
            );
        }
    };

    return (
        <div className="space-y-6  pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Issue Tracking</h1>
                <p className="text-muted-foreground mt-1">Manage, update, and resolve participant tickets.</p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-card border border-border rounded-2xl shadow-sm">
                <div className="relative w-full sm:w-80 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search by ID, Team, or Title..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent transition-colors"
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Filter className="text-muted-foreground w-4 h-4" />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 sm:w-auto px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent transition-colors appearance-none"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* Issues Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                {filteredIssues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground opacity-70">
                        <AlertCircle className="w-12 h-12 mb-4" />
                        <h3 className="text-xl font-bold text-foreground">No Issues Found</h3>
                        <p className="text-sm mt-1">No tickets match your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted uppercase text-xs font-bold text-muted-foreground tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Ticket</th>
                                    <th className="px-6 py-4">Title & Team</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Priority</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredIssues.map(issue => (
                                    <tr key={issue.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => setSelectedIssue(issue)}>
                                        <td className="px-6 py-4 font-mono font-bold">{issue.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-foreground truncate max-w-xs block mb-1">{issue.title}</div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium"><User className="w-3 h-3" /> {issue.teamName}</div>
                                        </td>
                                        <td className="px-6 py-4"><span className="bg-muted px-2.5 py-1 rounded-md text-xs font-semibold">{issue.category}</span></td>
                                        <td className="px-6 py-4"><span className={getPriorityStyles(issue.priority)}>{issue.priority.toUpperCase()}</span></td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider ${getStatusStyles(issue.status)}`}>
                                                {issue.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                className="inline-flex items-center gap-1.5 text-accent font-semibold text-[13px] hover:text-accent/80 transition-colors bg-accent/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                                                onClick={(e) => { e.stopPropagation(); setSelectedIssue(issue); }}
                                            >
                                                View <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* FULL ISSUE MODAL PANEL */}
            {selectedIssue && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-card w-full max-w-2xl border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
                        {/* Header Banner */}
                        <div className="p-6 border-b border-border bg-muted/10 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded text-muted-foreground">{selectedIssue.id}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getStatusStyles(selectedIssue.status)}`}>
                                        {selectedIssue.status}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-foreground leading-tight">{selectedIssue.title}</h2>
                            </div>
                            <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-muted/30 p-3 rounded-xl border border-border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
                                    <p className={`text-sm ${getPriorityStyles(selectedIssue.priority)}`}>{selectedIssue.priority}</p>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-xl border border-border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                                    <p className="text-sm font-semibold text-foreground truncate">{selectedIssue.category}</p>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-xl border border-border md:col-span-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Team Details</p>
                                    <p className="text-sm font-semibold text-foreground truncate">{selectedIssue.teamName} <span className="text-muted-foreground font-mono">({selectedIssue.teamId})</span></p>
                                </div>
                            </div>

                            {/* Description Block */}
                            <div>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Issue Description</h3>
                                <div className="p-4 bg-muted/20 border border-border rounded-xl text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                                    {selectedIssue.description}
                                </div>
                            </div>

                            {/* Attachment Handler */}
                            {selectedIssue.attachment_url && (
                                <div>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Attached File</h3>
                                    <a href={selectedIssue.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl hover:border-accent hover:bg-muted transition-colors w-max group cursor-pointer">
                                        <div className="w-10 h-10 bg-accent/10 flex items-center justify-center rounded-lg group-hover:bg-accent/20 transition-colors">
                                            <User className="w-5 h-5 text-accent opacity-0 hidden" />
                                            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">View Attachment</p>
                                            <p className="text-xs text-muted-foreground">Opens secure link</p>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="p-5 border-t border-border bg-muted/20 flex flex-wrap gap-3 items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground hidden sm:block">Reported at {new Date(selectedIssue.timestamp).toLocaleString()}</p>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button 
                                    onClick={() => {
                                        if (confirm("Are you sure you want to permanently delete this issue?")) {
                                            if (user?.id) logAdminAction(`Deleted issue ${selectedIssue.id}: "${selectedIssue.title}" (${selectedIssue.teamName})`, user.id);
                                            deleteIssue(selectedIssue.id);
                                            setSelectedIssue(null);
                                        }
                                    }}
                                    className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold text-sm rounded-xl transition-colors border border-red-500/20 flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                                {selectedIssue.status !== "In Progress" && (
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedIssue.id, "In Progress")}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 font-bold text-sm rounded-xl transition-colors border border-orange-500/20"
                                    >
                                        Start Working
                                    </button>
                                )}
                                {selectedIssue.status !== "Resolved" && (
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedIssue.id, "Resolved")}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md transition-all shadow-emerald-500/20"
                                    >
                                        Mark Resolved
                                    </button>
                                )}
                                {selectedIssue.status !== "Closed" && (
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedIssue.id, "Closed")}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-sm rounded-xl border border-border"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
