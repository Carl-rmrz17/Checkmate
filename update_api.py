import re
with open("js/api.js", "r", encoding="utf-8") as f:
    content = f.read()

new_auth = """export async function updateUserPassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    return { data, error };
}

// =========================================="""
content = content.replace("// ==========================================\n// Leaderboard", new_auth + "\n// Leaderboard")

with open("js/api.js", "w", encoding="utf-8") as f:
    f.write(content)
