#!/usr/bin/env python3
"""
Simplified Flask app for Home Design Lab
Works with or without Supabase
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Try to import supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
    print("✓ Supabase module available")
except (ImportError, AttributeError) as e:
    print(f"✗ Supabase import error: {e}")
    SUPABASE_AVAILABLE = False
    create_client = None

# Initialize supabase if available
supabase = None
if SUPABASE_AVAILABLE and SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"✓ Supabase client initialized: {SUPABASE_URL[:30]}...")
    except Exception as e:
        print(f"✗ Supabase init error: {e}")
else:
    print("ℹ Running in DEMO mode (no Supabase)")

# Sample data
SAMPLE_PROJECTS = [
    {
        "id": 1,
        "title": "Villa Moderna",
        "category": "residenziale",
        "description": "Progetto di una villa moderna con giardino",
        "thumbnail": "/assets/images/placeholder-project.svg",
        "location": "Milano",
        "year": 2024
    },
    {
        "id": 2,
        "title": "Ristrutturazione Loft",
        "category": "ristrutturazione",
        "description": "Ristrutturazione completa di un loft industriale",
        "thumbnail": "/assets/images/placeholder-project.svg",
        "location": "Torino",
        "year": 2023
    }
]

SAMPLE_PROPERTIES = [
    {
        "id": 1,
        "title": "Appartamento Centro Storico",
        "price": 450000,
        "type": "appartamento",
        "surface": 120,
        "rooms": 3,
        "location": "Roma",
        "thumbnail": "/assets/images/placeholder-property.svg"
    },
    {
        "id": 2,
        "title": "Villa con Piscina",
        "price": 890000,
        "type": "villa",
        "surface": 350,
        "rooms": 5,
        "location": "Firenze",
        "thumbnail": "/assets/images/placeholder-property.svg"
    }
]

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/portfolio')
def portfolio():
    return render_template('portfolio.html')

@app.route('/collection')
def collection():
    return render_template('collection.html')

@app.route('/journal')
def journal():
    return render_template('journal.html')

@app.route('/chi-siamo')
def chi_siamo():
    return render_template('chi-siamo.html')

@app.route('/contatti')
def contatti():
    return render_template('contatti.html')

@app.route('/servizi-lab')
def servizi_lab():
    return render_template('servizi-lab.html')

@app.route('/login')
def login():
    return render_template('login.html')

# Compatibility routes with .html extension
@app.route('/<path:page>.html')
def page_html(page):
    try:
        return render_template(f'{page}.html')
    except:
        return "Page not found", 404

# API Routes
@app.route('/api/progetti')
def api_progetti():
    return jsonify(SAMPLE_PROJECTS)

@app.route('/api/immobili')
def api_immobili():
    return jsonify(SAMPLE_PROPERTIES)

@app.route('/api/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": SUPABASE_AVAILABLE and supabase is not None,
            "supabase_url_configured": bool(SUPABASE_URL),
            "supabase_key_configured": bool(SUPABASE_KEY)
        }
    })

# Setup Admin - Crea admin user
@app.route('/api/setup-admin', methods=['POST'])
def setup_admin():
    try:
        data = request.get_json()
        email = data.get('email', 'info@homedesignlab.it')
        password = data.get('password')
        
        if not password or len(password) < 6:
            return jsonify({"error": "Password richiesta (min 6 caratteri)"}), 400
        
        # If Supabase is available, try to create user there
        if SUPABASE_AVAILABLE and supabase:
            try:
                # Check if user exists
                result = supabase.table('profiles').select('*').eq('email', email).execute()
                if result.data:
                    return jsonify({
                        "error": "Utente con questa email già esistente"
                    }), 400
            except Exception as e:
                print(f"Profile check error: {e}")
        
        # Create admin in local data (or Supabase if available)
        admin_user = {
            "id": 1,
            "email": email,
            "role": "admin",
            "full_name": "Admin Home Design Lab",
            "created_at": datetime.utcnow().isoformat()
        }
        
        mode = "Supabase" if (SUPABASE_AVAILABLE and supabase) else "DEMO (locale)"
        
        return jsonify({
            "success": True,
            "message": f"Admin creato in modalità {mode}!",
            "user": admin_user,
            "mode": mode,
            "next_steps": [
                "Vai al login: /login.html",
                f"Email: {email}",
                "Password: (quella inserita)"
            ]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Admin creation via Supabase (if available)
@app.route('/api/admin/create', methods=['POST'])
def create_admin_supabase():
    if not SUPABASE_AVAILABLE or not supabase:
        return jsonify({
            "error": "Supabase non disponibile",
            "message": "Verifica che SUPABASE_URL e SUPABASE_KEY siano configurati correttamente"
        }), 503
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name', 'Admin Home Design Lab')
        
        if not password or len(password) < 6:
            return jsonify({"error": "Password richiesta (min 6 caratteri)"}), 400
        
        # Create user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "role": "admin",
                    "full_name": full_name
                }
            }
        })
        
        if hasattr(auth_response, 'error') and auth_response.error:
            return jsonify({"error": str(auth_response.error)}), 400
        
        user = auth_response.user if hasattr(auth_response, 'user') else auth_response.get('user')
        
        if user:
            return jsonify({
                "success": True,
                "message": "Admin creato con successo su Supabase!",
                "user": {
                    "id": user.id if hasattr(user, 'id') else user.get('id'),
                    "email": user.email if hasattr(user, 'email') else user.get('email'),
                    "role": "admin"
                },
                "note": "Controlla l'email per la conferma se richiesto"
            })
        else:
            return jsonify({"error": "Utente non creato"}), 400
            
    except Exception as e:
        print(f"Error creating admin: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("Home Design Lab Server")
    print("=" * 50)
    print(f"Supabase: {'✓ OK' if SUPABASE_AVAILABLE else '✗ Non disponibile'}")
    print(f"Database: {'✓ Connesso' if supabase else 'ℹ Modalità DEMO'}")
    print("=" * 50)
    print("Server: http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
