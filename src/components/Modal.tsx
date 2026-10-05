import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

// The Ives "Modal" component, Minimal type (Figma node 184:434): an optional
// label chip and a round close button on top, the title and a line of body
// text, an optional slot, then a Tertiary and a Primary button side by side.
// Sits over a blurred overlay; Escape, the overlay or the close button cancel.
export default function Modal({
  title,
  body,
  label,
  children,
  primary,
  tertiary = { label: "Cancel" },
  onClose,
}: {
  title: string;
  body?: ReactNode;
  label?: ReactNode; // the small chip at the top left
  children?: ReactNode;
  primary: { label: string; onClick: () => void };
  tertiary?: { label: string; onClick?: () => void };
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // Start on the safe choice, listen for Escape, and give focus back afterwards
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(".modal__tertiary")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  return createPortal(
    <div className="modal-layer">
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" ref={panel}>
        <div className="modal__header">
          {label ? <span className="modal__label">{label}</span> : <span />}
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close" />
        </div>
        <div className="modal__content">
          <div className="modal__title" id="modal-title" role="heading" aria-level={2}>
            {title}
          </div>
          {body && <div className="modal__body">{body}</div>}
        </div>
        {children && <div className="modal__slot">{children}</div>}
        <div className="modal__actions">
          <Button
            variant="tertiary"
            className="modal__tertiary"
            onClick={() => (tertiary.onClick ? tertiary.onClick() : onClose())}
          >
            {tertiary.label}
          </Button>
          <Button className="modal__primary" onClick={primary.onClick}>
            {primary.label}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
