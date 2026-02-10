import os

file_path = "/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html"

# Wrap the initialization logic in try/catch
# We target `// User Guide Modal` which starts the interaction logic
start_marker = "// User Guide Modal"
end_marker = "// Start"

wrapper_start = """try {
        // User Guide Modal"""

# Note: we need to capture the block until start of fetchCSV call
# But fetchCSV definition is above.
# The init code is at the bottom.
# We'll just wrap the whole bottom section.

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace start
content = content.replace(start_marker, wrapper_start)

# Replace end
# We want to catch before the closing script tag?
# Or just wrap the event listeners.
# The timeout call `setTimeout(fetchCSV, 500);` is at the end.
# We'll replace that line with the end of try/catch
content = content.replace("setTimeout(fetchCSV, 500);", """setTimeout(fetchCSV, 500);
        } catch (err) {
            console.error(err);
            alert("JS Error: " + err.message);
            document.getElementById('loading-msg').textContent = "JS Error: " + err.message;
        }""")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added debug logging.")
