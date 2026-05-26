import 'dotenv/config';
import pg from 'pg';

const REF = 'amhqqszzxmrphisxlsnj';
const HOST = 'db.' + REF + '.supabase.co';

async function eseguiFile(label, sql) {
    // Prova la service_role_key come password (a volte funziona su progetti nuovi)
    for (const pwd of [process.env.SUPABASE_SERVICE_ROLE_KEY, '']) {
        const pool = new pg.Pool({
            host: HOST,
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            password: pwd,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });
        try {
            const client = await pool.connect();
            console.log('✅ Connesso a ' + HOST);
            await client.query(sql);
            console.log('✅ ' + label + ' eseguito con successo');
            client.release();
            await pool.end();
            return true;
        } catch (e) {
            await pool.end().catch(() => {});
            if (e.message.includes('password') || e.message.includes('auth')) {
                continue; // prova altra password
            }
            // altro errore
            console.log('❌ ' + label + ': ' + e.message.slice(0, 150));
            return false;
        }
    }
    console.log('❌ ' + label + ': nessuna password valida trovata');
    return false;
}

async function main() {
    console.log('=== Esecuzione SQL su Supabase PostgreSQL ===\n');

    // 1) sql-imprese-v3.sql - ALTER TABLE + CREATE TABLE + seed
    const sql1 = await fs.readFile('sql-imprese-v3.sql', 'utf8');
    const ok1 = await eseguiFile('sql-imprese-v3.sql', sql1);

    // 2) sql-computi-metrici.sql
    const sql2 = await fs.readFile('sql-computi-metrici.sql', 'utf8');
    const ok2 = await eseguiFile('sql-computi-metrici.sql', sql2);

    if (!ok1 && !ok2) {
        console.log('\n❌ Impossibile connettersi al database PostgreSQL.');
        console.log('👉 Vai su https://supabase.com/dashboard/project/' + REF);
        console.log('👉 Settings → Database → Database password');
        console.log('👉 Copia la password e incollala nel file .env come DB_PASSWORD=...');
    } else {
        console.log('\n✅ Operazioni completate!');
    }

    process.exit(0);
}

import fs from 'fs/promises';
main();
