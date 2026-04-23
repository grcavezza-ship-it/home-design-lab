#!/usr/bin/env python3
"""
Script di avvio per il server Flask del sito Home Design Lab
"""

import sys
import os

# Aggiungi la directory corrente al Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app
    print(" Avvio del Home Design Lab Dynamic Server...")
    print(" Server disponibile su: http://localhost:5000")
    print(" Per fermare il server, premere Ctrl+C")
    print("=" * 50)
    
    # Avvia il server in modalità debug
    app.run(debug=True, host='0.0.0.0', port=5000)
    
except ImportError as e:
    print(f" Errore di importazione: {e}")
    print(" Eseguire 'pip install -r requirements.txt' per installare le dipendenze")
    sys.exit(1)
except Exception as e:
    print(f" Errore durante l'avvio: {e}")
    sys.exit(1)
