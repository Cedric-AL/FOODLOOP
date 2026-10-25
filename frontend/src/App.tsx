import { FormEvent, useEffect, useRef, useState } from "react";
import api, { refreshCsrf } from "./services/api";
import { landing } from "./landing";

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
  pickupLocation: string;
  status: string;
  pickupFrom: string;
  pickupUntil: string;
  foodCondition: string;
  packagingCondition: string;
  storageInfo: string;
  notes: string;
};
type Request = {
  id: number;
  donationId: number;
  organization: string;
  status: string;
};
const label = (s: string) => s.toLowerCase().replaceAll("_", " ");
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
      } as Record<number, string>
    )[x.response?.status || 0] ||
    "Unable to connect. Check that the backend is running and try again."
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [auth, setAuth] = useState<"login" | "register" | null>(null),
    [role, setRole] = useState("DONOR"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [apps, setApps] = useState<Application[]>([]),
    [donations, setDonations] = useState<Donation[]>([]),
    [requests, setRequests] = useState<Request[]>([]),
    [showFood, setShowFood] = useState(false);
  const modal = useRef<HTMLDivElement>(null);
  async function load(u: User) {
    const [a, d, r] = await Promise.all([
      api.get(u.role === "ADMIN" ? "/admin/applications" : "/application"),
      api.get("/donations"),
      api.get("/requests"),
    ]);
    setApps(a.data);
    setDonations(d.data);
    setRequests(r.data);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshCsrf();
        try {
          const u = (await api.get("/auth/me")).data;
          if (active) {
            setUser(u);
            await load(u);
          }
        } catch (e) {
          if ((e as { response?: { status: number } }).response?.status !== 401)
            throw e;
        }
      } catch (e) {
        if (active) setError(errorText(e));
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!auth) return;
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
  }, [auth]);
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
    const d = Object.fromEntries(new FormData(form));
    await action(async () => {
      await api.post("/donations", {
        ...d,
        quantity: Number(d.quantity),
        pickupFrom: new Date(String(d.pickupFrom)).toISOString(),
        pickupUntil: new Date(String(d.pickupUntil)).toISOString(),
      });
      setShowFood(false);
      await load(user!);
      setNotice("Donation submitted for screening.");
    });
  }
  async function review(app: Application, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await action(async () => {
      await api.post(`/admin/applications/${app.id}/review`, d);
      await load(user!);
      setNotice("Application reviewed.");
    });
  }
  async function post(path: string, data?: object) {
    await action(async () => {
      await api.post(path, data);
      await load(user!);
      setNotice("Saved successfully.");
    });
  }
  async function download(id: number, kind: string) {
    await action(async () => {
      const response = await api.get(`/admin/applications/${id}/${kind}`, {
        responseType: "blob",
      });
      const b = response.data as Blob;
      const bytes = new Uint8Array(await b.slice(0, 8).arrayBuffer());
      const ext = bytes[0] === 37 ? "pdf" : bytes[0] === 137 ? "png" : "jpg";
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `application-${id}-${kind}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }
  const application = apps[0];
  return (
    <>
      <header className="nav">
        <a className="logo" href="/" aria-label="Savora home">
          <span className="leaf">❧</span>savora
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
      {!auth && (
        <div className="dashboard" aria-live="polite">
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {notice && <p className="notice success">{notice}</p>}
          {!ready && <p>Connecting to Savora…</p>}
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
            {user.role === "ADMIN" && (
              <section>
                <h2>Organization applications</h2>
                {apps.length === 0 && (
                  <p className="notice">No applications yet.</p>
                )}
                {apps.map((a) => (
                  <article className="panel" key={a.id}>
                    <span className="status">{label(a.status)}</span>
                    <h3>{a.organization}</h3>
                    <p>
                      {a.email} · {label(a.role || "")}
                    </p>
                    <div className="actions">
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => download(a.id, "legal")}
                      >
                        Download legal document
                      </button>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => download(a.id, "identity")}
                      >
                        Download valid ID
                      </button>
                    </div>
                    {a.status === "PENDING" ? (
                      <form className="form" onSubmit={(e) => review(a, e)}>
                        <label>
                          Review notes
                          <textarea name="notes" required maxLength={1000} />
                        </label>
                        <Choice
                          name="status"
                          title="Decision"
                          values={["APPROVED", "REJECTED"]}
                        />
                        <button className="btn lime" disabled={busy}>
                          Save review
                        </button>
                      </form>
                    ) : (
                      <p>{a.notes}</p>
                    )}
                  </article>
                ))}
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
                  <div className={"img c-" + d.category.replaceAll(" ", "-")}>
                    <span className="tg">{label(d.status)}</span>
                  </div>
                  <div className="fb">
                    <p className="k">
                      {d.category} · #{d.id}
                    </p>
                    <h3>{d.title}</h3>
                    <p>
                      {d.quantity} {d.unit} · Food date: {d.expiryDate}
                    </p>
                    <p>{d.pickupLocation}</p>
                    <p className="sub">
                      Pickup: {new Date(d.pickupFrom).toLocaleString()} –{" "}
                      {new Date(d.pickupUntil).toLocaleString()}
                    </p>
                    <p className="sub">
                      {d.foodCondition} · {d.packagingCondition} packaging ·{" "}
                      {d.storageInfo}
                    </p>
                    {d.notes && <p>{d.notes}</p>}
                    {user.role === "RECIPIENT" && d.status === "AVAILABLE" && (
                      <button
                        className="btn lime"
                        disabled={
                          busy ||
                          !user.verified ||
                          requests.some((r) => r.donationId === d.id)
                        }
                        onClick={() => post(`/donations/${d.id}/request`)}
                      >
                        {!user.verified
                          ? "Verification required"
                          : requests.some((r) => r.donationId === d.id)
                            ? "Request submitted"
                            : "Request food"}
                      </button>
                    )}
                    {user.role === "DONOR" &&
                      d.status === "SCHEDULED_FOR_PICKUP" && (
                        <button
                          className="btn lime"
                          disabled={busy}
                          onClick={() => post(`/donations/${d.id}/complete`)}
                        >
                          Confirm pickup completed
                        </button>
                      )}
                    {user.role === "ADMIN" && d.status === "SUBMITTED" && (
                      <form
                        className="form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const data = new FormData(e.currentTarget);
                          post(`/admin/donations/${d.id}/screen`, {
                            approve: data.get("decision") === "approve",
                            notes: data.get("notes"),
                          });
                        }}
                      >
                        <label>
                          Screening notes
                          <textarea name="notes" required maxLength={1000} />
                        </label>
                        <label>
                          Decision
                          <select name="decision">
                            <option value="approve">Make available</option>
                            <option value="reject">Reject listing</option>
                          </select>
                        </label>
                        <button className="btn lime" disabled={busy}>
                          Save screening
                        </button>
                      </form>
                    )}
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
                        <small>{label(r.status)}</small>
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
      {auth && (
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
                  <label>
                    I want to
                    <select
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="DONOR">Donate food</option>
                      <option value="RECIPIENT">
                        Receive food for my organization
                      </option>
                    </select>
                  </label>
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
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={auth === "register" ? 12 : 1}
                  maxLength={72}
                  autoComplete={
                    auth === "login" ? "current-password" : "new-password"
                  }
                />
              </label>
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
    <label>
      {title}
      <select name={name} required defaultValue="">
        <option value="" disabled>
          Select {title.toLowerCase()}
        </option>
        {values.map((v) => (
          <option value={v} key={v}>
            {v.includes("_") ? label(v) : v}
          </option>
        ))}
      </select>
    </label>
  );
}
export default App;
