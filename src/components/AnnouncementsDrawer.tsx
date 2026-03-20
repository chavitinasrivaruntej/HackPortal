"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, X, Paperclip, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnnouncementsDrawer() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // Toast Notification State
    const [toastAnn, setToastAnn] = useState<any | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const lastSeenStr = localStorage.getItem("lastSeenAnnouncements");
        const lastSeenDate = lastSeenStr ? new Date(lastSeenStr) : new Date(0);

        const fetchAnnouncements = async () => {
            const { data } = await supabase
                .from("announcements")
                .select("*")
                .order("created_at", { ascending: true });

            if (data) {
                setAnnouncements(data);
                const unread = data.filter((a: any) => new Date(a.created_at) > lastSeenDate).length;
                setUnreadCount(unread);
            }
        };
        fetchAnnouncements();

        const channel = supabase.channel('announcements_drawer')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
                const newAnn = payload.new;
                setAnnouncements(prev => [...prev, newAnn]);

                setIsOpen(currentIsOpen => {
                    if (!currentIsOpen) {
                        setUnreadCount(prev => prev + 1);
                        // Trigger Premium Toast
                        setToastAnn(newAnn);
                        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                        toastTimeoutRef.current = setTimeout(() => {
                            setToastAnn(null);
                        }, 8000); // Autoclose after 8 seconds
                    } else {
                        localStorage.setItem("lastSeenAnnouncements", new Date().toISOString());
                    }
                    return currentIsOpen;
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
                // Instantly remove from unread config/toast if active
                setToastAnn(current => current?.id === payload.old.id ? null : current);
                // Hard reset unread count based on valid IDs remaining
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (isOpen && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [isOpen, announcements]);

    const handleOpenDrawer = () => {
        setIsOpen(true);
        setUnreadCount(0);
        setToastAnn(null); // Dismiss current toast explicitly opening drawer
        localStorage.setItem("lastSeenAnnouncements", new Date().toISOString());
    };

    const parseMessage = (msg: string) => {
        const parts = msg.split('|||ATTACHMENT:');
        return { text: parts[0], url: parts[1] || null };
    };

    return (
        <>
            {/* The Notification Button in the Header */}
            <button
                onClick={handleOpenDrawer}
                className={cn(
                    "relative flex items-center justify-center gap-2.5 px-3 py-2 rounded-full font-medium transition-all group",
                    unreadCount > 0
                        ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
                        : "text-muted-foreground hover:bg-muted bg-transparent border border-border"
                )}
            >
                {unreadCount > 0 ? (
                    <>
                        <div className="relative">
                            <Bell className="w-4 h-4 animate-bounce" />
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                            </span>
                        </div>
                        <span className="text-sm">{unreadCount} New Announcement{unreadCount !== 1 && 's'}</span>
                    </>
                ) : (
                    <>
                        <Bell className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span className="text-sm hidden sm:inline-block">Announcements</span>
                    </>
                )}
            </button>

            {/* PREMIUM FLOATING TOAST NOTIFICATION */}
            {toastAnn && !isOpen && (
                <div className="fixed top-20 right-4 sm:right-8 z-[60] w-[calc(100vw-32px)] sm:w-96 bg-card border border-border rounded-2xl shadow-[0_20px_40px_-15px_rgba(139,92,246,0.2)] animate-in slide-in-from-top-12 fade-in duration-500 overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                    <div className="p-4 sm:p-5 relative">
                        <button
                            onClick={() => setToastAnn(null)}
                            className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-start gap-4 pr-6">
                            <div className="shrink-0 p-2.5 bg-violet-500/10 text-violet-500 rounded-xl">
                                <AlertCircle className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="font-bold text-base text-foreground mb-1 tracking-tight">Official Admin Broadcast</h4>
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                    {parseMessage(toastAnn.message).text}
                                </p>
                                <span className="text-[10px] uppercase font-bold text-violet-500 tracking-wider mt-2 block opacity-80">
                                    Received Just Now
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleOpenDrawer}
                            className="mt-4 w-full py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-border"
                        >
                            View Full Details
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 animate-in fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sliding Drawer Interface */}
            <div className={cn(
                "fixed inset-y-0 right-0 w-full sm:w-[450px] bg-card border-l border-border shadow-2xl z-50 flex flex-col transform transition-transform duration-500 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Drawer Header */}
                <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/10 text-violet-500 rounded-lg">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-lg tracking-tight">Broadcast History</h3>
                            <p className="text-xs text-muted-foreground">Official communication from Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Chat UI Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/5 custom-scrollbar">
                    {announcements.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <MessageSquare className="w-12 h-12 mb-4 text-muted-foreground" />
                            <p className="font-medium text-foreground">No announcements yet</p>
                            <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">When the admin broadcasts a message, it will appear here.</p>
                        </div>
                    ) : (
                        announcements.map((ann, i) => {
                            const { text, url } = parseMessage(ann.message);
                            const t = new Date(ann.created_at);

                            const prev = i > 0 ? new Date(announcements[i - 1].created_at) : null;
                            const showDate = !prev || prev.toDateString() !== t.toDateString();

                            return (
                                <div key={ann.id} className="flex flex-col space-y-4">
                                    {showDate && (
                                        <div className="flex justify-center my-2">
                                            <span className="bg-background border border-border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
                                                {t.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex self-start max-w-[95%] sm:max-w-[85%] animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1.5 ml-1">
                                                <span className="font-bold text-[11px] uppercase tracking-wider text-violet-500 bg-violet-500/10 px-2.5 py-0.5 rounded-md">Admin Ops</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            <div className="bg-card text-foreground p-3.5 sm:p-5 rounded-2xl rounded-tl-sm shadow-sm border border-border relative overflow-hidden group">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500"></div>
                                                <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">{text}</p>

                                                {url && (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-4 flex items-center gap-3 bg-muted border border-border hover:border-violet-500/40 hover:bg-violet-500/5 text-foreground px-3 py-2.5 rounded-xl transition-all group w-fit shadow-sm"
                                                    >
                                                        <div className="bg-violet-500/10 p-1.5 rounded-lg text-violet-500 group-hover:scale-110 transition-transform">
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-xs font-bold shrink-0">Attached Document</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} className="h-2 w-full" />
                </div>
            </div>
        </>
    );
}
