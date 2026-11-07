import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import {
  heroLineReveal,
  HERO_TEXT_EASE,
  HERO_TEXT_EXIT_EASE,
} from "./homeEntrance.js";

const EASE = "cubic-bezier(.2,.75,.25,1)";
const EXIT_EASE = "cubic-bezier(.75,0,.8,.25)";
// A symmetric curve gives unfolding and refolding the same speed profile.
const PHOTO_EASE = "cubic-bezier(.65,0,.35,1)";
const HERO_TYPE_ENTER_DURATION = 600;
const HERO_TYPE_EXIT_DURATION = 460;
const DURATION = 2600;
const routes = { home: "/concept", gallery: "/concept/gallery" };
const pageAt = (path) => {
  const normalized = path.replace(/\/$/, "") || "/";
  if (normalized === "/") return "home";
  if (normalized === "/gallery") return "gallery";
  return Object.keys(routes).find((page) => routes[page] === normalized);
};
const selector = (page) =>
  page === "home"
    ? "[data-hero-print]"
    : ".ed-collection-card .ed-image-window";
const textSelector = (page) =>
  page === "home"
    ? ".ed-hero-title, .ed-hero-bottom"
    : ".ed-gallery-heading, .ed-collection-caption, .ed-rail-controls";

function pose(element) {
  const rect = element.getBoundingClientRect();
  const css = getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(css.transform);
  const scale = Math.hypot(matrix.a, matrix.b);
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    width: parseFloat(css.width) * scale,
    angle: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
    opacity:
      Number(css.opacity) *
      Number(getComputedStyle(element.parentElement).opacity),
  };
}
function snapshot(element) {
  const image = element.querySelector("img");
  const colour = element.querySelector(".ed-cover-colour, .ed-route-colour");
  const css = getComputedStyle(element);
  return {
    element,
    pose: pose(element),
    zoom: image ? getComputedStyle(image).transform : "none",
    clipPath: css.clipPath,
    windowTransform: css.transform,
    colour: colour
      ? Number(getComputedStyle(colour).opacity)
      : image?.src.includes("-mono-")
        ? 0
        : 1,
  };
}
function transform(position, width) {
  return `translate3d(${position.x - width / 2}px,${position.y - width * 0.625}px,0) rotate(${position.angle}deg) scale(${position.width / width})`;
}
function prints(root, page) {
  return [...root.querySelectorAll(selector(page))].sort(
    (a, b) =>
      Number(
        a.dataset.heroPrint ??
          a.closest("[data-collection-index]").dataset.collectionIndex,
      ) -
      Number(
        b.dataset.heroPrint ??
          b.closest("[data-collection-index]").dataset.collectionIndex,
      ),
  );
}
function copyText(element, overlay) {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true),
    css = getComputedStyle(element);
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  const descendants = [...element.querySelectorAll("*")];
  clone.querySelectorAll("*").forEach((node, index) => {
    const style = getComputedStyle(descendants[index]);
    node.style.transform = style.transform;
    node.style.opacity = style.opacity;
    node.style.clipPath = style.clipPath;
    node.style.animation = "none";
    node.style.transition = "none";
    if (node.matches(".ed-hero-role")) node.style.lineHeight = style.lineHeight;
    if (node.matches(".ed-hero-greeting-line, .ed-hero-greeting-line > span")) {
      Object.assign(node.style, {
        font: style.font,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        width: style.width,
        height: style.height,
        padding: style.padding,
        margin: style.margin,
        boxSizing: style.boxSizing,
      });
    }
  });
  clone.dataset.routeText = "";
  Object.assign(clone.style, {
    position: "fixed",
    margin: "0",
    left: rect.left + "px",
    top: rect.top + "px",
    right: "auto",
    bottom: "auto",
    width: rect.width + "px",
    height: rect.height + "px",
    font: css.font,
    letterSpacing: css.letterSpacing,
    color: css.color,
    opacity: css.opacity,
    textAlign: css.textAlign,
    visibility: "visible",
    transform: "none",
    animation: "none",
    transition: "none",
    zIndex: "30",
  });
  overlay.append(clone);
  return clone;
}
function visibleText(element) {
  const css = getComputedStyle(element),
    rect = element.getBoundingClientRect();
  if (
    Number(css.opacity) < 0.001 ||
    css.visibility === "hidden" ||
    rect.bottom <= 0 ||
    rect.top >= innerHeight
  )
    return false;
  if (!element.matches(".ed-hero-title")) return true;
  return [...element.querySelectorAll(":scope > span > span")].some((line) => {
    const box = line.getBoundingClientRect(),
      mask = line.parentElement.getBoundingClientRect();
    return (
      Number(getComputedStyle(line).opacity) > 0.001 &&
      box.top < mask.bottom &&
      box.bottom > mask.top
    );
  });
}

