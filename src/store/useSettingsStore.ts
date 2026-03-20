import { create } from "zustand";
import { supabase } from "@/lib/supabase";

interface SettingsState {
    currentRound: string;
    loading: boolean;
    fetchSettings: () => Promise<void>;
    updateRound: (round: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
    currentRound: "Round 1",
    loading: false,

    fetchSettings: async () => {
        set({ loading: true });
        const { data, error } = await supabase
            .from("settings")
            .select("*");
        
        if (data && !error) {
            const roundSetting = data.find((s: any) => s.key === "current_round");
            if (roundSetting) set({ currentRound: roundSetting.value });
        }
        set({ loading: false });
    },

    updateRound: async (round: string) => {
        const { error } = await supabase
            .from("settings")
            .upsert({ key: "current_round", value: round });
        
        if (!error) set({ currentRound: round });
    },
}));
