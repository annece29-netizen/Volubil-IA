// Parcours du premier lancement : bienvenue, choix du mode, choix du modele
// Whisper, rappel du raccourci, ecran final.

let etapeCourante = 1;
const NB_ETAPES = 5;
let modeChoisi = 'simple';
let tailleChoisie = 'base';
let modeleTelecharge = false;

function afficherEtape(numero) {
  document.querySelectorAll('.etape').forEach((etape) => etape.classList.remove('visible'));
  document.getElementById(`etape-${numero}`).classList.add('visible');
  etapeCourante = numero;
}

document.querySelectorAll('[data-suivant]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    if (etapeCourante < NB_ETAPES) afficherEtape(etapeCourante + 1);
  });
});

document.querySelectorAll('[data-precedent]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    if (etapeCourante > 1) afficherEtape(etapeCourante - 1);
  });
});

// --- Etape 2 : choix du mode ---

document.querySelectorAll('#etape-2 .carte-mode').forEach((carte) => {
  carte.addEventListener('click', async () => {
    document.querySelectorAll('#etape-2 .carte-mode').forEach((c) => c.classList.remove('selectionnee'));
    carte.classList.add('selectionnee');
    modeChoisi = carte.dataset.mode;

    const zoneVerification = document.getElementById('verification-ollama');
    if (modeChoisi === 'ameliore') {
      zoneVerification.style.display = 'block';
      zoneVerification.innerHTML = '<span class="pastille orange">Vérification d\'Ollama...</span>';
      const { ollamaPresent, modelePret } = await window.volubil.testerOllama();

      if (ollamaPresent && modelePret) {
        zoneVerification.innerHTML = '<span class="pastille verte">Ollama détecté, modèle prêt</span>';
      } else if (ollamaPresent) {
        zoneVerification.innerHTML = `
          <span class="pastille orange">Ollama présent mais modèle absent</span>
          <div style="margin-top: 8px;">Installe-le avec : <code>ollama pull qwen2.5:3b</code></div>
          <button class="discret" style="margin-top: 8px;" data-continuer-simple>Continuer en simple pour l'instant</button>
        `;
      } else {
        zoneVerification.innerHTML = `
          <span class="pastille rouge">Ollama non détecté</span>
          <div style="margin-top: 8px;"><a href="https://ollama.com/download" target="_blank">Télécharger Ollama</a></div>
          <button class="discret" style="margin-top: 8px;" data-continuer-simple>Continuer en simple pour l'instant</button>
        `;
      }

      const boutonContinuerSimple = zoneVerification.querySelector('[data-continuer-simple]');
      if (boutonContinuerSimple) {
        boutonContinuerSimple.addEventListener('click', () => {
          modeChoisi = 'simple';
          document.querySelectorAll('#etape-2 .carte-mode').forEach((c) => c.classList.remove('selectionnee'));
          document.querySelector('#etape-2 .carte-mode[data-mode="simple"]').classList.add('selectionnee');
          zoneVerification.style.display = 'none';
        });
      }
    } else {
      zoneVerification.style.display = 'none';
    }
  });
});

// --- Etape 3 : choix et telechargement du modele ---

document.querySelectorAll('#etape-3 .carte-mode').forEach((carte) => {
  carte.addEventListener('click', () => {
    document.querySelectorAll('#etape-3 .carte-mode').forEach((c) => c.classList.remove('selectionnee'));
    carte.classList.add('selectionnee');
    tailleChoisie = carte.dataset.taille;
  });
});

document.getElementById('btn-telecharger-modele').addEventListener('click', async () => {
  const barre = document.getElementById('barre-modele');
  const remplissage = document.getElementById('remplissage-modele');
  const statut = document.getElementById('statut-modele');

  barre.style.display = 'block';
  statut.textContent = 'Téléchargement en cours...';

  window.volubil.onProgressionTelechargement((progression) => {
    remplissage.style.width = `${progression.pourcentage}%`;
    statut.textContent = `Téléchargement : ${progression.pourcentage}%`;
  });

  const resultat = await window.volubil.telechargerModele(tailleChoisie);

  if (resultat.succes) {
    statut.textContent = 'Modèle prêt.';
    modeleTelecharge = true;
    document.getElementById('btn-etape3-suivant').disabled = false;
  } else {
    statut.textContent = `Erreur : ${resultat.erreur}`;
  }
});

// --- Etape 4 : rappel du raccourci ---

async function afficherRaccourciCourant() {
  const reglages = await window.volubil.getSettings();
  document.getElementById('rappel-raccourci').textContent = reglages.hotkey;
}

// --- Etape 5 : fin ---

document.getElementById('btn-terminer').addEventListener('click', async () => {
  await window.volubil.saveSettings({ mode: modeChoisi, modelSize: tailleChoisie });
  await window.volubil.terminerOnboarding();
});

afficherRaccourciCourant();
