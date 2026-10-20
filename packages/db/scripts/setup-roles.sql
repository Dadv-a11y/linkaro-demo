-- Création des rôles PostgreSQL de Linkaro (à exécuter une fois, en superutilisateur).
--
--   psql -v migrator_password="'…'" -v app_password="'…'" -v database=linkaro \
--        -f packages/db/scripts/setup-roles.sql
--
-- Deux rôles distincts (moindre privilège) :
--   * linkaro_migrator : propriétaire du schéma, utilisé UNIQUEMENT pour les migrations
--     (DATABASE_MIGRATION_URL) ;
--   * linkaro_app : utilisé par web, admin et worker (DATABASE_URL). Il lit et écrit les
--     données, mais ne peut pas modifier le schéma. Les migrations lui retirent en plus
--     le droit de modifier ou de supprimer le journal d'audit.

\set ON_ERROR_STOP on

CREATE ROLE linkaro_migrator LOGIN PASSWORD :migrator_password;
CREATE ROLE linkaro_app LOGIN PASSWORD :app_password;

-- Base existante ou à créer : le migrateur en est propriétaire.
SELECT format('CREATE DATABASE %I OWNER linkaro_migrator', :'database')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'database') \gexec
SELECT format('ALTER DATABASE %I OWNER TO linkaro_migrator', :'database') \gexec

\connect :database

-- Le schéma public appartient au migrateur ; l'application ne peut rien y créer.
ALTER SCHEMA public OWNER TO linkaro_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO linkaro_app;

-- Droits de l'application sur les tables et séquences créées par les futures migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE linkaro_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO linkaro_app;
ALTER DEFAULT PRIVILEGES FOR ROLE linkaro_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO linkaro_app;
ALTER DEFAULT PRIVILEGES FOR ROLE linkaro_migrator IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO linkaro_app;
