from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
from datetime import datetime
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except (ImportError, AttributeError) as e:
    print(f"Supabase import error: {e}")
    create_client = None
    Client = None
    SUPABASE_AVAILABLE = False
from utils.logger import logger
from utils.cache import cache, cached, SiteCache
from utils.backup import init_backup_manager, get_backup_manager
from utils.monitoring import init_performance_monitor, get_performance_monitor
import time

# Carica le variabili d'ambiente
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configurazione
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SUPABASE_URL'] = os.getenv('SUPABASE_URL')
app.config['SUPABASE_KEY'] = os.getenv('SUPABASE_ANON_KEY')

# Inizializza Supabase
supabase: Client = None
if SUPABASE_AVAILABLE and app.config['SUPABASE_URL'] and app.config['SUPABASE_KEY']:
    supabase = create_client(app.config['SUPABASE_URL'], app.config['SUPABASE_KEY'])
    # Inizializza il backup manager
    init_backup_manager(supabase)
else:
    logger.warning("Supabase non disponibile - alcune funzionalità saranno limitate")

# Inizializza il performance monitor
init_performance_monitor()

# Middleware per monitoring delle richieste
@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    if hasattr(request, 'start_time'):
        response_time = time.time() - request.start_time
        monitor = get_performance_monitor()
        if monitor:
            monitor.record_request(
                endpoint=request.endpoint or request.path,
                method=request.method,
                status_code=response.status_code,
                response_time=response_time
            )
    return response

# Funzioni helper per Supabase con cache
@cached("projects", ttl=600)  # 10 minuti cache
def get_projects():
    """Ottieni tutti i progetti da Supabase con cache"""
    start_time = time.time()
    if not supabase:
        logger.error("Supabase client not initialized")
        return []
    try:
        response = supabase.table('projects').select('*').eq('stato', 'attivo').execute()
        data = response.data if response.data else []
        duration = time.time() - start_time
        
        logger.database_operation("SELECT", "projects", success=True)
        logger.api_request("GET", "/projects", response_time=duration)
        
        # Registra nel performance monitor
        monitor = get_performance_monitor()
        if monitor:
            monitor.record_database_operation("SELECT", "projects", duration, True)
        
        return data
    except Exception as e:
        duration = time.time() - start_time
        logger.error("Error fetching projects", exception=e)
        logger.database_operation("SELECT", "projects", success=False)
        
        # Registra errore nel performance monitor
        monitor = get_performance_monitor()
        if monitor:
            monitor.record_database_operation("SELECT", "projects", duration, False)
        
        return []

@cached("properties", ttl=600)  # 10 minuti cache
def get_properties():
    """Ottieni tutti gli immobili da Supabase con cache"""
    start_time = time.time()
    if not supabase:
        logger.error("Supabase client not initialized")
        return []
    try:
        response = supabase.table('properties').select('*').eq('stato', 'disponibile').execute()
        data = response.data if response.data else []
        logger.database_operation("SELECT", "properties", success=True)
        logger.api_request("GET", "/properties", response_time=time.time() - start_time)
        return data
    except Exception as e:
        logger.error("Error fetching properties", exception=e)
        logger.database_operation("SELECT", "properties", success=False)
        return []

@cached("articles", ttl=1800)  # 30 minuti cache
def get_articles():
    """Ottieni tutti gli articoli da Supabase con cache"""
    start_time = time.time()
    if not supabase:
        logger.error("Supabase client not initialized")
        return []
    try:
        response = supabase.table('articles').select('*').eq('stato', 'pubblicato').execute()
        data = response.data if response.data else []
        logger.database_operation("SELECT", "articles", success=True)
        logger.api_request("GET", "/articles", response_time=time.time() - start_time)
        return data
    except Exception as e:
        logger.error("Error fetching articles", exception=e)
        logger.database_operation("SELECT", "articles", success=False)
        return []

# Routes principali
@app.route('/')
def index():
    progetti = get_projects()[:3]  # Solo primi 3 per homepage
    return render_template('index.html', progetti=progetti)

@app.route('/portfolio')
def portfolio():
    progetti = get_projects()
    return render_template('portfolio.html', progetti=progetti)

@app.route('/collection')
def collection():
    immobili = get_properties()
    return render_template('collection.html', immobili=immobili)

@app.route('/journal')
def journal():
    articoli = get_articles()
    return render_template('journal.html', articoli=articoli)

@app.route('/chi-siamo')
def chi_siamo():
    return render_template('chi-siamo.html')

@app.route('/contatti')
def contatti():
    return render_template('contatti.html')

@app.route('/servizi-lab')
def servizi_lab():
    return render_template('servizi-lab.html')

