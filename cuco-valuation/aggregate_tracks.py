import csv
import os
import glob
from datetime import datetime

def get_csv_files(base_dir):
    return glob.glob(os.path.join(base_dir, 'Annual Statements/**/*.csv'), recursive=True)

def normalize_month(period_str):
    # Handles "January 2025", "2025-01", "25-01", etc.
    s = str(period_str).strip()
    for fmt in ('%B %Y', '%Y-%m', '%m/%Y', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime('%Y-%m')
        except:
            continue
    # Handle "25-01" or "24-11"
    if len(s) == 5 and s[2] == '-':
        year = "20" + s[:2]
        month = s[3:]
        return f"{year}-{month}"
    return "Unknown"

def process_all_files():
    csv_files = get_csv_files('.')
    master_data = {}
    
    mapping = {
        'GROSS REVENUE ACCOUNT CURRENCY': 'gross',
        'GROSS_REVENUE_ACCOUNT_CURRENCY': 'gross',
        'NET SHARE ACCOUNT CURRENCY': 'net',
        'NET_SHARE_ACCOUNT_CURRENCY': 'net',
        'TRACK': 'track',
        'ISRC': 'isrc',
        'QUANTITY': 'units',
        'UNITS SOLD': 'units',
        'STATEMENT PERIOD': 'period',
        'TRANSACTION TYPE': 'type'
    }

    for f_path in csv_files:
        with open(f_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            actual_map = {mapping[h]: h for h in reader.fieldnames if h in mapping}
            
            for row in reader:
                try:
                    month = normalize_month(row.get(actual_map.get('period'), ''))
                    # If monthly is missing, try to get it from the filename (e.g. 25-11)
                    if month == "Unknown":
                        fname = os.path.basename(f_path)
                        if fname[:2].isdigit() and fname[2] == '-':
                            month = normalize_month(fname[:5])

                    isrc = (row.get(actual_map.get('isrc')) or 'NO-ISRC').strip()
                    track = (row.get(actual_map.get('track')) or 'Unknown').strip()
                    t_type = (row.get(actual_map.get('type')) or '').lower()
                    
                    # Skip non-royalty adjustments if they don't have ISRCs (e.g. manual adjustments)
                    # unless we want to see them as a separate bucket.
                    if isrc == 'NO-ISRC' and 'adjustment' in t_type:
                        isrc = 'ADJUSTMENT'
                        track = 'Account Adjustment'

                    gross = float(row.get(actual_map.get('gross')) or 0)
                    net = float(row.get(actual_map.get('net')) or 0)
                    units = float(row.get(actual_map.get('units')) or 0)
                    
                    key = (month, isrc)
                    if key not in master_data:
                        master_data[key] = {'track': track, 'gross': 0.0, 'net': 0.0, 'units': 0.0}
                    
                    master_data[key]['gross'] += gross
                    master_data[key]['net'] += net
                    master_data[key]['units'] += units
                    # Prefer non-Unknown names
                    if track != 'Unknown':
                        master_data[key]['track'] = track
                        
                except Exception:
                    continue

    output_file = 'track_monthly_performance.csv'
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Month', 'ISRC', 'Track', 'Gross', 'Net', 'Units'])
        for key in sorted(master_data.keys()):
            writer.writerow([key[0], key[1], master_data[key]['track'], 
                             round(master_data[key]['gross'], 4), 
                             round(master_data[key]['net'], 4), 
                             int(master_data[key]['units'])])

if __name__ == "__main__":
    process_all_files()
