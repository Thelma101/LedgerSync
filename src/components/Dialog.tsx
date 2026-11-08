import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({
  onClose,
  labelledBy,
  variant = "modal",
  className = "",
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  variant?: "modal" | "drawer";
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusables = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const isDrawer = variant === "drawer";

  return (
    <div className={`fixed inset-0 z-50 flex ${isDrawer ? "justify-end" : "items-center justify-center p-4"}`}>
      <div className={`absolute inset-0 ${isDrawer ? "bg-black/50" : "bg-black/70"}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative bg-[var(--card)] border-[var(--border)] outline-none ${
          isDrawer ? "w-full max-w-[440px] h-full border-l flex flex-col overflow-y-auto" : "w-full border flex flex-col"
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
