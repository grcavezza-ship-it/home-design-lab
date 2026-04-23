#!/usr/bin/env python3
"""
Script per debug dettagliato della migrazione SQL
Home Design Lab - SQL Debug Tool
"""

import sys
import os

def debug_sql_parentheses():
    """Debug dettagliato delle parentesi nel SQL"""
    print("🔍 Debug dettagliato parentesi SQL...")
    
    try:
        with open('supabase/migrations/001_create_data_tables.sql', 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        open_parens = 0
        close_parens = 0
        issues = []
        
        for i, line in enumerate(lines, 1):
            line_clean = line.strip()
            if not line_clean or line_clean.startswith('--'):
                continue
                
            # Conta parentesi nella riga
            line_open = line_clean.count('(')
            line_close = line_clean.count(')')
            
            open_parens += line_open
            close_parens += line_close
            
            current_balance = open_parens - close_parens
            
            # Mostra info per righe con parentesi
            if line_open > 0 or line_close > 0:
                print(f"Riga {i:3d}: ({line_open:2d}) ({line_close:2d}) Balance: {current_balance:+3d} | {line_clean[:60]}")
            
            # Controlla problemi
            if current_balance < 0:
                issues.append(f"Riga {i}: Parentesi chiuse senza apertura")
            elif line_open > 0 and line_close == 0:
                issues.append(f"Riga {i}: Parentesi aperte non chiuse nella stessa riga")
        
        print(f"\n📊 Totale parentesi:")
        print(f"   Aperte: {open_parens}")
        print(f"   Chiuse: {close_parens}")
        print(f"   Bilancio: {open_parens - close_parens}")
        
        if issues:
            print(f"\n❌ Problemi trovati:")
            for issue in issues:
                print(f"   {issue}")
        else:
            print(f"\n✅ Nessun problema di parentesi trovato")
        
        return len(issues) == 0
        
    except Exception as e:
        print(f"❌ Errore durante debug: {e}")
        return False

def analyze_sql_structure():
    """Analizza la struttura SQL per problemi comuni"""
    print("\n🏗️ Analisi struttura SQL...")
    
    try:
        with open('supabase/migrations/001_create_data_tables.sql', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Analisi pattern problematici
        issues = []
        
        # Controlla INSERT INTO senza VALUES corretto
        import re
        insert_pattern = r'INSERT INTO \w+ \([^)]+)\)(?!.*VALUES)'
        matches = re.findall(insert_pattern, content, re.IGNORECASE | re.MULTILINE)
        if matches:
            issues.append(f"INSERT INTO senza VALUES: {len(matches)} occorrenze")
        
        # Controlla funzioni PL/pgSQL
        if 'RETURNS TRIGGER AS $' in content and 'LANGUAGE plpgsql' not in content:
            issues.append("Funzione PL/pgSQL senza LANGUAGE specificato")
        
        # Controlla virgolette singole non bilanciate
        single_quotes = content.count("'")
        if single_quotes % 2 != 0:
            issues.append(f"Virgolette singole non bilanciate: {single_quotes}")
        
        # Controlla caratteri strani
        if '\x00' in content:
            issues.append("Caratteri null trovati nel file")
        
        if issues:
            print(f"\n❌ Problemi di struttura trovati:")
            for issue in issues:
                print(f"   {issue}")
        else:
            print(f"\n✅ Nessun problema di struttura trovato")
        
        return len(issues) == 0
        
    except Exception as e:
        print(f"❌ Errore durante analisi: {e}")
        return False

def create_clean_migration():
    """Crea una versione pulita della migrazione"""
    print("\n🧹 Creazione versione pulita...")
    
    try:
        with open('supabase/migrations/001_create_data_tables.sql', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Pulisci caratteri problematici
        clean_content = content.replace('\x00', '')
        
        # Salva versione pulita
        with open('supabase/migrations/001_create_data_tables_clean.sql', 'w', encoding='utf-8') as f:
            f.write(clean_content)
        
        print("✅ Versione pulita salvata come 001_create_data_tables_clean.sql")
        return True
        
    except Exception as e:
        print(f"❌ Errore creazione versione pulita: {e}")
        return False

def main():
    """Funzione principale di debug"""
    print("🚀 Debug dettagliato migrazione SQL")
    print("=" * 50)
    
    # Debug parentesi
    parens_ok = debug_sql_parentheses()
    
    # Analisi struttura
    structure_ok = analyze_sql_structure()
    
    # Crea versione pulita
    clean_ok = create_clean_migration()
    
    # Riepilogo
    print("\n" + "=" * 50)
    print("📊 RIEPILOGO DEBUG")
    print("=" * 50)
    
    print(f"Parentesi bilanciate.... {'✅ OK' if parens_ok else '❌ ERRORE'}")
    print(f"Struttura SQL.......... {'✅ OK' if structure_ok else '❌ ERRORE'}")
    print(f"Versione pulita....... {'✅ CREATA' if clean_ok else '❌ ERRORE'}")
    
    if parens_ok and structure_ok:
        print("\n🎉 La migrazione sembra sintatticamente corretta!")
        print("💡 Se hai ancora problemi, prova la versione pulita: 001_create_data_tables_clean.sql")
        return True
    else:
        print("\n⚠️ La migrazione ha problemi sintattici.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
