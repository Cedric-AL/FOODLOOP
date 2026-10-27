import { FormEvent, useEffect, useRef, useState } from "react";
import api from "./services/api";

type Message = {
  id: number;
  senderId: number;
  sender: string;
  body: string;
  createdAt: string;
};
export default function ChatPanel({
  donationId,
  userId,
}: {
  donationId: number;
  userId: number;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [canSend, setCanSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const history = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout>;
    setMessages([]);
    setLoaded(false);
    setError("");
    async function poll() {
      try {
        let batch: Message[];
        do {
          const { data } = await api.get(`/donations/${donationId}/messages`, {
            params: { after: cursor },
          });
          if (!active) return;
          batch = data.messages;
          setCanSend(data.canSend);
          if (batch.length) {
            cursor = batch[batch.length - 1].id;
            setMessages((previous) => [...previous, ...batch]);
          }
        } while (batch.length === 100);
        setLoaded(true);
        setError("");
      } catch {
        if (active)
          setError("Could not refresh this conversation. Retrying shortly.");
      } finally {
        if (active) timer = setTimeout(poll, 4000);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, donationId]);
  useEffect(() => {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages.length]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await api.post(`/donations/${donationId}/messages`, {
        body: body.trim(),
      });
      setBody("");
    } catch (e) {
      setError(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ||
          "Message could not be sent. Your draft is saved here; try again.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="pickup-chat">
      <button
        className="chat-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={`chat-${donationId}`}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">◌</span> Pickup conversation{" "}
        <span>{open ? "Close" : "Open chat →"}</span>
      </button>
      {open && (
        <div id={`chat-${donationId}`}>
          <p className="chat-intro">
            Private chat with your pickup partner. Confirm timing, directions,
            and collection details here.
          </p>
          <div
            ref={history}
            className="chat-history"
            role="log"
            aria-label="Pickup messages"
            aria-live="polite"
          >
            {!loaded && <p className="sub">Loading messages…</p>}
            {loaded && !messages.length && (
              <p className="chat-empty">
                Start with a hello. A little coordination goes a long way.
              </p>
            )}
            {messages.map((m) => (
              <article
                key={m.id}
                className={`chat-message ${m.senderId === userId ? "mine" : ""}`}
              >
                <b>{m.senderId === userId ? "You" : m.sender}</b>
                <p>{m.body}</p>
                <time dateTime={m.createdAt}>
                  {new Date(m.createdAt).toLocaleString()}
                </time>
              </article>
            ))}
            
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {loaded && !canSend ? (
            <p className="chat-intro">
              This conversation is read-only. Messages remain available for your
              records.
            </p>
          ) : (
            <form onSubmit={send} className="chat-compose">
              <label htmlFor={`message-${donationId}`}>Your message</label>
              <textarea
                id={`message-${donationId}`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Discuss your pickup…"
                required
                disabled={!canSend || sending}
              />
              <div>
                <small>{body.length}/2000</small>
                <button
                  className="btn lime"
                  disabled={!canSend || sending || !body.trim()}
                >
                  {sending ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
