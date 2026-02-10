import os

file_path = "/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html"

# HTML Replacement
html_target = """            <div class="search-container">
                <div style="font-size: 13px; color: var(--text-muted); margin-right: 8px;">Filter by:</div>

                <select id="filter-column" class="search-input" style="width: 150px;">
                    <option value="all">Global Search</option>
                    <option value="Class">Class</option>
                    <option value="Account">Account</option>
                    <option value="Transaction Type">Transaction Type</option>
                    <option value="Name">Name</option>
                    <option value="Vendor">Vendor</option>
                </select>

                <div class="search-input-wrapper">
                    <input type="text" id="search-input" class="search-input" placeholder="Type to search..." />
                </div>

                <button id="reset-btn" class="search-btn"
                    style="background: rgba(255,255,255,0.1); width: auto;">Reset</button>

                <div style="margin-left: auto; font-size: 12px; color: var(--text-muted);">
                    <span id="row-count">0</span> rows
                </div>
            </div>"""

html_replacement = """            <div class="search-container">
                <!-- Date Range -->
                <div class="filter-group">
                    <label>Date Range</label>
                    <div style="display:flex; gap:8px;">
                        <input type="date" id="filter-date-start" class="search-input" style="width: 130px;" />
                        <input type="date" id="filter-date-end" class="search-input" style="width: 130px;" />
                    </div>
                </div>

                <!-- Specific Filters -->
                <div class="filter-group">
                    <label>Class</label>
                    <input type="text" id="filter-class" class="search-input" list="class-options" placeholder="All Classes" style="width: 160px;" />
                    <datalist id="class-options"></datalist>
                </div>

                <div class="filter-group">
                    <label>Account</label>
                    <input type="text" id="filter-account" class="search-input" list="account-options" placeholder="All Accounts" style="width: 160px;" />
                    <datalist id="account-options"></datalist>
                </div>

                <div class="filter-group">
                    <label>Type</label>
                    <input type="text" id="filter-type" class="search-input" list="type-options" placeholder="All Types" style="width: 140px;" />
                    <datalist id="type-options"></datalist>
                </div>

                <div class="filter-group">
                    <label>Name / Desc</label>
                    <input type="text" id="filter-name" class="search-input" placeholder="Search Name..." style="width: 160px;" />
                </div>

                <button id="reset-btn" class="search-btn" style="background: rgba(255,255,255,0.1); margin-top: 18px;">Reset</button>

                <div style="margin-left: auto; display:flex; flex-direction:column; align-items:flex-end;">
                    <div style="font-size: 12px; color: var(--text-muted);"><span id="row-count">0</span> rows</div>
                </div>
            </div>

            <style>
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .filter-group label {
                    font-size: 11px;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-left: 2px;
                }
            </style>"""

# JS `els` Replacement
els_target = """        const els = {
            loading: document.getElementById('loading'),
            loadingMsg: document.getElementById('loading-msg'),
            status: document.getElementById('connection-status'),
            table: document.getElementById('data-table'),
            thead: document.querySelector('#data-table thead tr'),
            tbody: document.getElementById('table-body'),
            searchInput: document.getElementById('search-input'),
            filterColumn: document.getElementById('filter-column'),
            resetBtn: document.getElementById('reset-btn'),
            rowCount: document.getElementById('row-count'),
            tooltip: document.getElementById('tooltip')
        };"""

els_replacement = """        const els = {
            loading: document.getElementById('loading'),
            loadingMsg: document.getElementById('loading-msg'),
            status: document.getElementById('connection-status'),
            table: document.getElementById('data-table'),
            thead: document.querySelector('#data-table thead tr'),
            tbody: document.getElementById('table-body'),
            // New Filters
            dateStart: document.getElementById('filter-date-start'),
            dateEnd: document.getElementById('filter-date-end'),
            classIn: document.getElementById('filter-class'),
            accountIn: document.getElementById('filter-account'),
            typeIn: document.getElementById('filter-type'),
            nameIn: document.getElementById('filter-name'),
            resetBtn: document.getElementById('reset-btn'),
            
            // Datalists
            dlClass: document.getElementById('class-options'),
            dlAccount: document.getElementById('account-options'),
            dlType: document.getElementById('type-options'),

            rowCount: document.getElementById('row-count'),
            tooltip: document.getElementById('tooltip')
        };"""

