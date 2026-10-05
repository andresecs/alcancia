import { ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TooltipArrow = "none" | "top" | "right" | "bottom" | "left";

const GAP = 16; // px between the trigger and the bubble: the arrow, its 3px gap, and a little air

// The Ives "Tooltip" component (Figma node 173:1880). Wraps whatever it
// explains and shows a short note on hover or keyboard focus.
// `arrow` is the side of the bubble the arrow sits on, so the bubble opens on
// the opposite side: "bottom" = above the trigger, "top" = below it,
// "right" = to its left, "left" = to its right. "none" opens above, no arrow.
// The bubble is rendered at the end of <body> so tables and scroll areas
// can't clip it; Escape hides it.
export default function Tooltip({
  text,
  arrow = "bottom",
  children,
  className,
}: {
  text: string;
  arrow?: TooltipArrow;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = useCallback(() => {
    const t = trigger.current?.getBoundingClientRect();
    const b = bubble.current?.getBoundingClientRect();
    if (!t || !b) return;
    const centerX = t.left + t.width / 2 - b.width / 2;
    const centerY = t.top + t.height / 2 - b.height / 2;
    const at = {
      none: { top: t.top - b.height - GAP, left: centerX },
      bottom: { top: t.top - b.height - GAP, left: centerX },
      top: { top: t.bottom + GAP, left: centerX },
      right: { top: centerY, left: t.left - b.width - GAP },
      left: { top: centerY, left: t.right + GAP },
    }[arrow];
    // keep it on screen horizontally
    at.left = Math.max(8, Math.min(at.left, window.innerWidth - b.width - 8));
    setPos(at);
  }, [arrow]);

  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const hide = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
    };
  }, [open]);

  return (
    <>
      <span
        ref={trigger}
        className={["tooltip-trigger", className].filter(Boolean).join(" ")}
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // a tap shows it on touch screens without opening the row underneath
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={bubble}
            id={id}
            role="tooltip"
            className={`tooltip tooltip--arrow-${arrow}`}
            style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}
          >
            {arrow !== "none" && <span className="tooltip__arrow" aria-hidden="true" />}
            <span className="tooltip__text">{text}</span>
          </div>,
          document.body,
        )}
    </>
  );
}
