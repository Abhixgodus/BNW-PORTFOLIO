import { useEffect } from "react";
import { createPortfolioScrollMotion } from "../../runtime/helpers.js";

const PUBLICATIONS = {
  begin: 0.02,
  finish: 0.98,
};

// Publications alone owns this scroll scene. Other Home sections use their
// single entrance observer; the hero and Gallery keep their existing clocks.
export function usePublicationScroll(rootRef) {
  useEffect(() => {
    const root = rootRef.current,
      preference = matchMedia("(prefers-reduced-motion:reduce)"),
      shortLandscape = matchMedia(
        "(orientation:landscape) and (max-height:480px)",
      );
    const disabled = () => preference.matches || shortLandscape.matches;
    if (!root) return;
    const native = createPortfolioScrollMotion("editorial-publications");
    let fallback = [],
      frame = 0,
      measureFrame = 0,
      focusFrame = 0,
      alive = true,
      lastWidth = innerWidth,
      lastScrollY = scrollY,
      lastScrollTime = performance.now(),
      lastFrameTime = 0,
      velocity = 0,
      velocityTarget = 0,
      velocityActive = false,
      lastVelocityValue = null,
      keyboardFocus = false,
      motionBounds = { start: Infinity, end: -Infinity, height: 0 };
    const q = (s) => root.querySelector(s);
    const chapter = q(".ed-publications-chapter"),
      sticky = q(".ed-publications-sticky"),
      track = q(".ed-publications-track"),
      windowEl = q(".ed-publications-window");
    const warps = [...root.querySelectorAll(".ed-publication-warp")],
      smears = [...root.querySelectorAll(".ed-publication-blur")],
      movingType = q(".ed-publications-type");
    const top = (el) => el.getBoundingClientRect().top + scrollY;
    const resetVelocity = () => {
      velocity = velocityTarget = lastFrameTime = 0;
      lastVelocityValue = null;
      if (!velocityActive) return;
      velocityActive = false;
      sticky.classList.remove("has-scroll-velocity");
      warps.forEach((element) => element.style.removeProperty("transform"));
      smears.forEach((element) => element.style.removeProperty("opacity"));
      movingType.style.removeProperty("transform");
    };
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      resetVelocity();
      native?.clear();
      fallback.forEach((e) => e.animation.cancel());
      fallback = [];
    };
    const render = (time) => {
      frame = 0;
      if (!alive || disabled()) return;
      const y = scrollY;
      fallback.forEach((e) => {
        const time =
          Math.min(1, Math.max(0, (y - e.start) / (e.end - e.start))) * 1000;
        if (time !== e.last) {
          e.animation.currentTime = time;
          e.last = time;
        }
      });
      // The pre-blurred photographs are small static assets. Only their opacity
      // and the inner print transforms respond to speed; no live blur filter.
      const target = time - lastScrollTime < 75 ? velocityTarget : 0;
      const dt = Math.min(32, time - (lastFrameTime || time - 16));
      lastFrameTime = time;
      velocity += (target - velocity) * (1 - Math.exp(-dt / 65));
      if (Math.abs(velocity) < 0.002 && !target) {
        resetVelocity();
      } else {
        if (!velocityActive) {
          velocityActive = true;
          sticky.classList.add("has-scroll-velocity");
        }
        const value = Math.round(velocity * 1000);
        if (value !== lastVelocityValue) {
          lastVelocityValue = value;
          const transform = `scaleX(${(1 + Math.abs(velocity) * 0.028).toFixed(4)}) skewX(${(-velocity * 1.35).toFixed(3)}deg)`,
            opacity = (Math.abs(velocity) * 0.26).toFixed(3);
          // Direct transforms and leaf opacity avoid invalidating inherited
          // custom properties across every caption and image in this section.
          warps.forEach((element) => {
            element.style.transform = transform;
          });
          smears.forEach((element) => {
            element.style.opacity = opacity;
          });
          movingType.style.transform = `skewX(${(velocity * 1.35).toFixed(3)}deg)`;
        }
        frame = requestAnimationFrame(render);
      }
    };
    const scroll = () => {
      const now = performance.now(),
        y = scrollY,
        dy = y - lastScrollY,
        elapsed = now - lastScrollTime;
      velocityTarget =
        !disabled() &&
        !keyboardFocus &&
        y >= motionBounds.start &&
        y <= motionBounds.end &&
        elapsed < 180 &&
        Math.abs(dy) < motionBounds.height * 0.75
          ? Math.max(-1, Math.min(1, dy / Math.max(8, elapsed) / 3))
          : 0;
      lastScrollY = y;
      lastScrollTime = now;
      if ((fallback.length || velocityTarget || velocity) && !frame)
        frame = requestAnimationFrame(render);
    };
    const measure = () => {
      measureFrame = 0;
      if (!alive || disabled()) return;
      const vh = sticky.offsetHeight,
        effects = [];
      const add = (element, keyframes, start, end) => {
        if (element)
          effects.push({
            element,
            keyframes,
            start,
            end: Math.max(start + 1, end),
            easing: "linear",
          });
      };
      const overflow = Math.max(0, track.scrollWidth - windowEl.clientWidth),
        travel = Math.round(Math.max(vh * 1.2, overflow * 0.85));
      if (root.style.getPropertyValue("--publication-travel") !== `${travel}px`)
        root.style.setProperty("--publication-travel", `${travel}px`);
      const start = top(chapter),
        end = start + travel;
      motionBounds = { start: start - vh, end, height: vh };
      add(
        track,
        [
          { transform: "translate3d(0,0,0)", offset: 0 },
          { transform: "translate3d(0,0,0)", offset: PUBLICATIONS.begin },
          {
            transform: `translate3d(${-overflow}px,0,0)`,
            offset: PUBLICATIONS.finish,
          },
          { transform: `translate3d(${-overflow}px,0,0)`, offset: 1 },
        ],
        start,
        end,
      );
      add(
        q(".ed-publications-type > span"),
        [
          { transform: `translateX(${-overflow}px)`, offset: 0 },
          {
            transform: `translateX(${-overflow}px)`,
            offset: PUBLICATIONS.begin,
          },
          { transform: "translateX(0)", offset: PUBLICATIONS.finish },
          { transform: "translateX(0)", offset: 1 },
        ],
        start,
        end,
      );
      if (native?.set(effects)) {
        fallback.forEach((e) => e.animation.cancel());
        fallback = [];
      } else {
        fallback.forEach((e) => e.animation.cancel());
        fallback = effects.map((e) => {
          const animation = e.element.animate(e.keyframes, {
            duration: 1000,
            fill: "both",
            easing: e.easing,
          });
          animation.pause();
          return { ...e, animation, last: -1 };
        });
        if (!frame) frame = requestAnimationFrame(render);
      }
    };
    const schedule = () => {
      if (!measureFrame) measureFrame = requestAnimationFrame(measure);
    };
    const setup = () => {
      clear();
      root.classList.toggle("has-publication-scroll", !disabled());
      if (!disabled()) schedule();
    };
    const resize = () => {
      if (innerWidth !== lastWidth) {
        lastWidth = innerWidth;
        schedule();
      }
    };
    const key = (event) => {
      if (event.key === "Tab") keyboardFocus = !root.closest("main")?.inert;
    };
    const pointer = () => {
      keyboardFocus = false;
      cancelAnimationFrame(focusFrame);
    };
    const focus = (event) => {
      // A viewer owns its own keyboard focus. Restoring the previous card
      // must not seek the Home scroll scene as though Tab selected that card.
      if (event.target.closest(".fg-viewer, .ed-album")) {
        keyboardFocus = false;
        cancelAnimationFrame(focusFrame);
        return;
      }
      if (!keyboardFocus || disabled()) return;
      const target = event.target;
      cancelAnimationFrame(focusFrame);
      // Let native focus scrolling finish before aligning a keyboard-focused
      // link with its scroll-driven scene. Pointer activation never seeks it.
      focusFrame = requestAnimationFrame(() => {
        focusFrame = 0;
        if (
          !alive ||
          !keyboardFocus ||
          document.activeElement !== target ||
          disabled()
        )
          return;
        const card = target.closest("[data-publication-index]");
        if (!card) return;
        const overflow = track.scrollWidth - windowEl.clientWidth;
        const progress =
          overflow > 0
            ? Math.min(
                1,
                Math.max(
                  0,
                  (card.offsetLeft -
                    (windowEl.clientWidth - card.offsetWidth) / 2) /
                    overflow,
                ),
              )
            : 0;
        window.scrollTo({
          top:
            top(chapter) +
            (PUBLICATIONS.begin +
              progress * (PUBLICATIONS.finish - PUBLICATIONS.begin)) *
              (chapter.offsetHeight - sticky.offsetHeight),
          behavior: "instant",
        });
      });
    };
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : null;
    [chapter, sticky, windowEl].forEach((el) => observer?.observe(el));
    document.fonts?.ready.then(() => {
      if (alive) schedule();
    });
    preference.addEventListener("change", setup);
    shortLandscape.addEventListener("change", setup);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    root.addEventListener("focusin", focus);
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", pointer, { passive: true });
    setup();
    return () => {
      alive = false;
      clear();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measureFrame);
      cancelAnimationFrame(focusFrame);
      observer?.disconnect();
      root.classList.remove("has-publication-scroll");
      root.style.removeProperty("--publication-travel");
      preference.removeEventListener("change", setup);
      shortLandscape.removeEventListener("change", setup);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll);
      root.removeEventListener("focusin", focus);
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", pointer);
    };
  }, [rootRef]);
}
