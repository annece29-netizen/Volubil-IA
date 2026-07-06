// Insertion du texte transcrit au curseur de l'application active : on passe
// par le presse-papier puis on simule le collage, sans jamais voler le focus.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { clipboard } = require('electron');

function executer(commande, args) {
  return new Promise((resolve, reject) => {
    execFile(commande, args, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function collerWindows() {
  const cheminVbs = path.join(os.tmpdir(), `volubil-coller-${Date.now()}.vbs`);
  const contenuVbs = 'WScript.CreateObject("WScript.Shell").SendKeys "^v"';
  fs.writeFileSync(cheminVbs, contenuVbs, 'utf8');

  try {
    await executer('cscript', ['//nologo', cheminVbs]);
  } catch (errCscript) {
    // Repli PowerShell si cscript echoue.
    try {
      await executer('powershell', [
        '-NoProfile',
        '-Command',
        '$w = New-Object -ComObject wscript.shell; $w.SendKeys(\'^v\')',
      ]);
    } catch (errPowershell) {
      throw errPowershell;
    }
  } finally {
    fs.unlink(cheminVbs, () => {});
  }
}

async function collerMac() {
  try {
    await executer('osascript', [
      '-e',
      'tell application "System Events" to keystroke "v" using command down',
    ]);
  } catch (err) {
    const message = (err.stderr || err.message || '').toString();
    if (message.includes('1002') || /not allowed/i.test(message)) {
      const erreurAutorisation = new Error(
        'Autorisation Accessibilité manquante pour coller automatiquement.'
      );
      erreurAutorisation.autorisationManquante = true;
      throw erreurAutorisation;
    }
    throw err;
  }
}

function ouvrirPanneauAccessibiliteMac() {
  execFile('open', ['x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'], () => {});
}

// Insere le texte final dans l'application active. Retourne un objet
// { succes, autorisationManquante } pour piloter le message a afficher.
async function insererTexte(texteFinal) {
  const ancienPressePapier = clipboard.readText();
  clipboard.writeText(texteFinal);

  try {
    if (process.platform === 'win32') {
      await collerWindows();
    } else if (process.platform === 'darwin') {
      await collerMac();
    } else {
      // Plateforme non geree par la spec (Linux) : on laisse dans le presse-papier.
      return { succes: false, autorisationManquante: false };
    }

    setTimeout(() => {
      clipboard.writeText(ancienPressePapier);
    }, 1000);

    return { succes: true, autorisationManquante: false };
  } catch (err) {
    if (err.autorisationManquante) {
      ouvrirPanneauAccessibiliteMac();
    }
    // Le texte reste dans le presse-papier : on ne le restaure pas ici,
    // l'utilisatrice doit pouvoir le coller elle-meme.
    return { succes: false, autorisationManquante: !!err.autorisationManquante };
  }
}

module.exports = { insererTexte };
