// Reception de l'audio brut envoye par la fenetre cachee d'enregistrement,
// reechantillonnage en 16 kHz mono, conversion en WAV 16 bits.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

const FREQUENCE_CIBLE = 16000;

// Reechantillonnage par interpolation lineaire, mono, vers 16 000 Hz.
function reechantillonner(float32, frequenceSource) {
  if (frequenceSource === FREQUENCE_CIBLE) return float32;

  const ratio = frequenceSource / FREQUENCE_CIBLE;
  const longueurCible = Math.round(float32.length / ratio);
  const resultat = new Float32Array(longueurCible);

  for (let i = 0; i < longueurCible; i++) {
    const positionSource = i * ratio;
    const indexBas = Math.floor(positionSource);
    const indexHaut = Math.min(indexBas + 1, float32.length - 1);
    const fraction = positionSource - indexBas;
    resultat[i] = float32[indexBas] * (1 - fraction) + float32[indexHaut] * fraction;
  }

  return resultat;
}

function float32VersInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const echantillon = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = echantillon < 0 ? echantillon * 0x8000 : echantillon * 0x7fff;
  }
  return int16;
}

// Construit un fichier WAV PCM 16 bits mono a partir d'un Int16Array.
function ecrireWav(int16, frequence) {
  const octetsParEchantillon = 2;
  const tailleDonnees = int16.length * octetsParEchantillon;
  const buffer = Buffer.alloc(44 + tailleDonnees);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + tailleDonnees, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // taille du sous-bloc fmt
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(frequence, 24);
  buffer.writeUInt32LE(frequence * octetsParEchantillon, 28); // octets/s
  buffer.writeUInt16LE(octetsParEchantillon, 32); // alignement bloc
  buffer.writeUInt16LE(16, 34); // bits par echantillon
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(tailleDonnees, 40);

  for (let i = 0; i < int16.length; i++) {
    buffer.writeInt16LE(int16[i], 44 + i * 2);
  }

  return buffer;
}

// Convertit un ArrayBuffer de Float32 (audio brut du renderer) en fichier WAV
// temporaire 16 kHz mono. Retourne le chemin du fichier cree.
function creerWavTemporaire(arrayBuffer, frequenceSource) {
  const float32 = new Float32Array(arrayBuffer);
  const reechantillonne = reechantillonner(float32, frequenceSource);
  const int16 = float32VersInt16(reechantillonne);
  const wav = ecrireWav(int16, FREQUENCE_CIBLE);

  const cheminTemp = path.join(app.getPath('temp'), `volubil-${Date.now()}.wav`);
  fs.writeFileSync(cheminTemp, wav);
  return cheminTemp;
}

function supprimerFichier(chemin) {
  fs.unlink(chemin, () => {
    // Suppression au mieux : la confidentialite prime, mais on ne bloque pas
    // le flux si le fichier est deja parti.
  });
}

module.exports = { creerWavTemporaire, supprimerFichier, reechantillonner, FREQUENCE_CIBLE };
