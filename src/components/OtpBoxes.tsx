import { ClipboardEvent, KeyboardEvent, useRef } from "react";

const LENGTH = 6;

// Six joined boxes, one digit each. Typing moves forward, backspace moves
// back, and pasting (or the phone's "from Messages" suggestion) fills them all.
export default function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Fast typing and autofill fire several events before React re-renders,
  // so handlers read the latest code from here rather than from `value`.
  const latest = useRef(value);
  latest.current = value;
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");
  const set = (code: string) => {
    latest.current = code;
    onChange(code);
  };
  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  // The code is kept gap-free, so typing always lands in the first empty box
  const fill = (at: number, text: string) => {
    const incoming = text.replace(/\D/g, "");
    if (!incoming) return;
    const code = latest.current;
    const from = Math.min(at, code.length);
    const next = Array.from({ length: LENGTH }, (_, i) => code[i] ?? "");
    for (let k = 0; k < incoming.length && from + k < LENGTH; k++) next[from + k] = incoming[k];
    set(next.join("").slice(0, LENGTH));
    focus(from + incoming.length);
  };

  const onKeyDown = (i: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const code = latest.current;
      const at = code[i] ? i : i - 1;
      if (at < 0) return;
      set(code.slice(0, at) + code.slice(at + 1));
      focus(at);
    } else if (event.key === "ArrowLeft") focus(i - 1);
    else if (event.key === "ArrowRight") focus(i + 1);
  };

  const onPaste = (i: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fill(i, event.clipboardData.getData("text"));
  };

  return (
    <div className="otp-boxes" role="group" aria-label="Verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          value={digit}
          disabled={disabled}
          autoFocus={i === 0}
          onFocus={(event) => {
            if (i > latest.current.length) focus(latest.current.length);
            else event.target.select();
          }}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, "");
            if (!typed) return;
            // Typing over a filled box gives two digits: keep the new one.
            // Anything longer is a phone autofill dropping the whole code in.
            if (digit && typed.length === 2) fill(i, typed[0] === digit ? typed[1] : typed[0]);
            else fill(i, typed);
          }}
          onKeyDown={(event) => onKeyDown(i, event)}
          onPaste={(event) => onPaste(i, event)}
        />
      ))}
    </div>
  );
}
