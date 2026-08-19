import re
with open("js/main.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('const settingsPassword = document.getElementById("settings-password");', 'const settingsPassword = document.getElementById("settings-password");\nconst settingsAvatar = document.getElementById("settings-avatar");')

content = content.replace('if (profile) settingsUsername.value = profile.username || "";', 'if (profile) {\n        settingsUsername.value = profile.username || "";\n        settingsAvatar.value = profile.avatar_url || "";\n    }')

avatar_update_logic = """
    const newAvatar = settingsAvatar.value.trim();
    if (newAvatar !== (profile.avatar_url || "")) {
        try {
            await updateProfile(currentUser.id, { avatar_url: newAvatar });
            profile.avatar_url = newAvatar;
            
            const avatarCircle = document.querySelector('.avatar-circle');
            if (newAvatar) {
                avatarCircle.innerHTML = `<img src="${newAvatar}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                avatarCircle.innerHTML = `<span id="avatar-initials" class="avatar-initials">${profile.username ? profile.username.charAt(0).toUpperCase() : '?'}</span>`;
            }
            hasChanges = true;
        } catch (err) {
            hasError = true;
            showToast('error', 'Update Failed', 'Failed to update profile picture.');
        }
    }
    
    const newPassword"""
content = content.replace("const newPassword", avatar_update_logic)

with open("js/main.js", "w", encoding="utf-8") as f:
    f.write(content)
