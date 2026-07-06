// Correction rapide d'une dictee : edition manuelle du texte, diff mot a mot
// avec l'original, propositions d'ajout au dictionnaire personnel.

let entreeCourante = null;
let texteOriginal = '';

function diffMots(ancien, nouveau) {
  const motsAnciens = ancien.split(/\s+/).filter(Boolean);
  const motsNouveaux = nouveau.split(/\s+/).filter(Boolean);
  const paires = [];
  const longueur = Math.min(motsAnciens.length, motsNouveaux.length);

  for (let i = 0; i < longueur; i++) {
    if (motsAnciens[i] !== motsNouveaux[i]) {
      paires.push({ avant: motsAnciens[i], apres: motsNouveaux[i] });
    }
  }

  return paires;
}

function nettoyerPourDictionnaire(mot) {
  return mot.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function chargerEntree(entree) {
  entreeCourante = entree;
  if (!entreeCourante) return;

  texteOriginal = entreeCourante.text || '';
  document.getElementById('texte-correction').value = texteOriginal;
  document.getElementById('zone-suggestions').innerHTML = '';
  document.getElementById('message-confirmation').style.display = 'none';
}

async function initialiser() {
  const entree = await window.volubil.getEntreeCorrection();
  chargerEntree(entree);
}

// Si la fenetre de correction est deja ouverte et qu'on clique "Corriger"
// sur une autre entree, le main pousse la nouvelle entree ici plutot que
// d'ouvrir une seconde fenetre.
window.volubil.onCorrectionRefresh((entree) => {
  chargerEntree(entree);
});

document.getElementById('btn-enregistrer-correction').addEventListener('click', () => {
  const nouveauTexte = document.getElementById('texte-correction').value;
  const paires = diffMots(texteOriginal, nouveauTexte)
    .map((p) => ({ correct: nettoyerPourDictionnaire(p.apres), variant: nettoyerPourDictionnaire(p.avant) }))
    .filter((p) => p.correct && p.variant && p.correct.toLowerCase() !== p.variant.toLowerCase());

  const zoneSuggestions = document.getElementById('zone-suggestions');
  zoneSuggestions.innerHTML = '';

  if (paires.length === 0) {
    validerEtFermer(nouveauTexte, []);
    return;
  }

  const titre = document.createElement('h3');
  titre.textContent = 'Ajouter au dictionnaire ?';
  zoneSuggestions.appendChild(titre);

  paires.forEach((paire, index) => {
    const ligne = document.createElement('div');
    ligne.className = 'suggestion';
    ligne.innerHTML = `
      <input type="checkbox" id="suggestion-${index}" checked />
      <span class="mots">${paire.variant} devient ${paire.correct}</span>
    `;
    zoneSuggestions.appendChild(ligne);
  });

  const boutonValider = document.createElement('button');
  boutonValider.className = 'principal';
  boutonValider.style.marginTop = '14px';
  boutonValider.textContent = 'Valider';
  boutonValider.addEventListener('click', () => {
    const ajouts = paires.filter((_, index) => document.getElementById(`suggestion-${index}`).checked);
    validerEtFermer(nouveauTexte, ajouts);
  });
  zoneSuggestions.appendChild(boutonValider);
});

async function validerEtFermer(nouveauTexte, ajoutsDictionnaire) {
  await window.volubil.validerCorrection({
    ts: entreeCourante ? entreeCourante.ts : null,
    nouveauTexte,
    ajoutsDictionnaire,
  });

  const message = document.getElementById('message-confirmation');
  message.style.display = 'block';
  message.textContent = 'Texte corrigé copié, collez-le si besoin.';
}

initialiser();
