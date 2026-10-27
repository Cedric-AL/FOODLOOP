import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
type Option = { value: string; label: string };
export default function SelectField({
  name,
  label,
  options,
  value,
  defaultValue = "",
  onChange,
  required = true,
  placeholder = "Select an option",
}: {
  name: string;
  label: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const id = useId(),
    root = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const [internal, setInternal] = useState(defaultValue),
    [expanded, setExpanded] = useState(false),
    [active, setActive] = useState(0),
    [invalid, setInvalid] = useState(false);
  const chosen = value === undefined ? internal : value;
  useEffect(() => {
    if (!expanded) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [expanded]);
  useEffect(() => {
    if (expanded)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, expanded, id]);
  useEffect(() => {
    const form = root.current?.closest("form");
    const reset = () => {
      setInternal(defaultValue);
      setInvalid(false);
      setExpanded(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue]);
  function choose(v: string) {
    setInternal(v);
    onChange?.(v);
    setExpanded(false);
    setInvalid(false);
    button.current?.focus();
  }
  function open() {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === chosen),
      ),
    );
    setExpanded(true);
  }
  function key(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setExpanded(false);
      return;
    }
    if (e.key === "Tab") {
      setExpanded(false);
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      if (!expanded) {
        open();
        return;
      }
      setActive((i) =>
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? options.length - 1
            : Math.max(
                0,
                Math.min(
                  options.length - 1,
                  i + (e.key === "ArrowDown" ? 1 : -1),
                ),
              ),
      );
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (expanded && options[active]) choose(options[active].value);
      else open();
    } else if (e.key.length === 1) {
      const index = options.findIndex((o) =>
        o.label.toLowerCase().startsWith(e.key.toLowerCase()),
      );
      if (index >= 0) {
        setActive(index);
        setExpanded(true);
      }
    }
  }
  return (
    <div
      ref={root}
      className={`soft-select ${expanded ? "is-open" : ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setExpanded(false);
      }}
    >
      <label id={`${id}-label`} htmlFor={`${id}-button`}>
        {label}
      </label>
      <select
        aria-hidden="true"
        tabIndex={-1}
        className="select-validation"
        name={name}
        required={required}
        value={chosen}
        onChange={(e) => choose(e.target.value)}
        onInvalid={(e) => {
          e.preventDefault();
          setInvalid(true);
          open();
          button.current?.focus();
        }}
      >
        <option value="" />
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        ref={button}
        id={`${id}-button`}
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        aria-required={required}
        aria-invalid={invalid}
        aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
        className={`select-trigger ${!chosen ? "placeholder" : ""}`}
        onClick={() => (expanded ? setExpanded(false) : open())}
        onKeyDown={key}
      >
        <span id={`${id}-value`}>
          {options.find((o) => o.value === chosen)?.label || placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {expanded && (
        <ul
          className="select-options"
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
        >
          {options.map((o, i) => (
            <li
              id={`${id}-option-${i}`}
              key={o.value}
              role="option"
              aria-selected={chosen === o.value}
              className={i === active ? "highlighted" : ""}
              onPointerMove={() => setActive(i)}
              onPointerDown={(e) => {
                e.preventDefault();
                choose(o.value);
              }}
            >
              {o.label}
              {chosen === o.value && <span aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
      {invalid && <small className="error">Please choose an option.</small>}
    </div>
  );
}