# API Routes
@app.route('/api/progetti')
def api_progetti():
    progetti = get_projects()
    return jsonify(progetti)

@app.route('/api/progetti/<int:progetto_id>')
def api_progetto_dettaglio(progetto_id):
    if not supabase:
        return jsonify({"errore": "Database non disponibile"}), 500
    try:
        response = supabase.table('projects').select('*').eq('id', progetto_id).execute()
        if response.data:
            return jsonify(response.data[0])
        return jsonify({"errore": "Progetto non trovato"}), 404
    except Exception as e:
        return jsonify({"errore": str(e)}), 500

@app.route('/api/immobili')
def api_immobili():
    immobili = get_properties()
    return jsonify(immobili)

@app.route('/api/immobili/<int:immobile_id>')
def api_immobile_dettaglio(immobile_id):
    if not supabase:
        return jsonify({"errore": "Database non disponibile"}), 500
    try:
        response = supabase.table('properties').select('*').eq('id', immobile_id).execute()
        if response.data:
            return jsonify(response.data[0])
        return jsonify({"errore": "Immobile non trovato"}), 404
    except Exception as e:
        return jsonify({"errore": str(e)}), 500

@app.route('/api/articoli')
def api_articoli():
    articoli = get_articles()
    return jsonify(articoli)

@app.route('/api/articoli/<int:articolo_id>')
def api_articolo_dettaglio(articolo_id):
    if not supabase:
        return jsonify({"errore": "Database non disponibile"}), 500
    try:
        response = supabase.table('articles').select('*').eq('id', articolo_id).execute()
        if response.data:
            return jsonify(response.data[0])
        return jsonify({"errore": "Articolo non trovato"}), 404
    except Exception as e:
        return jsonify({"errore": str(e)}), 500

# Pagine dettaglio
@app.route('/dettaglio-progetto/<int:progetto_id>')
def dettaglio_progetto(progetto_id):
    if not supabase:
        return "Database non disponibile", 500
    try:
        response = supabase.table('projects').select('*').eq('id', progetto_id).execute()
        if response.data:
            return render_template('dettaglio-progetto.html', progetto=response.data[0])
        return "Progetto non trovato", 404
    except Exception as e:
        return f"Errore: {str(e)}", 500

@app.route('/dettaglio-immobile/<int:immobile_id>')
def dettaglio_immobile(immobile_id):
    if not supabase:
        return "Database non disponibile", 500
    try:
        response = supabase.table('properties').select('*').eq('id', immobile_id).execute()
        if response.data:
            return render_template('dettaglio-immobile.html', immobile=response.data[0])
        return "Immobile non trovato", 404
    except Exception as e:
        return f"Errore: {str(e)}", 500

# Servizi statici
@app.route('/assets/<path:filename>')
def assets(filename):
    return send_from_directory('assets', filename)

@app.route('/lib/<path:filename>')
def lib(filename):
    return send_from_directory('lib', filename)

# API Routes per Backup
@app.route('/api/backup/create', methods=['POST'])
def create_backup():
    """Crea un nuovo backup"""
    backup_manager = get_backup_manager()
    if not backup_manager:
        return jsonify({"errore": "Backup manager non disponibile"}), 500
    
    backup_type = request.json.get('type', 'full') if request.json else 'full'
    result = backup_manager.create_backup(backup_type)
    
    if result.get('success'):
        return jsonify(result)
    else:
        return jsonify(result), 500

@app.route('/api/backup/list', methods=['GET'])
def list_backups():
    """Elenca tutti i backup disponibili"""
    backup_manager = get_backup_manager()
    if not backup_manager:
        return jsonify({"errore": "Backup manager non disponibile"}), 500
    
    backups = backup_manager.list_backups()
    stats = backup_manager.get_backup_stats()
    
    return jsonify({
        "backups": backups,
        "stats": stats
    })

@app.route('/api/backup/restore/<backup_filename>', methods=['POST'])
def restore_backup(backup_filename):
    """Ripristina un backup specifico"""
    backup_manager = get_backup_manager()
    if not backup_manager:
        return jsonify({"errore": "Backup manager non disponibile"}), 500
    
    result = backup_manager.restore_backup(backup_filename)
    
    if result.get('success'):
        # Invalida la cache dopo il ripristino
        SiteCache.invalidate_all_content()
        return jsonify(result)
    else:
        return jsonify(result), 500

@app.route('/api/backup/stats', methods=['GET'])
def backup_stats():
    """Ottieni statistiche sui backup"""
    try:
        backup_manager = get_backup_manager()
        if not backup_manager:
            return jsonify({
                "total_backups": 0,
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "oldest_backup": None,
                "newest_backup": None,
                "backup_types": [],
                "message": "Backup manager non inizializzato"
            })
        
        stats = backup_manager.get_backup_stats()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting backup stats: {e}")
        return jsonify({"errore": str(e)}), 500

