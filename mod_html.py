import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Add Settings button to Sidebar
settings_btn = """            <button id="settings-btn" class="sidebar-action-btn">
                <i data-lucide="settings"></i>
                Account Settings
            </button>
            
            <!-- Theme Switcher -->"""
content = content.replace("<!-- Theme Switcher -->", settings_btn)

# Add Settings Modal
settings_modal = """    <!-- Settings Modal -->
    <div id="settings-modal" class="modal-overlay hidden">
        <div class="modal-card">
            <div class="modal-header">
                <h2><i data-lucide="settings"></i> Account Settings</h2>
                <button class="close-modal-btn" id="close-settings-btn" aria-label="Close modal">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-content">
                <form id="settings-form">
                    <div class="input-group">
                        <label>Update Username</label>
                        <input type="text" id="settings-username" placeholder="New username" minlength="3">
                    </div>
                    <div class="input-group">
                        <label>Change Password</label>
                        <input type="password" id="settings-password" placeholder="New password" minlength="6">
                    </div>
                </form>
            </div>
            <div class="modal-footer justify-center">
                <button id="save-settings-btn" class="btn-primary" style="width: 100%;">Save Changes</button>
            </div>
        </div>
    </div>
    
    <!-- Logout Modal -->"""
content = content.replace("<!-- Logout Modal -->", settings_modal)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
