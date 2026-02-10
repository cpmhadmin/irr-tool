# Accounting Dashboard

A standalone HTML dashboard for visualizing accounting data.

## Usage

Simply open `index.html` in your web browser. The dashboard is self-contained and does not require a backend server to run.

### Why does it say "Offline / Sample Data"?
When running locally (e.g., via `file://` or `localhost`), modern browsers restrict fetching data from external sites (like Google Sheets) for security (CORS).
The dashboard automatically falls back to **embedded sample data** so you can still use it.

To view live data, the project must be hosted on a live web server (like GitHub Pages).

## Development

The project includes Python scripts in the `scripts/` directory that are used to generate or modify the dashboard.

### Updating Data
To update the embedded data in `index.html`, you need the source CSV and template files:
1.  `QB GL Python Print - public_csv.csv` (Source Data)
2.  `accounting_dashboard_template.html` (Template)

Place these files in the `scripts/` folder (or adjust the paths in the script), then run:

```bash
cd scripts
python3 build_dashboard.py
```

### Scripts

- `scripts/build_dashboard.py`: Main script to build/update the dashboard.
- `scripts/add_columns.py`: Adds computed columns to the data.
- `scripts/apply_filters.py`: Logic for filtering data.
- `scripts/modify_dashboard.py`: Modifies the HTML structure/content.
