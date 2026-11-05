import { useEffect, useRef, useState } from "react";
import { playPageEntrance, playPageExit } from "./pageEntrance.js";
import {
  measureHomeEntrance,
  paintHomeProgress,
  playHomeEntrance,
} from "./homeEntrance.js";

// One entrance lifecycle per page. Scroll reveals only toggle state; the
// browser owns transforms. No smooth-scroll hijack or React scroll frames.
export function useEditorialMotion(page) {
  const rootRef = useRef(null);
  const loadingRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(page === "home" ? 0 : null);
  useEffect(() => {
    const root = rootRef.current;
    const quietPage = ["about", "contact", "blog", "post"].includes(page);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let alive = true,
      frame = 0,
      timer = 0,
      entranceTimer = 0,
      finished = false,
      entrance = null,
      departure = null,
      destination = null,
      releaseScrollBlockers,
      observer;
    const removers = [];
    const html = document.documentElement;
    const homeReturn =
      page === "home" && html.dataset.edHomeEntry === "navigation";
    const locked = () =>
      html.classList.contains("ed-entry-locked") &&
      !html.classList.contains("ed-entry-timeout");
    const unlock = () => {
      html.classList.remove("ed-entry-locked");
      releaseScrollBlockers?.();
    };
    if (
      page === "home" &&
      !reduced.matches &&
      !homeReturn &&
      !html.dataset.edArrival &&
      !html.classList.contains("ed-entry-timeout")
    ) {
      html.classList.add("ed-entry-locked");
      window.scrollTo({ top: 0, behavior: "instant" });
    } else unlock();
    const finish = (immediate = false) => {
      if (!alive) return;
      if (immediate && entrance) {
        entrance.finish();
        entrance = null;
      }
      if (finished) {
        if (immediate) {
          root.classList.add("has-entered");
          setProgress(null);
          unlock();
        }
        return;
      }
      finished = true;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      root.classList.add("is-ready");
      setReady(true);
      if (quietPage) observe();
      if (!immediate && !reduced.matches && quietPage) {
        setProgress(null);
        unlock();
        entrance = playPageEntrance(root);
        return;
      }
      if (
        immediate ||
        reduced.matches ||
        page !== "home" ||
        !Element.prototype.animate
      ) {
        setProgress(null);
        unlock();
        if (immediate || reduced.matches) root.classList.add("has-entered");
        else
          entranceTimer = setTimeout(
            () => root.classList.add("has-entered"),
            1600,
          );
      } else {
        const loader = homeReturn ? null : loadingRef.current;
        if (homeReturn) {
          setProgress(null);
          unlock();
        } else {
          setProgress(100);
          paintHomeProgress(
            loader,
            1,
            measureHomeEntrance(root, loader)?.height || 0,
          );
        }
        entrance = playHomeEntrance(root, loader, () => {
          setProgress(null);
          unlock();
        });
      }
    };
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
          const ordered = quietPage;
          const opening =
            ordered && !root.classList.contains("has-entered")
              ? root.querySelectorAll(
                  "[data-about-enter], [data-contact-enter], [data-journal-enter]",
                ).length
              : 0;
          visible.forEach((entry, index) => {
            if (ordered)
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
    // Progressive enhancement leaves all server-rendered copy readable.
    root.classList.add("has-editorial-motion");
    if (!quietPage) observe();
    const images = [...root.querySelectorAll("[data-entry-photo]")];
    if (
      reduced.matches ||
      page !== "home" ||
      homeReturn ||
      document.documentElement.dataset.edArrival === "home" ||
      document.documentElement.classList.contains("ed-entry-timeout")
    ) {
      const arrival = document.documentElement.dataset.edArrival;
      if (homeReturn && !arrival && !reduced.matches) {
        setProgress(null);
        // Normal document returns wait only for the hero's real assets, with
        // no simulated percentage run. The shared Gallery handoff stays owned
        // by navigation.js via edArrival.
        Promise.all([
          document.fonts?.ready,
          ...images.map((image) => image.decode().catch(() => {})),
        ]).then(() => finish());
        timer = setTimeout(() => finish(), 1500);
      } else if (page === "gallery" && !arrival && !reduced.matches) {
        // The server holds the same first pose as the entrance. Wait for type
        // before starting it once, so a cold font load cannot move the title.
        Promise.resolve(document.fonts?.ready).then(() => finish());
        timer = setTimeout(() => finish(), 1500);
      } else if (quietPage && !reduced.matches) {
        const photograph = root.querySelector(
          ".ed-about-portrait img, .ed-contact-photo img, .ed-blog-leads img, .ed-post-hero img",
        );
        const assets = Promise.all([
          document.fonts?.ready,
          photograph?.decode().catch(() => {}),
        ]);
        assets.then(() => finish());
        timer = setTimeout(() => finish(), 1500);
      } else
        frame = requestAnimationFrame(() =>
          finish(page !== "home" && !arrival ? false : true),
        );
    } else {
      root.classList.remove("is-ready", "has-entered");
      const pending = new Set(images.filter((image) => !image.complete));
      let geometry = measureHomeEntrance(root, loadingRef.current);
      let fontReady = false,
        start = 0,
        previous = 0,
        displayed = 0;
      const prepareLoader = () => {
        if (!alive || finished) return;
        geometry = measureHomeEntrance(root, loadingRef.current);
        paintHomeProgress(loadingRef.current, 0, geometry?.height || 0);
        loadingRef.current?.classList.add("is-prepared");
        fontReady = true;
      };
      if (document.fonts) document.fonts.ready.then(prepareLoader);
      else prepareLoader();
      setProgress(0);
      const tick = (now) => {
        if (!alive || finished) return;
        if (!fontReady) {
          frame = requestAnimationFrame(tick);
          return;
        }
        if (!start) start = previous = now;
        const target =
          ((images.length - pending.size + Number(fontReady)) /
            (images.length + 1)) *
          100;
        const elapsed = now - start;
        // Reference rhythm: ease toward 56, breathe, then accelerate and settle.
        const pace =
          elapsed < 1850
            ? 56 * (1 - Math.pow(1 - elapsed / 1850, 1.4))
            : elapsed < 2050
              ? 56
              : (() => {
                  const t = Math.min(1, (elapsed - 2050) / 1750);
                  return 56 + 44 * (t + t * t - t * t * t);
                })();
        const pacedTarget = Math.min(target, pace);
        displayed +=
          (pacedTarget - displayed) * Math.min(1, (now - previous) / 90);
        previous = now;
        paintHomeProgress(
          loadingRef.current,
          displayed / 100,
          geometry?.height || 0,
        );
        if (target === 100 && pace === 100 && displayed > 99.3) {
          finish();
        } else frame = requestAnimationFrame(tick);
      };
      images.forEach((image) => {
        const done = () => pending.delete(image);
        image.addEventListener("load", done, { once: true });
        image.addEventListener("error", done, { once: true });
        removers.push(() => {
          image.removeEventListener("load", done);
          image.removeEventListener("error", done);
        });
      });
      frame = requestAnimationFrame(tick);
      timer = setTimeout(() => finish(), 5500);
      const resize = () => {
        if (entrance) finish(true);
        else geometry = measureHomeEntrance(root, loadingRef.current);
      };
      window.addEventListener("resize", resize, { passive: true });
      removers.push(() => window.removeEventListener("resize", resize));
    }
    const preference = () => {
      if (reduced.matches) {
        revealAll();
        finish(true);
        setProgress(null);
      } else observe();
    };
    const restore = (event) => {
      if (event.persisted) {
        departure?.cancel();
        departure = null;
        destination = null;
        finish(true);
        setProgress(null);
        revealAll();
      }
    };
    const interrupt = () => finish(true);
    const blockScroll = (event) => {
      if (locked()) {
        if (event.cancelable) event.preventDefault();
      } else if (page === "gallery") interrupt();
    };
    const blockKeys = (event) => {
      if (
        locked() &&
        [
          "Tab",
          " ",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "PageUp",
          "PageDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        event.preventDefault();
    };
    const holdPosition = () => {
      if (locked() && scrollY !== 0)
        window.scrollTo({ top: 0, behavior: "instant" });
    };
    const focus = (event) => {
      if (page === "home" && !locked()) finish(true);
      event.target.closest("[data-ed-reveal]")?.classList.add("is-revealed");
    };
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
    root.addEventListener("ed:before-route", interrupt);
    if (locked()) {
      window.addEventListener("wheel", blockScroll, { passive: false });
      window.addEventListener("touchmove", blockScroll, { passive: false });
      // Only the initial loader owns scroll cancellation. Ordinary scrolling
      // must not wait for an otherwise idle main-thread input handler.
      releaseScrollBlockers = () => {
        window.removeEventListener("wheel", blockScroll);
        window.removeEventListener("touchmove", blockScroll);
      };
    } else if (page === "gallery") {
      window.addEventListener("wheel", blockScroll, { passive: true });
      window.addEventListener("touchmove", blockScroll, { passive: true });
    }
    window.addEventListener("keydown", blockKeys, true);
    window.addEventListener("scroll", holdPosition, { passive: true });
    reduced.addEventListener("change", preference);
    window.addEventListener("pageshow", restore);
    root.addEventListener("focusin", focus);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearTimeout(entranceTimer);
      entrance?.cancel();
      departure?.cancel();
      unlock();
      cancelAnimationFrame(frame);
      observer?.disconnect();
      removers.forEach((remove) => remove());
      reduced.removeEventListener("change", preference);
      window.removeEventListener("pageshow", restore);
      root.removeEventListener("focusin", focus);
      root.removeEventListener("click", leave);
      root.removeEventListener("ed:before-route", interrupt);
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      window.removeEventListener("keydown", blockKeys, true);
      window.removeEventListener("scroll", holdPosition);
    };
  }, [page]);
  return { rootRef, loadingRef, ready, progress };
}
