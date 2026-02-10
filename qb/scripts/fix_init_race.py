import os

file_path = "/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html"

# We need to wrap the User Guide logic in DOMContentLoaded.
# Current structure (approx):
# try {
#    // User Guide Modal
#    const modal = ...
#    ...
#    window.onclick = ...
#    
#    // Events
#    const inputs = ...
#    ...
#    setTimeout(fetchCSV, 500);
# } catch ...

# We will wrap the top part.

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target the start of the logic
start_target = """try {
        // User Guide Modal
        const modal = document.getElementById("guide-modal");"""

# We'll change this to initialize inside a function or event listener.
# Since variables are `const` and might be block scoped, we need to be careful about `inputs` which is used in `setTimeout`? No, `fetchCSV` uses `els`.
# `inputs` is defined in the block.

# Let's simple wrap the whole block in a function and call it on load.
# Or just use DOMContentLoaded.

replacement_start = """try {
        window.addEventListener('DOMContentLoaded', () => {
            // User Guide Modal
            const modal = document.getElementById("guide-modal");"""

# We need to find where to close this listener.
# The `inputs` logic ends before `setTimeout(fetchCSV, 500);`
# But `fetchCSV` is called via setTimeout.
# Let's check `inputs` usage.
# `inputs` is used to add event listeners: `inputs.forEach(...)`.
# This is safe to put inside DOMContentLoaded.
# The `setTimeout(fetchCSV, 500)` call should also be inside, or just called directly since we are already waiting for DOM.

# Find the end of the block before the catch
# In `add_debug.py` I used:
# setTimeout(fetchCSV, 500);
# } catch (err) {

end_target = """setTimeout(fetchCSV, 500);
        } catch (err) {"""

replacement_end = """    fetchCSV();
        });
        } catch (err) {"""

# Apply changes
content = content.replace(start_target, replacement_start)
content = content.replace(end_target, replacement_end)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully wrapped initialization in DOMContentLoaded.")
