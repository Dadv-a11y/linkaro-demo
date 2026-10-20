import { getCreatorAuth } from "@linkaro/auth"
import { toNextJsHandler } from "better-auth/next-js"

// Points d'accès Better Auth des créateurs : /api/auth/*
export const { GET, POST } = toNextJsHandler((request) =>
  getCreatorAuth().handler(request)
)
