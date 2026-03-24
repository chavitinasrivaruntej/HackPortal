import { supabase } from "@/lib/supabase";

/**
 * Logs an admin action to the activity_logs table.
 * @param action  Human-readable description of what was done
 * @param adminId The admin's internal UUID (from useAuthStore user.id)
 * @param teamRefId Optional: the team UUID this action relates to
 */
export async function logAdminAction(
    action: string,
    adminId: string,
    teamRefId?: string
): Promise<void> {
    await supabase.from("activity_logs").insert({
        action,
        admin_ref_id: adminId,
        team_ref_id: teamRefId ?? null,
        timestamp: new Date().toISOString(),
    });
}
