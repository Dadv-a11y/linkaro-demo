-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "result" "AuditResult" NOT NULL,
    "reason" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "request_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "prev_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_event" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "severity" "SecuritySeverity" NOT NULL,
    "user_id" TEXT,
    "identifier" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "details" JSONB,

    CONSTRAINT "security_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_hash_key" ON "audit_log"("hash");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "audit_log"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_log_request_id_idx" ON "audit_log"("request_id");

-- CreateIndex
CREATE INDEX "audit_log_ip_address_created_at_idx" ON "audit_log"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "security_event_created_at_idx" ON "security_event"("created_at");

-- CreateIndex
CREATE INDEX "security_event_type_created_at_idx" ON "security_event"("type", "created_at");

-- CreateIndex
CREATE INDEX "security_event_user_id_created_at_idx" ON "security_event"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "security_event_ip_address_created_at_idx" ON "security_event"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "security_event_request_id_idx" ON "security_event"("request_id");

-- ─── Protection des journaux (ajouté à la main) ─────────────────────────────
-- 1. Un déclencheur interdit toute modification, et toute suppression de ligne
--    de moins de 12 mois, quel que soit le rôle SQL (sauf désactivation explicite
--    par le propriétaire, elle-même visible dans les journaux PostgreSQL).
CREATE FUNCTION linkaro_protect_journal() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Le journal % est en ajout seul : modification interdite', TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.created_at > now() - interval '12 months' THEN
    RAISE EXCEPTION 'Le journal % est en ajout seul : suppression interdite avant 12 mois', TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION linkaro_protect_journal();

CREATE TRIGGER security_event_append_only
  BEFORE UPDATE OR DELETE ON "security_event"
  FOR EACH ROW EXECUTE FUNCTION linkaro_protect_journal();

-- TRUNCATE contourne les déclencheurs de ligne : on l'interdit aussi.
CREATE FUNCTION linkaro_forbid_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Le journal % est en ajout seul : TRUNCATE interdit', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION linkaro_forbid_truncate();

CREATE TRIGGER security_event_no_truncate
  BEFORE TRUNCATE ON "security_event"
  FOR EACH STATEMENT EXECUTE FUNCTION linkaro_forbid_truncate();

-- 2. Purge des lignes expirées (> 12 mois), seule suppression possible.
--    SECURITY DEFINER : s'exécute avec les droits du propriétaire, ce qui permet
--    au worker de purger sans avoir lui-même le droit DELETE.
CREATE FUNCTION linkaro_purge_expired_journals() RETURNS TABLE (audit_deleted bigint, security_deleted bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a bigint;
  s bigint;
BEGIN
  DELETE FROM "audit_log" WHERE created_at <= now() - interval '12 months';
  GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM "security_event" WHERE created_at <= now() - interval '12 months';
  GET DIAGNOSTICS s = ROW_COUNT;
  RETURN QUERY SELECT a, s;
END;
$$;

REVOKE ALL ON FUNCTION linkaro_purge_expired_journals() FROM PUBLIC;

-- 3. Droits du rôle applicatif (s'il existe : en développement simplifié, un seul rôle).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'linkaro_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "audit_log", "security_event" FROM linkaro_app;
    GRANT SELECT, INSERT ON "audit_log", "security_event" TO linkaro_app;
    GRANT EXECUTE ON FUNCTION linkaro_purge_expired_journals() TO linkaro_app;
  END IF;
END
$$;
