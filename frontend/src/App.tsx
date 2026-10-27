import { donationLabel } from "./donationStatus";
import { FormEvent, useEffect, useRef, useState } from "react";
import api, { refreshCsrf } from "./services/api";
import { landing } from "./landing";
import AdminWorkspace from "./AdminWorkspace";
import PasswordField from "./PasswordField";
import PasswordRecovery from "./PasswordRecovery";
import SelectField from "./SelectField";
import PrivateMedia from "./PrivateMedia";
import PhotoPicker from "./PhotoPicker";
import ReceiptPanel from "./ReceiptPanel";
import ChatPanel from "./ChatPanel";

type User = {
  id: number;
  email: string;
  firstName: string;
  role: string;
  verified: boolean;
};
type Application = {
  id: number;
  organization: string;
  status: string;
  notes: string;
  email?: string;
  role?: string;
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
  status: string;
  pickupFrom: string;
  pickupUntil: string;
  foodCondition: string;
  packagingCondition: string;
  storageInfo: string;
  notes: string;
  hasPhoto: boolean;
  handoverAt: string | null;
  collectionMethod: string;
  donorEmail: string | null;
  recipientEmail: string | null;
  receiptOutcome: string | null;
  receiptIssue: string | null;
  receiptNotes: string | null;
  receiptReviewStatus: string | null;
  receiptAdminNotes: string | null;
  cancellationReason: string | null;
};
type Request = {
  id: number;
  donationId: number;
  collectionMethod: string;
  collectionNotes: string | null;
  email: string;
  organization: string;
  status: string;
};
const label = (s: string) => s.toLowerCase().replaceAll("_", " ");
const pickupWindow = (from: string, until: string) => {
  const start = new Date(from),
    end = new Date(until);
  if (
    !from ||
    !until ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  )
    return "Not specified";
  const date = (value: Date) =>
    value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = (value: Date) =>
    value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return start.toDateString() === end.toDateString()
    ? `${date(start)} · ${time(start)} – ${time(end)}`
    : `${date(start)} ${time(start)} – ${date(end)} ${time(end)}`;
};

