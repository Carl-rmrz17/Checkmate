import re

with open("js/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix winrate logic
content = content.replace("const winrate = totalFinished === 0 ? 100 : Math.round((completedCount / totalFinished) * 100);", "const winrate = totalFinished === 0 ? 0 : Math.round((completedCount / totalFinished) * 100);")

# 2. Fix avatar container logic
old_avatar = """const avatarContainer = document.getElementById('profile-avatar-container');
        if (profile.avatar_url) {
            avatarContainer.innerHTML = `<img src="${profile.avatar_url}" class="profile-img" alt="Avatar">`;
        } else {
            avatarContainer.innerHTML = `<span class="player-piece">A,??</span>`;
        }"""
        
new_avatar = """const avatarInitials = document.getElementById('avatar-initials');
        if (avatarInitials && profile.username) {
            avatarInitials.innerText = profile.username.charAt(0).toUpperCase();
        }"""
        
# Note: due to unicode artifacts in the original file, we'll use a regex replacement
avatar_pattern = re.compile(r"const avatarContainer = document\.getElementById\('profile-avatar-container'\);.*?\}", re.DOTALL)
content = avatar_pattern.sub(new_avatar, content)

with open("js/main.js", "w", encoding="utf-8") as f:
    f.write(content)
