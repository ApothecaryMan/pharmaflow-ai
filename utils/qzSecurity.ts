/**
 * QZ Tray Security Configuration
 *
 * Contains the digital certificate and private key for PharmaFlow AI to enable Silent Printing.
 * The certificate must be imported into the local QZ Tray installation to suppress permission prompts.
 */

export const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDLTCCAhWgAwIBAgIBATANBgkqhkiG9w0BAQsFADBaMRYwFAYDVQQDEw1QaGFy
bWFGbG93IEFJMQswCQYDVQQGEwJFRzEOMAwGA1UECBMFQ2Fpcm8xDjAMBgNVBAcT
BUNhaXJvMRMwEQYDVQQKEwpQaGFybWFGbG93MB4XDTI2MDYyNzA2NDMxN1oXDTM2
MDYyNzA2NDMxN1owWjEWMBQGA1UEAxMNUGhhcm1hRmxvdyBBSTELMAkGA1UEBhMC
RUcxDjAMBgNVBAgTBUNhaXJvMQ4wDAYDVQQHEwVDYWlybzETMBEGA1UEChMKUGhh
cm1hRmxvdzCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAK/BKkmPKHsr
MJFNUOKWtA9vUZ8L3MyQKeAd+Th9XkcL4p2IRJcb++DF1+dSxrqhXIOY5BasDXxk
ji+kMIgQ8A/lCVUYEnmNk3lsT0vfsY5dapOFvc6iHkApSn9UtirKpMkPIlgzPDkC
hmLHXSYsIOojrQnINX78fiubyDJLzUanrLb2wfRpfsTrJRuMJ/hkN8RYyD84CBwM
X/htPYl5aeXoVQ7sVHhJ7cu3AvBNKcsp4dIyejbTDeLae8M2BPneExMFT6HUJEiH
AGdF0FW0LA5rbxWINexUP8Ev1mFj+pnTQ/qVvyOrwZmytSRms5EgHAMVgrq+n6mY
pNxmpHcnHZUCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAGMnZ19MMoYPdDqLE/tsq
jTu6d1o0H8g/5wDRLmKrBVXD4T+L+8QtEGUbCBSE7S7qVxrzZFQwN89a4RFC1o8q
WxZoyrN8jQkoO/vUyp56RrUNowjKS28G6MX5CLFv4dA4hk9ygmv+OrdZ0hqezPXz
Jlz3W5LdyFZGKVF3LOXT8DWX4VHy3geits4o74exYORTmR9IH/spQXajBaGSLD7s
9dIeULpZ78PANVtFLVv5SfZoVSqxfKONvuS8l4zGreDadHpLhtfuRxtSiN1kWqWB
DLUj4Knnov7jS7EEXo10621C22Ric0oOd+VrtFjOtdQV9sQ+LoiJC1/Y5s5SrTlv
mA==
-----END CERTIFICATE-----`;

// Note: In a real multi-tenant SaaS, this should ideally come from an API and not be hardcoded,
// but for suppressing local prompts with a self-signed generic cert, this works perfectly.
const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCvwSpJjyh7KzCR
TVDilrQPb1GfC9zMkCngHfk4fV5HC+KdiESXG/vgxdfnUsa6oVyDmOQWrA18ZI4v
pDCIEPAP5QlVGBJ5jZN5bE9L37GOXWqThb3Ooh5AKUp/VLYqyqTJDyJYMzw5AoZi
x10mLCDqI60JyDV+/H4rm8gyS81Gp6y29sH0aX7E6yUbjCf4ZDfEWMg/OAgcDF/4
bT2JeWnl6FUO7FR4Se3LtwLwTSnLKeHSMno20w3i2nvDNgT53hMTBU+h1CRIhwBn
RdBVtCwOa28ViDXsVD/BL9ZhY/qZ00P6lb8jq8GZsrUkZrORIBwDFYK6vp+pmKTc
ZqR3Jx2VAgMBAAECggEAE9qAYjkuNk+oLQRsr9Px+NEMiX4HuKyhAQSnG6Gp2Iu3
/dn1VD6LLZZxGlvy6q/XVAmdhmQezTT3YjFWxsq8W4dLY8CUNwVDqf05WJWnKIZW
nN3dlZh2+KzRZ2B/Mtvw+8IJEVPkUypSWkPcEAz/Fi6RLvWIpCoglIuEn2M0XUKG
mUywAx61pFQEaqsotiDkhgs30IlVdmSJk0MDUxRqzDuI+Hsvv4szH1tuwIqqHb9Y
6WzjYPcxtpQcvkGsuHif77CuQDV3XovDeBLdhG4v46K4LOLVMEZwTTayBXfcRFv8
zpRm6sI4G42v7zi9aL2RPYwVLMs1DUqSxJZ2PT1yRwKBgQDk33ctJ4F80rTmq0Dt
dCsJh/Jvzat9l+QCnZ4GLxcx6NEmfPxtj4Qo7V/+Kvh9qOcm7ZYfqVdVrI6MCJQf
lkdSLBlW+AUnGcOqny674kKMWLUxblbTHVzsVMh+hja7tMzI1tEKxzJBbRY9TfPp
1fBbN0Mr5fumyIsawoqNVeYx5wKBgQDElfcro20IZNsPXn6CQP2p3GRkDy/4k24w
Kna9purtq+WveLG2vMb9qHlmEVcMFBn72PVhYyHM105i4OdPXYOSGVLTQe9S/Hq6
gDpACkMnpLNcJhm5nI5PZTkD8smMvNioM1zGavhpxMZxURjOjkYh9iFgChOCExLx
gZ63mhv9IwKBgAy+SINyHKqXjMz/IglWm4LXV+9Ts0W17FMc9YyAmLkFroeHFAMB
p6kjtmGPgPB2NBCdz+sJYbx6dCFl5OFxW50+qVaHTrojnBpm7JI3gd8QnV4YN6tf
iin6eoNY87k10uUn2NHRz4GHEmLtcTRG3jAl/o52KrHZnq0pwc8mxj9nAoGAf2WM
O5x6IVFy4R/krja97KFl8a4h8V5hrxclwjv0zTdz7uYxjPIDpwjSO4ILPkmcmSh9
xLIAioYRR2TmoflBNaHxmfSFyurSAiDtHulHod5LWfFbBH1fgDZh35wsX2dWpJI8
kl1qROj/jRn4EIwFCSc/c8Sz5bzErvvIRsW5U68CgYBGRCdKTvlvkHjtsSCdAiAT
b5ORs7uao47w4y1WMOb3L15vBhVLM2ZDYiVz61FpmLAMy/ShxwyJcC984FlVUuhp
f5jaHK6eWcpU7LexuKETlJJPXhBUDnLzAR20eUp4quUjz3rn0vu5HhR+DTw0/y7/
RuVjFTDv0xDJ2LD1Nr1ptw==
-----END PRIVATE KEY-----`;

/**
 * Converts a PEM string to an ArrayBuffer
 */
function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

let cachedCryptoKey: CryptoKey | null = null;

/**
 * Imports the PKCS#8 PEM private key into a WebCrypto CryptoKey
 */
async function importPrivateKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  // Remove PEM header/footer and all whitespace
  const pemContents = QZ_PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const binaryDerString = window.atob(pemContents);
  const binaryDer = str2ab(binaryDerString);

  cachedCryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-512',
    },
    true,
    ['sign']
  );

  return cachedCryptoKey;
}

/**
 * Signs a string using the RSA private key and returns a base64 encoded signature
 * compatible with QZ Tray.
 */
export async function signQZData(toSign: string): Promise<string> {
  const key = await importPrivateKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(toSign);

  const signature = await window.crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data);

  // Convert ArrayBuffer to base64
  let binary = '';
  const bytes = new Uint8Array(signature);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