# API Routes per Cache Management
@app.route('/api/cache/stats', methods=['GET'])
def cache_stats():
    """Ottieni statistiche della cache"""
    stats = cache.get_stats()
    return jsonify(stats)

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """Svuota la cache"""
    try:
        # Gestisci sia JSON che form data
        if request.is_json:
            pattern = request.json.get('pattern') if request.json else None
        else:
            pattern = request.form.get('pattern') if request.form else None
        
        if pattern:
            count = cache.cleanup_expired()
            # Invalida pattern specifico
            from utils.cache import invalidate_cache_pattern
            pattern_count = invalidate_cache_pattern(pattern)
            return jsonify({
                "success": True,
                "expired_cleaned": count,
                "pattern_invalidated": pattern_count
            })
        else:
            cache.clear()
            return jsonify({"success": True, "message": "Cache cleared completely"})
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/cache/invalidate', methods=['POST'])
def invalidate_cache():
    """Invalida la cache dei contenuti"""
    SiteCache.invalidate_all_content()
    return jsonify({"success": True, "message": "Content cache invalidated"})

# API Routes per Performance Monitoring
@app.route('/api/monitoring/metrics', methods=['GET'])
def get_metrics():
    """Ottieni le metriche di performance"""
    monitor = get_performance_monitor()
    if not monitor:
        return jsonify({"errore": "Performance monitor non disponibile"}), 500
    
    time_range = request.args.get('time_range', 60, type=int)
    metrics = monitor.get_metrics_summary(time_range)
    return jsonify(metrics)

@app.route('/api/monitoring/alerts', methods=['GET'])
def get_alerts():
    """Ottieni gli alert di performance"""
    monitor = get_performance_monitor()
    if not monitor:
        return jsonify({"errore": "Performance monitor non disponibile"}), 500
    
    limit = request.args.get('limit', 20, type=int)
    alerts = monitor.get_recent_alerts(limit)
    return jsonify({"alerts": alerts})

@app.route('/api/monitoring/endpoints', methods=['GET'])
def get_endpoint_stats():
    """Ottieni statistiche per endpoint"""
    monitor = get_performance_monitor()
    if not monitor:
        return jsonify({"errore": "Performance monitor non disponibile"}), 500
    
    endpoint = request.args.get('endpoint')
    stats = monitor.get_endpoint_stats(endpoint)
    return jsonify(stats)

# Health Check con statistiche complete
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check completo con statistiche"""
    cache_stats_data = cache.get_stats()
    backup_stats_data = {}
    monitoring_stats_data = {}
    
    backup_manager = get_backup_manager()
    if backup_manager:
        backup_stats_data = backup_manager.get_backup_stats()
    
    monitor = get_performance_monitor()
    if monitor:
        monitoring_stats_data = monitor.get_metrics_summary(5)  # Ultimi 5 minuti
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": supabase is not None,
            "cache": True,
            "backup": backup_manager is not None,
            "monitoring": monitor is not None
        },
        "stats": {
            "cache": cache_stats_data,
            "backup": backup_stats_data,
            "monitoring": monitoring_stats_data
        }
    })

# API: Crea admin user (solo per setup iniziale)
@app.route('/api/admin/create', methods=['POST'])
def create_admin():
    """Crea il primo admin user su Supabase"""
    try:
        data = request.get_json()
        email = data.get('email', 'info@homedesignlab.it')
        password = data.get('password')
        full_name = data.get('full_name', 'Admin Home Design Lab')
        
        if not password or len(password) < 6:
            return jsonify({"error": "Password richiesta (min 6 caratteri)"}), 400
        
        if not SUPABASE_AVAILABLE or not supabase:
            return jsonify({
                "error": "Supabase non disponibile",
                "message": "Verifica che SUPABASE_URL e SUPABASE_KEY siano configurati correttamente"
            }), 503
        
        # Crea utente con metadata
        result = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,  # Auto-conferma email
            "user_metadata": {
                "role": "admin",
                "full_name": full_name
            }
        })
        
        if result.get('error'):
            error_msg = result['error'].get('message', 'Errore sconosciuto')
            return jsonify({"error": error_msg}), 400
        
        user = result.get('user')
        
        return jsonify({
            "success": True,
            "message": "Admin creato con successo su Supabase!",
            "user": {
                "id": user.get('id'),
                "email": user.get('email'),
                "role": "admin"
            },
            "next_steps": [
                "Vai al login: /login.html",
                "Accedi con email e password appena create"
            ]
        })
        
    except Exception as e:
        logger.error(f"Error creating admin: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
