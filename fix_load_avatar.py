import re
with open("js/main.js", "r", encoding="utf-8") as f:
    content = f.read()

old_load = """const avatarInitials = document.getElementById('avatar-initials');
        if (avatarInitials && profile.username) {
            avatarInitials.innerText = profile.username.charAt(0).toUpperCase();
        }"""
        
new_load = """const avatarCircle = document.querySelector('.avatar-circle');
        if (avatarCircle) {
            if (profile.avatar_url) {
                avatarCircle.innerHTML = `<img src="${profile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                avatarCircle.innerHTML = `<span id="avatar-initials" class="avatar-initials">${profile.username ? profile.username.charAt(0).toUpperCase() : '?'}</span>`;
            }
        }"""

content = content.replace(old_load, new_load)

with open("js/main.js", "w", encoding="utf-8") as f:
    f.write(content)
