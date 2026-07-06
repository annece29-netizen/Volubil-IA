// Nettoyage par regles, applique dans les deux modes (avant Ollama en mode
// ameliore). Supprime hesitations, doublons, artefacts Whisper, corrige les
// espaces et la majuscule initiale.

const HESITATIONS = ['euh+', 'heu+', 'hum+', 'hmm+', 'mmh+', 'bah euh'];

const ARTEFACTS = [
  /\[BLANK_AUDIO\]/gi,
  /\[MUSIC\]/gi,
  /\(\s*\.\.\.\s*\)/g,
  /\[[^\]]*sous-titr[^\]]*\]/gi,
];

function nettoyerHesitations(texte) {
  let resultat = texte;
  for (const motif of HESITATIONS) {
    // Hesitation isolee, avec la ponctuation/virgule qui l'entoure eventuellement.
    const regex = new RegExp(`(^|[\\s,.;:!?])\\b(${motif})\\b[\\s,]*`, 'gi');
    resultat = resultat.replace(regex, (correspondance, avant) => {
      // Le motif consomme le blanc avant ET les blancs apres : il faut en
      // restituer un, sinon les mots voisins se collent ("bonjourdemain").
      // corrigerEspaces compressera les doublons ensuite.
      if (avant && /\s/.test(avant)) return ' ';
      return avant || '';
    });
  }
  return resultat;
}

function reduireDoublons(texte) {
  // "le le" -> "le", mais on garde les repetitions legitimes de "nous"/"vous".
  return texte.replace(
    /\b(\p{L}+)\b(\s+\1\b)+/giu,
    (correspondance, mot) => {
      const motMinuscule = mot.toLowerCase();
      if (motMinuscule === 'nous' || motMinuscule === 'vous') return correspondance;
      return mot;
    }
  );
}

function corrigerEspaces(texte) {
  let resultat = texte;
  // Pas d'espace avant , et . ; un espace apres si suivi d'un caractere.
  resultat = resultat.replace(/\s+([.,])/g, '$1');
  resultat = resultat.replace(/([.,])(?=\S)/g, '$1 ');
  // Espace simple acceptee avant ?!;: (convention francaise simplifiee).
  resultat = resultat.replace(/\s*([?!;:])/g, ' $1');
  resultat = resultat.replace(/([?!;:])(?=\S)/g, '$1 ');
  // Compresser les espaces multiples.
  resultat = resultat.replace(/[ \t]+/g, ' ');
  resultat = resultat.replace(/ +\n/g, '\n');
  resultat = resultat.trim();
  return resultat;
}

function mettreMajusculeInitiale(texte) {
  if (!texte) return texte;
  const premierCaractereIndex = texte.search(/\p{L}/u);
  if (premierCaractereIndex === -1) return texte;
  return (
    texte.slice(0, premierCaractereIndex) +
    texte[premierCaractereIndex].toUpperCase() +
    texte.slice(premierCaractereIndex + 1)
  );
}

function supprimerArtefacts(texte) {
  let resultat = texte;
  for (const motif of ARTEFACTS) {
    resultat = resultat.replace(motif, '');
  }
  return resultat;
}

function nettoyerSimple(texteBrut) {
  if (!texteBrut) return '';
  let texte = texteBrut;
  texte = supprimerArtefacts(texte);
  texte = nettoyerHesitations(texte);
  texte = reduireDoublons(texte);
  texte = corrigerEspaces(texte);
  texte = mettreMajusculeInitiale(texte);
  return texte;
}

module.exports = { nettoyerSimple };
