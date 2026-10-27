import { useState } from "react";
import api from "./services/api";
import PhotoPicker from "./PhotoPicker";
import PrivateMedia from "./PrivateMedia";
import SelectField from "./SelectField";

export type ReceiptFields = {
  receiptOutcome?: string | null;
  receiptIssue?: string | null;
  receiptNotes?: string | null;
  receiptReviewStatus?: string | null;
  receiptAdminNotes?: string | null;
};
export default function ReceiptPanel({
  donation,
  recipient,
  onSaved,
}: {
  donation: ReceiptFields & {
    id: number;
    status: string;
    handoverAt: string | null;
  };
  recipient: boolean;
  onSaved: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"" | "ACCEPTED" | "REPORTED">(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const canAct =
    recipient &&
    Boolean(donation.handoverAt) &&
    ["SCHEDULED_FOR_PICKUP", "COMPLETED"].includes(donation.status) &&
    donation.receiptOutcome !== "REPORTED";
  return (
    <section className="receipt-panel">
      <h4>Receipt confirmation</h4>
      {donation.receiptOutcome ? (
        <>
          <span className="status">
            {donation.receiptOutcome === "ACCEPTED"
              ? "Received as described"
              : "Issue reported"}
          </span>
          <p>{donation.receiptNotes}</p>
          {donation.receiptOutcome === "REPORTED" && (
            <>
              <p className="sub">
                Issue:{" "}
                {donation.receiptIssue?.toLowerCase().replaceAll("_", " ")} ·
                Review: {donation.receiptReviewStatus?.toLowerCase()}
              </p>
              <PrivateMedia
                path={`/donations/${donation.id}/receipt/photo`}
                title="Recipient evidence photo"
                compact
              />
              {donation.receiptAdminNotes && (
                <p className="notice">
                  Admin response: {donation.receiptAdminNotes}
                </p>
              )}
            </>
          )}
        </>
      ) : (
        <p className="sub">
          {!donation.handoverAt
            ? "Waiting for the donor to confirm pickup."
            : recipient
              ? "Pickup confirmed. Check the food, then confirm receipt."
              : "Pickup confirmed. Waiting for the recipient’s confirmation."}
        </p>
      )}
      {canAct && (
        <>
          <div className="actions">
            {!donation.receiptOutcome && (
              <button
                type="button"
                className="btn lime"
                onClick={() => {
                  setMode("ACCEPTED");
                  setError("");
                }}
              >
                Confirm receipt
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => {
                setMode("REPORTED");
                setError("");
              }}
            >
              Report an issue
            </button>
          </div>
          {mode && canAct && (
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                const data = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                try {
                  const body = new FormData();
                  body.append(
                    "details",
                    new Blob(
                      [
                        JSON.stringify({
                          outcome: mode,
                          issueType:
                            mode === "REPORTED" ? data.get("issueType") : null,
                          notes: data.get("notes"),
                        }),
                      ],
                      { type: "application/json" },
                    ),
                  );
                  if (mode === "REPORTED")
                    body.append("evidence", data.get("evidence") as File);
                  await api.post(`/donations/${donation.id}/receipt`, body);
                  setMode("");
                  await onSaved();
                } catch (ex) {
                  setError(
                    (ex as { response?: { data?: { message?: string } } })
                      .response?.data?.message ||
                      "We could not save this receipt. Refresh the workspace and try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {mode === "REPORTED" ? (
                <>
                  <h4>What was different?</h4>
                  <SelectField
                    name="issueType"
                    label="Issue type"
                    options={[
                      {
                        value: "WRONG_ITEM",
                        label: "Different food or product",
                      },
                      { value: "QUANTITY", label: "Quantity was different" },
                      {
                        value: "CONDITION",
                        label: "Condition or packaging concern",
                      },
                      { value: "OTHER", label: "Another issue" },
                    ]}
                  />
                  <label>
                    Explain the issue
                    <textarea name="notes" required rows={3} maxLength={2000} />
                  </label>
                  <PhotoPicker
                    name="evidence"
                    label="Photo of what you received"
                  />
                  <p className="sub">
                    The donor and administrator can review this evidence. An
                    administrator will record a response.
                  </p>
                </>
              ) : (
                <>
                  <label className="receipt-confirm">
                    <input type="checkbox" required />I received the listed food
                    and it matches the description, quantity and condition.
                  </label>
                  <label>
                    Receipt notes (optional)
                    <textarea name="notes" rows={2} maxLength={2000} />
                  </label>
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn lime" disabled={busy}>
                {busy
                  ? "Saving…"
                  : mode === "REPORTED"
                    ? "Submit issue report"
                    : "Confirm received as described"}
              </button>
              <button
                type="button"
                className="link"
                disabled={busy}
                onClick={() => setMode("")}
              >
                Cancel
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
