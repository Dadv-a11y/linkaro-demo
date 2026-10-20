import { prisma } from "@linkaro/db"
import { env } from "@linkaro/env"
import {
  createLogger,
  recordAudit,
  recordSecurityEvent,
} from "@linkaro/observability"
import { betterAuth, type BetterAuthOptions } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { genericOAuth } from "better-auth/plugins"

import {
  DEV_OAUTH_CLIENT_ID,
  DEV_OAUTH_CLIENT_SECRET,
  DEV_OAUTH_PROVIDER_ID,
  placeholderEmail,
} from "./dev-oauth"
import {
  CLIENT_IP_HEADER,
  contextFromEndpoint,
  contextFromHeaders,
} from "./request-context"

const logger = createLogger({ app: "auth" })

/** Version des conditions d'utilisation acceptées à l'inscription. */
export const TERMS_VERSION = "2026-10"

function socialProviders(): BetterAuthOptions["socialProviders"] {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {}
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Identité seulement ; l'accès YouTube est demandé plus tard, au moment de connecter la chaîne.
      prompt: "select_account",
    }
  }
  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
    providers.facebook = {
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
      scope: ["public_profile", "email"],
      // Certains comptes Facebook n'ont pas d'e-mail : adresse factice non routable.
      mapProfileToUser: (profile) => ({
        email:
          profile.email ??
          placeholderEmail(
            "facebook",
            "id" in profile ? profile.id : profile.sub
          ),
      }),
    }
  }
  if (env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET) {
    providers.tiktok = {
      clientKey: env.TIKTOK_CLIENT_KEY,
      clientSecret: env.TIKTOK_CLIENT_SECRET,
      // Lecture seule : profil, statistiques et vidéos publiques.
      scope: ["user.info.basic", "user.info.stats", "video.list"],
    }
  }
  return providers
}

function devOAuthPlugin() {
  return genericOAuth({
    config: [
      {
        providerId: DEV_OAUTH_PROVIDER_ID,
        clientId: DEV_OAUTH_CLIENT_ID,
        clientSecret: DEV_OAUTH_CLIENT_SECRET,
        authorizationUrl: `${env.WEB_URL}/dev-oauth/autoriser`,
        tokenUrl: `${env.WEB_URL}/api/dev-oauth/token`,
        userInfoUrl: `${env.WEB_URL}/api/dev-oauth/userinfo`,
        scopes: ["profile"],
        pkce: true,
        // Identifiant stable du compte chez le fournisseur (champ OpenID « sub »).
        accountSubject: ({ profile }) => String(profile.sub),
        mapProfileToUser: (profile) => ({
          name: String(profile.name ?? ""),
          email: placeholderEmail(DEV_OAUTH_PROVIDER_ID, String(profile.sub)),
          emailVerified: false,
        }),
      },
    ],
  })
}

