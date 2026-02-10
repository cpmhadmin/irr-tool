import os

file_path = "/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html"

target = "populateFilters(rawData); initTable();"
replacement = "populateFilters(rawData); initTable(); renderSummaries(rawData);"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated initialization logic.")
