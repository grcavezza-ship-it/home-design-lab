import time
import json
import hashlib
from typing import Any, Optional, Dict, Callable
from functools import wraps
from utils.logger import logger

class MemoryCache:
    """Sistema di cache in memoria per Home Design Lab"""
    
    def __init__(self, default_ttl: int = 300):  # 5 minuti default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Genera una chiave di cache univoca"""
        key_data = f"{prefix}:{str(args)}:{str(sorted(kwargs.items()))}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Ottieni valore dalla cache"""
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        if time.time() > entry['expires_at']:
            del self.cache[key]
            logger.debug(f"Cache expired for key: {key}")
            return None
        
        logger.debug(f"Cache hit for key: {key}")
        return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Imposta valore nella cache"""
        expires_at = time.time() + (ttl or self.default_ttl)
        self.cache[key] = {
            'value': value,
            'expires_at': expires_at,
            'created_at': time.time()
        }
        logger.debug(f"Cache set for key: {key}, TTL: {ttl or self.default_ttl}s")
    
    def delete(self, key: str) -> bool:
        """Elimina valore dalla cache"""
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"Cache deleted for key: {key}")
            return True
        return False
    
    def clear(self) -> None:
        """Svuota tutta la cache"""
        count = len(self.cache)
        self.cache.clear()
        logger.info(f"Cache cleared, removed {count} entries")
    
    def cleanup_expired(self) -> int:
        """Rimuove le entry scadute"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self.cache.items()
            if current_time > entry['expires_at']
        ]
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
        
        return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """Ottieni statistiche della cache"""
        current_time = time.time()
        total_entries = len(self.cache)
        expired_entries = sum(
            1 for entry in self.cache.values()
            if current_time > entry['expires_at']
        )
        
        return {
            'total_entries': total_entries,
            'active_entries': total_entries - expired_entries,
            'expired_entries': expired_entries,
            'memory_usage_estimate': sum(
                len(str(entry['value'])) for entry in self.cache.values()
            )
        }

# Istanza globale della cache
cache = MemoryCache()

def cached(prefix: str, ttl: Optional[int] = None):
    """Decorator per cache automatica delle funzioni"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Genera chiave di cache
            cache_key = cache._generate_key(prefix, *args, **kwargs)
            
            # Prova a ottenere dalla cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Esegui la funzione e metti in cache
            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            cache.set(cache_key, result, ttl)
            
            logger.info(f"Function {func.__name__} cached", extra={
                'cache_key': cache_key,
                'execution_time': execution_time,
                'ttl': ttl
            })
            
            return result
        
        return wrapper
    return decorator

def invalidate_cache_pattern(pattern: str) -> int:
    """Invalida tutte le chiavi che corrispondono al pattern"""
    keys_to_delete = [
        key for key in cache.cache.keys()
        if pattern in key
    ]
    
    for key in keys_to_delete:
        cache.delete(key)
    
    logger.info(f"Invalidated {len(keys_to_delete)} cache entries matching pattern: {pattern}")
    return len(keys_to_delete)

# Cache specifiche per i dati del sito
class SiteCache:
    """Cache specializzata per i dati del sito"""
    
    @staticmethod
    @cached("projects", ttl=600)  # 10 minuti
    def get_projects():
        """Cache per i progetti"""
        pass  # Sarà implementato in app.py
    
    @staticmethod
    @cached("properties", ttl=600)  # 10 minuti
    def get_properties():
        """Cache per gli immobili"""
        pass  # Sarà implementato in app.py
    
    @staticmethod
    @cached("articles", ttl=1800)  # 30 minuti
    def get_articles():
        """Cache per gli articoli"""
        pass  # Sarà implementato in app.py
    
    @staticmethod
    def invalidate_all_content():
        """Invalida tutta la cache dei contenuti"""
        invalidate_cache_pattern("projects")
        invalidate_cache_pattern("properties")
        invalidate_cache_pattern("articles")
        logger.info("All content cache invalidated")
