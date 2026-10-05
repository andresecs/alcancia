import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// The Ives "Drawer" component, Regular type on the right side (Figma node
// 200:1785): title and a line of description, the content, then the actions
// right-aligned at the bottom. Slides in over a blurred overlay; closes on
// Escape or a click on the overlay, and hands focus back to its opener.
export default function Drawer({
  title,
  description,
  onClose,
  children,
  actions,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Runs once per opening: focus the first field, listen for Escape, and
  // hand focus back to the opener afterwards.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // The first field if there is one, otherwise the close button
    (
      panel.current?.querySelector<HTMLElement>(".drawer__content input:not([type=hidden])") ??
      panel.current?.querySelector<HTMLElement>(".drawer__close")
    )?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  // Rendered at the end of <body> so it sits above every page layer,
  // including the sticky header, and the blur covers the whole page
  return createPortal(
    <div className="drawer-layer">
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="drawer" role="dialog" aria-modal="true" aria-label={title} ref={panel}>
        <div className="drawer__header">
          <div className="drawer__heading">
            <div className="drawer__title" role="heading" aria-level={2}>
              {title}
            </div>
            {description && <p className="drawer__description">{description}</p>}
          </div>
          {/* The round close button from the Ives drawer's Menu variant */}
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close" />
        </div>
        <div className="drawer__content">{children}</div>
        {actions && <div className="drawer__actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
