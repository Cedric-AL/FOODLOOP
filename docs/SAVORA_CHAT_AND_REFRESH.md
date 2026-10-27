# Savora design refresh, pickup expiry, and private chat

## Database setup
Apply `docs/database/006_donation_messages.sql` after migration 005 using Supabase SQL Editor before opening pickup chat. No live database changes were made by this task. The trusted Spring database role needs table and identity sequence privileges; the table has RLS enabled with no browser/public policies. The backend performs participant authorization for every read and send. Restart the backend and frontend after updating the source.

## Pickup deadline
The end of the donor pickup window is the deadline, not the start. The running Spring backend checks every 60 seconds, and donation/request/admin reads reconcile overdue records. On restart it catches up when the scheduled check or a workspace read runs. The scheduler must remain running for background cancellation; this is not a Supabase scheduled job.

Open donations (submitted, under review, available, matched, scheduled for pickup) with a passed deadline and no recorded donor handover become CANCELLED. Accepted requests become CANCELLED; pending requests become REJECTED. Existing administrative notes are preserved and the automatic cancellation reason is appended once. Donor and assigned recipient see that reason. Completed or already handed-over donations remain unchanged so recipients can confirm receipt. Late handover is rejected. Concurrent handover/cancellation updates use database row locks and conditional updates.

## Conversations
Accepted donor-recipient pairs get a per-donation conversation. Other users, including administrators, cannot read or send messages through the chat endpoints. Messages are text only, limited to 2000 characters, rendered as text, and protected by the existing session and CSRF handling. Verified participants can send while the pickup is scheduled; history becomes read-only after completion/cancellation. A handover keeps coordination open until receipt is resolved. Polling runs every four seconds only while a conversation is expanded. History is incrementally fetched in batches of 100, with all pages loaded. The workspace refreshes every 30 seconds.

No chat attachment, read-receipt, push notification, or unread badge is included in this version.

## Design
Green and cream surfaces, a photographic hero, circular Savora logo badge and browser icon, warmer donation cards, clearer status colors, and responsive admin styling. Supplied photographs are local assets; uploaded food photos remain the primary evidence. Legacy listings use clearly labeled category imagery rather than implying it shows the actual donation. The watermarked bakery option was not used. Charts count real donations by creation date and current status; no estimated meals, kilograms or environmental claims are invented.

## Validation
Production TypeScript/Vite build passed. All 31 Spring tests passed, including five new tests covering chat participant isolation, pending-chat rejection, message validation, cursor reads, closed conversation behavior, automatic cancellation, request cleanup, idempotency, handover protection, and late-handover rejection. Tests use isolated H2 databases; Supabase deployment still requires migration 006 and restart.
