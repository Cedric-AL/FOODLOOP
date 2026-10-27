# Savora administrator workspace

For the latest photo, document-preview and recipient receipt workflow, see [Donation evidence and handoff](DONATION_EVIDENCE_AND_HANDOFF.md).

The administrator workspace uses the original Savora sidebar and four pages:

- **User management:** search accounts, edit names and contact details, change roles, and revoke organization verification with feedback. Email and password hashes are not editable here. Password hashes are never included in API responses.
- **Document review:** search/filter applications, download legal registration documents and IDs privately, approve or reject pending applications with feedback, and inspect past reviews.
- **Donation records:** search/filter all donation statuses, inspect donor/recipient details and requests, add administrative notes, cancel open donations, or confirm scheduled pickups as completed.
- **Verification queue:** lists submitted donations awaiting food screening. Inspect food conditions, packaging, storage, food date and pickup window; pass screening to publish or fail screening to cancel.

Organization document verification and food screening are separate queues. Accounts gain organization verification through an approved application; it is not an arbitrary checkbox in user management.

No additional migration is required beyond the existing initial schema and `002_verification.sql`. Restart the Java backend and refresh Vite after applying this code. Existing administrators can sign in as before. Navigate directly to `#admin/users`, `#admin/documents`, `#admin/records` or `#admin/verification` after signing in.

Administrator permissions are reloaded from the database for each authenticated API request. A previously logged-in administrator loses admin access immediately after demotion. Administrators cannot demote themselves. Role changes are serialized across administrators to prevent concurrent removal of all administrator access. Switching between donor and recipient roles is blocked once donation activity exists; changing to a non-admin role invalidates prior organization verification and requires resubmission.

Donation record updates include the displayed status to reject stale changes. Administrative completion requires a scheduled pickup; cancellation closes pending/accepted requests. Publishing food continues to require screening through the verification queue.

The site reads and writes through authenticated Java endpoints. No records are seeded and no live database migration or data modification is performed during code installation. Automated checks use an isolated H2 database; test the PostgreSQL-specific queries with a test Supabase project before public use.
