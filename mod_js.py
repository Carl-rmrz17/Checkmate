import re

with open("js/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Add updateUserPassword to imports
content = content.replace('updateProfile,', 'updateProfile, updateUserPassword,')

# Add Settings logic before closing window events
settings_logic = """
// ---------------------------------------------------------
// Settings Modal
// ---------------------------------------------------------
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const settingsUsername = document.getElementById("settings-username");
const settingsPassword = document.getElementById("settings-password");

settingsBtn?.addEventListener("click", () => {
    if (profile) settingsUsername.value = profile.username || "";
    settingsPassword.value = "";
    settingsModal.classList.remove("hidden");
});

closeSettingsBtn?.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
});

saveSettingsBtn?.addEventListener("click", async () => {
    if (!currentUser || !profile) return;
    
    setBtnLoading(saveSettingsBtn, true, 'Save Changes');
    
    let hasError = false;
    let hasChanges = false;
    
    const newUsername = settingsUsername.value.trim();
    if (newUsername && newUsername !== profile.username) {
        try {
            await updateProfile(currentUser.id, { username: newUsername });
            profile.username = newUsername;
            displayUsername.innerText = newUsername;
            if (document.getElementById('avatar-initials')) {
                document.getElementById('avatar-initials').innerText = newUsername.charAt(0).toUpperCase();
            }
            hasChanges = true;
        } catch (err) {
            hasError = true;
            showToast('error', 'Update Failed', 'Failed to update username. It might be taken.');
        }
    }
    
    const newPassword = settingsPassword.value;
    if (newPassword && newPassword.length >= 6) {
        const { error } = await updateUserPassword(newPassword);
        if (error) {
            hasError = true;
            showToast('error', 'Password Failed', error.message);
        } else {
            hasChanges = true;
        }
    }
    
    setBtnLoading(saveSettingsBtn, false, 'Save Changes');
    
    if (!hasError && hasChanges) {
        showToast('success', 'Profile Updated', 'Your settings were saved successfully.');
        settingsModal.classList.add("hidden");
    } else if (!hasChanges) {
        settingsModal.classList.add("hidden");
    }
});

// Close modals when clicking outside"""
content = content.replace("// Close modals when clicking outside", settings_logic)

# Add settings modal to outside click and escape key
content = content.replace("if (e.target === logoutModal) {", "if (e.target === logoutModal) { logoutModal.classList.add('hidden'); } const settingsModalEl = document.getElementById('settings-modal'); if (e.target === settingsModalEl) { settingsModalEl.classList.add('hidden'); } if (false) {")
content = content.replace("document.getElementById('logout-modal')?.classList.add('hidden');", "document.getElementById('logout-modal')?.classList.add('hidden');\n        document.getElementById('settings-modal')?.classList.add('hidden');")

with open("js/main.js", "w", encoding="utf-8") as f:
    f.write(content)
