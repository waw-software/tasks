CREATE TABLE "setup_claim" (
	"id" smallint PRIMARY KEY NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "setup_claim_single_row" CHECK ("setup_claim"."id" = 1)
);
