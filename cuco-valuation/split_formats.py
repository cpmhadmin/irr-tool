import csv
import os
import glob
from datetime import datetime

def get_csv_files(base_dir):
    return glob.glob(os.path.join(base_dir, 'Annual Statements/**/*.csv'), recursive=True)

def normalize_month(period_str):
    s = str(period_str).strip()
    for fmt in ('%B %Y', '%Y-%m', '%m/%Y', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime('%Y-%m')
        except:
            continue
    if len(s) == 5 and s[2] == '-':
        return f"20{s[:2]}-{s[3:]}"
    return "Unknown"

def process_formats():
    csv_files = get_csv_files('.')
    format_data = {} # { month: { 'digital': 0, 'physical': 0 } }
    
    mapping = {
        'NET SHARE ACCOUNT CURRENCY': 'net',
        'NET_SHARE_ACCOUNT_CURRENCY': 'net',
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
                    if month == "Unknown":
                        fname = os.path.basename(f_path)
                        if fname[:2].isdigit() and fname[2] == '-':
                            month = normalize_month(fname[:5])
                    
                    net = float(row.get(actual_map.get('net')) or 0)
                    t_type = (row.get(actual_map.get('type')) or '').lower()
                    
                    is_phys = 'physical' in t_type
                    fmt_key = 'physical' if is_phys else 'digital'
                    
                    if month not in format_data:
                        format_data[month] = {'digital': 0.0, 'physical': 0.0}
                    
                    format_data[month][fmt_key] += net
                except:
                    continue

    with open('monthly_format_split.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Month', 'Digital_Net', 'Physical_Net', 'Total_Net'])
        for m in sorted(format_data.keys()):
            d = format_data[m]
            writer.writerow([m, round(d['digital'], 2), round(d['physical'], 2), round(d['digital'] + d['physical'], 2)])

if __name__ == "__main__":
    process_formats()
