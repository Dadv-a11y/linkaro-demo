import type { GenericOAuthConfig } from "better-auth/plugins"
import { z } from "zod"

import { placeholderEmail } from "./dev-oauth"

/**
 * Instagram (« Instagram API with Instagram Login ») : comptes professionnels
 * (créateur ou entreprise) uniquement, sans Page Facebook.
 * Lecture seule : profil et statistiques (insights).
 *
 * ⚠️ À valider avec une vraie app Meta (mode Développement + testeurs) :
 * non testable sans identifiants.
 */

export const INSTAGRAM_PROVIDER_ID = "instagram"
const GRAPH = "https://graph.instagram.com/v23.0"
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
]

// Réponse de l'échange du code : à plat, ou enveloppée dans « data » selon les versions.
const TokenResponse = z.union([
  z.object({
    access_token: z.string(),
    user_id: z.union([z.string(), z.number()]),
  }),
  z.object({
    data: z
      .array(
        z.object({
          access_token: z.string(),
          user_id: z.union([z.string(), z.number()]),
        })
      )
      .min(1),
  }),
])

const Profile = z.object({
  user_id: z.union([z.string(), z.number()]),
  username: z.string(),
  name: z.string().optional(),
  profile_picture_url: z.url().optional(),
})

export function instagramProvider(options: {
  clientId: string
  clientSecret: string
}): GenericOAuthConfig {
  return {
    providerId: INSTAGRAM_PROVIDER_ID,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorizationUrl: "https://www.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    // Instagram attend des permissions séparées par des virgules et ne gère pas PKCE.
    authorizationUrlParams: { scope: SCOPES.join(",") },
    pkce: false,
    accountSubject: ({ profile }) => String(profile.user_id),

    async getToken({ code, redirectURI }) {
      const response = await fetch(
        "https://api.instagram.com/oauth/access_token",
        {
          method: "POST",
          body: new URLSearchParams({
            client_id: options.clientId,
            client_secret: options.clientSecret,
            grant_type: "authorization_code",
            redirect_uri: redirectURI,
            code,
          }),
          signal: AbortSignal.timeout(10_000),
        }
      )
      if (!response.ok)
        throw new Error(
          `Instagram : échange du code refusé (${response.status})`
        )
      const parsed = TokenResponse.parse(await response.json())
      const token = "data" in parsed ? parsed.data[0]! : parsed
      return {
        accessToken: token.access_token,
        tokenType: "bearer",
        scopes: SCOPES,
      }
    },

    async getUserInfo(tokens) {
      if (!tokens.accessToken) return null
      const url = new URL(`${GRAPH}/me`)
      url.searchParams.set(
        "fields",
        "user_id,username,name,profile_picture_url"
      )
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${tokens.accessToken}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) return null
      const profile = Profile.parse(await response.json())
      return {
        id: String(profile.user_id),
        user_id: String(profile.user_id),
        name: profile.name ?? profile.username,
        username: profile.username,
        image: profile.profile_picture_url,
        // Instagram ne fournit pas d'e-mail.
        email: placeholderEmail(INSTAGRAM_PROVIDER_ID, String(profile.user_id)),
        emailVerified: false,
      }
    },
  }
}
