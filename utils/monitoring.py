import time
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict, deque
from utils.logger import logger

class PerformanceMonitor:
    """Sistema di monitoring delle performance per Home Design Lab"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.metrics_history = defaultdict(lambda: deque(maxlen=max_history))
        self.alerts = []
        self.thresholds = {
            'response_time_ms': 2000,  # 2 secondi
            'cpu_percent': 80,          # 80%
            'memory_percent': 85,       # 85%
            'disk_percent': 90,         # 90%
            'error_rate': 5.0           # 5%
        }
        self.start_time = time.time()
        self._lock = threading.Lock()
        
        # Avvia il monitoring in background
        self.monitoring_thread = threading.Thread(target=self._background_monitoring, daemon=True)
        self.monitoring_thread.start()
        
        logger.info("Performance monitor initialized")
    
    def record_request(self, endpoint: str, method: str, status_code: int, 
                      response_time: float, user_id: Optional[str] = None):
        """Registra una richiesta HTTP"""
        timestamp = datetime.utcnow()
        
        metric = {
            'timestamp': timestamp.isoformat(),
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code,
            'response_time_ms': response_time * 1000,
            'user_id': user_id,
            'is_error': status_code >= 400
        }
        
        with self._lock:
            self.metrics_history['requests'].append(metric)
        
        # Controlla soglie di allerta
        if response_time * 1000 > self.thresholds['response_time_ms']:
            self._create_alert('slow_request', f"Slow request to {endpoint}", metric)
        
        if status_code >= 500:
            self._create_alert('server_error', f"Server error on {endpoint}", metric)
    
    def record_database_operation(self, operation: str, table: str, 
                                duration: float, success: bool = True):
        """Registra un'operazione database"""
        timestamp = datetime.utcnow()
        
        metric = {
            'timestamp': timestamp.isoformat(),
            'operation': operation,
            'table': table,
            'duration_ms': duration * 1000,
            'success': success
        }
        
        with self._lock:
            self.metrics_history['database'].append(metric)
        
        if not success:
            self._create_alert('database_error', f"Database operation failed: {operation} on {table}", metric)
    
    def record_cache_operation(self, operation: str, key: str, hit: bool = None):
        """Registra un'operazione di cache"""
        timestamp = datetime.utcnow()
        
        metric = {
            'timestamp': timestamp.isoformat(),
            'operation': operation,
            'key': key,
            'hit': hit
        }
        
        with self._lock:
            self.metrics_history['cache'].append(metric)
    
    def _background_monitoring(self):
        """Monitoring in background delle risorse di sistema"""
        while True:
            try:
                timestamp = datetime.utcnow()
                
                # Metriche di sistema
                system_metrics = {
                    'timestamp': timestamp.isoformat(),
                    'cpu_percent': psutil.cpu_percent(interval=1),
                    'memory_percent': psutil.virtual_memory().percent,
                    'disk_percent': psutil.disk_usage('/').percent,
                    'active_connections': len(psutil.net_connections()),
                    'process_count': len(psutil.pids())
                }
                
                with self._lock:
                    self.metrics_history['system'].append(system_metrics)
                
                # Controlla soglie di sistema
                if system_metrics['cpu_percent'] > self.thresholds['cpu_percent']:
                    self._create_alert('high_cpu', f"High CPU usage: {system_metrics['cpu_percent']}%", system_metrics)
                
                if system_metrics['memory_percent'] > self.thresholds['memory_percent']:
                    self._create_alert('high_memory', f"High memory usage: {system_metrics['memory_percent']}%", system_metrics)
                
                if system_metrics['disk_percent'] > self.thresholds['disk_percent']:
                    self._create_alert('high_disk', f"High disk usage: {system_metrics['disk_percent']}%", system_metrics)
                
                # Pulisci vecchie metriche
                self._cleanup_old_metrics()
                
                time.sleep(30)  # Monitoring ogni 30 secondi
                
            except Exception as e:
                logger.error("Error in background monitoring", exception=e)
                time.sleep(60)  # Attendi 1 minuto in caso di errore
    
    def _create_alert(self, alert_type: str, message: str, data: Dict[str, Any]):
        """Crea un alert"""
        alert = {
            'id': len(self.alerts) + 1,
            'timestamp': datetime.utcnow().isoformat(),
            'type': alert_type,
            'message': message,
            'data': data,
            'severity': self._get_severity(alert_type)
        }
        
        with self._lock:
            self.alerts.append(alert)
            # Mantieni solo gli ultimi 100 alert
            if len(self.alerts) > 100:
                self.alerts = self.alerts[-100:]
        
        logger.warning(f"Performance alert: {message}", extra={'alert': alert})
    
    def _get_severity(self, alert_type: str) -> str:
        """Determina la severità dell'alert"""
        severity_map = {
            'slow_request': 'medium',
            'server_error': 'high',
            'database_error': 'high',
            'high_cpu': 'medium',
            'high_memory': 'medium',
            'high_disk': 'low'
        }
        return severity_map.get(alert_type, 'medium')
    
    def _cleanup_old_metrics(self):
        """Pulisce le metriche vecchie"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        with self._lock:
            for metric_type in self.metrics_history:
                # Rimuovi metriche più vecchie di 24 ore
                self.metrics_history[metric_type] = deque(
                    [m for m in self.metrics_history[metric_type] 
                     if datetime.fromisoformat(m['timestamp']) > cutoff_time],
                    maxlen=self.max_history
                )
    
    def get_metrics_summary(self, time_range_minutes: int = 60) -> Dict[str, Any]:
        """Ottieni un riepilogo delle metriche"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=time_range_minutes)
        
        with self._lock:
            # Metriche delle richieste
            recent_requests = [
                r for r in self.metrics_history['requests']
                if datetime.fromisoformat(r['timestamp']) > cutoff_time
            ]
            
            requests_summary = {}
            if recent_requests:
                response_times = [r['response_time_ms'] for r in recent_requests]
                error_count = sum(1 for r in recent_requests if r['is_error'])
                
                requests_summary = {
                    'total_requests': len(recent_requests),
                    'error_rate_percent': (error_count / len(recent_requests)) * 100,
                    'avg_response_time_ms': sum(response_times) / len(response_times),
                    'max_response_time_ms': max(response_times),
                    'min_response_time_ms': min(response_times),
                    'p95_response_time_ms': sorted(response_times)[int(len(response_times) * 0.95)]
                }
            
            # Metriche di sistema
            recent_system = [
                s for s in self.metrics_history['system']
                if datetime.fromisoformat(s['timestamp']) > cutoff_time
            ]
            
            system_summary = {}
            if recent_system:
                system_summary = {
                    'avg_cpu_percent': sum(s['cpu_percent'] for s in recent_system) / len(recent_system),
                    'max_cpu_percent': max(s['cpu_percent'] for s in recent_system),
                    'avg_memory_percent': sum(s['memory_percent'] for s in recent_system) / len(recent_system),
                    'max_memory_percent': max(s['memory_percent'] for s in recent_system),
                    'avg_disk_percent': sum(s['disk_percent'] for s in recent_system) / len(recent_system)
                }
            
            # Metriche database
            recent_db = [
                d for d in self.metrics_history['database']
                if datetime.fromisoformat(d['timestamp']) > cutoff_time
            ]
            
            db_summary = {}
            if recent_db:
                durations = [d['duration_ms'] for d in recent_db]
                error_count = sum(1 for d in recent_db if not d['success'])
                
                db_summary = {
                    'total_operations': len(recent_db),
                    'error_rate_percent': (error_count / len(recent_db)) * 100,
                    'avg_duration_ms': sum(durations) / len(durations),
                    'max_duration_ms': max(durations)
                }
            
            # Metriche cache
            recent_cache = [
                c for c in self.metrics_history['cache']
                if datetime.fromisoformat(c['timestamp']) > cutoff_time
            ]
            
            cache_summary = {}
            if recent_cache:
                hits = sum(1 for c in recent_cache if c.get('hit') is True)
                misses = sum(1 for c in recent_cache if c.get('hit') is False)
                total = hits + misses
                
                cache_summary = {
                    'total_operations': len(recent_cache),
                    'hit_rate_percent': (hits / total * 100) if total > 0 else 0,
                    'hits': hits,
                    'misses': misses
                }
        
        return {
            'time_range_minutes': time_range_minutes,
            'uptime_seconds': time.time() - self.start_time,
            'requests': requests_summary,
            'system': system_summary,
            'database': db_summary,
            'cache': cache_summary,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    def get_recent_alerts(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Ottieni gli alert più recenti"""
        with self._lock:
            return sorted(self.alerts, key=lambda x: x['timestamp'], reverse=True)[:limit]
    
    def get_endpoint_stats(self, endpoint: str = None) -> Dict[str, Any]:
        """Ottieni statistiche per endpoint specifico"""
        with self._lock:
            requests = self.metrics_history['requests']
            
            if endpoint:
                requests = [r for r in requests if r['endpoint'] == endpoint]
            
            if not requests:
                return {}
            
            # Raggruppa per endpoint
            endpoint_stats = defaultdict(list)
            for req in requests:
                endpoint_stats[req['endpoint']].append(req)
            
            summary = {}
            for ep, reqs in endpoint_stats.items():
                response_times = [r['response_time_ms'] for r in reqs]
                error_count = sum(1 for r in reqs if r['is_error'])
                
                summary[ep] = {
                    'request_count': len(reqs),
                    'error_rate_percent': (error_count / len(reqs)) * 100,
                    'avg_response_time_ms': sum(response_times) / len(response_times),
                    'max_response_time_ms': max(response_times),
                    'last_request': max(r['timestamp'] for r in reqs)
                }
            
            return summary

# Istanza globale del performance monitor
performance_monitor = None

def init_performance_monitor():
    """Inizializza il performance monitor globale"""
    global performance_monitor
    performance_monitor = PerformanceMonitor()
    logger.info("Performance monitor initialized")

def get_performance_monitor() -> Optional[PerformanceMonitor]:
    """Ottieni l'istanza del performance monitor"""
    return performance_monitor
