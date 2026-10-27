import PrivateMedia from "./PrivateMedia";
import SelectField from "./SelectField";
export type ReceiptRecord = {
  donationId: number;
  outcome: string;
  issueType: string | null;
  notes: string | null;
  reviewStatus: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};
export default function AdminReceipt({
  receipt,
  save,
  busy,
}: {
  receipt?: ReceiptRecord;
  save: (path: string, body: object) => Promise<void>;
  busy: boolean;
}) {
  if (!receipt)
    return (
      <p className="notice">
        The recipient has not confirmed receipt yet. A donor handover or an
        administrative closure does not confirm the condition of the food
        received.
      </p>
    );
  return (
    <section className="admin-receipt-report">
      <h3>
        {receipt.outcome === "ACCEPTED"
          ? "Recipient confirmed receipt"
          : "Recipient issue report"}
      </h3>
      <span className="status">
        {receipt.outcome === "ACCEPTED"
          ? "Received as described"
          : receipt.reviewStatus.toLowerCase()}
      </span>
      <p>{receipt.notes}</p>
      <p className="muted">
        Recorded: {new Date(receipt.updatedAt).toLocaleString()}
      </p>
      {receipt.outcome === "REPORTED" && (
        <>
          <p>Issue: {receipt.issueType?.toLowerCase().replaceAll("_", " ")}</p>
          <PrivateMedia
            path={`/donations/${receipt.donationId}/receipt/photo`}
            title="Recipient evidence photo"
          />
          {receipt.reviewStatus === "PENDING" ? (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save(`/admin/donations/${receipt.donationId}/receipt/review`, {
                  status: f.get("status"),
                  notes: f.get("notes"),
                });
              }}
            >
              <SelectField
                name="status"
                label="Report decision"
                options={[
                  { value: "RESOLVED", label: "Resolved after review" },
                  { value: "DISMISSED", label: "Dismissed with explanation" },
                ]}
              />
              <label>
                Response to donor and recipient
                <textarea name="notes" required maxLength={2000} rows={4} />
              </label>
              <button className="btn lime" disabled={busy}>
                Save report review
              </button>
            </form>
          ) : (
            <div className="notice">
              <b>Administrator response</b>
              <p>{receipt.adminNotes}</p>
              <small>
                {receipt.reviewedBy} ·{" "}
                {receipt.reviewedAt
                  ? new Date(receipt.reviewedAt).toLocaleString()
                  : ""}
              </small>
            </div>
          )}
        </>
      )}
    </section>
  );
}
