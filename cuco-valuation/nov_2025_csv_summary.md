# November 2025 CSV Analysis Summary

This document breaks down how the CSV data corresponds to the high-level metrics found in the AWAL PDF statement for November 2025.

## Data Reconciliation (Across both AGR531681 and AGR682359)

| Metric | CSV Column Used | Summed Value (Nov 2025) |
| :--- | :--- | :--- |
| **Gross Revenue** | `GROSS REVENUE ACCOUNT CURRENCY` | **$102,909.09** |
| **Net Revenue (Artist Share)** | `NET SHARE ACCOUNT CURRENCY` | **$95,129.47** |
| **AWAL Fees (Implicit)** | `Gross` minus `Net` | **$7,779.62** |
| **Mechanical Deductions** | `MECHANICAL DEDUCTION` | **$0.00** |
| **Physical Gross Revenue** | `GROSS...` where Type = "Physical Sales" | **$273.06** |

## Key Findings

### 1. The "Fee" Structure
The fees are not explicitly listed as a negative row in the CSV. Instead, they are the difference between the **Gross** and the **Net Share** on a line-by-line basis.
- **Catalogue (AGR531681)**: Fees are consistently **7.5%** of Gross.
- **AWAL+ (AGR682359)**: Fees are approx **8.1%** of Gross. 
- **Physical Sales**: Fees are significantly higher at **30.0%** of Gross ($273.06 Gross vs $191.14 Net).

### 2. Missing PDF Data Points
The following metrics requested from the PDF were **NOT found** in the transaction CSVs:
- **Expenses**: No rows for "Marketing", "Travel", or "Production" were found. These are likely applied at the account level in the PDF summary.
- **Reserves Held/Released**: There are no "Reserve" transaction types in the Nov 2025 CSV.
- **Payable Balance**: This is a running total across months, so it exists only in the PDF or an account-level ledger.

### 3. Physical Reserves Strategy
Since `Physical Sales` ($273.06) were recorded in Nov 2025, the PDF summary likely shows a "Physical Reserve Held" amount. 
- **Hypothesis**: If AWAL holds a 20% reserve on physical sales, you should see a ~$54.61 "Reserve Held" line item in the PDF.
- **Validation**: Check the PDF for a value near this. If it's there, we know the reserve is calculated as a % of the CSV's `Physical Sales` gross.

## Recommendation for Scaling
To calculate "True Net Revenue" across the whole data room, we must:
1. Sum the `NET SHARE ACCOUNT CURRENCY` from CSVs.
2. Subtract "Expenses" and "Reserves" extracted from the PDFs.
3. Add "Reserves Released" extracted from the PDFs.
