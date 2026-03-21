"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, MessageSquare, AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

interface IssueToast {
    id: string;
    issue_id: string;
    title: string;
    team_name: string;
    priority: string;
    timestamp: string;
}

export function IssueNotificationListener() {
    const [toasts, setToasts] = useState<IssueToast[]>([]);

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    useEffect(() => {
        const channel = supabase
            .channel("admin_issue_notifications")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "issues" },
                (payload) => {
                    const newIssue = payload.new as any;
                    
                    // Add new toast
                    const toastId = newIssue.id;
                    const toastData: IssueToast = {
                        id: newIssue.id,
                        issue_id: newIssue.issue_id,
                        title: newIssue.title,
                        team_name: newIssue.team_name,
                        priority: newIssue.priority,
                        timestamp: newIssue.timestamp,
                    };

                    setToasts((prev) => [...prev, toastData]);

                    // Auto-dismiss after 10 seconds
                    setTimeout(() => dismissToast(toastId), 10000);

                    // Optional: Play a subtle notification sound
                    try {
                        const audio = new Audio("/notification.mp3"); // Assuming there's a notification sound
                        audio.volume = 0.5;
                        audio.play().catch(() => {}); // Ignore if browser blocks autoplay
                    } catch (e) {
                        // Ignore errors
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-[400px]">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="pointer-events-auto bg-card border border-amber-500/30 shadow-2xl shadow-amber-500/10 rounded-2xl overflow-hidden animate-in slide-in-from-right-8 fade-in duration-500"
                >
                    {/* Priority Accent Bar */}
                    <div className={`h-1.5 w-full ${
                        toast.priority === 'High' ? 'bg-red-500' : 
                        toast.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    
                    <div className="p-4 flex gap-4">
                        <div className={`shrink-0 p-2.5 rounded-xl h-fit ${
                            toast.priority === 'High' ? 'bg-red-500/10 text-red-500' : 
                            toast.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    New Ticket • {toast.issue_id}
                                </span>
                                <button
                                    onClick={() => dismissToast(toast.id)}
                                    className="text-muted-foreground hover:text-foreground shrink-0 transition-colors p-1 hover:bg-muted rounded-md"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <h4 className="text-sm font-bold text-foreground mt-1 leading-tight line-clamp-1">
                                {toast.title}
                            </h4>
                            
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                <span className="font-semibold text-foreground/80">{toast.team_name}</span>
                                <span>•</span>
                                <span>{new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                                <Link 
                                    href="/admin/issues" 
                                    onClick={() => dismissToast(toast.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-foreground text-background px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Review Issue <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                                    toast.priority === 'High' ? 'border-red-500/20 text-red-500 bg-red-500/5' : 
                                    toast.priority === 'Medium' ? 'border-amber-500/20 text-amber-500 bg-amber-500/5' : 'border-blue-500/20 text-blue-500 bg-blue-500/5'
                                }`}>
                                    {toast.priority.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
