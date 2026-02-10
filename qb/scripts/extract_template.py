
import re

input_path = "../index.html"
output_path = "accounting_dashboard_template.html"

with open(input_path, "r", encoding="utf-8") as f:
    content = f.read()

# Regex to find the variable and its backticked content
# const LOCAL_CSV_DATA = `...`;
# We use non-greedy match for the content
pattern = r'(const LOCAL_CSV_DATA = `)([\s\S]*?)(`;)'

def replace_fn(match):
    return match.group(1) + "__CSV_DATA_PLACEHOLDER__" + match.group(3)

new_content = re.sub(pattern, replace_fn, content)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Extracted template to {output_path}")
