import os

file_path = "/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html"

# 1. HTML Injection (After Main Card)
# We find the closing div of the main card, which is followed by </div> closing app-container
html_target = """        </div>
    </div>

    <script>"""

html_replacement = """        </div>

        <!-- Summary Tables -->
        <div class="summary-tables-grid">
            <div class="card" style="height: auto; min-height: 400px; padding: 0;">
                <div style="padding: 16px; border-bottom: 1px solid var(--card-border);">
                    <h3 style="margin: 0; font-size: 14px;">Total by Class</h3>
                </div>
                <div class="table-wrapper">
                    <table id="class-summary-table">
                        <thead>
                            <tr>
                                <th style="width: 70%;">Class</th>
                                <th style="width: 30%; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody id="class-summary-body"></tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="height: auto; min-height: 400px; padding: 0;">
                <div style="padding: 16px; border-bottom: 1px solid var(--card-border);">
                    <h3 style="margin: 0; font-size: 14px;">Total by Account</h3>
                </div>
                <div class="table-wrapper">
                    <table id="account-summary-table">
                        <thead>
                            <tr>
                                <th style="width: 70%;">Account</th>
                                <th style="width: 30%; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody id="account-summary-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <style>
        .summary-tables-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 24px;
        }
        @media (max-width: 900px) {
            .summary-tables-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>

    <script>"""

# 2. JS Logic Injection
# We need to add renderSummaries and call it.

logic_target = """            renderData();
        }

        // Sorting"""

logic_replacement = """            renderData();
            renderSummaries(filteredData);
        }

        function renderSummaries(data) {
            // Aggregate by Class
            const classTotals = {};
            // Aggregate by Account
            const accountTotals = {};

            data.forEach(row => {
                const amt = parseFloat((row['Amount'] || '0').replace(/,/g, ''));
                if (isNaN(amt)) return;

                const cls = row['Class'] || '(No Class)';
                const acc = row['Account'] || '(No Account)';

                classTotals[cls] = (classTotals[cls] || 0) + amt;
                accountTotals[acc] = (accountTotals[acc] || 0) + amt;
            });

            // Convert to Array and Sort by Amount Desc (Absolute value to show magnitude or Just Desc)
            // Usually largest positive sums first, then largest negatives. 
            // Let's just sort by value descending.
            const sortedClass = Object.entries(classTotals).sort((a, b) => b[1] - a[1]);
            const sortedAccount = Object.entries(accountTotals).sort((a, b) => b[1] - a[1]);

            // Helper to render
            const renderRows = (arr, tbodyId) => {
                const tbody = document.getElementById(tbodyId);
                if (!tbody) return;
                
                if (arr.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 20px; color: var(--text-muted);">No data</td></tr>';
                    return;
                }

                tbody.innerHTML = arr.map(([key, val]) => {
                    const fmtVal = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const color = val < 0 ? '#feb2b2' : '#4fd1c5';
                    return `
                        <tr>
                            <td>${escapeHtml(key)}</td>
                            <td style="text-align: right; color: ${color}; font-weight: 600;">${fmtVal}</td>
                        </tr>
                    `;
                }).join('');
            };

            renderRows(sortedClass, 'class-summary-body');
            renderRows(sortedAccount, 'account-summary-body');
        }

        // Sorting"""


# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Apply replacements
content = content.replace(html_target, html_replacement)
content = content.replace(logic_target, logic_replacement)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added Summary Subtables")