# JS `handleFilter` logic
handle_filter_target = """        function handleFilter() {
            const query = els.searchInput.value.toLowerCase().trim();
            const colFilter = els.filterColumn.value;

            if (!query) {
                filteredData = [...rawData];
            } else {
                filteredData = rawData.filter(row => {
                    if (colFilter !== 'all') {
                        // Specific column search
                        const val = String(row[colFilter] || '').toLowerCase();
                        return val.includes(query);
                    } else {
                        // Global search
                        return Object.values(row).some(val =>
                            String(val).toLowerCase().includes(query)
                        );
                    }
                });
            }
            renderData();
        }"""

handle_filter_replacement = """        function populateFilters(data) {
            const getUnique = (key) => [...new Set(data.map(r => r[key]).filter(x => x))].sort();
            
            const classes = getUnique('Class');
            const accounts = getUnique('Account');
            const types = getUnique('Transaction Type');

            const makeOpts = (arr) => arr.map(v => `<option value="${escapeHtml(v)}">`).join('');

            if(els.dlClass) els.dlClass.innerHTML = makeOpts(classes);
            if(els.dlAccount) els.dlAccount.innerHTML = makeOpts(accounts);
            if(els.dlType) els.dlType.innerHTML = makeOpts(types);
        }

        function handleFilter() {
            const dStart = els.dateStart.value ? new Date(els.dateStart.value) : null;
            const dEnd = els.dateEnd.value ? new Date(els.dateEnd.value) : null;
            
            const fClass = els.classIn.value.toLowerCase().trim();
            const fAccount = els.accountIn.value.toLowerCase().trim();
            const fType = els.typeIn.value.toLowerCase().trim();
            const fName = els.nameIn.value.toLowerCase().trim();

            filteredData = rawData.filter(row => {
                // Date Check
                if (dStart || dEnd) {
                    const rDate = new Date(row['Date']); // Assuming 'Date' column exists and is parseable
                    if (dStart && rDate < dStart) return false;
                    if (dEnd && rDate > dEnd) return false;
                }

                // Class Check
                if (fClass && !String(row['Class'] || '').toLowerCase().includes(fClass)) return false;
                
                // Account Check
                if (fAccount && !String(row['Account'] || '').toLowerCase().includes(fAccount)) return false;
                
                // Type Check
                if (fType && !String(row['Transaction Type'] || '').toLowerCase().includes(fType)) return false;

                // Name/Desc Check (Search Name, Vendor, Memo)
                if (fName) {
                    const combined = (
                        (row['Name'] || '') + " " + 
                        (row['Vendor'] || '') + " " + 
                        (row['Memo/Description'] || '')
                    ).toLowerCase();
                    if (!combined.includes(fName)) return false;
                }

                return true;
            });
            
            renderData();
        }"""

# JS Events
events_target = """        // Events
        els.searchInput.addEventListener('input', handleFilter);
        els.filterColumn.addEventListener('change', handleFilter);
        els.resetBtn.addEventListener('click', () => {
            els.searchInput.value = '';
            els.filterColumn.value = 'all';
            handleFilter();
        });"""

events_replacement = """        // Events
        const inputs = [els.dateStart, els.dateEnd, els.classIn, els.accountIn, els.typeIn, els.nameIn];
        inputs.forEach(el => el.addEventListener('input', handleFilter));

        els.resetBtn.addEventListener('click', () => {
            inputs.forEach(el => el.value = '');
            handleFilter();
        });"""


# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Apply replacements
content = content.replace(html_target, html_replacement)
content = content.replace(els_target, els_replacement)
content = content.replace(handle_filter_target, handle_filter_replacement)
content = content.replace(events_target, events_replacement)

# Inject populateFilters call
# There are two places: initTable(); call inside fetchCSV
# We will replace `initTable();` with `populateFilters(rawData); initTable();`
# Be careful not to replace definition of initTable
content = content.replace("initTable();", "populateFilters(rawData); initTable();")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated accounting_dashboard_v2.html")
