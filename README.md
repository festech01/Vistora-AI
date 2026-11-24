# Vistora AI
Private staging for a Nigerian-first creative studio. Next.js App Router, React, TypeScript, Supabase/PostgreSQL and server-only Paystack and fal.ai integrations.

## Local setup
Use Node.js 22. Install dependencies with npm install, then run npm test, npm run build and npm run dev. Open http://localhost:3000. The landing page, short film, themes, currency preferences and downloadable creative briefs work without service credentials. Briefs are stored on the current device. Accounts require a dedicated Supabase project with email confirmation enabled.

## Private staging
Develop on staging. Keep Vercel Authentication enabled for all preview domains and leave main free of release changes until the owner approves launch after payment and generation verification. GitHub source visibility is independent from deployment visibility. Put server credentials in encrypted Vercel environment settings. Keep staging and production billing databases and credentials isolated.

Apply both numbered SQL migrations in order to the dedicated project first. RLS limits signed-in readers to their records. The checkout gate in the API is deliberately closed while the paid generation workflow is unfinished. Authentic signed webhooks undergo independent Paystack verification before credits enter the ledger. Retries of the same successful payment are idempotent.

## Commissioning and recovery
See docs/API-CONFIGURATION.md for provider configuration. Obtain a reviewed price and the owner's spending authorization before using scripts/verify-video.mjs. It can submit one real Kling job and separately poll by request ID. Preserve that ID before polling. Review the actual file, dimensions, duration and cost. Run the 20-case benchmark only within an approved budget.

Use Supabase backups or encrypted database dumps held outside the deployment. Restore into an isolated project first. Compare order counts, provider transaction IDs and ledger totals; rehearse before enabling billing. Rotate server credentials through the hosting provider; revoke compromised credentials and pause checkout immediately.

## Verification and open work
Unit checks cover Paystack signatures, transaction matching, mode isolation, model input and credit package rules. Run npm test for the current count. No real payment, generation or provider charge has been verified. The release still needs a verified worker recovery, media retention, Gemini analysis, PiAPI consent flow, protected administration, lifecycle management, reconciliation of refunds/chargebacks, production pricing, end-to-end security and mobile tests. Incomplete tools only save briefs. Do not open checkout before these required controls and live checks pass.

The initial Kling worker is in scripts/video-worker.mjs. Migration 002 adds idempotent quote acceptance, serialized balance checks and queue claims. It requires a private studio-results bucket and a dedicated restricted FFprobe host. Interrupted or uncertain submissions enter reconciliation. Retry, refund, ownership, storage and live media checks require staging verification before use.
