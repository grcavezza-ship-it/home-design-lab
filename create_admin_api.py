#!/usr/bin/env python3
"""
Script per creare admin user via Supabase API
Funziona con Python 3.x senza dipendenze problematiche
"""

import http.client
import json
import ssl

def create_admin_user():
    # Configurazione
    SUPABASE_URL = "fjwcgawzjfhqzjgztfgg.supabase.co"
    SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqd2NnYXd6amZocXpqZ3p0ZmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1NzQ0MzgsImV4cCI6MjA0NTE1MDQzOH0.qvJn-sxLr3J2i0X3xO1JdYk3m-7kXKzR0eF1bH2q0M"
    
    # Dati admin
    admin_email = "info@homedesignlab.it"
    admin_password = "Admin123456"  # Cambia questa!
    
    print(f"Creazione admin: {admin_email}")
    print("-" * 50)
    
    # Crea connessione HTTPS
    context = ssl.create_default_context()
    conn = http.client.HTTPSConnection(SUPABASE_URL, context=context)
    
    # Headers
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    
    # Body per signup
    payload = json.dumps({
        "email": admin_email,
        "password": admin_password,
        "data": {
            "role": "admin",
            "full_name": "Admin Home Design Lab"
        }
    })
    
    try:
        # Chiamata API signup
        conn.request("POST", "/auth/v1/signup", body=payload, headers=headers)
        response = conn.getresponse()
        data = response.read().decode()
        
        result = json.loads(data)
        
        if response.status == 200:
            print("✅ Admin creato con successo!")
            print(f"   User ID: {result.get('user', {}).get('id')}")
            print(f"   Email: {result.get('user', {}).get('email')}")
            print(f"   Role: admin")
            print("-" * 50)
            print("Puoi ora accedere con:")
            print(f"   Email: {admin_email}")
            print(f"   Password: {admin_password}")
            print("-" * 50)
            
            # Verifica se richiede conferma email
            if result.get('user', {}).get('confirmation_sent_at'):
                print("⚠️  Controlla l'email per confermare l'account")
            
            return True
        else:
            print(f"❌ Errore {response.status}:")
            print(f"   {result.get('error_description', result.get('msg', 'Errore sconosciuto'))}")
            return False
            
    except Exception as e:
        print(f"❌ Errore: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Home Design Lab - Admin Creator")
    print("=" * 50)
    print()
    
    success = create_admin_user()
    
    if not success:
        print()
        print("Alternativa: Usa la dashboard Supabase:")
        print("1. Vai su https://supabase.com/dashboard")
        print("2. Progetto: fjwcgawzjfhqzjgztfgg")
        print("3. Authentication → Users → Add User")
        print("4. Inserisci email e password, metti role=admin nei metadata")
