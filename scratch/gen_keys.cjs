const crypto = require('crypto');

function generateTauriKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  // Export raw public key (32 bytes)
  const rawPub = publicKey.export({ type: 'spki', format: 'der' }).slice(-32);
  // Export raw private key (32 bytes)
  const rawPriv = privateKey.export({ type: 'pkcs8', format: 'der' }).slice(-32);

  console.log("Public Key (Base64):", rawPub.toString('base64'));
  console.log("Private Key (Base64):", rawPriv.toString('base64'));
}

generateTauriKeys();
