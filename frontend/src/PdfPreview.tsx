import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfPreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const container = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [width, setWidth] = useState(500),
    [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setPdf(null);
    setPage(1);
    setError("");
    const task = getDocument({
      url,
      wasmUrl:import.meta.env.BASE_URL+"pdfjs/wasm/",
      standardFontDataUrl:import.meta.env.BASE_URL+"pdfjs/standard_fonts/",
      disableAutoFetch: true,
      disableStream: true,
    });
    task.promise
      .then((doc) => {
        if (current) setPdf(doc);
      })
      .catch(() => {
        if (current)
          setError(
            "This PDF could not be displayed. It may be encrypted or damaged. A download copy is available below.",
          );
      });
    return () => {
      current = false;
      void task.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.max(200, Math.floor(entries[0].contentRect.width) - 16));
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let current = true;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    pdf
      .getPage(page)
      .then((p) => {
        if (!current || !canvas.current) return;
        const base = p.getViewport({ scale: 1 });
        const scale = Math.min(
          width / base.width,
          2,
          Math.sqrt(6_000_000 / (base.width * base.height)),
        );
        const viewport = p.getViewport({ scale });
        const c = canvas.current;
        c.width = Math.ceil(viewport.width);
        c.height = Math.ceil(viewport.height);
        const context = c.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        render = p.render({ canvas: c, canvasContext: context, viewport });
        return render.promise;
      })
      .catch((e) => {
        if (current && e.name !== "RenderingCancelledException")
          setError(
            "This PDF page could not be rendered. Try another page or download a copy.",
          );
      });
    return () => {
      current = false;
      render?.cancel();
    };
  }, [pdf, page, width]);
  return (
    <div ref={container} className="pdf-preview">
      <div className="pdf-toolbar">
        <button
          type="button"
          className="btn"
          disabled={!pdf || page <= 1}
          onClick={() => {
            setError("");
            setPage((p) => p - 1);
          }}
        >
          Previous
        </button>
        <span aria-live="polite">
          {pdf ? `Page ${page} of ${pdf.numPages}` : "Loading PDF…"}
        </span>
        <button
          type="button"
          className="btn"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => {
            setError("");
            setPage((p) => p + 1);
          }}
        >
          Next
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="pdf-canvas-wrap">
        <canvas ref={canvas} aria-label={`${title}, page ${page}`} role="img" />
      </div>
    </div>
  );
}
