import { useEffect, useRef, useState } from "react";
export default function PhotoPicker({
  name = "photo",
  label = "Photo of the food and packaging",
  required = true,
}: {
  name?: string;
  label?: string;
  required?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const root = useRef<HTMLLabelElement>(null);
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  useEffect(() => {
    const form = root.current?.closest("form"),
      reset = () => {
        setFile(null);
        setError("");
      };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);
  return (
    <label className="photo-picker" ref={root}>
      {label}
      <input
        name={name}
        type="file"
        accept="image/jpeg,image/png"
        required={required}
        onChange={(e) => {
          setError("");
          const f = e.target.files?.[0];
          if (!f) {
            setFile(null);
            return;
          }
          if (
            f.size > 5 * 1024 * 1024 ||
            !["image/jpeg", "image/png"].includes(f.type)
          ) {
            e.target.value = "";
            setFile(null);
            setError("Choose a JPG or PNG photo up to 5 MB.");
            return;
          }
          setFile(f);
        }}
      />
      <span className="sub">
        JPG or PNG, up to 5 MB. Show the actual product and its packaging
        clearly.
      </span>
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
      {url && <img src={url} alt="Selected photo preview" />}
    </label>
  );
}
