import { FormEvent, useEffect, useState } from "react";
import api from "./services/api";
import "./styles/admin.css";

type Account = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  phone: string | null;
  location: string | null;
  role: string;
  verified: boolean;
  createdAt: string;
};
type Application = {
  id: number;
  userId: number;
  organization: string;
  status: string;
  notes: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};
type Donation = {
  id: number;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  dateType: string;
  pickupLocation: string;
  pickupFrom: string;
  pickupUntil: string;
  foodCondition: string;
  packagingCondition: string;
  storageInfo: string;
  foodNotes: string | null;
  screeningStatus: string;
  screeningNotes: string | null;
  status: string;
  scheduledPickup: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  donor: string | null;
  donorEmail: string;
  recipient: string | null;
  recipientEmail: string | null;
};
type Request = {
  id: number;
  donationId: number;
  status: string;
  message: string | null;
  createdAt: string;
  organization: string | null;
  email: string;
};
type Workspace = {
  users: Account[];
  applications: Application[];
  donations: Donation[];
  requests: Request[];
};
const pages = [
  {
    key: "users",
    title: "User management",
    description:
      "Manage accounts, contact details, roles, and organization access.",
  },
  {
    key: "documents",
    title: "Document review",
    description:
      "Review legal documents and valid IDs before approving organizations.",
  },
  {
    key: "records",
    title: "Donation records",
    description: "Follow every donation from submission to completed pickup.",
  },
  {
    key: "verification",
    title: "Verification queue",
    description:
      "Screen submitted food and collection details before making listings available.",
  },
] as const;
type Page = (typeof pages)[number]["key"];
const text = (s: string | null | undefined) =>
  s ? s.toLowerCase().replaceAll("_", " ") : "—";
const date = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const getPage = (): Page => {
  const key = window.location.hash.replace("#admin/", "");
  return pages.some((p) => p.key === key) ? (key as Page) : "verification";
};
const message = (e: unknown) => {
  const r = (
    e as { response?: { status: number; data?: { message?: string } } }
  ).response;
  return (
    r?.data?.message ||
    (r?.status === 401
      ? "Your session expired. Sign out and sign in again."
      : r?.status === 403
        ? "Your administrator access has changed. Sign out and sign in again."
        : r?.status === 500
          ? "The server could not load these records. Check the backend log and confirm the verification migration has been applied."
          : "Unable to reach the server. Check that the backend is running.")
  );
};

