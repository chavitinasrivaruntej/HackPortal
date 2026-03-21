import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type IssueStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type IssuePriority = "Low" | "Medium" | "High";

export interface Issue {
    id: string; // From Supabase (UUID)
    issue_id: string; // E.g., ISSUE001
    teamName: string;
    teamId: string;
    title: string;
    category: string;
    description: string;
    priority: IssuePriority;
    timestamp: string;
    status: IssueStatus;
    attachment_url?: string;
}

interface IssuesState {
    issues: Issue[];
    loading: boolean;
    fetchIssues: () => Promise<void>;
    addIssue: (issueData: Omit<Issue, 'id' | 'issue_id' | 'timestamp' | 'status'>) => Promise<void>;
    updateIssueStatus: (id: string, status: IssueStatus) => Promise<void>;
    deleteIssue: (id: string) => Promise<void>;
}

export const useIssuesStore = create<IssuesState>()((set, get) => ({
    issues: [],
    loading: false,

    fetchIssues: async () => {
        set({ loading: true });
        const { data, error } = await supabase
            .from('issues')
            .select('*')
            .order('timestamp', { ascending: false });
        
        if (data && !error) {
            const mappedIssues: Issue[] = data.map((dbIssue: any) => ({
                id: dbIssue.id,
                issue_id: dbIssue.issue_id,
                teamName: dbIssue.team_name,
                teamId: dbIssue.team_id,
                title: dbIssue.title,
                category: dbIssue.category,
                description: dbIssue.description,
                priority: dbIssue.priority as IssuePriority,
                timestamp: dbIssue.timestamp,
                status: dbIssue.status as IssueStatus,
                attachment_url: dbIssue.attachment_url
            }));
            set({ issues: mappedIssues, loading: false });
        } else {
            set({ loading: false });
        }
    },

    addIssue: async (issueData) => {
        const currentCount = get().issues.length;
        const newIssueId = `ISSUE${String(currentCount + 1).padStart(3, '0')}`;
        
        const { error } = await supabase
            .from('issues')
            .insert([{
                issue_id: newIssueId,
                team_name: issueData.teamName,
                team_id: issueData.teamId,
                title: issueData.title,
                category: issueData.category,
                description: issueData.description,
                priority: issueData.priority,
                status: "Open",
                attachment_url: issueData.attachment_url || null
            }]);

        if (!error) {
            await get().fetchIssues();
        }
    },

    updateIssueStatus: async (id, status) => {
        const { error } = await supabase
            .from('issues')
            .update({ status })
            .eq('id', id);

        if (!error) {
            set((state) => ({
                issues: state.issues.map((i) => i.id === id ? { ...i, status } : i)
            }));
        }
    },

    deleteIssue: async (id) => {
        const { error } = await supabase
            .from('issues')
            .delete()
            .eq('id', id);

        if (!error) {
            set((state) => ({
                issues: state.issues.filter((i) => i.id !== id)
            }));
        }
    }
}));
