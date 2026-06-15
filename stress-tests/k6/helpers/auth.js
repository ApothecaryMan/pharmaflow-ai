/**
 * Auth Helpers for k6 Stress Tests
 * Login to Supabase Auth and get access tokens.
 */

import { check } from 'k6';
import http from 'k6/http';
import { SUPABASE_ANON_KEY, SUPABASE_AUTH_URL } from '../config.js';

/**
 * Login with email/password and return the access_token.
 * @param {string} email
 * @param {string} password
 * @returns {string|null} JWT access token
 */
export function loginAndGetToken(email, password) {
  const res = http.post(
    `${SUPABASE_AUTH_URL}/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      tags: { name: 'auth_login' },
    }
  );

  const success = check(res, {
    'auth login status is 200': (r) => r.status === 200,
    'auth login has access_token': (r) => {
      try {
        return !!JSON.parse(r.body).access_token;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Login failed: ${res.status} - ${res.body}`);
    return null;
  }

  const data = JSON.parse(res.body);
  return data.access_token;
}

/**
 * Sign up a test user. Returns the user object.
 */
export function signUpTestUser(email, password) {
  const res = http.post(`${SUPABASE_AUTH_URL}/signup`, JSON.stringify({ email, password }), {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    tags: { name: 'auth_signup' },
  });

  if (res.status === 200 || res.status === 201) {
    return JSON.parse(res.body);
  }
  return null;
}

/**
 * Get current user session to verify token validity.
 */
export function verifySession(accessToken) {
  const res = http.get(`${SUPABASE_AUTH_URL}/user`, {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    tags: { name: 'auth_verify' },
  });

  return check(res, {
    'session is valid': (r) => r.status === 200,
  });
}
