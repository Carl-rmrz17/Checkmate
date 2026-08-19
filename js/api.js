import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// Authentication
// ==========================================

export async function signUpUser(email, username, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username }
        }
    });
    return { data, error };
}

export async function signInUser(email, password) {
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
// Leaderboard
// ==========================================

export async function fetchLeaderboard(limit = 50) {
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(limit);
    if (error) throw error;
    return data || [];
}

export async function fetchUserRank(userElo) {
    const { count, error } = await supabase
        .from('leaderboard')
        .select('*', { count: 'exact', head: true })
        .gt('elo', userElo);
    if (error) return null;
    return (count || 0) + 1;
}

// ==========================================
// Profiles
// ==========================================

export async function getProfile(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
    if (error) throw error;
    return data;
}

export async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
    if (error) throw error;
    return data;
}

// ==========================================
// Tasks (Active Moves)
// ==========================================

export async function fetchTasks() {
    const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
}

export async function addTask(taskData) {
    const { data, error } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateTask(taskId, updates) {
    const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteTask(taskId) {
    const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
    if (error) throw error;
    return true;
}

// ==========================================
// Graveyard
// ==========================================

export async function fetchGraveyard() {
    const { data, error } = await supabase
        .from("graveyard")
        .select("*")
        .order("completed_at", { ascending: false });
    if (error) throw error;
    return data;
}

export async function addToGraveyard(graveyardData) {
    const { data, error } = await supabase
        .from("graveyard")
        .insert(graveyardData)
        .select()
        .single();
    if (error) throw error;
    return data;
}
