import os

file_path = "/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html"

# 1. Header Injection
header_target = """            <div id="connection-status" class="badge" style="background: rgba(160, 174, 192, 0.2); color: #a0aec0;">
                Connecting...
            </div>"""

header_replacement = """            <div style="display: flex; align-items: center; gap: 12px;">
                <button id="user-guide-btn" style="
                    background: transparent; 
                    border: 1px solid var(--accent-color); 
                    color: var(--accent-color); 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    font-size: 11px; 
                    font-weight: 600; 
                    cursor: pointer; 
                    letter-spacing: 0.05em;
                    transition: all 0.2s;">
                    USER GUIDE
                </button>
                <div id="connection-status" class="badge" style="background: rgba(160, 174, 192, 0.2); color: #a0aec0;">
                    Connecting...
                </div>
            </div>"""

# 2. Modal HTML Injection (Before closing body)
# We'll look for the end of the script tag or closing body.
# The file ends with </body></html>
modal_html = """
    <!-- User Guide Modal -->
    <div id="guide-modal" class="modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>User Guide & Workflow</h2>
            
            <div class="workflow-box">
                <h3 style="color: #feb2b2; margin-top: 0;">CRITICAL WORKFLOW</h3>
                <ol>
                    <li><strong>Download General Ledger:</strong> Export the General Ledger from QuickBooks.</li>
                    <li><strong>Place File:</strong> Save the exported file into the designated <code>QB Data</code> folder. (Accounting Team Task)</li>
                    <li><strong>Run Script:</strong> Trigger the Python update script to aggregate the new data and update the CSV. (Accounting Team Task)</li>
                </ol>
            </div>

            <h3>Using the Dashboard</h3>
            <ul>
                <li><strong>Filters:</strong> Use the "Filter by" bar to drill down by Date, Class, Account, Type, or Name.</li>
                <li><strong>Summaries:</strong> "Total by Class" and "Total by Account" tables update automatically based on your active filters.</li>
                <li><strong>Tooltips:</strong> Hover over any row to see the full transaction details (Memo, Splits, etc.).</li>
                <li><strong>Sorting:</strong> Click column headers to sort. Click "Date" safely to sort chronologically.</li>
            </ul>
        </div>
    </div>
"""

# 3. CSS Injection
css_target = """        .text-accent {
            color: var(--accent-color);
            font-weight: 600;
        }"""

css_replacement = """        .text-accent {
            color: var(--accent-color);
            font-weight: 600;
        }

        /* Modal Styles */
        .modal {
            display: none; 
            position: fixed; 
            z-index: 1000; 
            left: 0;
            top: 0;
            width: 100%; 
            height: 100%; 
            overflow: auto; 
            background-color: rgba(0,0,0,0.8); 
            backdrop-filter: blur(4px);
        }

        .modal-content {
            background-color: #1a202c;
            margin: 10% auto; 
            padding: 30px; 
            border: 1px solid var(--card-border);
            width: 90%; 
            max-width: 600px;
            border-radius: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            position: relative;
            color: var(--text-primary);
        }

        .close-btn {
            color: var(--text-muted);
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            line-height: 20px;
        }

        .close-btn:hover,
        .close-btn:focus {
            color: #fff;
            text-decoration: none;
            cursor: pointer;
        }

        .workflow-box {
            background: rgba(254, 178, 178, 0.1); 
            border: 1px solid rgba(254, 178, 178, 0.3); 
            padding: 16px; 
            border-radius: 8px; 
            margin-bottom: 24px;
        }

        .workflow-box ol {
            margin: 0;
            padding-left: 20px;
        }

        .workflow-box li {
            margin-bottom: 8px;
            color: #fff;
        }
        
        .modal-content h2 { margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid var(--card-border); padding-bottom: 10px; }
        .modal-content h3 { margin-top: 0; margin-bottom: 10px; font-size: 16px; color: var(--accent-color); }
        .modal-content ul { padding-left: 20px; color: var(--text-muted); }
        .modal-content li { margin-bottom: 6px; }
        .modal-content strong { color: #edf2f7; }"""

# 4. JS Injection
js_target = """        // Events
        const inputs = [els.dateStart, els.dateEnd, els.classIn, els.accountIn, els.typeIn, els.categoryIn, els.masterIn, els.nameIn];"""

js_replacement = """        // User Guide Modal
        const modal = document.getElementById("guide-modal");
        const btn = document.getElementById("user-guide-btn");
        const span = document.getElementsByClassName("close-btn")[0];

        btn.onclick = function() {
            modal.style.display = "block";
        }

        span.onclick = function() {
            modal.style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }

        // Events
        const inputs = [els.dateStart, els.dateEnd, els.classIn, els.accountIn, els.typeIn, els.categoryIn, els.masterIn, els.nameIn];"""


# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Apply replacements
content = content.replace(header_target, header_replacement)
content = content.replace(css_target, css_replacement)
content = content.replace("</body>", modal_html + "\n</body>")
content = content.replace(js_target, js_replacement)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added User Guide")
