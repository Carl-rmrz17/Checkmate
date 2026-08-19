import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('<button id="cancel-logout-btn" class="nav-btn">Cancel</button>', '<button id="cancel-logout-btn" class="btn-secondary">Cancel</button>')
content = content.replace('<button id="confirm-logout-btn" class="action-btn capture-btn">Yes, Log Out</button>', '<button id="confirm-logout-btn" class="btn-danger">Yes, Log Out</button>')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
