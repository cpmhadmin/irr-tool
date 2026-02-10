import os

file_path = '/Users/warren/Desktop/web-apps (EMAILED JAN 29)/QB Tool/accounting_dashboard_v2.html'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the new logic with robust download and button state
    pdf_logic = r"""
        /* PDF GENERATION LOGIC */
        async function generatePDF() {
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
                    doc.addImage(logoImg, 'PNG', 170, 10, 25, (logoImg.height / logoImg.width) * 25);
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

                filteredData.forEach(row => {
                    const amt = parseFloat(String(row['Amount'] || '0').replace(/,/g, ''));
                    if (!isNaN(amt)) {
                        totalNet += amt;
                        if (amt > 0) totalIncome += amt;
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

                doc.autoTable({
                    startY: 40,
                    head: [['Metric', 'Value']],
                    body: [
                        ['Report Date Range', dateRangeStr],
                        ['Total Transactions', count.toLocaleString()],
                        ['Total Income', totalIncome.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
                        ['Total Expenses', totalExpense.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
                        ['Net Amount', totalNet.toLocaleString('en-US', { style: 'currency', currency: 'USD' })]
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: colorDark, textColor: [255, 255, 255], fontStyle: 'bold' },
                    styles: { fontSize: 11, cellPadding: 6 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } }
                });

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
        }

        function setupPdfBtn() {
             const pdfBtn = document.getElementById('export-pdf-btn');
             if(pdfBtn) {
                 pdfBtn.replaceWith(pdfBtn.cloneNode(true)); 
                 document.getElementById('export-pdf-btn').addEventListener('click', generatePDF);
             } else {
                 setTimeout(setupPdfBtn, 500);
             }
        }
        setupPdfBtn();
    """

    if "/* PDF GENERATION LOGIC */" in content:
        start_idx = content.find("/* PDF GENERATION LOGIC */")
        end_idx = content.find("</script>", start_idx)
        if start_idx != -1 and end_idx != -1:
            content = content[:start_idx] + pdf_logic + content[end_idx:]
            print("Updated existing PDF logic")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("File updated successfully.")

except Exception as e:
    print(f"Error: {e}")
