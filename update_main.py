import re

with open("js/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Update getReadableError
content = content.replace('if (msg.includes("already registered")) return "An account with this email already exists.";', 'if (msg.includes("already registered")) return "An account with this email already exists.";\n    if (msg.includes("email not confirmed")) return "Please check your email and click the confirmation link before signing in.";')

# Update registration success toast
content = content.replace("showToast('success', 'Profile Created', 'Welcome to CheckMate! You may now sign in.');", "showToast('success', 'Profile Created', 'Important: Please check your email inbox to verify your account before signing in!');")

with open("js/main.js", "w", encoding="utf-8") as f:
    f.write(content)
