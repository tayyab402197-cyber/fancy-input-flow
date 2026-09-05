import { useEffect } from "react";

import { playSfx, preloadSfx, preloadUrduVoice, type SfxName } from "@/lib/sfx";

const INTERACTIVE =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="switch"], input[type="checkbox"], input[type="radio"], label[data-sfx], select, summary';

/**
 * Adds app-wide audio feedback:
 *  - a soft click on every button / link / control
 *  - a light hover blip on interactive elements
 *  - typed chimes (success / error / notify) whenever a toast appears
 * Mounted once in the root layout.
 */
export function SoundProvider() {
  useEffect(() => {
    preloadSfx();
    preloadUrduVoice();

    const hit = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el || typeof el.closest !== "function") return null;
      const node = el.closest<HTMLElement>(INTERACTIVE);
      if (!node) return null;
      if (node.hasAttribute("data-no-sfx") || (node as HTMLButtonElement).disabled) return null;
      return node;
    };

    // Only real controls (buttons, links, toggles…) click. Pressing empty
    // space, text or images stays silent.
    const onPointerDown = (event: Event) => {
      const node = hit(event.target);
      if (!node) return;
      if ((event.target as HTMLElement | null)?.closest?.("[data-no-sfx]")) return;
      const custom = node.getAttribute("data-sfx") as SfxName | null;
      const role = node.getAttribute("role");
      if (custom) playSfx(custom);
      else if (role === "switch" || (node as HTMLInputElement).type === "checkbox")
        playSfx("toggle");
      else playSfx("click");
    };



    let lastHover: HTMLElement | null = null;
    const onPointerOver = (event: Event) => {
      const node = hit(event.target);
      if (!node || node === lastHover) return;
      lastHover = node;
      playSfx("hover");
    };
    const onPointerOut = (event: Event) => {
      if (!hit(event.target)) lastHover = null;
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);

    // Toast notifications get their own chime, matched to the toast type.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          const toastEl = node.matches("[data-sonner-toast]")
            ? node
            : node.querySelector<HTMLElement>("[data-sonner-toast]");
          if (!toastEl) continue;
          const type = toastEl.getAttribute("data-type");
          playSfx(
            type === "success"
              ? "success"
              : type === "error"
                ? "error"
                : type === "warning"
                  ? "warn"
                  : "notify",
          );
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerover", onPointerOver, true);
      document.removeEventListener("pointerout", onPointerOut, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
