# Physical Sales History Tool

A comprehensive web-based analytics dashboard for tracking and analyzing physical product sales across multiple distributors, regions, and time periods.

![Dashboard Screenshot](https://via.placeholder.com/800x400.png?text=Physical+Sales+Dashboard)

## Features

- 🔐 **Secure Authentication** - JWT-based login system
- 📊 **Interactive Dashboard** - Real-time sales visualization with Chart.js
- 🗄️ **Database Integration** - Connect to MySQL or PostgreSQL databases
- 🌍 **Geographic Analysis** - Track sales by country with visual breakdowns
- 📈 **Performance Metrics** - Monitor units sold, revenue, ROI, and trends
- 💰 **Budget Tracking** - Calculate recoupment progress and ROI
- 📄 **Export Reports** - Generate PDF executive reports and Excel exports
- 🎯 **Advanced Filtering** - Filter by artist, product, date range, distributor, and more

## Prerequisites

- **Python 3.9+**
- **MySQL** or **PostgreSQL** database
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/physical-history.git
cd physical-history
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_TYPE=mysql                    # or 'postgres'
DB_HOST=your-database-host
DB_PORT=3306                     # 3306 for MySQL, 5432 for PostgreSQL
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=your-database-name
TABLE_NAME=your-table-name

SECRET_KEY=generate-a-secure-random-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
```

> ⚠️ **Security**: Never commit your `.env` file to version control. It contains sensitive credentials.

### 4. Prepare Your Database

Ensure your database table has the following schema (or similar):

```sql
CREATE TABLE your_table_name (
    source VARCHAR(255),
    upc_code VARCHAR(255),
    artist_name VARCHAR(255),
    title VARCHAR(255),
    quantity INT,
    customer VARCHAR(255),
    invoice_date DATE,
    price DECIMAL(10,2),
    net_sales DECIMAL(10,2),
    country VARCHAR(100),
    format_type VARCHAR(100)
);
```

## Running Locally

### Quick Start

Use the convenience script:

```bash
bash start_sales_tool.sh
```

### Manual Start

**Option 1: Backend + Frontend (Recommended)**

```bash
# Terminal 1 - Start backend API server
python3 server.py

# Terminal 2 - Start frontend server
python3 -m http.server 8002
```

Then open: http://localhost:8002/index.html

**Option 2: Backend Only**

```bash
python3 server.py
```

Then open `index.html` directly in your browser using `file://` protocol.

### Login

Default credentials (change these in `.env`):
- **Username**: `admin`
- **Password**: `password`

## Deployment

### Backend Deployment

The backend (`server.py`) can be deployed to:

- **Heroku**: Use the included `Procfile`
- **Render**: Python web service
- **Railway**: Python deployment
- **AWS/GCP/Azure**: Container or VM-based deployment

**For Heroku:**

```bash
# Install Heroku CLI, then:
heroku create your-app-name
heroku config:set DB_TYPE=mysql DB_HOST=... DB_USER=... # etc.
git push heroku main
```

### Frontend Deployment

The frontend (`index.html`) can be deployed to:

- **GitHub Pages**
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**

> 📝 **Note**: You'll need to update the API endpoints in `index.html` (lines 836, 888) to point to your deployed backend URL.

### Environment Variables for Production

Set these on your hosting platform:

```
DB_TYPE=mysql
DB_HOST=your-production-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=your-db-name
TABLE_NAME=all_physical_sales_with_metadata
SECRET_KEY=your-very-long-random-secret-key
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-admin-password
```

## Project Structure

```
physical-history/
├── index.html              # Frontend dashboard (HTML/CSS/JS)
├── server.py               # Backend API server (Flask)
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── Procfile               # Heroku deployment config
├── start_sales_tool.sh    # Convenience startup script
└── README.md              # This file
```

## API Endpoints

- `GET /api/health` - Health check (public)
- `POST /api/login` - Authenticate and receive JWT token
- `GET /api/sales` - Fetch sales data (requires authentication)

## Security Considerations

- ✅ JWT-based authentication
- ✅ CORS protection
- ✅ Environment-based configuration
- ⚠️ Change default admin credentials before deployment
- ⚠️ Use a strong, random SECRET_KEY in production
- ⚠️ Use HTTPS in production
- ⚠️ Restrict CORS origins in production (update `server.py` line 30)

## Troubleshooting

### "Connection Failed" Error

- Verify `server.py` is running
- Check database credentials in `.env`
- Ensure database is accessible from your network
- Check firewall rules

### Authentication Not Working

- Clear browser localStorage: `localStorage.clear()`
- Verify credentials in `.env` match login attempt
- Check SECRET_KEY is set

### Charts Not Displaying

- Ensure Chart.js CDN is accessible
- Check browser console for JavaScript errors
- Verify data is being fetched successfully

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Python, Flask, Flask-CORS
- **Database**: MySQL / PostgreSQL
- **Authentication**: PyJWT
- **Export**: jsPDF, html2canvas, SheetJS (xlsx)

## License

MIT License - feel free to use this project for commercial or personal purposes.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Made with ❤️ for music industry analytics**
