"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, X, Paperclip, MessageSquare, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastAnn {
    id: string;
    message: string;
    created_at: string;
}

export function AnnouncementsDrawer() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [toasts, setToasts] = useState<ToastAnn[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const isOpenRef = useRef(false);

    // Keep ref in sync so realtime callbacks can read it
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    const dismissToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

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

        const channel = supabase.channel('announcements_drawer_v2')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
                const newAnn = payload.new as any;
                setAnnouncements(prev => [...prev, newAnn]);

                if (!isOpenRef.current) {
                    setUnreadCount(prev => prev + 1);
                    // Show a toast popup only if drawer is closed
                    setToasts(prev => [...prev, { id: newAnn.id, message: newAnn.message, created_at: newAnn.created_at }]);
                    // Auto-dismiss after 7 seconds
                    setTimeout(() => dismissToast(newAnn.id), 7000);
                } else {
                    localStorage.setItem("lastSeenAnnouncements", new Date().toISOString());
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, (payload) => {
                setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
                setToasts(prev => prev.filter(t => t.id !== payload.old.id));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel) };
    }, []);

    useEffect(() => {
        if (isOpen && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [isOpen, announcements]);

    const handleOpenDrawer = () => {
        setIsOpen(true);
        setUnreadCount(0);
        setToasts([]);
        localStorage.setItem("lastSeenAnnouncements", new Date().toISOString());
    };

    const parseMessage = (msg: string) => {
        const parts = msg.split('|||ATTACHMENT:');
        return { text: parts[0], url: parts[1] || null };
    };

    return (
        <>
            {/* ===== POPUP TOAST NOTIFICATIONS ===== */}
            <div className="fixed top-4 right-4 z-[999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '380px' }}>
                {toasts.map((toast) => {
                    const { text, url } = parseMessage(toast.message);
                    return (
                        <div
                            key={toast.id}
                            className="pointer-events-auto bg-card border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-2xl overflow-hidden animate-in slide-in-from-right-8 fade-in duration-500 w-[360px] max-w-full"
                        >
                            {/* Accent top bar */}
                            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-500 w-full" />
                            <div className="p-4 flex gap-3">
                                <div className="shrink-0 p-2 bg-emerald-500/10 text-emerald-500 rounded-lg h-fit">
                                    <Megaphone className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">Admin Broadcast</span>
                                        <button
                                            onClick={() => dismissToast(toast.id)}
                                            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-sm font-medium text-foreground mt-1 leading-relaxed line-clamp-3">{text}</p>
                                    {url && (
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 hover:text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md transition-colors">
                                            <Paperclip className="w-3 h-3" /> View Attachment
                                        </a>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-2">
                                        {new Date(toast.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {" · "}
                                        <button onClick={handleOpenDrawer} className="text-emerald-500 hover:underline font-semibold">View All</button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== NOTIFICATION BELL BUTTON ===== */}
            <button
                onClick={handleOpenDrawer}
                className={cn(
                    "relative flex items-center justify-center gap-2.5 px-3 py-2 rounded-full font-bold transition-all group",
                    "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 border-none"
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
                        <Bell className="w-4 h-4 text-white" />
                        <span className="text-sm hidden sm:inline-block">Announcements</span>
                    </>
                )}
            </button>

            {/* ===== BACKDROP ===== */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100] animate-in fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* ===== SLIDING CHAT DRAWER ===== */}
            <div className={cn(
                "fixed inset-y-0 right-0 w-full sm:w-[460px] bg-card border-l border-border shadow-2xl z-[101] flex flex-col transform transition-transform duration-500 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Drawer Header */}
                <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-gradient-to-r from-emerald-500/5 to-emerald-500/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shadow-sm">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-lg tracking-tight">Broadcast History</h3>
                            <p className="text-xs text-muted-foreground">{announcements.length} message{announcements.length !== 1 ? 's' : ''} from Admin Ops</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Chat Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-muted/5">
                    {announcements.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-20">
                            <div className="p-5 bg-emerald-500/10 rounded-2xl mb-5">
                                <MessageSquare className="w-10 h-10 text-emerald-500" />
                            </div>
                            <p className="font-semibold text-foreground text-lg">Nothing yet</p>
                            <p className="text-sm text-muted-foreground mt-2 max-w-[220px]">Admin broadcasts will appear here live as a chat.</p>
                        </div>
                    ) : (
                        announcements.map((ann, i) => {
                            const { text, url } = parseMessage(ann.message);
                            const t = new Date(ann.created_at);

                            const prev = i > 0 ? new Date(announcements[i - 1].created_at) : null;
                            const showDate = !prev || prev.toDateString() !== t.toDateString();

                            return (
                                <div key={ann.id} className="flex flex-col">
                                    {/* Date Divider */}
                                    {showDate && (
                                        <div className="flex items-center gap-3 my-3">
                                            <div className="h-[1px] flex-1 bg-border" />
                                            <span className="bg-muted px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                                {t.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                            </span>
                                            <div className="h-[1px] flex-1 bg-border" />
                                        </div>
                                    )}

                                    {/* Chat Bubble */}
                                    <div className="flex self-start max-w-[92%] sm:max-w-[88%] animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-1.5 ml-1">
                                                <span className="font-bold text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Admin Ops</span>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className="bg-card border border-border text-foreground p-3.5 sm:p-4 rounded-2xl rounded-tl-sm shadow-sm">
                                                <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">{text}</p>

                                                {url && (
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 flex items-center gap-2 bg-background border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-foreground px-3 py-2 rounded-xl transition-all group w-fit"
                                                    >
                                                        <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-xs font-bold">Attached Document</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} className="h-1 w-full" />
                </div>
            </div>
        </>
    );
}
