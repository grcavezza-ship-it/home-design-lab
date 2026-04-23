#!/usr/bin/env python3
"""
Script per testare le API endpoints implementate
Home Design Lab - API Test Suite
"""

import sys
import os
import json
import time
from datetime import datetime

# Aggiungi la directory corrente al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_api_endpoints():
    """Test delle API endpoints implementate"""
    print("🔍 Test delle API endpoints...")
    
    try:
        import app
        flask_app = app.app
        
        # Crea un client di test
        with flask_app.test_client() as client:
            tests_passed = 0
            total_tests = 0
            
            # Test Health Check
            total_tests += 1
            response = client.get('/api/health')
            if response.status_code == 200:
                data = json.loads(response.data)
                if 'status' in data and data['status'] == 'healthy':
                    print("✅ Health Check API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Health Check API risposta non valida")
            else:
                print(f"❌ Health Check API status: {response.status_code}")
            
            # Test Cache Stats
            total_tests += 1
            response = client.get('/api/cache/stats')
            if response.status_code == 200:
                data = json.loads(response.data)
                if 'total_entries' in data:
                    print("✅ Cache Stats API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Cache Stats API risposta non valida")
            else:
                print(f"❌ Cache Stats API status: {response.status_code}")
            
            # Test Cache Clear
            total_tests += 1
            response = client.post('/api/cache/clear')
            if response.status_code == 200:
                print("✅ Cache Clear API funzionante")
                tests_passed += 1
            else:
                print(f"❌ Cache Clear API status: {response.status_code}")
            
            # Test Monitoring Metrics
            total_tests += 1
            response = client.get('/api/monitoring/metrics')
            if response.status_code == 200:
                data = json.loads(response.data)
                if 'requests' in data and 'system' in data:
                    print("✅ Monitoring Metrics API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Monitoring Metrics API risposta non valida")
            else:
                print(f"❌ Monitoring Metrics API status: {response.status_code}")
            
            # Test Monitoring Alerts
            total_tests += 1
            response = client.get('/api/monitoring/alerts')
            if response.status_code == 200:
                data = json.loads(response.data)
                if 'alerts' in data:
                    print("✅ Monitoring Alerts API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Monitoring Alerts API risposta non valida")
            else:
                print(f"❌ Monitoring Alerts API status: {response.status_code}")
            
            # Test Backup Stats
            total_tests += 1
            response = client.get('/api/backup/stats')
            if response.status_code == 200:
                data = json.loads(response.data)
                if 'total_backups' in data:
                    print("✅ Backup Stats API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Backup Stats API risposta non valida")
            else:
                print(f"❌ Backup Stats API status: {response.status_code}")
            
            # Test Progetti API
            total_tests += 1
            response = client.get('/api/progetti')
            if response.status_code == 200:
                data = json.loads(response.data)
                if isinstance(data, list):
                    print("✅ Progetti API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Progetti API risposta non valida")
            else:
                print(f"❌ Progetti API status: {response.status_code}")
            
            # Test Immobili API
            total_tests += 1
            response = client.get('/api/immobili')
            if response.status_code == 200:
                data = json.loads(response.data)
                if isinstance(data, list):
                    print("✅ Immobili API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Immobili API risposta non valida")
            else:
                print(f"❌ Immobili API status: {response.status_code}")
            
            # Test Articoli API
            total_tests += 1
            response = client.get('/api/articoli')
            if response.status_code == 200:
                data = json.loads(response.data)
                if isinstance(data, list):
                    print("✅ Articoli API funzionante")
                    tests_passed += 1
                else:
                    print("❌ Articoli API risposta non valida")
            else:
                print(f"❌ Articoli API status: {response.status_code}")
            
            print(f"\n📊 Risultati API Test: {tests_passed}/{total_tests} superati")
            return tests_passed == total_tests
            
    except Exception as e:
        print(f"❌ Errore durante test API: {e}")
        return False

def test_frontend_integration():
    """Test integrazione frontend con nuovo sistema"""
    print("\n🌐 Test integrazione frontend...")
    
    try:
        import app
        flask_app = app.app
        
        with flask_app.test_client() as client:
            # Test homepage
            response = client.get('/')
            if response.status_code == 200:
                print("✅ Homepage caricata correttamente")
            else:
                print(f"❌ Homepage status: {response.status_code}")
                return False
            
            # Test portfolio
            response = client.get('/portfolio')
            if response.status_code == 200:
                print("✅ Portfolio caricato correttamente")
            else:
                print(f"❌ Portfolio status: {response.status_code}")
                return False
            
            # Test collection
            response = client.get('/collection')
            if response.status_code == 200:
                print("✅ Collection caricata correttamente")
            else:
                print(f"❌ Collection status: {response.status_code}")
                return False
            
            # Test journal
            response = client.get('/journal')
            if response.status_code == 200:
                print("✅ Journal caricato correttamente")
            else:
                print(f"❌ Journal status: {response.status_code}")
                return False
            
            return True
            
    except Exception as e:
        print(f"❌ Errore durante test frontend: {e}")
        return False

def main():
    """Funzione principale di test"""
    print("🚀 Inizio test API endpoints e integrazione")
    print("=" * 50)
    
    # Test API endpoints
    api_success = test_api_endpoints()
    
    # Test integrazione frontend
    frontend_success = test_frontend_integration()
    
    # Riepilogo
    print("\n" + "=" * 50)
    print("📊 RIEPILOGO TEST")
    print("=" * 50)
    
    print(f"API Endpoints............. {'✅ PASSATO' if api_success else '❌ FALLITO'}")
    print(f"Integrazione Frontend.... {'✅ PASSATO' if frontend_success else '❌ FALLITO'}")
    
    if api_success and frontend_success:
        print("\n🎉 Tutti i test superati! Il sistema è pronto per produzione.")
        return True
    else:
        print("\n⚠️ Alcuni test sono falliti. Controllare gli errori sopra.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
