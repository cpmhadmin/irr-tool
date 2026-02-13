import pandas as pd
import numpy as np

# Load the aggregated data
df = pd.read_csv('track_monthly_performance.csv')

# Get the list of last 12 unique months
all_months = sorted(df['Month'].unique())
ltm_months = all_months[-12:]
print(f"LTM Period: {ltm_months[0]} to {ltm_months[-1]}")

# Filter for LTM
df_ltm = df[df['Month'].isin(ltm_months)]

# Create a pivot table: Index=ISRC/Track, Columns=Month, Values=Net
pivot = df_ltm.pivot_table(index=['ISRC', 'Track'], columns='Month', values='Net', fill_value=0)

# Calculate Stats
stats = pd.DataFrame(index=pivot.index)
stats['Total_Net'] = pivot.sum(axis=1)
stats['Mean_Monthly'] = pivot.mean(axis=1)
stats['Std_Dev'] = pivot.std(axis=1)
stats['CV'] = stats['Std_Dev'] / stats['Mean_Monthly']

# Calculate % Contribution
total_ltm_net = stats['Total_Net'].sum()
stats['Pct_Contribution'] = (stats['Total_Net'] / total_ltm_net) * 100

# Sort by Total Net descending
stats = stats.sort_values('Total_Net', ascending=False)

# Calculate Cumulative Sum for concentration analysis
stats['Cumulative_Pct'] = stats['Pct_Contribution'].cumsum()

# Format for output
stats_output = stats.reset_index()

# Save to CSV
stats_output.to_csv('track_ltm_valuation_stats.csv', index=False)

# Printable summary
print("\nTOP 10 TRACKS BY LTM NET REVENUE:")
print(stats_output.head(10)[['Track', 'Total_Net', 'Pct_Contribution', 'CV']].to_string(index=False))

# Concentration analysis
top_1 = stats_output.iloc[0]['Pct_Contribution']
top_5 = stats_output.iloc[4]['Cumulative_Pct']
top_10 = stats_output.iloc[9]['Cumulative_Pct']

print(f"\nCONCENTRATION RISK:")
print(f"Top 1 Track: {top_1:.1f}% of Revenue")
print(f"Top 5 Tracks: {top_5:.1f}% of Revenue")
print(f"Top 10 Tracks: {top_10:.1f}% of Revenue")

# HHI Calculation (Sum of squares of shares)
hhi = (stats_output['Pct_Contribution']**2).sum()
print(f"HHI (Herfindahl-Hirschman Index): {hhi:.0f}")
print("  (Low Score < 1500 = Diversified, High Score > 2500 = Highly Concentrated)")
