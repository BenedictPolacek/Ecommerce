import * as oidc from 'openid-client';
import { config } from '../../../config/env.js';

/**
 * Sign in with Google (OpenID Connect) and GitHub (plain OAuth 2), both with the
 * authorization code flow + PKCE. openid-client does the protocol work: building the
 * authorization URL, checking state (CSRF) and nonce (replay), exchanging the code and
 * validating Google's ID token.
 */

/** Where the provider sends the browser back to. Must be registered at the provider. */
export const redirectUri = (provider) => `${config.appUrl}/api/auth/oauth/${provider}/callback`;

/** Cached promise per provider; reset on failure so a network error is retried next time */
const configCache = new Map();

const cached = (provider, load) => {
  if (!configCache.has(provider)) {
    const promise = load().catch((error) => {
      configCache.delete(provider);
      throw error;
    });
    configCache.set(provider, promise);
  }
  return configCache.get(provider);
};

const GITHUB_API = 'https://api.github.com';

const githubApi = async (path, accessToken) => {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      // GitHub rejects API requests without a User-Agent
      'User-Agent': 'ecommerce-shop',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path} answered ${res.status}`);
  return res.json();
};

const splitName = (fullName) => {
  const name = fullName?.trim() ?? '';
  const space = name.lastIndexOf(' ');
  return space === -1
    ? { firstName: name, lastName: '' }
    : { firstName: name.slice(0, space), lastName: name.slice(space + 1) };
};

const PROVIDERS = {
  google: {
    scope: 'openid email profile',
    // OpenID Connect: a nonce binds the ID token to this login attempt
    usesNonce: true,
    // Discovery loads Google's endpoints and signing keys from its metadata document
    loadConfig: ({ clientId, clientSecret }) =>
      oidc.discovery(new URL('https://accounts.google.com'), clientId, clientSecret),
    async profile(tokens) {
      const claims = tokens.claims();
      return {
        providerUserId: claims.sub,
        email: claims.email,
        emailVerified: claims.email_verified === true,
        firstName: claims.given_name,
        lastName: claims.family_name,
      };
    },
  },
  github: {
    scope: 'read:user user:email',
    usesNonce: false,
    // GitHub is not an OpenID provider (no discovery, no ID token): endpoints are set by hand
    loadConfig: async ({ clientId, clientSecret }) =>
      new oidc.Configuration(
        {
          // GitHub sends this as "iss" on the callback (RFC 9207, mix-up attack protection);
          // openid-client rejects the callback when it differs
          issuer: 'https://github.com/login/oauth',
          authorization_endpoint: 'https://github.com/login/oauth/authorize',
          token_endpoint: 'https://github.com/login/oauth/access_token',
        },
        clientId,
        clientSecret
      ),
    async profile(tokens) {
      const [user, emails] = await Promise.all([
        githubApi('/user', tokens.access_token),
        githubApi('/user/emails', tokens.access_token),
      ]);
      // The public profile email may be empty or unverified: use the verified primary one
      const primary = emails.find((entry) => entry.primary) ?? emails[0];
      return {
        providerUserId: String(user.id),
        email: primary?.email,
        emailVerified: primary?.verified === true,
        ...splitName(user.name || user.login),
      };
    },
  },
};

export const OAUTH_PROVIDERS = Object.keys(PROVIDERS);

/** Providers with client id and secret in the environment */
export const enabledProviders = () => OAUTH_PROVIDERS.filter((name) => config.oauth[name]);

export const isProviderEnabled = (name) => enabledProviders().includes(name);

const providerConfig = (name) => cached(name, () => PROVIDERS[name].loadConfig(config.oauth[name]));

/**
 * Random values for one login attempt; kept in an httpOnly cookie until the callback
 */
export const newLoginAttempt = (provider) => ({
  provider,
  state: oidc.randomState(),
  codeVerifier: oidc.randomPKCECodeVerifier(),
  nonce: PROVIDERS[provider].usesNonce ? oidc.randomNonce() : undefined,
});

/** The provider's login page for this attempt */
export async function authorizationUrl({ provider, state, codeVerifier, nonce }) {
  const params = {
    redirect_uri: redirectUri(provider),
    scope: PROVIDERS[provider].scope,
    state,
    code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
  };
  if (nonce) params.nonce = nonce;
  return oidc.buildAuthorizationUrl(await providerConfig(provider), params);
}

/**
 * Exchanges the code from the callback URL for tokens and reads the user's profile.
 * Throws when state, PKCE verifier or nonce do not match this attempt.
 */
export async function fetchProfile(callbackUrl, { provider, state, codeVerifier, nonce }) {
  const tokens = await oidc.authorizationCodeGrant(await providerConfig(provider), callbackUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState: state,
    expectedNonce: nonce,
    idTokenExpected: PROVIDERS[provider].usesNonce,
  });
  return PROVIDERS[provider].profile(tokens);
}
