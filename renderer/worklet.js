// AudioWorkletProcessor : capture les echantillons PCM du micro et les poste
// au thread principal du renderer, par blocs de 128 echantillons (defaut Web Audio).
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const canal = inputs[0] && inputs[0][0];
    if (canal && canal.length > 0) {
      // On copie le buffer : celui fourni par le moteur audio est reutilise
      // a chaque appel et serait ecrase sinon.
      const copie = new Float32Array(canal);

      // RMS du bloc, pour le vumetre du HUD.
      let somme = 0;
      for (let i = 0; i < canal.length; i++) somme += canal[i] * canal[i];
      const rms = Math.sqrt(somme / canal.length);

      this.port.postMessage({ audio: copie, rms }, [copie.buffer]);
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
