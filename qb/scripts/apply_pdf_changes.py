
import re
import os

index_path = "../index.html"
csv_output_path = "../QB GL Python Print - public_csv.csv" # Save to root so it matches original location
template_output_path = "accounting_dashboard_template.html"

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract CSV Data
# const LOCAL_CSV_DATA = `...`;
csv_pattern = r'(const LOCAL_CSV_DATA = `)([\s\S]*?)(`;)'
match = re.search(csv_pattern, content)
if match:
    csv_data = match.group(2)
    # If it's the placeholder, we can't extract (but we know it's not based on previous reads)
    if "CSV_DATA_PLACEHOLDER" not in csv_data:
        with open(csv_output_path, "w", encoding="utf-8") as f:
            f.write(csv_data)
        print(f"Extracted CSV data to {csv_output_path}")
    else:
        print("Warning: CSV data in index.html is already a placeholder or empty.")
else:
    print("Error: Could not find LOCAL_CSV_DATA in index.html")

# 2. Create Template with Placeholder
def replace_csv_placeholder(match):
    return match.group(1) + "__CSV_DATA_PLACEHOLDER__" + match.group(3)

template_content = re.sub(csv_pattern, replace_csv_placeholder, content)

# 3. Apply PDF Changes to Template
# We look for the generatePDF function body or the whole function
# Since regex replacement of large code blocks is fragile, we'll try to find unique markers
# The original code has: // LOGO ... const logoUrl = ...
# And: // --- PAGE 2: EXECUTIVE SUMMARY --- ... doc.addPage();
# And ends with: console.log("PDF download triggered."); ... }

# Let's replace the ENTIRE generatePDF function to be safe.
# It starts with: async function generatePDF() {
# It ends before: function setupPdfBtn() {

pdf_func_pattern = r'(async function generatePDF\(\)\s*\{)([\s\S]*?)(\n\s*function setupPdfBtn)'

