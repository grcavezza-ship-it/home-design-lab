import os
import json
import gzip
import shutil
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
try:
    from supabase import Client
    SUPABASE_AVAILABLE = True
except ImportError:
    Client = None
    SUPABASE_AVAILABLE = False
from utils.logger import logger

class BackupManager:
    """Sistema di backup automatico per i dati di Home Design Lab"""
    
    def __init__(self, supabase_client: Optional[Client] = None):
        self.supabase = supabase_client
        self.backup_dir = "backups"
        self.max_backups = 30  # Mantiene 30 giorni di backup
        self.compression_level = 6
        
        # Crea directory backup se non esiste
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
            logger.info(f"Created backup directory: {self.backup_dir}")
    
    def create_backup(self, backup_type: str = "full") -> Dict[str, Any]:
        """Crea un backup completo dei dati"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"backup_{backup_type}_{timestamp}.json.gz"
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        backup_data = {
            "metadata": {
                "type": backup_type,
                "timestamp": timestamp,
                "created_at": datetime.utcnow().isoformat(),
                "version": "1.0.0"
            },
            "data": {}
        }
        
        try:
            # Backup dei progetti
            if self.supabase:
                backup_data["data"]["projects"] = self._backup_table("projects")
                backup_data["data"]["properties"] = self._backup_table("properties")
                backup_data["data"]["articles"] = self._backup_table("articles")
                backup_data["data"]["profiles"] = self._backup_table("profiles")
            else:
                logger.warning("Supabase client not available, backup will be empty")
            
            # Comprimi e salva il backup
            with gzip.open(backup_path, 'wt', encoding='utf-8', compresslevel=self.compression_level) as f:
                json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
            # Calcola statistiche
            file_size = os.path.getsize(backup_path)
            
            backup_info = {
                "success": True,
                "filename": backup_filename,
                "path": backup_path,
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "records_count": self._count_records(backup_data["data"]),
                "timestamp": timestamp
            }
            
            logger.info(f"Backup created successfully", extra=backup_info)
            
            # Pulizia vecchi backup
            self._cleanup_old_backups()
            
            return backup_info
            
        except Exception as e:
            error_info = {
                "success": False,
                "error": str(e),
                "timestamp": timestamp
            }
            logger.error("Backup creation failed", exception=e, extra=error_info)
            return error_info
    
    def _backup_table(self, table_name: str) -> List[Dict[str, Any]]:
        """Esegue il backup di una tabella specifica"""
        try:
            response = self.supabase.table(table_name).select('*').execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Failed to backup table {table_name}", exception=e)
            return []
    
    def _count_records(self, data: Dict[str, Any]) -> int:
        """Conta il numero totale di record nel backup"""
        return sum(len(records) for records in data.values() if isinstance(records, list))
    
    def _cleanup_old_backups(self):
        """Rimuove i backup più vecchi di max_backups giorni"""
        cutoff_date = datetime.now() - timedelta(days=self.max_backups)
        removed_count = 0
        
        for filename in os.listdir(self.backup_dir):
            if filename.startswith("backup_") and filename.endswith(".json.gz"):
                file_path = os.path.join(self.backup_dir, filename)
                
                # Estrai la data dal filename
                try:
                    date_str = filename.split("_")[2]  # formato YYYYMMDD_HHMMSS
                    file_date = datetime.strptime(date_str, "%Y%m%d_%H%M%S")
                    
                    if file_date < cutoff_date:
                        os.remove(file_path)
                        removed_count += 1
                        logger.debug(f"Removed old backup: {filename}")
                        
                except (IndexError, ValueError):
                    # Se non riesce a parsare la data, ignora il file
                    continue
        
        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} old backup files")
    
    def restore_backup(self, backup_filename: str) -> Dict[str, Any]:
        """Ripristina i dati da un backup"""
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        if not os.path.exists(backup_path):
            return {
                "success": False,
                "error": f"Backup file not found: {backup_filename}"
            }
        
        try:
            # Decomprimi e carica il backup
            with gzip.open(backup_path, 'rt', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            # Verifica validità backup
            if "data" not in backup_data:
                return {
                    "success": False,
                    "error": "Invalid backup format: missing data section"
                }
            
            restored_records = 0
            
            # Ripristina ogni tabella
            for table_name, records in backup_data["data"].items():
                if isinstance(records, list) and self.supabase:
                    try:
                        # Prima svuota la tabella (opzionale - attenzione!)
                        # self.supabase.table(table_name).delete().neq('id', -1).execute()
                        
                        # Inserisci i record
                        for record in records:
                            self.supabase.table(table_name).insert(record).execute()
                            restored_records += 1
                        
                        logger.info(f"Restored {len(records)} records to {table_name}")
                        
                    except Exception as e:
                        logger.error(f"Failed to restore table {table_name}", exception=e)
            
            result = {
                "success": True,
                "restored_records": restored_records,
                "backup_metadata": backup_data.get("metadata", {}),
                "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S")
            }
            
            logger.info(f"Backup restored successfully", extra=result)
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S")
            }
            logger.error("Backup restoration failed", exception=e, extra=error_result)
            return error_result
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """Elenca tutti i backup disponibili"""
        backups = []
        
        for filename in os.listdir(self.backup_dir):
            if filename.startswith("backup_") and filename.endswith(".json.gz"):
                file_path = os.path.join(self.backup_dir, filename)
                stat = os.stat(file_path)
                
                try:
                    # Estrai metadata dal filename
                    parts = filename.replace(".json.gz", "").split("_")
                    backup_type = parts[1] if len(parts) > 2 else "unknown"
                    timestamp_str = parts[2] if len(parts) > 2 else "unknown"
                    
                    backups.append({
                        "filename": filename,
                        "type": backup_type,
                        "timestamp": timestamp_str,
                        "size_bytes": stat.st_size,
                        "size_mb": round(stat.st_size / (1024 * 1024), 2),
                        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
                    
                except Exception:
                    continue
        
        # Ordina per data (più recenti prima)
        backups.sort(key=lambda x: x["timestamp"], reverse=True)
        return backups
    
    def get_backup_stats(self) -> Dict[str, Any]:
        """Ottieni statistiche sui backup"""
        backups = self.list_backups()
        total_size = sum(b["size_bytes"] for b in backups)
        
        return {
            "total_backups": len(backups),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "oldest_backup": backups[-1]["timestamp"] if backups else None,
            "newest_backup": backups[0]["timestamp"] if backups else None,
            "backup_types": list(set(b["type"] for b in backups))
        }

# Istanza globale del backup manager
backup_manager = None

def init_backup_manager(supabase_client: Client):
    """Inizializza il backup manager globale"""
    global backup_manager
    backup_manager = BackupManager(supabase_client)
    logger.info("Backup manager initialized")

def get_backup_manager() -> Optional[BackupManager]:
    """Ottieni l'istanza del backup manager"""
    return backup_manager
