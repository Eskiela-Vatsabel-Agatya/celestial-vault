import { useEffect, type RefObject } from "react";

/** Marks a horizontally scrolling element with data-fade-start / data-fade-end so CSS can show an edge fade only when there is more to scroll to. */
export function useScrollFade(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.dataset.fadeStart = String(el.scrollLeft > 4);
      el.dataset.fadeEnd = String(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [ref]);
}
