import { createLogger } from "@linkaro/observability"

// Logger du proxy : module séparé, sans « server-only » ni next/headers,
// car le proxy s'exécute avant le rendu.
export const logger = createLogger({ app: "web" })
