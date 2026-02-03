/**
 * WebAuthn Utilities
 * Helper functions to handle ArrayBuffer conversions required by the WebAuthn API.
 * Implements Base64URL encoding (RFC 4648) as required by WebAuthn spec.
 */

/**
 * Converts ArrayBuffer or Uint8Array to Base64URL string for storage
 * Uses Base64URL encoding (URL-safe, no padding) as per WebAuthn spec
 *
 * @param buffer - Buffer to convert
 * @returns Base64URL encoded string
 */
export const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  // ✅ Fix: Handle large buffers without call stack issues
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';

  // Process in chunks to avoid stack overflow
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  // Convert to Base64URL (replace +/= with -_)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); // Remove padding
};

/**
 * Converts Base64URL string back to ArrayBuffer for API consumption
 * Handles both Base64URL and standard Base64 formats
 *
 * @param base64 - Base64URL or Base64 encoded string
 * @returns ArrayBuffer
 */
export const base64ToBuffer = (base64: string): ArrayBuffer => {
  // ✅ Fix: Support Base64URL format (convert back to standard Base64)
  let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = standardBase64.length % 4;
  if (padding > 0) {
    standardBase64 += '='.repeat(4 - padding);
  }

  const binary = atob(standardBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

/**
 * Generates a cryptographically secure random challenge for WebAuthn
 * Uses 32 bytes (256 bits) as recommended by FIDO Alliance
 *
 * @returns ArrayBuffer containing random challenge
 */
export const generateChallenge = (): Uint8Array => {
  // ✅ Return Uint8Array directly (more compatible)
  return crypto.getRandomValues(new Uint8Array(32));
};

/**
 * Check if WebAuthn is supported in the current browser
 *
 * @returns Promise<boolean>
 */
export const isWebAuthnSupported = async (): Promise<boolean> => {
  // Check if PublicKeyCredential is available
  if (!window.PublicKeyCredential) {
    return false;
  }

  // Check if platform authenticator is available (fingerprint/face)
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

/**
 * Check if conditional UI (autofill) is supported
 *
 * @returns Promise<boolean>
 */
export const isConditionalUISupported = async (): Promise<boolean> => {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    // @ts-expect-error - Conditional mediation is new
    return (await PublicKeyCredential.isConditionalMediationAvailable?.()) ?? false;
  } catch {
    return false;
  }
};

/**
 * Converts credential response to JSON-serializable format
 * Needed because ArrayBuffers can't be directly JSON.stringify'd
 *
 * @param credential - PublicKeyCredential from WebAuthn
 * @returns Serializable object
 */
export const credentialToJSON = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64(response.clientDataJSON),
      authenticatorData: bufferToBase64(response.authenticatorData),
      signature: bufferToBase64(response.signature),
      userHandle: response.userHandle ? bufferToBase64(response.userHandle) : null,
    },
  };
};

/**
 * Converts registration credential to JSON format
 *
 * @param credential - PublicKeyCredential from registration
 * @returns Serializable object
 */
export const registrationToJSON = (credential: PublicKeyCredential) => {
  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64(response.clientDataJSON),
      attestationObject: bufferToBase64(response.attestationObject),
      // @ts-expect-error - transports might not be in all TS versions
      transports: response.getTransports?.() ?? [],
    },
  };
};

/**
 * Error messages for common WebAuthn failures
 */
export const WEBAUTHN_ERRORS = {
  NOT_SUPPORTED: {
    AR: 'جهازك لا يدعم المصادقة البيومترية',
    EN: 'Your device does not support biometric authentication',
  },
  NOT_ALLOWED: {
    AR: 'تم إلغاء العملية أو انتهى الوقت',
    EN: 'The operation was canceled or timed out',
  },
  INVALID_STATE: {
    AR: 'اسم المستخدم مسجل بالفعل على هذا الجهاز',
    EN: 'This user is already registered on this device',
  },
  NOT_ENROLLED: {
    AR: 'لا توجد بصمة مسجلة على الجهاز',
    EN: 'No biometrics are enrolled on this device',
  },
  NETWORK_ERROR: {
    AR: 'خطأ في الاتصال بالخادم',
    EN: 'Server connection error',
  },
  UNKNOWN: {
    AR: 'حدث خطأ غير متوقع',
    EN: 'An unexpected error occurred',
  },
} as const;

/**
 * Parse WebAuthn error and return user-friendly message based on language
 *
 * @param error - Error from WebAuthn API
 * @param language - Target language ('AR' or 'EN')
 * @returns User-friendly error message
 */
export const parseWebAuthnError = (error: Error, language: 'AR' | 'EN' = 'EN'): string => {
  const name = error.name || '';
  const lang = language === 'AR' || language === 'EN' ? language : 'EN';

  if (name === 'NotSupportedError') {
    return WEBAUTHN_ERRORS.NOT_SUPPORTED[lang];
  }
  if (name === 'NotAllowedError') {
    return WEBAUTHN_ERRORS.NOT_ALLOWED[lang];
  }
  if (name === 'InvalidStateError') {
    return WEBAUTHN_ERRORS.INVALID_STATE[lang];
  }
  if (name === 'NetworkError') {
    return WEBAUTHN_ERRORS.NETWORK_ERROR[lang];
  }

  return WEBAUTHN_ERRORS.UNKNOWN[lang];
};