function createCreatorAuth() {
  return betterAuth({
    appName: "Linkaro",
    baseURL: env.WEB_URL,
    basePath: "/api/auth",
    secret: env.CREATOR_AUTH_SECRET,
    trustedOrigins: [env.WEB_URL],
    database: prismaAdapter(prisma, { provider: "postgresql" }),

    // Aucun mot de passe : on s'inscrit en connectant un réseau social.
    emailAndPassword: { enabled: false },
    socialProviders: socialProviders(),

    user: {
      modelName: "creator",
      additionalFields: {
        // Champs gérés uniquement par le serveur (jamais par une requête ou un profil externe).
        status: {
          type: "string",
          defaultValue: "active",
          input: false,
        },
        adultConfirmedAt: { type: "date", required: false, input: false },
        termsAcceptedAt: { type: "date", required: false, input: false },
        termsVersion: { type: "string", required: false, input: false },
      },
    },
    session: {
      modelName: "creatorSession",
      expiresIn: 60 * 60 * 24 * 30, // 30 jours
      updateAge: 60 * 60 * 24, // prolongée au plus une fois par jour
    },
    account: {
      modelName: "creatorAccount",
      // Tokens des réseaux chiffrés en base (XChaCha20-Poly1305).
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        // Pas de rattachement automatique par e-mail (adresses factices, e-mails
        // non vérifiés) : un réseau n'est ajouté que par le créateur connecté.
        disableImplicitLinking: true,
        allowDifferentEmails: true,
      },
    },
    verification: { modelName: "creatorVerification" },

    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "authRateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/social": { window: 60, max: 10 },
        "/sign-in/oauth2": { window: 60, max: 10 },
        "/link-social": { window: 60, max: 10 },
        "/oauth2/link": { window: 60, max: 10 },
      },
    },

    advanced: {
      cookiePrefix: "linkaro",
      useSecureCookies: env.NODE_ENV === "production",
      // IP réelle calculée par notre proxy (l'en-tête du client est écrasé).
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (creator, ctx) => {
            await recordAudit({
              actor: { type: "USER", id: creator.id, role: "creator" },
              action: "creator.signup",
              target: { type: "creator", id: creator.id },
              context: contextFromEndpoint(ctx),
            })
          },
        },
      },
      session: {
        create: {
          after: async (session, ctx) => {
            await recordAudit({
              actor: { type: "USER", id: session.userId, role: "creator" },
              action: "auth.login",
              context: contextFromEndpoint(ctx),
            })
          },
        },
        delete: {
          after: async (session, ctx) => {
            await recordAudit({
              actor: { type: "USER", id: session.userId, role: "creator" },
              action: "auth.logout",
              context: contextFromEndpoint(ctx),
            })
          },
        },
      },
      account: {
        create: {
          after: async (account, ctx) => {
            await recordAudit({
              actor: { type: "USER", id: account.userId, role: "creator" },
              action: "social.connect",
              target: { type: "social_account", id: account.id },
              metadata: { provider: account.providerId },
              context: contextFromEndpoint(ctx),
            })
          },
        },
        delete: {
          after: async (account, ctx) => {
            await recordAudit({
              actor: { type: "USER", id: account.userId, role: "creator" },
              action: "social.disconnect",
              target: { type: "social_account", id: account.id },
              metadata: { provider: account.providerId },
              context: contextFromEndpoint(ctx),
            })
          },
        },
      },
    },

    onAPIError: {
      // Page d'erreur de l'app plutôt que celle de Better Auth.
      errorURL: `${env.WEB_URL}/connexion/erreur`,
      onError: async (error) => {
        logger.warn({ err: error }, "Erreur d'authentification")
        await recordSecurityEvent({
          type: "auth.error",
          severity: "WARNING",
          details: {
            message: error instanceof Error ? error.message : String(error),
          },
        }).catch((cause: unknown) =>
          logger.error({ err: cause }, "Événement de sécurité non enregistré")
        )
      },
    },

    plugins: [
      ...(env.ENABLE_DEV_OAUTH ? [devOAuthPlugin()] : []),
      nextCookies(), // toujours en dernier
    ],
  })
}

export type CreatorAuth = ReturnType<typeof createCreatorAuth>

// Création paresseuse : importer ce module (par exemple pendant `next build`)
// ne lit ni l'environnement ni la base.
let instance: CreatorAuth | undefined
export function getCreatorAuth(): CreatorAuth {
  instance ??= createCreatorAuth()
  return instance
}

export { contextFromHeaders }

export type SignInProvider = {
  id: string
  label: string
  /** Fournisseur simulé, affiché à part. */
  isDev?: boolean
}

/** Réseaux disponibles pour s'inscrire ou se connecter (selon les clés configurées). */
export function enabledSignInProviders(): SignInProvider[] {
  const providers: SignInProvider[] = []
  if (env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET)
    providers.push({ id: "tiktok", label: "TikTok" })
  if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET)
    providers.push({ id: "facebook", label: "Facebook" })
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
    providers.push({ id: "google", label: "Google / YouTube" })
  if (env.ENABLE_DEV_OAUTH)
    providers.push({
      id: DEV_OAUTH_PROVIDER_ID,
      label: "Compte de test",
      isDev: true,
    })
  return providers
}
