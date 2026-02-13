# Cuco Data Room Analysis Roadmap

This document outlines a step-by-step approach to unpacking the Cuco AWAL data room. We will prioritize quality control and understanding the narrative before scaling our analysis.

## Phase 1: Discovery & Validation
**Objective:** Confirm the integrity and structure of the dataset before processing.

1.  **Inventory Check**: Create a script to scan all `Annual Statements` folders (2022-2025).
    *   Verify that each month (1-11 for 2025, 1-12 for others) contains exactly:
        *   1 Summary PDF
        *   2 CSVs (AGR531681 & AGR682359)
    *   Flag any missing files or naming inconsistencies.
2.  **Schema Verification**:
    *   **Crucial Step**: Compare headers across years. Preliminary check shows **2022 and 2025 headers differ** (e.g. `UNITS SOLD` vs `QUANTITY`, underscores vs spaces in column names).
    *   Create a "Schema Map" to normalize columns (e.g., map `UNITS SOLD` -> `QUANTITY`) before processing.


## Phase 2: High-Level Financial Overview (The "Story") - **COMPLETE**
**Objective:** Build a "Month-by-Month" summary based on the PDF statements.

1.  **PDF Data Extraction**: 
    *   **Status**: Done. Extracted data from 37 PDF statements (Nov 2022 - Nov 2025).
2.  **Master Summary Table**:
    *   **Result**: Created `master_financial_summary.csv`.
    *   **Findings**: Identified a major $128k Commission Adjustment in Oct 2024 and significant Physical Reserve spikes in Jan 2024.


## Phase 3: Contract Deep Dive (Granular Audit)
**Objective:** Analyze *one single month* in depth to understand the underlying data and reconcile it with the PDF summary.

1.  **Pilot Month Selection**: Choose a recent, complete month (e.g., Nov 2024).
2.  **CSV Analysis**:
    *   Load the two CSVs for that month.
    *   Sum the `NET SHARE ACCOUNT CURRENCY` column.
3.  **Reconciliation**:
    *   Compare the CSV Sum vs. the PDF "Net Revenue" figure.
    *   *Success Metric*: The numbers must match (within a small rounding error). If they don't, we investigate "Why?" (e.g., are expenses missing from the CSV?).
4.  **Initial Breakdown**:
    *   Top Tracks by Revenue.
    *   Top DSPs (Spotify, Apple, etc.).
    *   Top Territories.

## Phase 5: Forecasts & "Year 1" Probabilities
**Objective:** Project future cash flows based on historical decay curves and external factors.

1.  **Mu/Sigma Forecasting**:
    *   Use calculated track-level volatility to define "Best," "Base," and "Worst" case scenarios.
2.  **Probability Modeling**:
    *   Assign probabilities to Year 1 Net Revenue outcomes.
3.  **Final Valuation Matrix**:
    *   Produce a final ROI/NPV model based on the 11x-13x multiple range.

