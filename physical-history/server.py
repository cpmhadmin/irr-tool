
import os
import json
import datetime
import jwt
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()


# --- CONFIGURATION SECTION ---
DB_TYPE = os.getenv('DB_TYPE', 'mysql')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
DB_NAME = os.getenv('DB_NAME', 'db')
TABLE_NAME = os.getenv('TABLE_NAME', 'sales')

# Auth Config
SECRET_KEY = os.getenv('SECRET_KEY', 'default_dev_secret')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'password')

# Server Config
PORT = int(os.getenv('PORT', 5000))  # Heroku sets PORT env var
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# CORS Origins (restrict in production)
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*')  # Set to your frontend URL in production

# Security check
if SECRET_KEY == 'default_dev_secret':
    print("WARNING: Using default SECRET_KEY. Set a secure SECRET_KEY in production!")

# --- END CONFIGURATION ---

app = Flask(__name__)
# CORS configuration - restrict origins in production
if ALLOWED_ORIGINS == '*':
    CORS(app, resources={r"/api/*": {"origins": "*"}})
else:
    origins_list = [origin.strip() for origin in ALLOWED_ORIGINS.split(',')]
    CORS(app, resources={r"/api/*": {"origins": origins_list}})

# Decorator for protected routes
def token_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Use same secret and alg as encode
            jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(*args, **kwargs)
    return decorated

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('password'):
        return jsonify({'message': 'Missing password'}), 401

    if data['password'] == ADMIN_PASSWORD:
        token = jwt.encode({
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")
        return jsonify({'token': token})

    return jsonify({'message': 'Invalid password'}), 401

def get_db_connection():
    if DB_TYPE == 'mysql':
        import mysql.connector
        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return conn, 'mysql'
    
    elif DB_TYPE == 'postgres':
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_NAME
        )
        return conn, 'postgres'
    else:
        raise ValueError(f"Unsupported DB_TYPE: {DB_TYPE}")

@app.route('/api/sales', methods=['GET'])
@token_required
def get_sales():
    print(f"Connecting to {DB_TYPE} database at {DB_HOST}...")
    try:
        conn, flavor = get_db_connection()
        cursor = conn.cursor(dictionary=True) if flavor == 'mysql' else conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # We assume the columns match the CSV schema or are aliased to match
        # Schema expected by frontend: source, upc_code, artist_name, title, quantity, customer, invoice_date, price, net_sales, country
        query = f"SELECT * FROM {TABLE_NAME}"
        cursor.execute(query)
        result = cursor.fetchall()
        
        # Normalize date format if needed to string (handled by JSON serializer usually, but let's be safe)
        for row in result:
             if 'invoice_date' in row and row['invoice_date']:
                 row['invoice_date'] = str(row['invoice_date'])

        cursor.close()
        conn.close()
        
        print(f"Successfully fetched {len(result)} rows.")
        return jsonify(result)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Server is running"})

if __name__ == '__main__':
    print(f"Starting server on http://localhost:{PORT}")
    print("Ensure you have installed dependencies: pip install flask flask-cors mysql-connector-python psycopg2-binary PyJWT python-dotenv")
    print(f"Debug mode: {DEBUG}")
    app.run(debug=DEBUG, host='0.0.0.0', port=PORT)
