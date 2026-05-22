const fs = require('fs');
const path = require('path');

const srcBase = 'C:\\Users\\Gianni\\OneDrive\\Desktop\\Sito\\Home Design Lab rev2';
const dstBase = 'D:\\Lavoro\\Home Design Lab\\Sito\\Home Design Lab rev2';

const files = [
  'templates/index.html', 'templates/collection.html', 'templates/portfolio.html',
  'templates/servizi-lab.html', 'templates/chi-siamo.html', 'templates/login.html',
  'templates/imposta-password.html', 'templates/journal.html', 'templates/dettaglio-journal.html',
  'templates/contatti.html', 'templates/dettaglio-progetto.html', 'templates/dettaglio-immobile.html',
  'templates/portale-cliente.html', 'templates/setup-admin.html',
  '404.html', 'profilo.html', 'area-cliente.html',
  'gestione-progetti.html', 'gestione-compiti.html', 'dashboard-operatore.html',
  'dashboard-senior.html', 'gestione-journal.html', 'gestione-clienti.html',
  'gestione-immobili.html', 'creazione-immobile.html', 'dettaglio-cliente.html',
  'dettaglio-assegnazione.html', 'dettaglio-progetto.html', 'dettaglio-progetto rev2.html',
  'gestione-team.html', 'gestione-team rev2.html', 'gestione-clienti-new.html',
  'dashboard-generale.html', 'privacy.html', 'termini.html',
  'middleware/auth.mjs', 'routes/api.mjs', 'server.mjs',
  'config.js', 'package.json'
];

var count = 0;
files.forEach(function(f) {
  var sp = path.join(srcBase, f);
  var dp = path.join(dstBase, f);
  if (fs.existsSync(sp)) {
    fs.mkdirSync(path.dirname(dp), { recursive: true });
    fs.copyFileSync(sp, dp);
    count++;
  }
});
console.log('Copiati ' + count + ' file da C: a D:');
