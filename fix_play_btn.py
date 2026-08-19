import re
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('class="play-btn"', 'class="btn-primary"')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
