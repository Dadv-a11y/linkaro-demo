-- Droits du rôle applicatif, rejoués à chaque déploiement et après une
-- réinitialisation (qui recrée le schéma public et efface ses droits).
-- Sans effet si le rôle linkaro_app n'existe pas (CI, développement simplifié).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'linkaro_app') THEN
    GRANT USAGE ON SCHEMA public TO linkaro_app;

    -- Tables et séquences existantes.
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO linkaro_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO linkaro_app;

    -- Tables et séquences créées par les migrations suivantes.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO linkaro_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO linkaro_app;

    -- L'historique des migrations n'est pas l'affaire de l'application
    -- (table absente de la base temporaire utilisée par `prisma migrate dev`).
    IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
      REVOKE ALL ON "_prisma_migrations" FROM linkaro_app;
    END IF;

    -- Journaux : ajout seul (voir migration traceabilite).
    REVOKE UPDATE, DELETE, TRUNCATE ON "audit_log", "security_event" FROM linkaro_app;
    GRANT EXECUTE ON FUNCTION linkaro_purge_expired_journals() TO linkaro_app;
  END IF;
END
$$;
