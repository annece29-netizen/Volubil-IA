// Verifie la syntaxe de tous les fichiers .js du projet avec `node --check`.
// Sert de filet de securite avant chaque build (local et CI).
// Usage : node tools/check.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const dossiers = ['main', 'renderer', 'tools'];
const fichiersRacine = ['preload.js'];

function listerFichiersJs(dossier) {
  const resultats = [];
  const entrees = fs.readdirSync(dossier, { withFileTypes: true });
  for (const entree of entrees) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) {
      resultats.push(...listerFichiersJs(chemin));
    } else if (entree.isFile() && chemin.endsWith('.js')) {
      resultats.push(chemin);
    }
  }
  return resultats;
}

let fichiers = [];
for (const dossier of dossiers) {
  const chemin = path.join(racine, dossier);
  if (fs.existsSync(chemin)) fichiers.push(...listerFichiersJs(chemin));
}
for (const fichier of fichiersRacine) {
  const chemin = path.join(racine, fichier);
  if (fs.existsSync(chemin)) fichiers.push(chemin);
}

console.log(`Verification de ${fichiers.length} fichier(s) JavaScript...`);

let erreurs = 0;
for (const fichier of fichiers) {
  try {
    execFileSync(process.execPath, ['--check', fichier], { stdio: 'pipe' });
    console.log(`  OK   ${path.relative(racine, fichier)}`);
  } catch (err) {
    erreurs++;
    console.error(`  FAIL ${path.relative(racine, fichier)}`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
  }
}

if (erreurs > 0) {
  console.error(`\n${erreurs} fichier(s) en erreur.`);
  process.exit(1);
} else {
  console.log('\nTous les fichiers sont syntaxiquement valides.');
}
