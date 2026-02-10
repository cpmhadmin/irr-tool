
import os

csv_path = "../QB GL Python Print - public_csv.csv"
template_path = "accounting_dashboard_template.html"
output_path = "../index.html"

try:
    with open(csv_path, "r", encoding="utf-8") as f:
        # Read lines, maybe limit if too huge, but 6MB should be fine in memory
        csv_content = f.read()
        
    # Escape backticks in CSV because we are putting it into a JS template string
    # Escape only script tag closer since we are in a text/csv script block
    csv_content = csv_content.replace("</script", "<\\/script")

    # Read template
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Replace logic
    # We look for the exact string `__CSV_DATA_PLACEHOLDER__`
    new_html = html_content.replace("__CSV_DATA_PLACEHOLDER__", csv_content)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(new_html)

    print(f"Successfully created {output_path} with embedded CSV data.")

except Exception as e:
    print(f"Error: {e}")
