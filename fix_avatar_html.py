import re
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

avatar_input = """                    <div class="input-group">
                        <label>Profile Picture URL</label>
                        <input type="url" id="settings-avatar" placeholder="https://example.com/avatar.png">
                    </div>"""
content = content.replace('<div class="input-group">\n                        <label>Change Password</label>', avatar_input + '\n                    <div class="input-group">\n                        <label>Change Password</label>')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
