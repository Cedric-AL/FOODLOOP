# Donation photos, document previews and recipient receipts

## Install this update

1. Run `docs/database/005_donation_photos_receipts.sql` in Supabase SQL Editor after the earlier migrations. It adds nullable photos for existing food records, collection details, handover timestamps and private recipient receipts. Existing accounts and donation records are preserved.
2. Install frontend dependencies with `npm install` from frontend/. PDF.js now renders PDFs inside the app. Its worker, fonts and image decoders are bundled locally; documents are never sent to an online viewer.
3. Restart Java from backend/ after applying the migration. Stop the previous server with Ctrl+C first so port 8080 is free.
4. Refresh Savora with Ctrl+Shift+R.

## Donor submission and admin review

New donations require one JPG/PNG photo up to 5 MB showing the actual food and packaging. The form previews the selected photo. The server checks the actual image format, limits pixel dimensions, strips metadata and re-encodes/resizes the image before storing it privately in PostgreSQL.

Admins see the submitted image in the verification queue. Approved available donations show the same photo to signed-in recipients. Older listings without photos show a clear placeholder. This update does not invent pictures for existing records. A photo supports assessment of the reported condition; it is not a physical inspection or a safety certification.

## ID and registration document previews

Document review now shows images directly and renders PDF pages on the page with Previous/Next controls. Enlarge opens a larger preview; Download copy remains an optional fallback. All document API requests still require an administrator session. Previews use revocable browser object URLs and private no-store responses, not public Supabase object URLs.

PDF.js is pinned to 6.4.299. If upgrading it, update the matching worker/dependency and the vendor assets in `frontend/public/pdfjs` together. Those files include upstream license notices. The viewer renders canvas content without adding clickable PDF annotations or running document JavaScript. Pixel limits keep each rendered page bounded.

## Collection without delivery monitoring

Savora records **recipient-arranged collection**, not a courier service:

1. A verified recipient chooses either personal/organization pickup or a courier they arrange themselves and can add collection notes to their request.
2. The donor reviews that choice and accepts a request. The listed pickup start is the scheduled collection time.
3. The assigned donor/recipient can see each other's email to coordinate directly. Collection notes are visible to the request's parties and admin.
4. The donor clicks **Mark as handed over** after releasing the food. This records a timestamp; it does not confirm recipient receipt or mark the donation completed.
5. The assigned recipient either confirms that the food was received as described or reports a discrepancy. The donation becomes completed with a separate accepted/reported receipt outcome. Administrative completion also remains distinct from recipient acceptance.

Savora does not dispatch couriers, collect delivery fees, monitor locations or provide live delivery tracking. A practical next improvement is an agreed collector name/reference in the existing collection notes; courier arrangements and charges stay between the donor, recipient and the courier they choose.

## Receipt and issue reports

Only the assigned recipient can record receipt. Confirmation includes a checkbox acknowledging the actual food, quantity and condition. Reports require an issue type, explanation and a photo of what arrived. A recipient can report an issue after an earlier acceptance, but cannot overwrite a submitted report or replay acceptance.

The donor and recipient can see their receipt/report and admin response. Photo evidence is limited to those parties and admins. Other recipients cannot view it.

Admins review reports under **Donation records**, using the **Reports awaiting review** filter. They inspect the evidence and record either Resolved or Dismissed with a written response. Report decisions record the administrator�s findings; they do not automatically change donor permissions. A reported receipt is not counted as received as described.

## Validation

Backend checks use isolated H2 databases and cover file requirements/validation, image sanitization, document access, photo visibility, recipient authorization, acceptance/report persistence, admin-only review, replay prevention and handover semantics. Existing account and password-recovery tests remain included. PostgreSQL-specific submission queries still need an end-to-end test against a test Supabase project after migration; no live migration or test donation is created automatically.

Test the real workflow with separate donor, recipient and admin accounts: submit photo → admin approves → recipient requests with collection method → donor accepts and marks handover → recipient confirms/reports → admin reviews report. Also verify a registration image and a multi-page PDF in Document review.