// Both scenes stay in the same React island. Seven uniform-scale image layers
// own the handoff, so a document capture cannot restart or skip the motion.
export function useEditorialNavigation(
  rootRef,
  page,
  setPage,
  closeViewer,
  setGalleryPreview,
  setRoutePage,
) {
  const current = useRef(page);
  useEffect(() => {
    const root = rootRef.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let active = null;
    let rendered = current.current;
    let queuedRoute = null,
      waitingForCollection = false;
    let handoffFrame = 0;
    let topFrame = 0;
    let topCompletion = null;
    const cancelTopScroll = () => {
      cancelAnimationFrame(topFrame);
      topFrame = 0;
      topCompletion = null;
    };
    const scrollHomeTop = (complete = null) => {
      cancelTopScroll();
      topCompletion = complete;
      const start = scrollY;
      if (reduced.matches || start < 1) {
        window.scrollTo({ top: 0, behavior: "instant" });
        topCompletion = null;
        complete?.();
        return;
      }
      const began = performance.now();
      const duration = Math.min(2200, 1200 + start * 0.16);
      const tick = (now) => {
        const progress = Math.min(1, (now - began) / duration);
        const eased = (1 - Math.cos(Math.PI * progress)) / 2;
        window.scrollTo({ top: start * (1 - eased), behavior: "instant" });
        if (progress < 1) topFrame = requestAnimationFrame(tick);
        else {
          topFrame = 0;
          const done = topCompletion;
          topCompletion = null;
          done?.();
        }
      };
      topFrame = requestAnimationFrame(tick);
    };
    const finish = (focus = false) => {
      if (!active) return;
      const scene = active;
      active = null;
      // Retargeting only reverses the existing compositor clock. Mount the
      // requested live scene once, immediately before releasing its mask.
      if (rendered !== current.current)
        renderPage(current.current, scene.positions[current.current], true);
      const release = [];
      if (current.current === scene.from && scene.from === "gallery") {
        prints(root, "gallery").forEach((element, index) => {
          const original = scene.source[index];
          if (!original) return;
          const hold = (node, property, value) => {
            if (!node) return;
            const previous = node.style.getPropertyValue(property);
            node.style.setProperty(property, value);
            release.push(() => {
              if (previous) node.style.setProperty(property, previous);
              else node.style.removeProperty(property);
            });
          };
          hold(element, "transition", "none");
          hold(element, "transform", original.windowTransform);
          element.querySelectorAll("img").forEach((image) => {
            hold(image, "transition", "none");
            hold(image, "transform", original.zoom);
          });
          const colour = element.querySelector(".ed-cover-colour");
          hold(colour, "transition", "none");
          hold(colour, "opacity", String(original.colour));
        });
      }
      clearTimeout(scene.imageDeadline);
      scene.removeFinishListener?.();
      root.classList.remove("is-route-transition");
      scene.animations.forEach((animation) => animation.cancel());
      scene.overlay.remove();
      if (release.length) {
        // Let the existing hover transitions take over from the exact shared
        // pose on the following frame, including an interrupted mouse leave.
        root.getBoundingClientRect();
        handoffFrame = requestAnimationFrame(() => {
          release.forEach((restore) => restore());
          handoffFrame = 0;
        });
      }
      root.dispatchEvent(new Event("ed:entrance-complete"));
      if (focus) {
        const title = root.querySelector("h1");
        title?.setAttribute("tabindex", "-1");
        title?.focus({ preventScroll: true });
      }
    };
    const remember = () =>
      history.replaceState(
        {
          ...history.state,
          editorialPage: current.current,
          editorialScroll:
            active?.positions[current.current]?.editorialScroll ?? scrollY,
          editorialRail:
            active?.positions[current.current]?.editorialRail ??
            root.querySelector(".ed-collection-rail")?.scrollLeft ??
            0,
        },
        "",
      );
    remember();
    const renderPage = (target, state, resume = false) => {
      root.dispatchEvent(new Event("ed:before-route"));
      flushSync(() => {
        closeViewer();
        if (target === "gallery" && !resume) setGalleryPreview(null);
        setPage(target);
      });
      rendered = target;
      root.classList.add("is-ready", "has-entered");
      if (active) root.classList.add("is-route-transition");
      window.scrollTo({
        top: state?.editorialScroll || 0,
        behavior: "instant",
      });
      const rail = root.querySelector(".ed-collection-rail");
      if (rail) rail.scrollLeft = state?.editorialRail || 0;
      root.dispatchEvent(new Event("ed:entrance-complete"));
      return { rail, railLeft: rail?.scrollLeft || 0, scrollTop: scrollY };
    };
    const showPage = (
      target,
      { historyEntry, state, resume = false, defer = false },
    ) => {
      if (!historyEntry) {
        remember();
        history.pushState(
          {
            editorialPage: target,
            editorialScroll: state?.editorialScroll || 0,
            editorialRail: state?.editorialRail || 0,
          },
          "",
          routes[target],
        );
      }
      document.documentElement.dataset.editorialPage = target;
      document.documentElement.dataset.edArrival = target;
      current.current = target;
      flushSync(() => setRoutePage(target));
      document.title =
        (target === "home" ? "Photography" : "Portfolio") +
        " — Abhimanyu Sharma";
      return defer ? {} : renderPage(target, state, resume);
    };
    const completeWhenReady = (scene, focus) => {
      const revision = ++scene.revision;
      clearTimeout(scene.imageDeadline);
      scene.removeFinishListener?.();
      const master = scene.animations[0];
      const endpoint = current.current === scene.to ? DURATION : 0;
      let decoded = false;
      const finishAtEndpoint = () => {
        // Only hand off at the requested end. A previous direction's queued
        // readiness or completion callback must not finish the new motion.
        if (
          active === scene &&
          scene.revision === revision &&
          decoded &&
          !master.pending &&
          master.playState === "finished" &&
          Math.abs(Number(master.currentTime) - endpoint) < 0.5
        )
          finish(focus);
      };
      master.addEventListener("finish", finishAtEndpoint);
      scene.removeFinishListener = () =>
        master.removeEventListener("finish", finishAtEndpoint);
      const imagesReady = Promise.race([
        Promise.all(
          [
            ...scene.overlay.querySelectorAll(".ed-route-print"),
            ...prints(root, rendered),
          ].map((element) =>
            element
              .querySelector("img")
              ?.decode()
              .catch(() => {}),
          ),
        ),
        new Promise((resolve) => {
          scene.imageDeadline = setTimeout(resolve, DURATION + 1800);
        }),
      ]);
      imagesReady.then(() => {
        decoded = true;
        finishAtEndpoint();
      });
      master.ready.then(finishAtEndpoint, () => {});
    };
    const go = (
      target,
      { historyEntry = false, state = null, focus = false } = {},
    ) => {
      if (target === "home") state = { ...state, editorialScroll: 0 };
      if (target === current.current) return;
      if (active) {
        // Keep the same seven prints, text masks and clock. Repeated navigation
        // rewinds the actual choreography instead of taking a direct shortcut.
        const scene = active;
        const time = Math.max(
          0,
          Math.min(DURATION, Number(scene.animations[0]?.currentTime) || 0),
        );
        const direction = target === scene.to ? 1 : -1;
        if (!reduced.matches && (time < DURATION || direction < 0)) {
          const startTime = document.timeline.currentTime - time / direction;
          const revision = scene.revision + 1;
          scene.animations.forEach((animation) => {
            // Rebase the whole group from one held frame. Changing only the
            // rate can leave Chromium painting an old compositor endpoint.
            animation.pause();
            animation.playbackRate = direction;
            animation.currentTime = time;
            animation.play();
          });
          scene.animations[0].ready.then(
            () => {
              if (active !== scene || scene.revision !== revision) return;
              const actual = Number(scene.animations[0].currentTime);
              const expected = Math.max(
                0,
                Math.min(
                  DURATION,
                  (document.timeline.currentTime - startTime) * direction,
                ),
              );
              // WebKit can resume at an endpoint instead of the held time.
              // Repair that reset, leaving an ordinary frame hold untouched.
              if (
                (actual < 50 && expected > actual + 50) ||
                (actual > DURATION - 50 && expected < actual - 50)
              )
                scene.animations.forEach((animation) => {
                  animation.startTime = startTime;
                });
            },
            () => {},
          );
        }
        Object.assign(
          scene,
          showPage(target, {
            historyEntry,
            state: state || scene.positions[target],
            resume: true,
            defer: true,
          }),
        );
        if (reduced.matches || (target === scene.from && time === 0)) {
          finish(focus);
          return;
        }
        completeWhenReady(scene, focus);
        return;
      }
      const from = current.current;
      const fromPosition = {
        editorialScroll: scrollY,
        editorialRail:
          root.querySelector(".ed-collection-rail")?.scrollLeft || 0,
      };
      const source = prints(root, from).map(snapshot);
      if (!source.length) {
        finish();
        return;
      }
      const outgoing = [...root.querySelectorAll(textSelector(from))].filter(
        visibleText,
      );
      const overlay = document.createElement("div");
      overlay.className = "ed-site ed-route-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.inert = true;
      overlay.style.font = getComputedStyle(root).font;
      overlay.style.setProperty(
        "--gutter",
        getComputedStyle(root).getPropertyValue("--gutter"),
      );
      overlay.style.setProperty("--ease", EASE);
      document.body.append(overlay);
      const copies = outgoing.map((element) => copyText(element, overlay));
      const layers = source.map(
        ({ element, pose: start, zoom, colour, clipPath }, index) => {
          const layer = document.createElement("div");
          layer.className = "ed-route-print";
          layer.dataset.routePrint = index;
          layer.style.width = start.width + "px";
          layer.style.zIndex = String(20 - index);
          layer.style.transform = transform(start, start.width);
          layer.style.opacity = start.opacity;
          layer.style.clipPath = clipPath;
          const image = element.querySelector("img");
          if (image) {
            const copy = image.cloneNode();
            copy.removeAttribute("srcset");
            copy.removeAttribute("sizes");
            copy.src = image.currentSrc || image.src;
            copy.alt = "";
            copy.loading = "eager";
            copy.style.transform = zoom;
            const colourImage =
              element.querySelector(".ed-cover-colour img, .ed-route-colour") ||
              image;
            const original = colourImage.cloneNode();
            original.removeAttribute("srcset");
            original.removeAttribute("sizes");
            original.src = colourImage.currentSrc || colourImage.src;
            original.className = "ed-route-colour";
            original.alt = "";
            original.loading = "eager";
            original.style.transform = zoom;
            original.style.opacity = colour;
            if (!copy.src.includes("-mono-")) {
              const monochrome = copy.src.replace(
                /(\/covers\/[^/]+)(-\d+\.webp)$/,
                "$1-mono$2",
              );
              if (monochrome !== copy.src) copy.src = monochrome;
              else copy.style.filter = "grayscale(1) contrast(1.2)";
            }
            layer.append(copy);
            if (colour > 0) layer.append(original);
          }
          overlay.append(layer);
          return {
            element: layer,
            start,
            width: start.width,
            zoom,
            colour,
            clipPath,
          };
        },
      );
      const position = showPage(target, { historyEntry, state });
      root.classList.add("is-route-transition");
      const ends = prints(root, target).map(pose);
      const scene = {
        overlay,
        prints: layers,
        source,
        animations: [],
        imageDeadline: 0,
        revision: 0,
        from,
        to: target,
        positions: {
          [from]: fromPosition,
          [target]: {
            editorialScroll: position.scrollTop,
            editorialRail: position.railLeft,
          },
        },
        ...position,
        startedAt: document.timeline.currentTime,
      };
      active = scene;
      const animate = (element, frames, duration, delay = 0, easing = EASE) => {
        const phases = Array.isArray(frames)
          ? frames
          : [0, 1].map((index) =>
              Object.fromEntries(
                Object.entries(frames).map(([property, values]) => [
                  property,
                  values[index],
                ]),
              ),
            );
        const keyframes = phases.map((frame, index) => ({
          ...frame,
          offset:
            (delay + duration * (frame.offset ?? index / (phases.length - 1))) /
            2000,
          easing: frame.easing || easing,
        }));
        if (keyframes[0].offset > 0)
          keyframes.unshift({ ...keyframes[0], offset: 0, easing: "linear" });
        if (keyframes.at(-1).offset < 1)
          keyframes.push({ ...keyframes.at(-1), offset: 1, easing: "linear" });
        const animation = element.animate(keyframes, {
          duration: DURATION,
          easing: "linear",
          fill: "both",
        });
        animation.id = "ed-route-transition";
        animation.startTime = scene.startedAt;
        scene.animations.push(animation);
        return animation;
      };
      const phone = matchMedia("(max-width:760px)").matches;
      const animateGalleryText = (
        copy,
        incoming,
        duration,
        delay,
        easing = EASE,
      ) => {
        const heading = copy.matches(".ed-gallery-heading");
        const title = copy.querySelector(
          heading ? ".ed-page-title > span" : "h2 > span",
        );
        const count = copy.querySelector(
          heading ? ".ed-gallery-count" : ":scope > span",
        );
        copy.style.opacity = "1";
        animate(
          title,
          {
            opacity: incoming ? [0, 1] : [1, 0],
            transform: incoming
              ? ["translateY(112%)", "none"]
              : ["none", "translateY(112%)"],
          },
          duration,
          delay,
          easing,
        );
        animate(
          count,
          { opacity: incoming ? [0, 1] : [1, 0] },
          duration,
          delay,
          easing,
        );
      };
      if (reduced.matches || !Element.prototype.animate) {
        finish(focus);
        return;
      }
      const home = target === "home" ? ends : source.map((item) => item.pose);
      const gallery =
        target === "gallery" ? ends : source.map((item) => item.pose);
      const pack = {
        ...home[0],
        y: gallery[0].y,
        width: gallery[0].width,
        angle: 0,
      };
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index],
          end = ends[index];
        if (!end) continue;
        layer.width = Math.max(layer.start.width, end.width, pack.width);
        layer.element.style.width = layer.width + "px";
        layer.element.style.transform = transform(layer.start, layer.width);
        const startFrame = {
          transform: transform(layer.start, layer.width),
          opacity: layer.start.opacity,
          offset: 0,
          easing: PHOTO_EASE,
        };
        const endFrame = {
          transform: transform(end, layer.width),
          opacity: 1,
          offset: 1,
        };
        const frames =
          target === "gallery"
            ? [
                startFrame,
                { ...startFrame, offset: 0.06, easing: PHOTO_EASE },
                {
                  transform: transform(pack, layer.width),
                  opacity: 1,
                  offset: 0.33,
                  easing: PHOTO_EASE,
                },
                { ...endFrame, offset: 0.71, easing: PHOTO_EASE },
                endFrame,
              ]
            : [
                startFrame,
                { ...startFrame, offset: 0.29, easing: PHOTO_EASE },
                {
                  transform: transform(pack, layer.width),
                  opacity: 1,
                  offset: 0.67,
                  easing: PHOTO_EASE,
                },
                { ...endFrame, offset: 0.94, easing: PHOTO_EASE },
                endFrame,
              ];
        layer.animation = animate(layer.element, frames, 2000, 0, PHOTO_EASE);
        if (layer.clipPath !== "none")
          animate(
            layer.element,
            { clipPath: [layer.clipPath, "inset(0)"] },
            450,
          );
        for (const image of layer.element.querySelectorAll("img"))
          if (layer.zoom !== "none")
            animate(image, { transform: [layer.zoom, "none"] }, 650);
        const colourLayer = layer.element.querySelector(".ed-route-colour");
        if (colourLayer)
          animate(colourLayer, { opacity: [layer.colour, 0] }, 700, 200);
      }
      let captionIndex = 0;
      copies.forEach((copy) => {
        if (copy.matches(".ed-hero-title"))
          copy.querySelectorAll(":scope > span > span").forEach((line, i) => {
            const reveal = heroLineReveal(line);
            animate(
              line.parentElement,
              {
                clipPath: [
                  getComputedStyle(line.parentElement).clipPath === "none"
                    ? reveal.mask
                    : getComputedStyle(line.parentElement).clipPath,
                  reveal.hidden,
                ],
              },
              HERO_TYPE_EXIT_DURATION,
              i * 40,
              HERO_TEXT_EXIT_EASE,
            );
            animate(
              line,
              {
                opacity: [
                  Number(getComputedStyle(line).opacity),
                  Number(getComputedStyle(line).opacity),
                ],
              },
              HERO_TYPE_EXIT_DURATION,
              i * 40,
              HERO_TEXT_EXIT_EASE,
            );
          });
        else if (copy.matches(".ed-hero-bottom"))
          animate(
            copy,
            { opacity: [getComputedStyle(copy).opacity, 0] },
            HERO_TYPE_EXIT_DURATION,
            140,
            HERO_TEXT_EXIT_EASE,
          );
        else if (copy.matches(".ed-gallery-heading")) {
          if (phone) animateGalleryText(copy, false, 660, 0, EXIT_EASE);
          else
            animate(
              copy,
              { opacity: [1, 0], transform: ["none", "translateY(80px)"] },
              660,
              0,
              EXIT_EASE,
            );
        } else if (copy.matches(".ed-collection-caption")) {
          const delay = 220 - captionIndex++ * 35;
          if (phone) animateGalleryText(copy, false, 460, delay, EXIT_EASE);
          else
            animate(
              copy,
              { opacity: [1, 0], transform: ["none", "translateY(10px)"] },
              460,
              delay,
              EXIT_EASE,
            );
        } else if (copy.matches(".ed-rail-controls"))
          animate(copy, { opacity: [1, 0] }, 500, 90, EXIT_EASE);
        else
          animate(copy, { opacity: [getComputedStyle(copy).opacity, 0] }, 260);
      });
      const incoming = [...root.querySelectorAll(textSelector(target))].map(
        (element) => copyText(element, overlay),
      );
      if (target === "home") {
        incoming
          .find((element) => element.matches(".ed-hero-title"))
          .querySelectorAll(":scope > span > span")
          .forEach((line, i) => {
            const reveal = heroLineReveal(line);
            animate(
              line.parentElement,
              { clipPath: [reveal.hidden, reveal.mask] },
              HERO_TYPE_ENTER_DURATION,
              1300 - i * 40,
              HERO_TEXT_EASE,
            );
            animate(
              line,
              {
                opacity: [1, 1],
              },
              HERO_TYPE_ENTER_DURATION,
              1300 - i * 40,
              HERO_TEXT_EASE,
            );
          });
        animate(
          incoming.find((element) => element.matches(".ed-hero-bottom")),
          { opacity: [0, 1] },
          HERO_TYPE_ENTER_DURATION,
          1380,
          HERO_TEXT_EASE,
        );
      } else {
        incoming
          .filter((element) => element.matches(".ed-collection-caption"))
          .forEach((caption, i) => {
            if (phone) animateGalleryText(caption, true, 460, 1320 + i * 35);
            else
              animate(
                caption,
                { opacity: [0, 1], transform: ["translateY(10px)", "none"] },
                460,
                1320 + i * 35,
              );
          });
        const heading = incoming.find((element) =>
          element.matches(".ed-gallery-heading"),
        );
        if (phone) animateGalleryText(heading, true, 660, 1340);
        else
          animate(
            heading,
            {
              opacity: [0, 1],
              transform: ["translateY(80px)", "none"],
            },
            660,
            1340,
          );
        animate(
          incoming.find((element) => element.matches(".ed-rail-controls")),
          { opacity: [0, 1] },
          500,
          1410,
        );
      }
      completeWhenReady(scene, focus);
    };
    const continueRoute = (target, options) => {
      cancelTopScroll();
      if (
        target === "gallery" &&
        current.current === "home" &&
        !active &&
        scrollY > 1
      ) {
        scrollHomeTop(() => go(target, options));
        return;
      }
      go(target, options);
    };
    const requestRoute = (target, options = {}) => {
      if (root.querySelector(".ed-album")) {
        queuedRoute = target === current.current ? null : { target, options };
        if (waitingForCollection) return;
        waitingForCollection = true;
        const detail = {
          handled: false,
          complete: () => {
            waitingForCollection = false;
            const next = queuedRoute;
            queuedRoute = null;
            if (next) continueRoute(next.target, next.options);
            else if (pageAt(location.pathname) !== current.current)
              history.pushState(
                { editorialPage: current.current },
                "",
                routes[current.current],
              );
          },
        };
        root.dispatchEvent(new CustomEvent("ed:close-collection", { detail }));
        if (detail.handled) return;
        waitingForCollection = false;
      }
      continueRoute(target, options);
    };
    const click = (event) => {
      const link = event.target.closest("a[href]");
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href),
        target = pageAt(url.pathname);
      if (url.origin === location.origin && topFrame && !target)
        cancelTopScroll();
      if (url.origin !== location.origin || !target || !routes[current.current])
        return;
      if (url.hash && url.hash !== "#top") return;
      event.preventDefault();
      if (target === "home" && current.current === "home") {
        finish();
        scrollHomeTop();
        return;
      }
      cancelTopScroll();
      requestRoute(target, { focus: event.detail === 0 });
    };
    const back = (event) => {
      cancelTopScroll();
      const target = pageAt(location.pathname);
      if (target && target !== current.current)
        requestRoute(target, { historyEntry: true, state: event.state });
    };
    const interrupt = () => {
      cancelTopScroll();
      finish();
    };
    const scrollKey = (event) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      )
        cancelTopScroll();
    };
    const interact = (event) => {
      if (active && event.target.closest("main")) finish();
    };
    const scroll = () => {
      if (
        active &&
        (Math.abs(scrollY - active.scrollTop) > 1 ||
          (active.rail?.isConnected &&
            Math.abs(active.rail.scrollLeft - active.railLeft) > 1))
      )
        finish();
    };
    const preference = () => {
      if (reduced.matches) {
        if (topFrame) {
          const complete = topCompletion;
          cancelTopScroll();
          window.scrollTo({ top: 0, behavior: "instant" });
          complete?.();
        }
        finish();
      }
    };
    document.addEventListener("click", click);
    root.addEventListener("focusin", interact);
    root.addEventListener("click", interact, true);
    window.addEventListener("popstate", back);
    window.addEventListener("resize", interrupt, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchmove", interrupt, { passive: true });
    window.addEventListener("keydown", scrollKey);
    root.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("pagehide", interrupt);
    reduced.addEventListener("change", preference);
    return () => {
      finish();
      cancelTopScroll();
      cancelAnimationFrame(handoffFrame);
      document.removeEventListener("click", click);
      root.removeEventListener("focusin", interact);
      root.removeEventListener("click", interact, true);
      window.removeEventListener("popstate", back);
      window.removeEventListener("resize", interrupt);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchmove", interrupt);
      window.removeEventListener("keydown", scrollKey);
      root.removeEventListener("scroll", scroll, true);
      window.removeEventListener("pagehide", interrupt);
      reduced.removeEventListener("change", preference);
    };
  }, [rootRef, setPage, closeViewer, setGalleryPreview, setRoutePage]);
}
