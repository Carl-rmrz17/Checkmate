import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// Authentication
// ==========================================

export async function signUpUser(username, password, avatar_url = null) {
    const email = `${username}@checkmate.app`;
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username, avatar_url }
        }
    });
    return { data, error };
}

export async function fetchLeaderboard() {
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(50);
    if (error) console.error("Error fetching leaderboard:", error);
    return data || [];
}

export async function signInUser(username, password) {
    const email = `${username}@checkmate.app`;
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

export async function signOutUser() {
    return await supabase.auth.signOut();
}

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    return data.session;
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

// ==========================================
// Database Operations (CRUD)
// ==========================================

// Profiles
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    if (error) console.error("Error fetching profile:", error);
    return data;
}

export async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
    if (error) console.error("Error updating profile:", error);
    return data;
}

// Tasks (Active Moves)
export async function fetchTasks() {
    const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
    return data;
}

export async function addTask(taskData) {
    // taskData: { text, priority, phase, board_pos, user_id }
    const { data, error } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single();
    if (error) console.error("Error adding task:", error);
    return data;
}

export async function updateTask(taskId, updates) {
    const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .select()
        .single();
    if (error) console.error("Error updating task:", error);
    return data;
}

export async function deleteTask(taskId) {
    const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
    if (error) console.error("Error deleting task:", error);
    return !error;
}

// Graveyard (Completed/Captured Moves)
export async function fetchGraveyard() {
    const { data, error } = await supabase
        .from("graveyard")
        .select("*")
        .order("completed_at", { ascending: false });
    if (error) {
        console.error("Error fetching graveyard:", error);
        return [];
    }
    return data;
}

export async function addToGraveyard(graveyardData) {
    // graveyardData: { text, priority, user_id }
    const { data, error } = await supabase
        .from("graveyard")
        .insert(graveyardData)
        .select()
        .single();
    if (error) console.error("Error adding to graveyard:", error);
    return data;
}

