-- CreateTable
CREATE TABLE "staff_member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "two_factor_enabled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "second_factor_verified_at" TIMESTAMPTZ(3),
    "staff_member_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "staff_member_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(3),
    "refresh_token_expires_at" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "staff_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_two_factor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failed_verification_count" INTEGER DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "staff_member_id" TEXT NOT NULL,

    CONSTRAINT "staff_two_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "invited_by_id" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_member_email_key" ON "staff_member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_session_token_key" ON "staff_session"("token");

-- CreateIndex
CREATE INDEX "staff_session_staff_member_id_idx" ON "staff_session"("staff_member_id");

-- CreateIndex
CREATE INDEX "staff_account_staff_member_id_idx" ON "staff_account"("staff_member_id");

-- CreateIndex
CREATE INDEX "staff_verification_identifier_idx" ON "staff_verification"("identifier");

-- CreateIndex
CREATE INDEX "staff_two_factor_secret_idx" ON "staff_two_factor"("secret");

-- CreateIndex
CREATE INDEX "staff_two_factor_staff_member_id_idx" ON "staff_two_factor"("staff_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitation_token_hash_key" ON "staff_invitation"("token_hash");

-- CreateIndex
CREATE INDEX "staff_invitation_email_idx" ON "staff_invitation"("email");

-- AddForeignKey
ALTER TABLE "staff_session" ADD CONSTRAINT "staff_session_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_account" ADD CONSTRAINT "staff_account_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_two_factor" ADD CONSTRAINT "staff_two_factor_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "staff_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "staff_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Contraintes ajoutées à la main ─────────────────────────────────────────
-- Les rôles et statuts sont des textes (imposé par Better Auth) : la base
-- refuse toute valeur inconnue, même si une erreur applicative en laissait passer.
ALTER TABLE "staff_member"
  ADD CONSTRAINT staff_member_role_check CHECK (role IN ('superadmin', 'ops', 'support', 'tech')),
  ADD CONSTRAINT staff_member_status_check CHECK (status IN ('active', 'disabled'));

ALTER TABLE "staff_invitation"
  ADD CONSTRAINT staff_invitation_role_check CHECK (role IN ('superadmin', 'ops', 'support', 'tech')),
  ADD CONSTRAINT staff_invitation_reason_check CHECK (length(trim(reason)) > 0);

ALTER TABLE "creator"
  ADD CONSTRAINT creator_status_check CHECK (status IN ('active', 'suspended'));
