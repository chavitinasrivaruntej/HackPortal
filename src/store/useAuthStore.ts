import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'team' | null;

export interface AuthUser {
    id: string; // internal UUID
    role: UserRole;
    display_id: string; // admin_id or team_id
    name?: string; // e.g. team_name
    status?: string; // Team status: Active, Shortlisted, Eliminated, Frozen
}

interface AuthState {
    user: AuthUser | null;
    login: (userData: AuthUser) => void;
    logout: () => void;
    updateStatus: (status: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            login: (userData) => set({ user: userData }),
            logout: () => set({ user: null }),
            updateStatus: (status) =>
                set((state) => ({
                    user: state.user ? { ...state.user, status } : null,
                })),
        }),
        {
            name: 'hackportal-auth-storage', // saves to localStorage
        }
    )
);