export default function AdminWorkspace({
  user,
  onSignOut,
}: {
  user: { id: number; firstName: string; email: string };
  onSignOut: () => Promise<void>;
}) {
  const [data, setData] = useState<Workspace>({
    users: [],
    applications: [],
    donations: [],
    requests: [],
  });
  const [page, setPage] = useState<Page>(getPage),
    [selected, setSelected] = useState<number | null>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function refresh() {
    const response = await api.get<Workspace>("/admin/workspace");
    setData(response.data);
  }
  useEffect(() => {
    let current = true;
    api
      .get<Workspace>("/admin/workspace")
      .then((r) => {
        if (current) setData(r.data);
      })
      .catch((e) => {
        if (current) setError(message(e));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    const hash = () => {
      setPage(getPage());
      setSelected(null);
      setSearch("");
      setFilter("ALL");
      setNotice("");
    };
    window.addEventListener("hashchange", hash);
    return () => {
      current = false;
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  async function action(fn: () => Promise<void>, success = "Changes saved.") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      if (success) {
        await refresh();
        setNotice(success);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: Page) {
    window.location.hash = `admin/${next}`;
  }
  async function post(path: string, body: object) {
    await action(async () => {
      await api.post(path, body);
    });
  }
  async function download(id: number, kind: string) {
    await action(async () => {
      const r = await api.get(`/admin/applications/${id}/${kind}`, {
        responseType: "blob",
      });
      const b = r.data as Blob,
        bytes = new Uint8Array(await b.slice(0, 8).arrayBuffer());
      const ext = bytes[0] === 37 ? "pdf" : bytes[0] === 137 ? "png" : "jpg";
      const url = URL.createObjectURL(b),
        a = document.createElement("a");
      a.href = url;
      a.download = `application-${id}-${kind}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, "");
  }
  const currentPage = pages.find((p) => p.key === page)!;
  const pendingDocs = data.applications.filter(
    (a) => a.status === "PENDING",
  ).length;
  const pendingFood = data.donations.filter(
    (d) => d.status === "SUBMITTED",
  ).length;
  const query = search.trim().toLowerCase();
  const users = data.users.filter(
    (u) =>
      `${u.firstName} ${u.lastName} ${u.email} ${u.organization || ""}`
        .toLowerCase()
        .includes(query) &&
      (filter === "ALL" || u.role === filter),
  );
  const applications = data.applications.filter(
    (a) =>
      `${a.organization} ${a.email} ${a.id}`.toLowerCase().includes(query) &&
      (filter === "ALL" || a.status === filter),
  );
  const donations = data.donations.filter(
    (d) =>
      (page !== "verification" || d.status === "SUBMITTED") &&
      `${d.id} ${d.title} ${d.donor || ""} ${d.donorEmail} ${d.category}`
        .toLowerCase()
        .includes(query) &&
      (filter === "ALL" || d.status === filter),
  );
  const selectedUser = users.find((u) => u.id === selected) || users[0];
  const selectedApp =
    applications.find((a) => a.id === selected) || applications[0];
  const donation = donations.find((d) => d.id === selected) || donations[0];
  const counts: Record<Page, number> = {
    users: data.users.length,
    documents: pendingDocs,
    records: data.donations.length,
    verification: pendingFood,
  };
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="side-top">
          <a className="logo" href="/">
            <span className="leaf">❧</span>savora
          </a>
          <span className="adm">Admin</span>
        </div>
        <nav aria-label="Administrator pages">
          {pages.map((p) => (
            <a
              key={p.key}
              href={`#admin/${p.key}`}
              aria-current={page === p.key ? "page" : undefined}
              className={page === p.key ? "active" : ""}
            >
              {p.title}
              <span className="cnt">{counts[p.key]}</span>
            </a>
          ))}
        </nav>
        <div className="admin-identity">
          <b>{user.firstName}</b>
          <span>{user.email}</span>
          <small>Administrator</small>
          <button disabled={busy} onClick={() => action(onSignOut, "")}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-heading">
          <div>
            <p className="eyebrow">Savora administration</p>
            <h1>{currentPage.title}</h1>
            <p className="muted">{currentPage.description}</p>
          </div>
          <button
            className="btn"
            disabled={busy || loading}
            onClick={() => action(refresh, "Workspace refreshed.")}
          >
            Refresh
          </button>
        </header>
        <div className="admin-statistics">
          {[
            {
              key: "users",
              name: "Registered accounts",
              value: data.users.length,
            },
            {
              key: "documents",
              name: "Documents awaiting review",
              value: pendingDocs,
            },
            {
              key: "verification",
              name: "Donations to screen",
              value: pendingFood,
            },
            {
              key: "records",
              name: "Completed pickups",
              value: data.donations.filter((d) => d.status === "COMPLETED")
                .length,
            },
          ].map((s) => (
            <button key={s.key} onClick={() => navigate(s.key as Page)}>
              <span>{s.name}</span>
              <strong>{s.value}</strong>
            </button>
          ))}
        </div>
        <div aria-live="polite">
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="notice success">{notice}</p>}
          {loading && <p className="notice">Loading records…</p>}
        </div>
        <div className="admin-toolbar">
          <label className="admin-search">
            Search {currentPage.title.toLowerCase()}
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              placeholder={
                page === "users"
                  ? "Name, organization, or email"
                  : "Reference, organization, or food name"
              }
            />
          </label>
          {page !== "verification" && (
            <label>
              Filter
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setSelected(null);
                }}
              >
                <option value="ALL">
                  All {page === "users" ? "roles" : "statuses"}
                </option>
                {(page === "users"
                  ? ["DONOR", "RECIPIENT", "ADMIN"]
                  : page === "documents"
                    ? ["PENDING", "APPROVED", "REJECTED"]
                    : [
                        "SUBMITTED",
                        "UNDER_REVIEW",
                        "AVAILABLE",
                        "MATCHED",
                        "SCHEDULED_FOR_PICKUP",
                        "COMPLETED",
                        "CANCELLED",
                      ]
                ).map((v) => (
                  <option value={v} key={v}>
                    {text(v)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!loading && (
          <div className="admin-split">
            <section
              className="admin-list"
              aria-label={`${currentPage.title} list`}
            >
              <header>
                <h2>
                  {page === "verification"
                    ? "Waiting for review"
                    : page === "documents"
                      ? "Organization applications"
                      : page === "users"
                        ? "Registered accounts"
                        : "All donation records"}
                </h2>
                <span className="cnt">
                  {page === "users"
                    ? users.length
                    : page === "documents"
                      ? applications.length
                      : donations.length}
                </span>
              </header>
              {page === "users"
                ? users.map((u) => (
                    <button
                      key={u.id}
                      className={selectedUser?.id === u.id ? "selected" : ""}
                      onClick={() => setSelected(u.id)}
                    >
                      <small>
                        {text(u.role)} ·{" "}
                        {u.verified ? "Verified" : "Unverified"}
                      </small>
                      <strong>
                        {u.firstName} {u.lastName}
                      </strong>
                      <span>{u.organization || u.email}</span>
                    </button>
                  ))
                : page === "documents"
                  ? applications.map((a) => (
                      <button
                        key={a.id}
                        className={selectedApp?.id === a.id ? "selected" : ""}
                        onClick={() => setSelected(a.id)}
                      >
                        <small>
                          APP-{a.id} · {text(a.status)}
                        </small>
                        <strong>{a.organization}</strong>
                        <span>
                          {a.email} · {date(a.createdAt)}
                        </span>
                      </button>
                    ))
                  : donations.map((d) => (
                      <button
                        key={d.id}
                        className={donation?.id === d.id ? "selected" : ""}
                        onClick={() => setSelected(d.id)}
                      >
                        <small>
                          SV-{d.id} · {text(d.status)}
                        </small>
                        <strong>{d.title}</strong>
                        <span>
                          {d.donor || d.donorEmail} · {date(d.createdAt)}
                        </span>
                      </button>
                    ))}
              {(page === "users"
                ? !users.length
                : page === "documents"
                  ? !applications.length
                  : !donations.length) && (
                <p className="admin-empty">
                  {query || filter !== "ALL"
                    ? "No matching records."
                    : page === "verification"
                      ? "All caught up. No donations are waiting for screening."
                      : "No records yet."}
                </p>
              )}
            </section>
            <section
              className="admin-detail"
              aria-label="Selected record details"
            >
              {page === "users" && selectedUser && (
                <UserDetail
                  key={`${selectedUser.id}-${selectedUser.role}-${selectedUser.verified}`}
                  account={selectedUser}
                  currentId={user.id}
                  busy={busy}
                  save={post}
                />
              )}
              {page === "documents" && selectedApp && (
                <div key={`${selectedApp.id}-${selectedApp.status}`}>
                  <DetailHeading
                    reference={`APP-${selectedApp.id} · ${text(selectedApp.role)}`}
                    title={selectedApp.organization}
                    status={selectedApp.status}
                    subtitle={`Submitted by ${selectedApp.firstName} ${selectedApp.lastName} · ${date(selectedApp.createdAt)}`}
                  />
                  <div className="admin-detail-body">
                    <h3>Organization documents</h3>
                    <p className="muted">
                      Review both documents and confirm the organization and
                      applicant details before making a decision.
                    </p>
                    <Details
                      values={[
                        [
                          "Applicant",
                          `${selectedApp.firstName} ${selectedApp.lastName}`,
                        ],
                        ["Email", selectedApp.email],
                        ["Account role", text(selectedApp.role)],
                        ["Submitted", date(selectedApp.createdAt)],
                      ]}
                    />
                    <div className="admin-documents">
                      <article>
                        <b>Legal registration document</b>
                        <p>
                          Evidence of the organization's legal registration.
                        </p>
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() => download(selectedApp.id, "legal")}
                        >
                          Download document
                        </button>
                      </article>
                      <article>
                        <b>Valid government ID</b>
                        <p>Identity evidence submitted by the applicant.</p>
                        <button
                          className="btn"
                          disabled={busy}
                          onClick={() => download(selectedApp.id, "identity")}
                        >
                          Download ID
                        </button>
                      </article>
                    </div>
                    {selectedApp.status === "PENDING" ? (
                      <form
                        className="form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          post(`/admin/applications/${selectedApp.id}/review`, {
                            status: f.get("status"),
                            notes: f.get("notes"),
                          });
                        }}
                      >
                        <h3>Review decision</h3>
                        <label>
                          Decision
                          <select name="status" defaultValue="" required>
                            <option value="" disabled>
                              Select a decision
                            </option>
                            <option value="APPROVED">
                              Approve organization
                            </option>
                            <option value="REJECTED">
                              Reject and request corrections
                            </option>
                          </select>
                        </label>
                        <label>
                          Feedback for the applicant
                          <textarea
                            name="notes"
                            required
                            maxLength={1000}
                            rows={4}
                          />
                        </label>
                        <button className="btn lime" disabled={busy}>
                          Save document review
                        </button>
                      </form>
                    ) : (
                      <div className="notice">
                        <b>{text(selectedApp.status)}</b>
                        <p>{selectedApp.notes}</p>
                        <small>
                          Reviewed by{" "}
                          {selectedApp.reviewedBy || "administrator"} ·{" "}
                          {date(selectedApp.reviewedAt)}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(page === "verification" || page === "records") && donation && (
                <div key={`${donation.id}-${donation.status}`}>
                  <DetailHeading
                    reference={`SV-${donation.id} · ${donation.category}`}
                    title={donation.title}
                    status={donation.status}
                    subtitle={`Submitted by ${donation.donor || donation.donorEmail} · ${date(donation.createdAt)}`}
                  />
                  <div className="admin-detail-body">
                    <p className="admin-disclaimer">
                      <b>Basic screening and documentation only.</b> Review the
                      supplied information carefully. Savora does not physically
                      inspect, certify, or guarantee the safety of donated food.
                    </p>
                    <h3>Food and collection details</h3>
                    <p className="muted">
                      Information supplied by the food establishment
                    </p>
                    <Details
                      values={[
                        ["Food description", donation.title],
                        ["Category", donation.category],
                        ["Quantity", `${donation.quantity} ${donation.unit}`],
                        ["Pickup location", donation.pickupLocation],
                        ["Pickup starts", date(donation.pickupFrom)],
                        ["Pickup ends", date(donation.pickupUntil)],
                        [text(donation.dateType), donation.expiryDate],
                        ["Food condition", donation.foodCondition],
                        ["Packaging condition", donation.packagingCondition],
                        ["Storage information", donation.storageInfo],
                        ["Donor email", donation.donorEmail],
                        ["Additional food notes", donation.foodNotes],
                      ]}
                    />
                    {page === "verification" ? (
                      <ScreeningForm
                        key={donation.id}
                        donation={donation}
                        busy={busy}
                        save={post}
                      />
                    ) : (
                      <>
                        <h3>Donation lifecycle</h3>
                        <ol className="admin-timeline">
                          {[
                            "SUBMITTED",
                            "AVAILABLE",
                            "SCHEDULED_FOR_PICKUP",
                            "COMPLETED",
                          ].map((s) => (
                            <li
                              key={s}
                              className={donation.status === s ? "current" : ""}
                            >
                              {text(s)}
                            </li>
                          ))}
                        </ol>
                        <Details
                          values={[
                            ["Current status", text(donation.status)],
                            [
                              "Screening result",
                              text(donation.screeningStatus),
                            ],
                            ["Screening notes", donation.screeningNotes],
                            [
                              "Recipient",
                              donation.recipient || donation.recipientEmail,
                            ],
                            [
                              "Scheduled pickup",
                              date(donation.scheduledPickup),
                            ],
                            ["Completed at", date(donation.completedAt)],
                          ]}
                        />
                        <h3>Recipient requests</h3>
                        {data.requests
                          .filter((r) => r.donationId === donation.id)
                          .map((r) => (
                            <article className="admin-request" key={r.id}>
                              <b>{r.organization || r.email}</b>
                              <span>{text(r.status)}</span>
                              <small>
                                {r.email} · {date(r.createdAt)}
                              </small>
                              {r.message && <p>{r.message}</p>}
                            </article>
                          ))}
                        {!data.requests.some(
                          (r) => r.donationId === donation.id,
                        ) && (
                          <p className="muted">No recipient requests yet.</p>
                        )}
                        <form
                          className="form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            if (
                              f.get("action") !== "KEEP" &&
                              !window.confirm(
                                `Confirm ${text(String(f.get("action")))} for donation SV-${donation.id}?`,
                              )
                            )
                              return;
                            post(`/admin/donations/${donation.id}/record`, {
                              action: f.get("action"),
                              expectedStatus: donation.status,
                              notes: f.get("notes"),
                            });
                          }}
                        >
                          <h3>Manage donation record</h3>
                          <label>
                            Action
                            <select name="action" defaultValue="KEEP">
                              <option value="KEEP">
                                Save administrative notes
                              </option>
                              {!["COMPLETED", "CANCELLED"].includes(
                                donation.status,
                              ) && (
                                <option value="CANCEL">Cancel donation</option>
                              )}
                              {donation.status === "SCHEDULED_FOR_PICKUP" && (
                                <option value="COMPLETE">
                                  Confirm pickup completed
                                </option>
                              )}
                            </select>
                          </label>
                          <label>
                            Administrative notes
                            <textarea
                              name="notes"
                              defaultValue={donation.notes || ""}
                              required
                              maxLength={2000}
                              rows={4}
                            />
                          </label>
                          <button className="btn lime" disabled={busy}>
                            Save record
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              )}
              {(page === "users"
                ? !selectedUser
                : page === "documents"
                  ? !selectedApp
                  : !donation) && (
                <div className="admin-empty">
                  <h3>No record selected</h3>
                  <p>Records will appear here when they are available.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function DetailHeading({
  reference,
  title,
  status,
  subtitle,
}: {
  reference: string;
  title: string;
  status: string;
  subtitle: string;
}) {
  return (
    <header className="admin-record-heading">
      <div>
        <p className="eyebrow">{reference}</p>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <span className={`admin-badge ${status.toLowerCase()}`}>
        {text(status)}
      </span>
    </header>
  );
}
function Details({
  values,
}: {
  values: [string, string | number | null | undefined][];
}) {
  return (
    <dl className="admin-fields">
      {values.map(([title, value]) => (
        <div key={title}>
          <dt>{title}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
function ScreeningForm({
  donation,
  busy,
  save,
}: {
  donation: Donation;
  busy: boolean;
  save: (p: string, d: object) => Promise<void>;
}) {
  return (
    <form
      className="form"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save(`/admin/donations/${donation.id}/screen`, {
          approve: f.get("decision") === "approve",
          notes: f.get("notes"),
        });
      }}
    >
      <h3>Screening decision</h3>
      <label>
        Decision
        <select name="decision" required defaultValue="">
          <option value="" disabled>
            Select a decision
          </option>
          <option value="approve">Pass screening and make available</option>
          <option value="reject">Fail screening and cancel listing</option>
        </select>
      </label>
      <label>
        Screening notes
        <textarea
          name="notes"
          required
          rows={4}
          maxLength={1000}
          placeholder="Record the reason for your decision"
        />
      </label>
      <button className="btn lime" disabled={busy}>
        Save screening decision
      </button>
    </form>
  );
}
function UserDetail({
  account: u,
  currentId,
  busy,
  save,
}: {
  account: Account;
  currentId: number;
  busy: boolean;
  save: (p: string, d: object) => Promise<void>;
}) {
  return (
    <>
      <DetailHeading
        reference={`ACCOUNT-${u.id} · ${text(u.role)}`}
        title={`${u.firstName} ${u.lastName}`}
        status={u.verified ? "VERIFIED" : "UNVERIFIED"}
        subtitle={u.email}
      />
      <div className="admin-detail-body">
        <Details
          values={[
            ["Organization", u.organization],
            ["Account created", date(u.createdAt)],
            ["Account role", text(u.role)],
            [
              "Organization access",
              u.verified ? "Verified" : "Verification required",
            ],
          ]}
        />
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              f.get("role") !== u.role &&
              !window.confirm(
                `Change this account's role to ${text(String(f.get("role")))}? Administrator access gives control over all accounts and donations.`,
              )
            )
              return;
            save(`/admin/users/${u.id}`, Object.fromEntries(f));
          }}
        >
          <h3>Account details</h3>
          <div className="two">
            <label>
              First name
              <input
                name="firstName"
                defaultValue={u.firstName}
                required
                maxLength={100}
              />
            </label>
            <label>
              Last name
              <input
                name="lastName"
                defaultValue={u.lastName}
                required
                maxLength={100}
              />
            </label>
          </div>
          <label>
            Phone
            <input name="phone" defaultValue={u.phone || ""} maxLength={50} />
          </label>
          <label>
            Location
            <input
              name="location"
              defaultValue={u.location || ""}
              maxLength={500}
            />
          </label>
          <label>
            Role
            <select name="role" defaultValue={u.role}>
              {["DONOR", "RECIPIENT", "ADMIN"].map((r) => (
                <option
                  key={r}
                  value={r}
                  disabled={u.id === currentId && r !== "ADMIN"}
                >
                  {text(r)}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            Organization verification is granted through Document review.
            Changing to a non-admin role requires a new organization
            application.
          </p>
          <label>
            Reason for the change
            <textarea name="reason" maxLength={1000} required rows={3} />
          </label>
          <button className="btn lime" disabled={busy}>
            Save account changes
          </button>
        </form>
        {u.verified && u.role !== "ADMIN" && (
          <form
            className="form admin-revoke"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                window.confirm(
                  "Revoke this organization's verification? They will need to apply again before donating or requesting food.",
                )
              )
                save(`/admin/users/${u.id}/revoke-verification`, {
                  notes: f.get("notes"),
                });
            }}
          >
            <h3>Organization access</h3>
            <label>
              Reason for revoking verification
              <textarea name="notes" maxLength={1000} required rows={3} />
            </label>
            <button className="btn" disabled={busy}>
              Revoke verification
            </button>
          </form>
        )}
      </div>
    </>
  );
}