const errorText = (e: unknown) => {
  const x = e as { response?: { status: number; data?: { message?: string } } };
  return (
    x.response?.data?.message ||
    (
      {
        401: "Please check your email and password, or sign in again.",
        403: "Your account does not have permission for this action.",
        409: "This record has changed or already exists. Refresh and try again.",
        413: "Each file must be 5 MB or smaller.",
        500: "We couldn’t load your records. Please try again.",
      } as Record<number, string>
    )[x.response?.status || 0] ||
    "Unable to connect. Check that the backend is running and try again."
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [sessionError, setSessionError] = useState(""),
    [auth, setAuth] = useState<"login" | "register" | null>(null),
    [role, setRole] = useState("DONOR"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [apps, setApps] = useState<Application[]>([]),
    [donations, setDonations] = useState<Donation[]>([]),
    [requests, setRequests] = useState<Request[]>([]),
    [showFood, setShowFood] = useState(false);
  const [recovery, setRecovery] = useState(() =>
    window.location.hash.startsWith("#reset-password="),
  );
  useEffect(() => {
    if (window.location.hash.startsWith("#reset-password="))
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
  }, []);
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user || user.role === "ADMIN") return;
    let active = true;
    const timer = setInterval(() => {
      void load(user, () => active).catch(() => {});
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);

  async function load(u: User, current = () => true) {
    if (u.role === "ADMIN") return;
    const [a, d, r] = await Promise.all([
      api.get(u.role === "ADMIN" ? "/admin/applications" : "/application"),
      api.get("/donations"),
      api.get("/requests"),
    ]);
    if (!current()) return;
    setApps(a.data);
    setDonations(d.data);
    setRequests(r.data);
  }
  async function restoreSession(current = () => true) {
    setReady(false);
    setSessionError("");
    setError("");
    try {
      await refreshCsrf();
      if (!current()) return;
      let restored: User;
      try {
        restored = (await api.get("/auth/me", { timeout: 15000 })).data;
      } catch (e) {
        if ((e as { response?: { status: number } }).response?.status === 401) {
          if (current()) setUser(null);
          return;
        }
        throw e;
      }
      if (!current()) return;
      setUser(restored);
      try {
        await load(restored, current);
      } catch (e) {
        if (current()) setError(errorText(e));
      }
    } catch (e) {
      if (current()) setSessionError(errorText(e));
    } finally {
      if (current()) setReady(true);
    }
  }
  useEffect(() => {
    let active = true;
    void restoreSession(() => active);
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!auth || recovery) return;
    const previous = document.activeElement as HTMLElement;
    modal.current?.querySelector<HTMLInputElement>("input")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAuth(null);
      if (e.key === "Tab") {
        const els = modal.current?.querySelectorAll<HTMLElement>(
          "button,input,select,a",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [auth, recovery]);
  async function action(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function open(mode: "login" | "register", r = "DONOR") {
    setRole(r);
    setRecovery(false);
    setError("");
    setNotice("");
    setAuth(mode);
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await action(async () => {
      await refreshCsrf();
      if (auth === "register") {
        await api.post("/auth/register", Object.fromEntries(data));
        setAuth("login");
        setNotice("Account created. Sign in to your account.");
        return;
      }
      await api.post(
        "/auth/login",
        new URLSearchParams({
          email: String(data.get("email")),
          password: String(data.get("password")),
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      await refreshCsrf();
      const u = (await api.get("/auth/me")).data;
      setUser(u);
      setAuth(null);
      await load(u);
    });
  }
  async function apply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    await action(async () => {
      for (const key of ["legal", "identity"]) {
        const f = data.get(key) as File;
        if (f.size > 5 * 1024 * 1024)
          throw {
            response: {
              data: { message: "Each file must be 5 MB or smaller." },
            },
          };
      }
      await api.post("/application", data);
      await load(user!);
      form.reset();
      setNotice(
        "Application submitted. An administrator will review your documents.",
      );
    });
  }
  async function donate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const inputs = new FormData(form);
    const d = Object.fromEntries(inputs);
    delete d.photo;
    await action(async () => {
      const payload = new FormData();
      payload.append(
        "details",
        new Blob(
          [
            JSON.stringify({
              ...d,
              quantity: Number(d.quantity),
              pickupFrom: new Date(String(d.pickupFrom)).toISOString(),
              pickupUntil: new Date(String(d.pickupUntil)).toISOString(),
            }),
          ],
          { type: "application/json" },
        ),
      );
      payload.append("photo", inputs.get("photo") as File);
      await api.post("/donations", payload);
      setShowFood(false);
      await load(user!);
      setNotice("Donation submitted for screening.");
    });
  }
  async function post(path: string, data?: object) {
    await action(async () => {
      await api.post(path, data);
      await load(user!);
      setNotice("Saved successfully.");
    });
  }
  const application = apps[0];
  // Do not show public or account content until the server resolves the session.
  if (!ready || sessionError)
    return (
      <main className="session-gate" aria-busy={!ready}>
        <img
          className="brand-mark"
          src="/images/savora-logo.png?v=2"
          alt="Savora"
        />
        {!ready ? (
          <div role="status">
            <h1>Loading Savora…</h1>
            <p>Please wait while we check your session.</p>
          </div>
        ) : (
          <>
            <h1>We couldn’t connect to Savora</h1>
            <p role="alert">{sessionError}</p>
            <button className="btn lime" onClick={() => void restoreSession()}>
              Try again
            </button>
          </>
        )}
      </main>
    );

  return (
    <>
      {user?.role !== "ADMIN" && (
        <header className="nav">
          <a className="logo" href="/" aria-label="Savora home">
            <img
              className="brand-mark"
              src="/images/savora-logo.png?v=2"
              alt=""
            />
            Savora
          </a>
          {!user ? (
            <>
              <nav>
                <a href="#how">How it works</a>
                <a href="#impact">Impact</a>
              </nav>
              <div className="nav-r">
                <button className="link" onClick={() => open("login")}>
                  Log in
                </button>
                <button className="btn lime" onClick={() => open("register")}>
                  Create account
                </button>
              </div>
            </>
          ) : (
            <div className="nav-r">
              <span>
                {user.firstName} · {label(user.role)}
              </span>
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await api.post("/auth/logout");
                    setUser(null);
                    setApps([]);
                    setDonations([]);
                    setRequests([]);
                    await refreshCsrf();
                  })
                }
              >
                Sign out
              </button>
            </div>
          )}
        </header>
      )}
      {!auth && user?.role !== "ADMIN" && (
        <div className="dashboard" aria-live="polite">
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="notice success">{notice}</p>}
        </div>
      )}
      {!user ? (
        <main
          onClick={(e) => {
            const target = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-register]",
            );
            if (target) {
              e.preventDefault();
              open("register", target.dataset.register);
            }
          }}
          dangerouslySetInnerHTML={{ __html: landing }}
        />
      ) : user.role === "ADMIN" ? (
        <AdminWorkspace
          user={user}
          onSignOut={async () => {
            await api.post("/auth/logout");
            setUser(null);
            setApps([]);
            setDonations([]);
            setRequests([]);
            setNotice("");
            setError("");
            window.location.hash = "";
            await refreshCsrf();
          }}
        />
      ) : (
        <main>
          <section className="whero">
            <div>
              <p className="eyebrow lime-t">Your Savora workspace</p>
              <h1>
                Good food.
                <br />
                <em>Shared well.</em>
              </h1>
              <p>
                {user.role === "ADMIN"
                  ? "Review organization applications and screen submitted donations."
                  : user.role === "DONOR"
                    ? "Turn your surplus into support, one pickup at a time."
                    : "Connect your organization with available food nearby."}
              </p>
            </div>
            <div className="wside">
              <span className="status">
                {user.role === "ADMIN"
                  ? "Administrator"
                  : user.verified
                    ? "Verified organization"
                    : application
                      ? label(application.status)
                      : "Application needed"}
              </span>
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    const u = (await api.get("/auth/me")).data;
                    setUser(u);
                    await load(u);
                  })
                }
              >
                Refresh workspace
              </button>
              {user.role === "DONOR" && user.verified && (
                <button
                  className="btn lime"
                  onClick={() => setShowFood(!showFood)}
                >
                  {showFood ? "Close donation form" : "Donate food"}
                </button>
              )}
            </div>
          </section>
          <div className="dashboard">
            <div
              className="workspace-stats"
              aria-label="Your donation overview"
            >
              <div>
                <span>
                  {user.role === "DONOR"
                    ? "Donations shared"
                    : "Available listings"}
                </span>
                <strong>
                  {user.role === "DONOR"
                    ? donations.length
                    : donations.filter((d) => d.status === "AVAILABLE").length}
                </strong>
              </div>
              <div>
                <span>Scheduled pickups</span>
                <strong>
                  {
                    donations.filter((d) => d.status === "SCHEDULED_FOR_PICKUP")
                      .length
                  }
                </strong>
              </div>
              <div>
                <span>Completed handoffs</span>
                <strong>
                  {donations.filter((d) => d.status === "COMPLETED").length}
                </strong>
              </div>
            </div>
            {user.role !== "ADMIN" && !user.verified && (
              <section className="panel">
                <p className="eyebrow">Organization verification</p>
                <h2>
                  {application?.status === "PENDING"
                    ? "Your application is under review"
                    : "Apply to " +
                      (user.role === "DONOR" ? "donate food" : "receive food")}
                </h2>
                <p className="muted">
                  Your account is ready. Before participating, submit your
                  organization’s legal document and a valid government ID for
                  administrator review. Food details are collected when you
                  create a donation.
                </p>
                {application?.notes && (
                  <p className="notice">
                    Administrator feedback: {application.notes}
                  </p>
                )}
                {application?.status !== "PENDING" && (
                  <form className="form" onSubmit={apply}>
                    <label>
                      Organization or establishment name
                      <input
                        name="organization"
                        maxLength={200}
                        required
                        defaultValue={application?.organization}
                      />
                    </label>
                    <label>
                      Legal registration document
                      <input
                        name="legal"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        required
                      />
                    </label>
                    <label>
                      Valid government ID
                      <input
                        name="identity"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        required
                      />
                    </label>
                    <p className="muted">
                      PDF, JPG, or PNG. Maximum 5 MB per document. Documents are
                      available only to administrators for verification. Upload
                      only documents you are authorized to submit.
                    </p>
                    <button className="btn lime" disabled={busy}>
                      Submit application
                    </button>
                  </form>
                )}
              </section>
            )}
            {showFood && user.verified && (
              <section className="panel">
                <h2>Share your surplus</h2>
                <p className="muted">
                  Add the food and pickup details. An administrator screens the
                  listing before it becomes available.
                </p>
                <form className="form" onSubmit={donate}>
                  <PhotoPicker />
                  <label>
                    Food name or description
                    <input name="title" required maxLength={200} />
                  </label>
                  <div className="two">
                    <Choice
                      name="category"
                      title="Food category"
                      values={[
                        "Prepared meals",
                        "Bakery",
                        "Fresh produce",
                        "Packaged food",
                      ]}
                    />
                    <label>
                      Quantity
                      <input
                        name="quantity"
                        type="number"
                        min="0.01"
                        max="99999999.99"
                        step="0.01"
                        required
                      />
                    </label>
                    <label>
                      Unit
                      <input
                        name="unit"
                        placeholder="portions, kg, boxes"
                        maxLength={40}
                        required
                      />
                    </label>
                    <label>
                      Use-by / best-before
                      <input
                        name="expiryDate"
                        type="date"
                        min={new Date().toLocaleDateString("en-CA")}
                        required
                      />
                    </label>
                    <Choice
                      name="dateType"
                      title="Date type"
                      values={["EXPIRATION", "BEST_BEFORE"]}
                    />
                    <Choice
                      name="foodCondition"
                      title="Food condition"
                      values={["Fresh", "Frozen", "Chilled"]}
                    />
                    <Choice
                      name="packagingCondition"
                      title="Packaging condition"
                      values={["Sealed", "Intact"]}
                    />
                    <Choice
                      name="storageInfo"
                      title="Storage information"
                      values={["Refrigerated", "Frozen", "Room temperature"]}
                    />
                    <label>
                      Pickup starts
                      <input name="pickupFrom" type="datetime-local" required />
                    </label>
                    <label>
                      Pickup ends
                      <input
                        name="pickupUntil"
                        type="datetime-local"
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Pickup location
                    <input name="pickupLocation" maxLength={500} required />
                  </label>
                  <label>
                    Additional notes
                    <textarea
                      name="notes"
                      maxLength={2000}
                      placeholder="Allergens, handling instructions, access details"
                    />
                  </label>
                  <button className="btn lime" disabled={busy}>
                    Submit donation for review
                  </button>
                </form>
              </section>
            )}
            <h2 className="wh">
              {user.role === "DONOR"
                ? "Your donations"
                : user.role === "ADMIN"
                  ? "Donation screening"
                  : "Available food & your pickups"}
            </h2>
            {donations.length === 0 && (
              <p className="notice">No donations to show yet.</p>
            )}
            <div className="grid">
              {donations.map((d) => (
                <article className="fc" key={d.id}>
                  {d.hasPhoto ? (
                    <PrivateMedia
                      path={`/donations/${d.id}/photo`}
                      title={d.title}
                      compact
                    />
                  ) : (
                    <div className="category-photo">
                      <img
                        src={`/images/${({ "Prepared meals": "meals", Bakery: "bakery", "Fresh produce": "produce", "Packaged food": "pantry" } as Record<string, string>)[d.category] || "produce"}.png`}
                        alt=""
                      />
                      <span>
                        Category image · actual food photo unavailable
                      </span>
                    </div>
                  )}
                  <div className="fb">
                    <p className="k">
                      {d.category} · #{d.id}
                    </p>
                    <h3 title={d.title}>{d.title}</h3>
                    <span className={`status status-${d.status.toLowerCase()}`}>
                      {donationLabel(d.status)}
                    </span>
                    <dl className="donation-highlights">
                      <div>
                        <dt>Quantity</dt>
                        <dd className="quantity-value">
                          {d.quantity} <span>{d.unit}</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Pickup location</dt>
                        <dd className="pickup-address">{d.pickupLocation}</dd>
                      </div>
                      <div>
                        <dt>Pickup window</dt>
                        <dd>{pickupWindow(d.pickupFrom, d.pickupUntil)}</dd>
                      </div>
                    </dl>
                    <details className="donation-details">
                      <summary>
                        {user.role === "RECIPIENT" && d.status === "AVAILABLE"
                          ? "View details & request"
                          : d.recipientEmail
                            ? "Details, chat & receipt"
                            : "View donation details"}
                        <span aria-hidden="true">+</span>
                      </summary>
                      <div className="donation-detail-content">
                        <section className="donation-full-title">
                          <h4>{d.title}</h4>
                        </section>
                        {d.cancellationReason && (
                          <p className="cancellation-reason">
                            {d.cancellationReason}
                          </p>
                        )}
                        <section>
                          <h4>Pickup details</h4>
                          <dl className="detail-fields">
                            <div>
                              <dt>Location</dt>
                              <dd>{d.pickupLocation}</dd>
                            </div>
                            <div>
                              <dt>From</dt>
                              <dd>
                                {new Date(d.pickupFrom).toLocaleString(
                                  undefined,
                                  { dateStyle: "medium", timeStyle: "short" },
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt>Until</dt>
                              <dd>
                                {new Date(d.pickupUntil).toLocaleString(
                                  undefined,
                                  { dateStyle: "medium", timeStyle: "short" },
                                )}
                              </dd>
                            </div>
                            {d.recipientEmail && (
                              <>
                                <div>
                                  <dt>Collection</dt>
                                  <dd>
                                    {d.collectionMethod === "RECIPIENT_COURIER"
                                      ? "Recipient-arranged courier"
                                      : "Recipient pickup"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Contact</dt>
                                  <dd>
                                    {user.role === "DONOR"
                                      ? d.recipientEmail
                                      : d.donorEmail}
                                  </dd>
                                </div>
                              </>
                            )}
                          </dl>
                        </section>
                        <section>
                          <h4>Food & storage</h4>
                          <dl className="detail-fields">
                            <div>
                              <dt>
                                {d.dateType === "EXPIRATION"
                                  ? "Use by"
                                  : "Best before"}
                              </dt>
                              <dd>
                                {new Date(
                                  d.expiryDate + "T00:00:00",
                                ).toLocaleDateString(undefined, {
                                  dateStyle: "medium",
                                })}
                              </dd>
                            </div>
                            <div>
                              <dt>Condition</dt>
                              <dd>{d.foodCondition}</dd>
                            </div>
                            <div>
                              <dt>Packaging</dt>
                              <dd>{d.packagingCondition}</dd>
                            </div>
                            <div>
                              <dt>Storage</dt>
                              <dd>{d.storageInfo}</dd>
                            </div>
                          </dl>
                        </section>
                        {d.notes && (
                          <section>
                            <h4>Donor notes</h4>
                            <p className="donor-notes">{d.notes}</p>
                          </section>
                        )}
                        {user.role === "RECIPIENT" &&
                          d.status === "AVAILABLE" &&
                          (!user.verified ? (
                            <p className="notice">
                              Verification is required before requesting food.
                            </p>
                          ) : requests.some((r) => r.donationId === d.id) ? (
                            <p className="notice">Request submitted</p>
                          ) : (
                            <form
                              className="request-collection"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const f = new FormData(e.currentTarget);
                                post(`/donations/${d.id}/request`, {
                                  method: f.get("method"),
                                  notes: f.get("collectionNotes"),
                                });
                              }}
                            >
                              <SelectField
                                name="method"
                                label="How will you collect?"
                                defaultValue="RECIPIENT_PICKUP"
                                options={[
                                  {
                                    value: "RECIPIENT_PICKUP",
                                    label: "I will arrange pickup",
                                  },
                                  {
                                    value: "RECIPIENT_COURIER",
                                    label: "I will arrange my own courier",
                                  },
                                ]}
                              />
                              <label>
                                Collection notes (optional)
                                <textarea
                                  name="collectionNotes"
                                  rows={2}
                                  maxLength={500}
                                  placeholder="Who will collect, contact details or pickup arrangements"
                                />
                              </label>

                              <button className="btn lime" disabled={busy}>
                                Request food
                              </button>
                            </form>
                          ))}
                        {user.role === "DONOR" &&
                          d.status === "SCHEDULED_FOR_PICKUP" &&
                          !d.handoverAt && (
                            <button
                              className="btn lime"
                              disabled={busy}
                              onClick={() =>
                                post(`/donations/${d.id}/handover`)
                              }
                            >
                              Mark as handed over
                            </button>
                          )}
                        {d.recipientEmail &&
                          [
                            "SCHEDULED_FOR_PICKUP",
                            "COMPLETED",
                            "CANCELLED",
                          ].includes(d.status) && (
                            <ChatPanel donationId={d.id} userId={user.id} />
                          )}
                        {["SCHEDULED_FOR_PICKUP", "COMPLETED"].includes(
                          d.status,
                        ) && (
                          <>
                            {d.handoverAt && (
                              <p className="handover-confirmed">
                                Pickup confirmed by donor ·{" "}
                                {new Date(d.handoverAt).toLocaleString(
                                  undefined,
                                  {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  },
                                )}
                              </p>
                            )}
                            <ReceiptPanel
                              key={`${d.id}-${d.receiptOutcome}-${d.receiptReviewStatus}`}
                              donation={d}
                              recipient={user.role === "RECIPIENT"}
                              onSaved={() => load(user)}
                            />
                          </>
                        )}
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
            {user.role !== "ADMIN" && (
              <section className="panel">
                <h2>Food requests</h2>
                {requests.length === 0 ? (
                  <p>No requests yet.</p>
                ) : (
                  requests.map((r) => (
                    <div className="rq" key={r.id}>
                      <p>
                        Donation #{r.donationId} · {r.organization}
                        <small>
                          {label(r.status)} ·{" "}
                          {r.collectionMethod === "RECIPIENT_COURIER"
                            ? "Recipient-arranged courier"
                            : "Recipient pickup"}
                        </small>
                        <small>
                          {r.email} {r.collectionNotes}
                        </small>
                      </p>
                      {user.role === "DONOR" && r.status === "PENDING" && (
                        <button
                          className="btn lime"
                          disabled={busy}
                          onClick={() => post(`/requests/${r.id}/accept`)}
                        >
                          Accept & schedule pickup
                        </button>
                      )}
                    </div>
                  ))
                )}
              </section>
            )}
          </div>
        </main>
      )}
      {recovery && (
        <PasswordRecovery
          onLogin={() => {
            setRecovery(false);
            setUser(null);
            open("login");
          }}
          onClose={() => {
            setRecovery(false);
          }}
        />
      )}
      {auth && !recovery && (
        <div
          className="modal"
          ref={modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
        >
          <div className="auth-card">
            <button
              className="x"
              type="button"
              aria-label="Close"
              onClick={() => setAuth(null)}
            >
              ×
            </button>
            <p className="eyebrow">
              {auth === "login" ? "Welcome back" : "Join the loop"}
            </p>
            <h2 id="auth-title">
              {auth === "login"
                ? "Sign in to Savora."
                : "Good food starts with you."}
            </h2>
            <p className="sub">
              {auth === "login"
                ? "Access your account and keep your next handoff moving."
                : "Create your account now. Apply for organization verification when you’re ready to participate."}
            </p>
            <form className="form" onSubmit={login}>
              {auth === "register" && (
                <>
                  <div className="two">
                    <label>
                      First name
                      <input
                        name="firstName"
                        required
                        maxLength={100}
                        autoComplete="given-name"
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        name="lastName"
                        required
                        maxLength={100}
                        autoComplete="family-name"
                      />
                    </label>
                  </div>
                  <SelectField
                    name="role"
                    label="I want to"
                    value={role}
                    onChange={setRole}
                    options={[
                      { value: "DONOR", label: "Register as a donor" },
                      { value: "RECIPIENT", label: "Register as a recipient" },
                    ]}
                  />
                </>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
              <PasswordField
                key={auth}
                minLength={auth === "register" ? 12 : 1}
                autoComplete={
                  auth === "login" ? "current-password" : "new-password"
                }
              />
              {auth === "login" && (
                <button
                  type="button"
                  className="link forgot-password"
                  onClick={() => {
                    setAuth(null);
                    setError("");
                    setNotice("");
                    setRecovery(true);
                  }}
                >
                  Forgot password?
                </button>
              )}
              {auth === "register" && (
                <p className="sub">Use at least 12 characters.</p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="success" role="status">
                  {notice}
                </p>
              )}
              <button className="btn lime wide" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : auth === "login"
                    ? "Sign in"
                    : "Create account"}
              </button>
              <button
                type="button"
                className="link"
                onClick={() => open(auth === "login" ? "register" : "login")}
              >
                {auth === "login"
                  ? "New to Savora? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function Choice({
  name,
  title,
  values,
}: {
  name: string;
  title: string;
  values: string[];
}) {
  return (
    <SelectField
      name={name}
      label={title}
      placeholder={`Select ${title.toLowerCase()}`}
      options={values.map((v) => ({
        value: v,
        label: v.includes("_") ? label(v) : v,
      }))}
    />
  );
}
export default App;
