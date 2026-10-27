import { lazy, Suspense, useEffect, useRef, useState } from "react";
import api from "./services/api";
const PdfPreview = lazy(() => import("./PdfPreview"));

export default function PrivateMedia({
  path,
  title,
  compact = false,
  download = false,
}: {
  path: string;
  title: string;
  compact?: boolean;
  download?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    closeButton = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false),
    [url, setUrl] = useState<string | null>(null),
    [type, setType] = useState(""),
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!host.current) return;
    if (!("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setUrl(null);
    setError("");
    setExpanded(false);
    api
      .get(path, { responseType: "blob", signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        const blob = response.data as Blob;
        setType(blob.type);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e.response?.status === 403
              ? "You don’t have access to this file."
              : "The preview could not load. Try again or check the record’s file.",
          );
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, active, retry]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        );
        if (nodes?.length) {
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        setExpanded(false);
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [expanded]);
  const image = type.startsWith("image/"),
    pdf = type.startsWith("application/pdf");
  function view(large = false) {
    if (!url) return null;
    return image ? (
      <img src={url} alt={title} className={large ? "media-large-image" : ""} />
    ) : pdf ? (
      <Suspense
        fallback={<p className="media-placeholder">Loading PDF viewer…</p>}
      >
        <PdfPreview url={url} title={title} />
      </Suspense>
    ) : (
      <p>This file cannot be previewed. Use the download option.</p>
    );
  }
  function save() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download =
      title.replace(/[^a-z0-9-]/gi, "-") +
      (pdf ? ".pdf" : type.includes("png") ? ".png" : image ? ".jpg" : "");
    a.click();
  }
  return (
    <div ref={host} className={`private-media ${compact ? "compact" : ""}`}>
      {!url && !error && (
        <div className="media-placeholder" role="status">
          Loading {title.toLowerCase()}…
        </div>
      )}
      {error && (
        <div className="media-placeholder">
          <p role="alert">{error}</p>
          <button
            type="button"
            className="link"
            onClick={() => setRetry((r) => r + 1)}
          >
            Retry preview
          </button>
        </div>
      )}
      {url && (
        <>
          <div className="media-preview">
            {image ? (
              <button
                type="button"
                className="media-image-button"
                aria-label={`Enlarge ${title.toLowerCase()}`}
                onClick={() => setExpanded(true)}
              >
                {view()}
              </button>
            ) : (
              view()
            )}
          </div>
          <div className="media-actions">
            {(image || pdf) && (
              <button
                type="button"
                className="link"
                onClick={() => setExpanded(true)}
              >
                Enlarge {image ? "photo" : "document"}
              </button>
            )}
            {(download || (!image && !pdf)) && (
              <button type="button" className="link" onClick={save}>
                Download copy
              </button>
            )}
          </div>
        </>
      )}
      {expanded && url && (
        <div
          ref={dialog}
          className="media-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} preview`}
        >
          <div className="media-lightbox-bar">
            <b>{title}</b>
            <button
              ref={closeButton}
              type="button"
              className="btn"
              onClick={() => setExpanded(false)}
            >
              Close preview
            </button>
          </div>
          {view(true)}
        </div>
      )}
    </div>
  );
}
