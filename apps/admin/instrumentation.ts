import type { Instrumentation } from "next"

/** Au démarrage du serveur : masquage des secrets et validation de la configuration. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs")
    await import("./instrumentation.node")
}

/**
 * Point central de capture des erreurs serveur (pages, routes API,
 * Server Actions, proxy) : chaque erreur est journalisée avec l'identifiant
 * de requête, pour pouvoir retracer ce qui s'est passé.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { logger } = await import("./lib/observability")
  const requestId = request.headers["x-request-id"]
  logger.error(
    {
      err: error,
      requestId: Array.isArray(requestId) ? requestId[0] : requestId,
      method: request.method,
      // Sans la query string : elle peut contenir des codes ou tokens.
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
      digest:
        typeof error === "object" && error !== null && "digest" in error
          ? String(error.digest)
          : undefined,
    },
    "Erreur serveur non gérée"
  )
}
