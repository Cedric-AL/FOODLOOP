# Savora adviser readiness review

Reviewed 27 October 2026. Scope: current local React/Spring source, existing workflow documentation, and an isolated frontend session preview. This is a focused code review, not a full penetration test or a live Supabase audit. Findings below remain open unless marked fixed. No live data was changed.

## Fixed: landing-page flash on refresh
The application previously treated the initial `user = null` as proof of a signed-out visitor before `/auth/me` returned. It now gates public/account content behind session restoration. A neutral loading screen appears first; only an actual 401 response selects the landing page. Connection failures show a retry screen instead of implying the account is signed out. Account-record loading errors stay in the authenticated workspace. Session requests have 15-second timeouts, and outdated restoration results are ignored after unmount.

## 1. High priority: admin completion can bypass the handoff sequence
Evidence: `backend/src/main/java/com/foodloop/controller/AdminController.java:100`, especially the COMPLETE check at line 105 and update at line 108. COMPLETE only requires the existing status to be SCHEDULED_FOR_PICKUP. It does not require handover_at, a recipient assignment, or a recipient receipt. The corresponding UI offers completion for scheduled donations.

Trigger: an administrator chooses COMPLETE on a scheduled donation before the donor records handover. The donation becomes COMPLETED while the recipient receipt endpoint correctly rejects confirmation because handover_at is still null. Counts and chat closure can therefore imply a finished handoff without recipient evidence.

Recommendation: either reserve normal completion for recipient receipt, or model admin closure as a separate documented override with an actor, reason, timestamp, and explicit display label. At minimum block ordinary completion without donor handover. This policy change was not applied during the refresh fix.

## 2. Medium priority: claimed matching exceeds the current implementation
Evidence: `frontend/src/landing.ts` describes nearby recipients and “Needs- and location-aware matching.” `backend/src/main/java/com/foodloop/controller/WorkspaceController.java:38` lists all eligible available food without distance, recipient needs, or location matching; request acceptance is a donor decision at `/requests/{id}/accept`.

Adviser question: what is the matching algorithm, and how are distance and needs used? The present implementation supports browsing, requests, and donor selection. Recommendation: describe that accurately in the interface and thesis, or implement and evaluate the claimed matching logic. Plain-text pickup locations alone do not establish proximity.

## 3. Medium priority: admin actions do not have a complete audit history
Evidence: `AdminController.java:108` overwrites donation notes and status. Organization application reviews and receipt reviews record reviewers, but ordinary donation edits, cancellation/completion, verification revocation, and account edits do not append an immutable per-action event history in the inspected source.

Adviser question: who changed a donation, what was its previous status, and why? Recommendation: add an append-only audit table with actor, target, action, previous/new values, reason, and timestamp. Keep administrative notes separate from cancellation reasons; a later note edit can overwrite the reason currently displayed on cancelled cards.

## 4. Medium priority: expired sessions are silently ignored by background refresh
Evidence: `frontend/src/App.tsx` refreshes account records every 30 seconds with `.catch(() => {})`. A session that expires after the page loads can leave the old workspace and verification badge on screen. This does not bypass server authorization, but the user gets no immediate sign-in prompt and can lose a draft after a later action fails.

Recommendation: handle background 401 responses centrally, preserve safe drafts, and show a clear session-expired sign-in flow. This is distinct from the initial refresh flash fixed above.

## 5. Medium priority before public hosting: no application login-attempt throttling found
Evidence: `backend/src/main/java/com/foodloop/config/WebConfig.java:17` configures form login without an application attempt limiter; the inspected authentication filter rechecks account privileges, not login frequency. Password-reset attempt controls exist separately and should not be described as login throttling.

Recommendation: verify whether the hosting proxy already enforces a limit; if not, add account/IP-aware login and registration controls before public hosting. This finding concerns inspected application code; external hosting protections were not inspected.

## 6. Functional limitation: automatic cancellation depends on the backend running
Evidence: `backend/src/main/java/com/foodloop/service/PickupExpiry.java:14` runs a Spring scheduled job every 60 seconds, with additional reconciliation during workspace reads. Closing the app/backend means no background cancellation until it runs again or reconciles on read. This is a deployment dependency, not proof the expiry rule is broken.

Adviser/demo preparation: keep the backend hosted continuously, explain the check interval, and demonstrate an overdue donation, its request cleanup, and protection for a donation already handed over.

## 7. Functional limitation: several common coordination actions are missing
The inspected user routes include request creation and donor acceptance, but no donor request-rejection endpoint, recipient request-withdrawal endpoint, or pickup rescheduling endpoint. An accidental request or changed collection plan therefore has no dedicated user-facing resolution. Admin cancellation is available, but closes the donation rather than resolving one request.

Recommendation: define allowed actions at each stage, then add reject/withdraw/reschedule paths with ownership checks, deadline validation, history, and consistent request/donation updates.

## Validation and demo limits
The session fix is frontend-only. The production build is checked, and a temporary fake API exercises slow authenticated restoration, anonymous 401, server failure/retry, and admin restoration. It does not test real login credentials or Supabase connectivity. The previous backend suite passed 33 tests, but that prior result is not a new live PostgreSQL integration test.

Before an adviser demo, verify the configured real database migrations and reset-email delivery separately; demonstrate two distinct accounts, request acceptance, chat privacy, donor handover before receipt, issue-report review, and expiry. Do not use illustrative category images as evidence of the actual donated food, and do not claim location matching, live courier tracking, read receipts, or impact calculations that have not been implemented.
