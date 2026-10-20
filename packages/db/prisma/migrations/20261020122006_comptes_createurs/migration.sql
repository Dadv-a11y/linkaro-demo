-- CreateTable
CREATE TABLE "creator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "adult_confirmed_at" TIMESTAMPTZ(3),
    "terms_accepted_at" TIMESTAMPTZ(3),
    "terms_version" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "creator_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "creator_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(3),
    "refresh_token_expires_at" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "creator_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "creator_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "last_request" BIGINT NOT NULL,

    CONSTRAINT "auth_rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_email_key" ON "creator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "creator_session_token_key" ON "creator_session"("token");

-- CreateIndex
CREATE INDEX "creator_session_creator_id_idx" ON "creator_session"("creator_id");

-- CreateIndex
CREATE INDEX "creator_account_creator_id_idx" ON "creator_account"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_account_provider_id_account_id_key" ON "creator_account"("provider_id", "account_id");

-- CreateIndex
CREATE INDEX "creator_verification_identifier_idx" ON "creator_verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "auth_rate_limit_key_key" ON "auth_rate_limit"("key");

-- AddForeignKey
ALTER TABLE "creator_session" ADD CONSTRAINT "creator_session_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_account" ADD CONSTRAINT "creator_account_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
