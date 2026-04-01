-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('LINKEDIN');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "CommentVoteValue" AS ENUM ('HELPFUL', 'NOT_HELPFUL');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "display_name" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "headline" TEXT,
    "avatar_url" TEXT,
    "linkedin_profile_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_account" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_type" TEXT,
    "scope" TEXT[],
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website_url" TEXT,
    "domain" TEXT,
    "linkedin_url" TEXT,
    "logo_url" TEXT,
    "headquarters" TEXT,
    "industry" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_review" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "employment_context" TEXT,
    "would_recommend" BOOLEAN,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_critique" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_critique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comment" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_comment_id" TEXT,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "review_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_vote" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "value" "CommentVoteValue" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_created_at_idx" ON "user"("created_at");

-- CreateIndex
CREATE INDEX "oauth_account_user_id_idx" ON "oauth_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_account_provider_provider_account_id_key" ON "oauth_account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_account_user_id_provider_key" ON "oauth_account"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "company_domain_key" ON "company"("domain");

-- CreateIndex
CREATE INDEX "company_creator_id_idx" ON "company"("creator_id");

-- CreateIndex
CREATE INDEX "company_status_idx" ON "company"("status");

-- CreateIndex
CREATE INDEX "company_name_idx" ON "company"("name");

-- CreateIndex
CREATE INDEX "company_review_company_id_status_idx" ON "company_review"("company_id", "status");

-- CreateIndex
CREATE INDEX "company_review_author_id_idx" ON "company_review"("author_id");

-- CreateIndex
CREATE INDEX "company_review_published_at_idx" ON "company_review"("published_at");

-- CreateIndex
CREATE INDEX "review_critique_review_id_status_idx" ON "review_critique"("review_id", "status");

-- CreateIndex
CREATE INDEX "review_critique_author_id_idx" ON "review_critique"("author_id");

-- CreateIndex
CREATE INDEX "review_critique_published_at_idx" ON "review_critique"("published_at");

-- CreateIndex
CREATE INDEX "review_comment_review_id_status_idx" ON "review_comment"("review_id", "status");

-- CreateIndex
CREATE INDEX "review_comment_author_id_idx" ON "review_comment"("author_id");

-- CreateIndex
CREATE INDEX "review_comment_parent_comment_id_idx" ON "review_comment"("parent_comment_id");

-- CreateIndex
CREATE INDEX "comment_vote_user_id_idx" ON "comment_vote"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_vote_comment_id_user_id_key" ON "comment_vote"("comment_id", "user_id");

-- AddForeignKey
ALTER TABLE "oauth_account" ADD CONSTRAINT "oauth_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_review" ADD CONSTRAINT "company_review_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_review" ADD CONSTRAINT "company_review_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_critique" ADD CONSTRAINT "review_critique_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "company_review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_critique" ADD CONSTRAINT "review_critique_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "company_review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "review_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_vote" ADD CONSTRAINT "comment_vote_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "review_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_vote" ADD CONSTRAINT "comment_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
