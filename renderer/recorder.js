// Fenetre cachee dediee a la capture micro : getUserMedia + AudioWorklet.
// Accumule les blocs PCM pendant l'enregistrement, puis envoie le tout au
// processus principal au signal d'arret.

let contexteAudio = null;
let noeudSource = null;
let noeudWorklet = null;
let flux = null;
let blocsAudio = [];
let enregistrementActif = false;

async function demarrer() {
  blocsAudio = [];
  enregistrementActif = true;

  try {
    flux = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    contexteAudio = new AudioContext();
    await contexteAudio.audioWorklet.addModule('worklet.js');

    noeudSource = contexteAudio.createMediaStreamSource(flux);
    noeudWorklet = new AudioWorkletNode(contexteAudio, 'capture-processor');

    noeudWorklet.port.onmessage = (event) => {
      if (!enregistrementActif) return;
      const { audio, rms } = event.data;
      blocsAudio.push(audio);
      window.volubilRecorder.envoyerNiveau(rms);
    };

    noeudSource.connect(noeudWorklet);
  } catch (err) {
    enregistrementActif = false;
    window.volubilRecorder.envoyerErreur(
      "Impossible d'accéder au micro. Vérifie les autorisations de l'application."
    );
  }
}

function nettoyerRessourcesAudio() {
  if (noeudSource) noeudSource.disconnect();
  if (noeudWorklet) noeudWorklet.disconnect();
  if (flux) flux.getTracks().forEach((piste) => piste.stop());
  if (contexteAudio) contexteAudio.close();
  noeudSource = null;
  noeudWorklet = null;
  flux = null;
  contexteAudio = null;
}

async function arreter() {
  enregistrementActif = false;

  const frequenceEchantillonnage = contexteAudio ? contexteAudio.sampleRate : 48000;

  const longueurTotale = blocsAudio.reduce((acc, bloc) => acc + bloc.length, 0);
  const fusionne = new Float32Array(longueurTotale);
  let position = 0;
  for (const bloc of blocsAudio) {
    fusionne.set(bloc, position);
    position += bloc.length;
  }

  nettoyerRessourcesAudio();
  blocsAudio = [];

  await window.volubilRecorder.envoyerAudio(fusionne.buffer, frequenceEchantillonnage);
}

window.volubilRecorder.onDemarrer(() => {
  demarrer();
});

window.volubilRecorder.onArreter(() => {
  arreter();
});
