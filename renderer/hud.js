// Affiche l'etat courant du pipeline de dictee : enregistrement (chrono +
// vumetre), transcription, nettoyage, succes (avec bouton corriger), erreur.

const pointEtat = document.getElementById('point-etat');
const messageEtat = document.getElementById('message-etat');
const chrono = document.getElementById('chrono');
const vumetre = document.getElementById('vumetre');
const barreVumetre = document.getElementById('barre-vumetre');
const boutonCorriger = document.getElementById('bouton-corriger');

let minuteurChrono = null;
let minuteurDisparition = null;

function formaterChrono(ms) {
  const secondes = Math.floor(ms / 1000);
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function arreterChrono() {
  if (minuteurChrono) {
    clearInterval(minuteurChrono);
    minuteurChrono = null;
  }
}

function reinitialiserAffichage() {
  pointEtat.className = 'point';
  vumetre.classList.remove('visible');
  boutonCorriger.style.display = 'none';
  chrono.textContent = '';
  arreterChrono();
}

window.volubilHud.onEtat((donnees) => {
  if (minuteurDisparition) {
    clearTimeout(minuteurDisparition);
    minuteurDisparition = null;
  }
  reinitialiserAffichage();

  switch (donnees.etat) {
    case 'enregistrement':
      pointEtat.classList.add('pulse');
      messageEtat.textContent = 'Enregistrement...';
      vumetre.classList.add('visible');
      minuteurChrono = setInterval(() => {
        chrono.textContent = formaterChrono(Date.now() - donnees.depart);
      }, 250);
      break;

    case 'transcription':
      messageEtat.textContent = 'Transcription...';
      break;

    case 'nettoyage':
      messageEtat.textContent = 'Nettoyage...';
      break;

    case 'succes':
      messageEtat.textContent = `✓ ${donnees.nbMots} mots insérés${donnees.mention || ''}`;
      boutonCorriger.style.display = 'inline-block';
      minuteurDisparition = setTimeout(() => {
        boutonCorriger.style.display = 'none';
      }, 10000);
      break;

    case 'rien-entendu':
      messageEtat.textContent = 'Rien entendu';
      break;

    case 'occupe':
      messageEtat.textContent = 'Déjà en cours de traitement...';
      break;

    case 'erreur':
      messageEtat.textContent = donnees.message || 'Une erreur est survenue.';
      break;

    default:
      messageEtat.textContent = 'Prêt';
  }
});

window.volubilHud.onNiveauMicro((niveau) => {
  const pourcentage = Math.min(100, Math.round(niveau * 400));
  barreVumetre.style.width = `${pourcentage}%`;
});

boutonCorriger.addEventListener('click', () => {
  window.volubilHud.ouvrirCorrection();
});
