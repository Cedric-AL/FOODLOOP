import { useState } from "react";
export default function PasswordField({
  name = "password",
  label = "Password",
  autoComplete = "current-password",
  minLength = 1,
}: {
  name?: string;
  label?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="password-label">
      {label}
      <span className="password-control">
        <input
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          maxLength={72}
          autoComplete={autoComplete}
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          <svg
            viewBox="0 0 24 24"
            width="21"
            height="21"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </span>
    </label>
  );
}
