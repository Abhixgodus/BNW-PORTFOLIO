import { useEffect, useRef } from "react";
import { playPageEntrance, playPageExit } from "./pageEntrance.js";

export function useEditorialMotion(page) {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    const quietPage = ["about", "contact", "blog", "post"].includes(page);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let alive = true;
    let finished = false;
    let timer, entranceTimer, observer, entrance, departure, destination;

    const revealAll = () =>
      root
        .querySelectorAll("[data-ed-reveal]")
        .forEach((node) => node.classList.add("is-revealed"));
    const observe = () => {
      observer?.disconnect();
      if (reduced.matches || !("IntersectionObserver" in window))
        return revealAll();
      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) =>
              a.target.compareDocumentPosition(b.target) &
              Node.DOCUMENT_POSITION_FOLLOWING
                ? -1
                : 1,
            );
          const opening =
            quietPage && !root.classList.contains("has-entered")
              ? root.querySelectorAll(
                  "[data-about-enter], [data-contact-enter], [data-journal-enter]",
                ).length
              : 0;
          visible.forEach((entry, index) => {
            if (quietPage)
              entry.target.style.setProperty(
                "--reveal-order",
                Math.min(opening + index, 5),
              );
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
      );
      root
        .querySelectorAll("[data-ed-reveal]")
        .forEach((node) => observer.observe(node));
    };
    const finish = (immediate = false) => {
      if (!alive) return;
      if (immediate) {
        entrance?.finish();
        root.classList.add("has-entered");
        clearTimeout(entranceTimer);
      }
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      root.classList.add("is-ready");
      if (quietPage) observe();
      if (!immediate && !reduced.matches && quietPage)
        entrance = playPageEntrance(root);
      else if (!immediate && !reduced.matches && page === "gallery")
        entranceTimer = setTimeout(
          () => root.classList.add("has-entered"),
          1600,
        );
      else root.classList.add("has-entered");
    };

    root.classList.add("has-editorial-motion");
    if (!quietPage) observe();
    const photograph = root.querySelector(
      ".ed-story-photo img, .ed-about-portrait img, .ed-contact-photo img, .ed-blog-leads img, .ed-post-hero img",
    );
    if (reduced.matches) finish(true);
    else {
      Promise.all([
        document.fonts?.ready,
        photograph?.decode().catch(() => {}),
      ]).then(() => finish());
      timer = setTimeout(() => finish(), 1500);
    }

    const interrupt = () => finish(true);
    const preference = () => {
      if (reduced.matches) {
        finish(true);
        revealAll();
      } else observe();
    };
    const restore = (event) => {
      if (!event.persisted) return;
      departure?.cancel();
      departure = destination = null;
      finish(true);
      revealAll();
    };
    const focus = (event) =>
      event.target.closest("[data-ed-reveal]")?.classList.add("is-revealed");
    const leave = (event) => {
      if (
        !quietPage ||
        reduced.matches ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target.closest("a[href]");
      if (
        !link ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      )
        return;
      const url = new URL(link.href, location.href);
      if (
        url.origin !== location.origin ||
        url.pathname.replace(/\/$/, "") ===
          location.pathname.replace(/\/$/, "") ||
        !/^\/concept(?:\/|$)/.test(url.pathname)
      )
        return;
      event.preventDefault();
      destination = url.href;
      if (departure) return;
      departure = playPageExit(root);
      departure.finished.then(
        () => {
          if (alive && destination) location.assign(destination);
        },
        () => {},
      );
    };

    root.addEventListener("click", leave);
    root.addEventListener("focusin", focus);
    root.addEventListener("ed:before-route", interrupt);
    if (page === "gallery") {
      window.addEventListener("wheel", interrupt, { passive: true });
      window.addEventListener("touchmove", interrupt, { passive: true });
    }
    reduced.addEventListener("change", preference);
    window.addEventListener("pageshow", restore);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearTimeout(entranceTimer);
      entrance?.cancel();
      departure?.cancel();
      observer?.disconnect();
      root.removeEventListener("click", leave);
      root.removeEventListener("focusin", focus);
      root.removeEventListener("ed:before-route", interrupt);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchmove", interrupt);
      reduced.removeEventListener("change", preference);
      window.removeEventListener("pageshow", restore);
    };
  }, [page]);
  return { rootRef };
}