new_pdf_logic = r"""
            const btn = document.getElementById('export-pdf-btn');
            const originalBtnText = btn.innerText;
            
            console.log("Starting PDF generation...");
            try {
                if (!window.jspdf) {
                    throw new Error("jsPDF library not loaded. Check your internet connection.");
                }
                
                // Set button to loading state
                btn.innerText = "GENERATING...";
                btn.style.opacity = "0.7";
                btn.style.cursor = "wait";
                btn.disabled = true;

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                if (filteredData.length === 0) {
                    alert("No data available to export. Please adjust your filters.");
                    btn.innerText = originalBtnText;
                    btn.style.opacity = "1";
                    btn.style.cursor = "pointer";
                    btn.disabled = false;
                    return;
                }

                // LOGO
                const logoUrl = "https://upload.wikimedia.org/wikipedia/en/9/9d/Mexican_Summer_logo.png";
                
                const loadImage = (url) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.src = url;
                        img.onload = () => resolve(img);
                        img.onerror = () => {
                            console.warn("Could not load logo due to CORS or network error.");
                            resolve(null);
                        };
                    });
                };

                const logoImg = await loadImage(logoUrl);

                // COLORS
                const colorDark = [15, 23, 42]; 
                const colorAccent = [79, 209, 197]; 

                // --- PAGE 1: TITLE PAGE ---
                if (logoImg) {
                    const imgWidth = 50;
                    const imgHeight = (logoImg.height / logoImg.width) * imgWidth;
                    doc.addImage(logoImg, 'PNG', (210 - imgWidth) / 2, 60, imgWidth, imgHeight);
                } else {
                    doc.setFontSize(24);
                    doc.setTextColor(...colorDark);
                    doc.text("Mexican Summer", 105, 80, { align: "center" });
                }

                doc.setFontSize(26);
                doc.setTextColor(...colorDark);
                doc.text("Quickbooks Transaction History", 105, 130, { align: "center" });

                doc.setFontSize(14);
                doc.setTextColor(100, 100, 100);
                const reportDate = new Date().toLocaleDateString();
                doc.text(`Report Generated: ${reportDate}`, 105, 145, { align: "center" });

                doc.setFontSize(10);
                doc.text("Internal Executive Report", 105, 270, { align: "center" });

                // --- PAGE 2: EXECUTIVE SUMMARY ---
                doc.addPage();
                
                if (logoImg) {
                    // Start: RESIZED LOGO (15mm width, x=180 aligned right)
                    const logoW = 15; 
                    const logoH = (logoImg.height / logoImg.width) * logoW;
                    doc.addImage(logoImg, 'PNG', 180, 10, logoW, logoH);
                    // End: RESIZED LOGO
                }
                doc.setFontSize(22);
                doc.setTextColor(...colorDark);
                doc.text("Executive Summary", 14, 22);
                doc.setDrawColor(0, 0, 0);
                doc.line(14, 26, 196, 26);

                let totalIncome = 0;
                let totalExpense = 0;
                let totalNet = 0;
                let count = filteredData.length;
                let minDate = null;
                let maxDate = null;

                // Category Breakdown
                const incomeByCategory = {};

                filteredData.forEach(row => {
                    const amt = parseFloat(String(row['Amount'] || '0').replace(/,/g, ''));
                    if (!isNaN(amt)) {
                        totalNet += amt;
                        if (amt > 0) {
                            totalIncome += amt;
                            const cat = row['Category'] || 'Uncategorized';
                            incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
                        }
                        else totalExpense += amt;
                    }
                    let d = row['Date'] ? new Date(row['Date']) : null;
                    if (d && !isNaN(d.getTime())) {
                        if (!minDate || d < minDate) minDate = d;
                        if (!maxDate || d > maxDate) maxDate = d;
                    }
                });

                const dateRangeStr = (minDate && maxDate) 
                    ? `${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`
                    : "All Time";
                
                // Prepare Table Body with Breakdown
                const tableBody = [
                    ['Report Date Range', dateRangeStr],
                    ['Total Transactions', count.toLocaleString()],
                    ['Total Income', totalIncome.toLocaleString('en-US', { style: 'currency', currency: 'USD' })]
                ];

                // Sort and Inject Categories
                Object.entries(incomeByCategory)
                    .sort((a, b) => b[1] - a[1]) // Sort desc
                    .forEach(([cat, val]) => {
                         tableBody.push([
                             { content: `   ${cat}`, styles: { fontStyle: 'italic', textColor: [100,100,100] } },
                             { content: val.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), styles: { fontSize: 9, textColor: [100,100,100], halign: 'right' } }
                         ]);
                    });

                tableBody.push(
                    ['Total Expenses', totalExpense.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
                    ['Net Amount', totalNet.toLocaleString('en-US', { style: 'currency', currency: 'USD' })]
                );

                doc.autoTable({
                    startY: 40,
                    head: [['Metric', 'Value']],
                    body: tableBody,
                    theme: 'striped',
                    headStyles: { fillColor: colorDark, textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 11, cellPadding: 6 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } }
                });

                // Top Classes & Accounts Logic (Unchanged but included)
                const classTotals = {};
                const accountTotals = {};
                filteredData.forEach(row => {
                    const amt = parseFloat(String(row['Amount'] || '0').replace(/,/g, ''));
                    if (isNaN(amt)) return;
                    const cls = row['Class'] || '(No Class)';
                    const acc = row['Account'] || '(No Account)';
                    classTotals[cls] = (classTotals[cls] || 0) + amt;
                    accountTotals[acc] = (accountTotals[acc] || 0) + amt;
                });

                const sortedClass = Object.entries(classTotals)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .slice(0, 15)
                    .map(([k, v]) => [k, v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })]);

                const sortedAccount = Object.entries(accountTotals)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .slice(0, 15)
                    .map(([k, v]) => [k, v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })]);

                let finalY = doc.lastAutoTable.finalY + 15;
                doc.setFontSize(14);
                doc.setTextColor(...colorDark);
                doc.text("Top Classes (By Magnitude)", 14, finalY);
                
                doc.autoTable({
                    startY: finalY + 5,
                    head: [['Class', 'Total Amount']],
                    body: sortedClass,
                    theme: 'grid',
                    headStyles: { fillColor: colorAccent, textColor: [11, 17, 32], fontStyle: 'bold' },
                    styles: { fontSize: 10 },
                    columnStyles: { 1: { halign: 'right' } }
                });

                finalY = doc.lastAutoTable.finalY + 15;
                if (finalY + 80 > 280) { doc.addPage(); finalY = 20; }

                doc.setFontSize(14);
                doc.setTextColor(...colorDark);
                doc.text("Top Accounts (By Magnitude)", 14, finalY);

                doc.autoTable({
                    startY: finalY + 5,
                    head: [['Account', 'Total Amount']],
                    body: sortedAccount,
                    theme: 'grid',
                    headStyles: { fillColor: colorAccent, textColor: [11, 17, 32], fontStyle: 'bold' },
                    styles: { fontSize: 10 },
                    columnStyles: { 1: { halign: 'right' } }
                });

                console.log("Saving PDF via Blob...");
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Quickbooks_Executive_Report.pdf';
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);

                console.log("PDF download triggered.");

            } catch (err) {
                console.error("PDF Export Error:", err);
                alert("Error generating PDF: " + err.message);
            } finally {
                // Restore button state
                btn.innerText = originalBtnText;
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
                btn.disabled = false;
            }
        """

def replace_pdf_logic(match):
    return match.group(1) + new_pdf_logic + match.group(3)

if re.search(pdf_func_pattern, template_content):
    template_content = re.sub(pdf_func_pattern, replace_pdf_logic, template_content)
    print("Applied PDF logic changes.")
else:
    print("Error: Could not find PDF logic in template.")

with open(template_output_path, "w", encoding="utf-8") as f:
    f.write(template_content)
print(f"Created updated template at {template_output_path}")
