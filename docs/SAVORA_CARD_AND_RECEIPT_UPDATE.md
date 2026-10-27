# Donation cards and receipt sequence

- Donation cards show a photo, title, compact status badge, quantity, pickup location, and pickup window. Expand the native keyboard-accessible details control for labeled pickup and food/storage information, donor notes, and collection contact details. Available-food request forms are inside that expanded section. Chat and handover/receipt controls remain outside it.
- Typography uses stronger headings, readable metadata, and dividers between sections. Long locations are previewed on two lines, with the full address in details. Uploaded photos can still be enlarged.
- Recipients cannot confirm receipt or report received food until the donor records handover. The server checks handover_at under the donation row lock, before saving any receipt or completing the donation. Admin completion without donor handover cannot bypass this requirement. Existing historical receipt records are preserved.
- Admin donation filters and charts share five stage groups: Awaiting review, Available, Awaiting pickup, Completed, Cancelled. Reports awaiting review remains because issue reports and admin reviews are implemented. Legacy UNDER_REVIEW records group under Awaiting review and MATCHED records under Awaiting pickup; stored values are preserved. The application currently accepts requests directly into SCHEDULED_FOR_PICKUP, so no separate matched workflow is claimed.
- No database migration is needed for this update. Restart the backend and reload the frontend.

Validation: production frontend build and all 33 backend tests, including pre-handover acceptance/report rejection and successful receipt after donor handover.
