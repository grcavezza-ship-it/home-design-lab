#!/usr/bin/env python3
"""
Script per testare la migrazione SQL
Home Design Lab - Migration Test
"""

import sys
import os

def test_sql_syntax():
    """Test della sintassi SQL della migrazione"""
    print("🔍 Test sintassi SQL migrazione...")
    
    try:
        # Leggi il file di migrazione
        with open('supabase/migrations/001_create_data_tables.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("✅ File SQL letto correttamente")
        
        # Verifica elementi SQL fondamentali
        checks = [
            ("CREATE TABLE projects", "CREATE TABLE IF NOT EXISTS projects" in sql_content),
            ("CREATE TABLE properties", "CREATE TABLE IF NOT EXISTS properties" in sql_content),
            ("CREATE TABLE articles", "CREATE TABLE IF NOT EXISTS articles" in sql_content),
            ("INSERT INTO projects", "INSERT INTO projects" in sql_content),
            ("INSERT INTO properties", "INSERT INTO properties" in sql_content),
            ("INSERT INTO articles", "INSERT INTO articles" in sql_content),
            ("CREATE INDEX", "CREATE INDEX" in sql_content),
            ("ROW LEVEL SECURITY", "ROW LEVEL SECURITY" in sql_content),
            ("CREATE POLICY", "CREATE POLICY" in sql_content),
            ("CREATE TRIGGER", "CREATE TRIGGER" in sql_content),
        ]
        
        passed_checks = 0
        total_checks = len(checks)
        
        for check_name, condition in checks:
            if condition:
                print(f"✅ {check_name}")
                passed_checks += 1
            else:
                print(f"❌ {check_name}")
        
        # Verifica errori di sintassi comuni
        syntax_errors = []
        
        # Controlla che VALUES sia seguito correttamente
        if "INSERT INTO" in sql_content:
            import re
            insert_pattern = r'INSERT INTO \w+ \([^)]+)\)\s*VALUES\s*\('
            if not re.search(insert_pattern, sql_content, re.IGNORECASE):
                syntax_errors.append("INSERT INTO syntax error - VALUES non posizionato correttamente")
        
        # Controlla parentesi bilanciate
        open_parens = sql_content.count('(')
        close_parens = sql_content.count(')')
        if open_parens != close_parens:
            syntax_errors.append(f"Parentesi non bilanciate: {open_parens} aperte, {close_parens} chiuse")
        
        # Controlla virgolette bilanciate
        single_quotes = sql_content.count("'")
        if single_quotes % 2 != 0:
            syntax_errors.append(f"Virgolette singole non bilanciate: {single_quotes}")
        
        # Mostra errori di sintassi
        if syntax_errors:
            print("\n❌ Errori di sintassi trovati:")
            for error in syntax_errors:
                print(f"   - {error}")
            return False
        
        print(f"\n📊 Check SQL: {passed_checks}/{total_checks} superati")
        return passed_checks == total_checks
        
    except Exception as e:
        print(f"❌ Errore durante test SQL: {e}")
        return False

def test_migration_structure():
    """Test della struttura della migrazione"""
    print("\n🏗️ Test struttura migrazione...")
    
    try:
        with open('supabase/migrations/001_create_data_tables.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Verifica sezioni principali
        sections = [
            ("Tabella projects", "CREATE TABLE IF NOT EXISTS projects"),
            ("Tabella properties", "CREATE TABLE IF NOT EXISTS properties"), 
            ("Tabella articles", "CREATE TABLE IF NOT EXISTS articles"),
            ("Dati iniziali projects", "INSERT INTO projects"),
            ("Dati iniziali properties", "INSERT INTO properties"),
            ("Dati iniziali articles", "INSERT INTO articles"),
            ("Indici performance", "CREATE INDEX"),
            ("Sicurezza RLS", "ROW LEVEL SECURITY"),
            ("Policy accesso", "CREATE POLICY"),
            ("Trigger timestamp", "CREATE TRIGGER"),
        ]
        
        passed_sections = 0
        total_sections = len(sections)
        
        for section_name, pattern in sections:
            if pattern in sql_content:
                print(f"✅ {section_name}")
                passed_sections += 1
            else:
                print(f"❌ {section_name}")
        
        print(f"\n📊 Struttura: {passed_sections}/{total_sections} sezioni trovate")
        return passed_sections == total_sections
        
    except Exception as e:
        print(f"❌ Errore durante test struttura: {e}")
        return False

def generate_migration_summary():
    """Genera un riepilogo della migrazione"""
    print("\n📋 Riepilogo migrazione SQL...")
    
    try:
        with open('supabase/migrations/001_create_data_tables.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Conta elementi principali
        table_count = sql_content.count("CREATE TABLE IF NOT EXISTS")
        insert_count = sql_content.count("INSERT INTO")
        index_count = sql_content.count("CREATE INDEX")
        policy_count = sql_content.count("CREATE POLICY")
        trigger_count = sql_content.count("CREATE TRIGGER")
        
        print(f"📊 Statistiche SQL:")
        print(f"   - Tabelle create: {table_count}")
        print(f"   - Insert statements: {insert_count}")
        print(f"   - Indici creati: {index_count}")
        print(f"   - Policy create: {policy_count}")
        print(f"   - Trigger create: {trigger_count}")
        
        # Verifica che tutti i valori siano presenti
        expected_tables = ["projects", "properties", "articles"]
        created_tables = []
        
        for table in expected_tables:
            if f"CREATE TABLE IF NOT EXISTS {table}" in sql_content:
                created_tables.append(table)
        
        print(f"\n📋 Tabelle da creare: {', '.join(created_tables)}")
        
        return len(created_tables) == len(expected_tables)
        
    except Exception as e:
        print(f"❌ Errore durante riepilogo: {e}")
        return False

def main():
    """Funzione principale di test"""
    print("🚀 Inizio test migrazione SQL")
    print("=" * 50)
    
    # Test sintassi SQL
    syntax_ok = test_sql_syntax()
    
    # Test struttura migrazione
    structure_ok = test_migration_structure()
    
    # Riepilogo migrazione
    summary_ok = generate_migration_summary()
    
    # Riepilogo finale
    print("\n" + "=" * 50)
    print("📊 RIEPILOGO TEST MIGRAZIONE")
    print("=" * 50)
    
    print(f"Sintassi SQL............. {'✅ PASSATO' if syntax_ok else '❌ FALLITO'}")
    print(f"Struttura migrazione.... {'✅ PASSATO' if structure_ok else '❌ FALLITO'}")
    print(f"Riepilogo completo.... {'✅ PASSATO' if summary_ok else '❌ FALLITO'}")
    
    if syntax_ok and structure_ok and summary_ok:
        print("\n🎉 Migrazione SQL pronta per l'esecuzione!")
        print("\n📝 Istruzioni per eseguire la migrazione:")
        print("1. Apri il dashboard Supabase")
        print("2. Vai su SQL Editor")
        print("3. Copia e incolla il contenuto di supabase/migrations/001_create_data_tables.sql")
        print("4. Esegui lo script")
        print("5. Verifica che tutte le tabelle siano state create")
        return True
    else:
        print("\n⚠️ La migrazione ha problemi. Correggere gli errori prima di eseguirla.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
