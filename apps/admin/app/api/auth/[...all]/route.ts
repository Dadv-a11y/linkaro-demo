import { getStaffAuth } from "@linkaro/auth"
import { toNextJsHandler } from "better-auth/next-js"

// Points d'accès Better Auth de l'équipe : /api/auth/* (annuaire séparé des créateurs).
export const { GET, POST } = toNextJsHandler((request) =>
  getStaffAuth().handler(request)
)
