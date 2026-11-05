import { useEffect } from "react";
import { createPortfolioScrollMotion } from "../../runtime/helpers.js";

// Isabella's BackgroundImageFXParallax pans the image while interpolating its
// zoom. Keep that composition on an ordinary image layer, without its WebGL
// canvas or an extra scroll container. Copy and controls never join this clock.
const ISABELLA = {
  home: { intensity: 3, rotation: 115, zoomStart: 0, zoomEnd: 6 },
  hero: { intensity: 19, rotation: 295, zoomStart: 0, zoomEnd: 16 },
  about: { intensity: 7, rotation: 172, zoomStart: 2, zoomEnd: 23 },
};

export function useLargePhotoMotion(rootRef, page) {
  useEffect(() => {
    const root = rootRef.current;
    const scenes = [
      ...(root?.querySelectorAll("[data-ed-photo-motion]") || []),
    ];
    if (!scenes.length || !Element.prototype.animate) return;

    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const viewport = document.createElement("div");
    viewport.setAttribute("aria-hidden", "true");
    viewport.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none;contain:strict";
    document.body.append(viewport);
    const native = createPortfolioScrollMotion("editorial-large-photo");
    let fallback = [],
      frame = 0,
      measureFrame = 0,
      alive = true;
    const clear = () => {
      native?.clear();
      fallback.forEach(({ animation }) => animation.cancel());
      fallback = [];
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const paint = () => {
      frame = 0;
      const y = scrollY;
      fallback.forEach((entry) => {
        const time =
          Math.max(
            0,
            Math.min(1, (y - entry.start) / (entry.end - entry.start)),
          ) * 1000;
        if (entry.time !== time)
          entry.animation.currentTime = entry.time = time;
      });
    };
    const scroll = () => {
      if (fallback.length && !frame) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      measureFrame = 0;
      if (!alive || preference.matches) return;
      const header = root.querySelector(".fg-header")?.offsetHeight || 0;
      const viewportHeight = viewport.clientHeight;
      // Smaller excursions preserve the framing on phones. The original
      // Isabella direction/zoom relationship is retained at half strength on
      // desktop and quarter strength on phones.
      const strength = innerWidth <= 760 ? 0.25 : 0.5;
      const effects = scenes.flatMap((scene) => {
        if (scene.hasAttribute("data-ed-photo-mobile") && innerWidth > 760)
          return [];
        const layer = scene.querySelector("[data-ed-photo-layer]");
        // Crossfading Home images share one stable scroll layer; their own
        // gentle time-based zoom and opacity continue independently inside it.
        const image = layer?.hasAttribute("data-ed-photo-target")
          ? layer
          : layer?.querySelector("img");
        if (!image || !layer.clientWidth || !layer.clientHeight) return [];
        const preset = ISABELLA[scene.dataset.edPhotoMotion] || ISABELLA.about;
        const amount = preset.intensity * 0.005 * strength;
        const angle = (preset.rotation * Math.PI) / 180;
        const width = layer.clientWidth,
          height = layer.clientHeight;
        const rect = scene.getBoundingClientRect();
        const home = scene.dataset.edPhotoMotion === "home";
        // Sticky positioning changes the hero's viewport rect while scrolling.
        // Its normal-flow parent keeps the scroll range stable on remeasure.
        const top =
          (home ? scene.parentElement.getBoundingClientRect().top : rect.top) +
          scrollY;
        const start = Math.max(0, top - viewportHeight);
        const end = Math.max(
          start + 1,
          top + rect.height - (home ? 0 : header),
        );
        const keyframes = Array.from({ length: 9 }, (_, index) => {
          const progress = index / 8;
          const zoom =
            (preset.zoomStart +
              (preset.zoomEnd - preset.zoomStart) * progress) *
            0.01 *
            strength;
          const scale = 1 / (1 - amount - zoom);
          const x = Math.cos(angle) * amount * (progress - 0.5) * width * scale;
          const y =
            -Math.sin(angle) * amount * (progress - 0.5) * height * scale;
          return {
            transform: `translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0) scale(${scale.toFixed(6)})`,
            offset: progress,
          };
        });
        return [
          {
            element: image,
            keyframes,
            start,
            end,
            easing: home ? "linear" : "cubic-bezier(.4,0,.2,1)",
          },
        ];
      });
      if (native?.set(effects)) {
        fallback.forEach(({ animation }) => animation.cancel());
        fallback = [];
      } else {
        // Safari's fallback seeks the same paused animation once per scroll
        // frame. Never read layout or run a trailing spring while scrolling.
        const unused = [...fallback];
        fallback = effects.map((effect) => {
          const signature =
            JSON.stringify(effect.keyframes) + effect.start + ":" + effect.end;
          const index = unused.findIndex(
            (entry) =>
              entry.element === effect.element && entry.signature === signature,
          );
          if (index >= 0) return unused.splice(index, 1)[0];
          const animation = effect.element.animate(effect.keyframes, {
            duration: 1000,
            fill: "both",
            easing: effect.easing,
          });
          animation.id = "editorial-large-photo-fallback";
          animation.pause();
          return { ...effect, animation, signature, time: -1 };
        });
        unused.forEach(({ animation }) => animation.cancel());
        paint();
      }
    };
    const schedule = () => {
      if (alive && !preference.matches && !measureFrame)
        measureFrame = requestAnimationFrame(measure);
    };
    const setup = () => {
      clear();
      cancelAnimationFrame(measureFrame);
      measureFrame = 0;
      schedule();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(root.querySelector("main"));
    observer.observe(viewport);
    scenes.forEach((scene) => observer.observe(scene));
    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          entry.target.classList.toggle(
            "is-photo-active",
            entry.isIntersecting,
          );
      },
      { rootMargin: "160px 0px" },
    );
    scenes.forEach((scene) => visibility.observe(scene));
    document.fonts?.ready.then(schedule);
    window.addEventListener("scroll", scroll, { passive: true });
    preference.addEventListener("change", setup);
    setup();
    return () => {
      alive = false;
      clear();
      cancelAnimationFrame(measureFrame);
      observer.disconnect();
      visibility.disconnect();
      viewport.remove();
      scenes.forEach((scene) => scene.classList.remove("is-photo-active"));
      window.removeEventListener("scroll", scroll);
      preference.removeEventListener("change", setup);
    };
  }, [rootRef, page]);
}
