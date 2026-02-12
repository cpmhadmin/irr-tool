# Lampad Music Finance Index

This project is a standalone web application for tracking and pricing music catalog assets. It provides a ranked view of artists based on risk-adjusted multiples and includes a Monte Carlo simulation engine for asset valuation.

## Features

- **Dynamic Index**: Ranked view of artists with filters for Country, Genre, NPV, and Multiples.
- **Monte Carlo Simulation**: Interactive valuation overlay that runs simulations on artist cash flows.
- **Market Benchmarking**: Compares artist metrics against market benchmarks.
- **CSV Export**: Export filtered index data to CSV.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## Data Source

The application fetches data directly from Google Sheets:
- **Index Data**: Tracks artist metrics.
- **Model Assumptions**: Stores market benchmarks and risk-free rates.

## Deployment

This app is designed to be hosted as a static site.
- **GitHub**: Push the code to a repository.
- **Netlify**: Connect the repository to Netlify. It will automatically detect the `index.html` and serve it. No build command is required.

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Charts**: [Chart.js](https://www.chartjs.org/) via CDN.
- **Data**: Google Sheets (CSV Export API).
