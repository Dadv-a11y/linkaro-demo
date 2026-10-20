import { prisma } from "@linkaro/db"
import { env } from "@linkaro/env"
import { sendMail } from "@linkaro/mailer"
import {
  createLogger,
  recordAudit,
  recordSecurityEvent,
} from "@linkaro/observability"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { magicLink, twoFactor } from "better-auth/plugins"

import { CLIENT_IP_HEADER, contextFromEndpoint } from "./request-context"

const logger = createLogger({ app: "auth-staff" })

/** Durées de session de l'équipe (plus courtes que pour les créateurs). */
export const STAFF_SESSION_MAX_AGE_S = 8 * 60 * 60 // 8 h au maximum
export const STAFF_IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 min d'inactivité

/**
 * Gestion de la double authentification : réservée à une session déjà validée par
 * un code. Sans cette règle, une session ouverte par simple lien magique pourrait
 * relire le secret TOTP et contourner le second facteur.
 */
const SECOND_FACTOR_MANAGEMENT_PATHS = new Set([
  "/two-factor/get-totp-uri",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/two-factor/view-backup-codes",
  "/two-factor/enable",
])

/** Vérifications réussies d'un code (TOTP ou code de secours) : la session est validée. */
const SECOND_FACTOR_PATHS = new Set([
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
])

function createStaffAuth() {
  return betterAuth({
    appName: "Linkaro Admin",
    baseURL: env.ADMIN_URL,
    basePath: "/api/auth",
    secret: env.STAFF_AUTH_SECRET,
    trustedOrigins: [env.ADMIN_URL],
    database: prismaAdapter(prisma, { provider: "postgresql" }),

    // Pas de mot de passe ni d'inscription : uniquement des comptes créés par invitation.
    emailAndPassword: { enabled: false },

    user: {
      modelName: "staffMember",
      additionalFields: {
        role: { type: "string", required: true, input: false },
        status: { type: "string", defaultValue: "active", input: false },
      },
    },
    session: {
      modelName: "staffSession",
      expiresIn: STAFF_SESSION_MAX_AGE_S,
      // Durée absolue de 8 h, jamais prolongée. L'activité (délai d'inactivité)
      // est enregistrée par requireStaff côté app, après le contrôle d'inactivité :
      // un simple appel à get-session ne peut donc pas réveiller une session expirée.
      disableSessionRefresh: true,
      additionalFields: {
        // Renseigné uniquement après un code de double authentification valide.
        secondFactorVerifiedAt: { type: "date", required: false, input: false },
      },
    },
    account: { modelName: "staffAccount" },
    verification: { modelName: "staffVerification" },

    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "authRateLimit",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/magic-link": { window: 60, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 5 },
        "/two-factor/verify-backup-code": { window: 60, max: 5 },
      },
    },

    advanced: {
      cookiePrefix: "linkaro-staff",
      useSecureCookies: env.NODE_ENV === "production",
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
      // Les cookies de l'administration ne doivent jamais partir vers un autre site.
      defaultCookieAttributes: { sameSite: "strict" },
    },

    databaseHooks: {
      session: {
        create: {
          after: async (session, ctx) => {
            await recordAudit({
              actor: { type: "ADMIN", id: session.userId },
              action: "staff.login",
              metadata: { secondFactor: "pending" },
              context: contextFromEndpoint(ctx),
            })
          },
        },
        delete: {
          after: async (session, ctx) => {
            await recordAudit({
              actor: { type: "ADMIN", id: session.userId },
              action: "staff.logout",
              context: contextFromEndpoint(ctx),
            })
          },
        },
      },
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!SECOND_FACTOR_MANAGEMENT_PATHS.has(ctx.path)) return
        const session = await getSessionFromCtx(ctx)
        if (!session) return // Better Auth refusera la requête (non connecté)
        const member = await prisma.staffMember.findUnique({
          where: { id: session.user.id },
          select: { twoFactorEnabled: true },
        })
        const stored = await prisma.staffSession.findUnique({
          where: { id: session.session.id },
          select: { secondFactorVerifiedAt: true },
        })
        // Première activation (aucun second facteur encore) : autorisée.
        if (!member?.twoFactorEnabled) return
        if (!stored?.secondFactorVerifiedAt) {
          await recordSecurityEvent({
            type: "staff.second_factor_bypass_attempt",
            severity: "CRITICAL",
            userId: session.user.id,
            details: { path: ctx.path },
            context: contextFromEndpoint(ctx),
          })
          throw new APIError("FORBIDDEN", {
            message: "Valide d'abord ta double authentification.",
          })
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (!SECOND_FACTOR_PATHS.has(ctx.path)) return
        // À l'activation, Better Auth remplace la session : on vise la nouvelle si elle existe.
        const session = ctx.context.newSession ?? ctx.context.session
        if (!session) return
        if (ctx.context.returned instanceof Error) {
          await recordSecurityEvent({
            type: "staff.second_factor_failed",
            severity: "WARNING",
            userId: session.user.id,
            context: contextFromEndpoint(ctx),
          })
          return
        }
        await prisma.staffSession.updateMany({
          where: { id: session.session.id, userId: session.user.id },
          data: { secondFactorVerifiedAt: new Date() },
        })
        await recordAudit({
          actor: { type: "ADMIN", id: session.user.id },
          action: "staff.second_factor_verified",
          metadata: {
            method: ctx.path.endsWith("backup-code") ? "backup_code" : "totp",
          },
          context: contextFromEndpoint(ctx),
        })
      }),
    },

    plugins: [
      magicLink({
        // Un lien ne crée jamais de compte : il faut avoir été invité.
        disableSignUp: true,
        expiresIn: 10 * 60, // 10 minutes
        sendMagicLink: async ({ email, url }, ctx) => {
          // Même réponse pour toutes les adresses (rien n'est révélé), mais l'e-mail
          // ne part que vers un membre actif : pas de relais de spam.
          const member = await prisma.staffMember.findUnique({
            where: { email: email.trim().toLowerCase() },
            select: { status: true },
          })
          if (member?.status !== "active") {
            await recordSecurityEvent({
              type: "staff.magic_link_unknown",
              severity: "WARNING",
              identifier: email,
              context: contextFromEndpoint(ctx),
            })
            return
          }
          await sendMail({
            to: email,
            subject: "Ton lien de connexion à l'administration Linkaro",
            text: [
              "Bonjour,",
              "",
              "Voici ton lien de connexion à l'administration Linkaro. Il est valable 10 minutes et ne fonctionne qu'une fois :",
              url,
              "",
              "Tu n'as rien demandé ? Ignore ce message : sans ce lien, personne ne peut se connecter à ta place.",
            ].join("\n"),
          })
        },
      }),
      twoFactor({
        issuer: "Linkaro Admin",
        // Les comptes de l'équipe n'ont pas de mot de passe.
        allowPasswordless: true,
        twoFactorTable: "staffTwoFactor",
      }),
      nextCookies(),
    ],

    onAPIError: {
      errorURL: `${env.ADMIN_URL}/connexion?erreur=lien`,
      onError: (error) => {
        logger.warn({ err: error }, "Erreur d'authentification (équipe)")
      },
    },
  })
}

export type StaffAuth = ReturnType<typeof createStaffAuth>

let instance: StaffAuth | undefined
export function getStaffAuth(): StaffAuth {
  instance ??= createStaffAuth()
  return instance
}
