import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Optional, Dict, Any
import json

class HomeDesignLogger:
    """Sistema di logging centralizzato per Home Design Lab"""
    
    def __init__(self, name: str = "homedesignlab", log_level: str = "INFO"):
        self.name = name
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, log_level.upper()))
        
        # Evita duplicazioni di handler
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """Configura gli handler per il logging"""
        
        # Crea la directory logs se non esiste
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # Formatter dettagliato
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        
        # File handler per log generali (con rotazione)
        file_handler = RotatingFileHandler(
            f'{log_dir}/app.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # File handler per errori
        error_handler = RotatingFileHandler(
            f'{log_dir}/errors.log',
            maxBytes=5*1024*1024,  # 5MB
            backupCount=3
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        self.logger.addHandler(error_handler)
        
        # Console handler per sviluppo
        if os.getenv('FLASK_ENV') == 'development':
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)
    
    def info(self, message: str, extra: Optional[Dict[str, Any]] = None):
        """Log informativo"""
        if extra:
            message = f"{message} | Extra: {json.dumps(extra)}"
        self.logger.info(message)
    
    def error(self, message: str, exception: Optional[Exception] = None, extra: Optional[Dict[str, Any]] = None):
        """Log di errore"""
        if exception:
            message = f"{message} | Exception: {str(exception)}"
        if extra:
            message = f"{message} | Extra: {json.dumps(extra)}"
        self.logger.error(message)
    
    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None):
        """Log di warning"""
        if extra:
            message = f"{message} | Extra: {json.dumps(extra)}"
        self.logger.warning(message)
    
    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None):
        """Log di debug"""
        if extra:
            message = f"{message} | Extra: {json.dumps(extra)}"
        self.logger.debug(message)
    
    def api_request(self, method: str, endpoint: str, user_id: Optional[str] = None, 
                   status_code: Optional[int] = None, response_time: Optional[float] = None):
        """Log delle richieste API"""
        extra = {
            "method": method,
            "endpoint": endpoint,
            "user_id": user_id,
            "status_code": status_code,
            "response_time_ms": response_time * 1000 if response_time else None,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.info(f"API Request: {method} {endpoint}", extra)
    
    def database_operation(self, operation: str, table: str, record_id: Optional[str] = None,
                          user_id: Optional[str] = None, success: bool = True):
        """Log delle operazioni database"""
        extra = {
            "operation": operation,
            "table": table,
            "record_id": record_id,
            "user_id": user_id,
            "success": success,
            "timestamp": datetime.utcnow().isoformat()
        }
        level = "info" if success else "error"
        getattr(self.logger, level)(f"DB Operation: {operation} on {table}", extra)
    
    def security_event(self, event_type: str, user_id: Optional[str] = None,
                      ip_address: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        """Log degli eventi di sicurezza"""
        extra = {
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.warning(f"Security Event: {event_type}", extra)

# Istanza globale del logger
logger = HomeDesignLogger()
