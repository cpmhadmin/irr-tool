import os

file_path = "/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html"

# 1. HTML Container Injection
html_target = """                <div class="filter-group">
                    <label>Type</label>
                    <input type="text" id="filter-type" class="search-input" list="type-options" placeholder="All Types" style="width: 140px;" />
                    <datalist id="type-options"></datalist>
                </div>"""

html_replacement = """                <div class="filter-group">
                    <label>Type</label>
                    <input type="text" id="filter-type" class="search-input" list="type-options" placeholder="All Types" style="width: 140px;" />
                    <datalist id="type-options"></datalist>
                </div>

                <div class="filter-group">
                    <label>Category</label>
                    <input type="text" id="filter-category" class="search-input" list="category-options" placeholder="All" style="width: 130px;" />
                    <datalist id="category-options"></datalist>
                </div>

                <div class="filter-group">
                    <label>Master Vertical</label>
                    <input type="text" id="filter-master" class="search-input" list="master-vertical-options" placeholder="All" style="width: 130px;" />
                    <datalist id="master-vertical-options"></datalist>
                </div>"""

# 2. Table Colgroup Injection
colgroup_target = """                        <col style="width: 200px;"> <!-- Account (Clipped) -->
                        <col style="width: 120px;"> <!-- Amount -->"""

colgroup_replacement = """                        <col style="width: 200px;"> <!-- Account (Clipped) -->
                        <col style="width: 130px;"> <!-- Category -->
                        <col style="width: 140px;"> <!-- Master Vert -->
                        <col style="width: 120px;"> <!-- Amount -->"""

# 3. JS Column Definition Injection
cols_target = """            { key: 'Account', label: 'Account', clip: true },
            { key: 'Amount', label: 'Amount', type: 'number' }"""

cols_replacement = """            { key: 'Account', label: 'Account', clip: true },
            { key: 'Category', label: 'Category', clip: true },
            { key: 'Master_Vertical', label: 'Master Vert', clip: true },
            { key: 'Amount', label: 'Amount', type: 'number' }"""

# 4. JS Elements Injection
els_target = """            typeIn: document.getElementById('filter-type'),
            nameIn: document.getElementById('filter-name'),"""

els_replacement = """            typeIn: document.getElementById('filter-type'),
            categoryIn: document.getElementById('filter-category'),
            masterIn: document.getElementById('filter-master'),
            nameIn: document.getElementById('filter-name'),"""

els_dl_target = """            dlType: document.getElementById('type-options'),"""

els_dl_replacement = """            dlType: document.getElementById('type-options'),
            dlCategory: document.getElementById('category-options'),
            dlMaster: document.getElementById('master-vertical-options'),"""

# 5. JS Populate Filters Logic
pop_target = """            const types = getUnique('Transaction Type');

            const makeOpts = (arr) => arr.map(v => `<option value="${escapeHtml(v)}">`).join('');

            if(els.dlClass) els.dlClass.innerHTML = makeOpts(classes);
            if(els.dlAccount) els.dlAccount.innerHTML = makeOpts(accounts);
            if(els.dlType) els.dlType.innerHTML = makeOpts(types);"""

pop_replacement = """            const types = getUnique('Transaction Type');
            const categories = getUnique('Category');
            const masters = getUnique('Master_Vertical');

            const makeOpts = (arr) => arr.map(v => `<option value="${escapeHtml(v)}">`).join('');

            if(els.dlClass) els.dlClass.innerHTML = makeOpts(classes);
            if(els.dlAccount) els.dlAccount.innerHTML = makeOpts(accounts);
            if(els.dlType) els.dlType.innerHTML = makeOpts(types);
            if(els.dlCategory) els.dlCategory.innerHTML = makeOpts(categories);
            if(els.dlMaster) els.dlMaster.innerHTML = makeOpts(masters);"""

# 6. JS Handle Filter Logic
handle_target = """            const fType = els.typeIn.value.toLowerCase().trim();
            const fName = els.nameIn.value.toLowerCase().trim();"""

handle_replacement = """            const fType = els.typeIn.value.toLowerCase().trim();
            const fCategory = els.categoryIn.value.toLowerCase().trim();
            const fMaster = els.masterIn.value.toLowerCase().trim();
            const fName = els.nameIn.value.toLowerCase().trim();"""

handle_logic_target = """                // Type Check
                if (fType && !String(row['Transaction Type'] || '').toLowerCase().includes(fType)) return false;"""

handle_logic_replacement = """                // Type Check
                if (fType && !String(row['Transaction Type'] || '').toLowerCase().includes(fType)) return false;

                // Category Check
                if (fCategory && !String(row['Category'] || '').toLowerCase().includes(fCategory)) return false;

                // Master Vertical Check
                if (fMaster && !String(row['Master_Vertical'] || '').toLowerCase().includes(fMaster)) return false;"""

# 7. JS Events Injection
events_target = """const inputs = [els.dateStart, els.dateEnd, els.classIn, els.accountIn, els.typeIn, els.nameIn];"""

events_replacement = """const inputs = [els.dateStart, els.dateEnd, els.classIn, els.accountIn, els.typeIn, els.categoryIn, els.masterIn, els.nameIn];"""


# Read file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Apply replacements
content = content.replace(html_target, html_replacement)
content = content.replace(colgroup_target, colgroup_replacement)
content = content.replace(cols_target, cols_replacement)
content = content.replace(els_target, els_replacement)
content = content.replace(els_dl_target, els_dl_replacement)
content = content.replace(pop_target, pop_replacement)
content = content.replace(handle_target, handle_replacement)
content = content.replace(handle_logic_target, handle_logic_replacement)
content = content.replace(events_target, events_replacement)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added Category and Master Vertical columns/filters")
