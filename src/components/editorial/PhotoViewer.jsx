import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Photograph, Icon } from "./Primitives.jsx";

const EASE = "cubic-bezier(.2,.75,.25,1)";
export function photographBox(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect(),
    image = element.querySelector("img");
  if (image && getComputedStyle(image).objectFit === "contain") {
    const ratio = image.naturalWidth / image.naturalHeight;
    if (ratio) {
      const width = Math.min(rect.width, rect.height * ratio),
        height = width / ratio;
      return {
        left: rect.left + (rect.width - width) / 2,
        top: rect.top + (rect.height - height) / 2,
        width,
        height,
      };
    }
  }
  const zoom = image
    ? new DOMMatrixReadOnly(getComputedStyle(image).transform).a
    : 1;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    zoom,
  };
}
function bridge(source, end) {
  if (!source?.width || !end?.width) return null;
  // The print clips a gently zoomed image. Match that crop, not just its outer
  // frame, so removing the fullscreen layer cannot reveal a different zoom.
  const scale =
    Math.max(source.width / end.width, source.height / end.height) *
    (source.zoom || 1);
  const x = source.left + source.width / 2 - end.left - end.width / 2;
  const y = source.top + source.height / 2 - end.top - end.height / 2;
  const vertical = Math.max(0, (end.height - source.height / scale) / 2),
    horizontal = Math.max(0, (end.width - source.width / scale) / 2);
  return {
    transform: `translate3d(${x}px,${y}px,0) scale(${scale})`,
    clipPath: `inset(${vertical}px ${horizontal}px)`,
  };
}

export default function PhotoViewer({
  set,
  index,
  onChange,
  onJump,
  onClose,
  loading,
  origin,
  returnTarget,
  nested = false,
}) {
  const root = useRef(null),
    visual = useRef(null),
    frame = useRef(null),
    closeButton = useRef(null),
    touch = useRef(null);
  const animations = useRef([]),
    returnMotion = useRef([]),
    frozenReturn = useRef([]),
    timer = useRef(0),
    closing = useRef(false),
    endBox = useRef(null);
  const handlers = useRef({ onClose, onChange, returnTarget });
  handlers.current = { onClose, onChange, returnTarget };
  const [original, setOriginal] = useState(null);
  const photo = set[index],
    ratio = (photo.width || 1200) / (photo.height || 800);
  const filmstripStart = Math.max(0, Math.min(set.length - 9, index - 4));
  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const current = getComputedStyle(frame.current);
    const start = {
      transform: current.transform,
      clipPath: current.clipPath,
      opacity: current.opacity,
    };
    const returning = handlers.current.returnTarget?.();
    if (returning) {
      const column = returning.closest(".ed-album-column");
      if (column)
        column.scrollTo({ top: column.scrollTop, behavior: "instant" });
      // An early dismissal can overlap the print's own gentle zoom. Freeze its
      // painted crop for this handoff, then let that zoom resume after closing.
      frozenReturn.current = [...returning.querySelectorAll("img")].map(
        (node) => {
          const transform = getComputedStyle(node).transform;
          const state = {
            node,
            transform: node.style.transform,
            transition: node.style.transition,
          };
          const active = node
            .getAnimations()
            .filter((animation) =>
              animation.effect
                .getKeyframes()
                .some((key) => key.transform !== undefined),
            );
          active.forEach((animation) => animation.pause());
          returnMotion.current.push(...active);
          node.style.transition = "none";
          node.style.transform = transform;
          return state;
        },
      );
    }
    const destination = photographBox(returning) || origin;
    const backgroundColor = getComputedStyle(root.current).backgroundColor;
    const controls = [
      ...root.current.querySelectorAll(
        ".fg-viewer-bar,.fg-viewer-filmstrip,.fg-viewer-caption,.fg-viewer-stage > button",
      ),
    ].map((element) => ({
      element,
      opacity: getComputedStyle(element).opacity,
    }));
    animations.current.forEach((animation) => animation.cancel());
    if (!reduced) {
      const target = bridge(destination, endBox.current) || {
        transform: "scale(.975)",
        clipPath: "inset(0)",
        opacity: 0,
      };
      animations.current = [
        frame.current.animate([start, target], {
          duration: 500,
          easing: EASE,
          fill: "both",
        }),
        root.current.animate(
          [{ backgroundColor }, { backgroundColor: "rgba(0,0,0,0)" }],
          { duration: 500, easing: EASE, fill: "both" },
        ),
      ];
      for (const { element, opacity } of controls)
        animations.current.push(
          element.animate([{ opacity }, { opacity: 0 }], {
            duration: 220,
            easing: EASE,
            fill: "both",
          }),
        );
    }
    timer.current = setTimeout(
      () => handlers.current.onClose(),
      reduced ? 0 : 500,
    );
  }, [origin]);
  useLayoutEffect(
    () => () => {
      frozenReturn.current.forEach(({ node, transform, transition }) => {
        node.style.transition = transition;
        node.style.transform = transform;
      });
      returnMotion.current.forEach((animation) => {
        if (animation.playState === "paused") animation.play();
      });
    },
    [],
  );
  useLayoutEffect(() => {
    const measure = () => {
      const bounds = visual.current.getBoundingClientRect();
      const width = Math.min(bounds.width, bounds.height * ratio),
        height = width / ratio;
      Object.assign(frame.current.style, {
        width: width + "px",
        height: height + "px",
      });
      endBox.current = {
        left: bounds.left + (bounds.width - width) / 2,
        top: bounds.top + (bounds.height - height) / 2,
        width,
        height,
      };
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(visual.current);
    return () => resize.disconnect();
  }, [ratio]);
  useLayoutEffect(() => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const start = bridge(origin, endBox.current) || {
      transform: "scale(.975)",
      clipPath: "inset(0)",
      opacity: 0,
    };
    animations.current = [
      frame.current.animate(
        [start, { transform: "none", clipPath: "inset(0)", opacity: 1 }],
        { duration: 750, easing: EASE, fill: "both" },
      ),
      root.current.animate(
        [
          { backgroundColor: "rgba(0,0,0,0)" },
          { backgroundColor: "rgb(0,0,0)" },
        ],
        { duration: 400, easing: EASE, fill: "both" },
      ),
    ];
    for (const element of root.current.querySelectorAll(
      ".fg-viewer-bar,.fg-viewer-filmstrip,.fg-viewer-caption,.fg-viewer-stage > button",
    ))
      animations.current.push(
        element.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 500,
          delay: 180,
          easing: EASE,
          fill: "both",
        }),
      );
    animations.current.forEach((animation) => {
      animation.id = "ed-viewer-transition";
    });
    return () => {
      clearTimeout(timer.current);
      animations.current.forEach((animation) => animation.cancel());
    };
  }, [origin]);
  useEffect(() => {
    let alive = true,
      image;
    // Decode the full-resolution original after the opening is underway.
    // Its fitted frame never changes when quality improves.
    const task = setTimeout(() => {
      image = new window.Image();
      image.src = photo.src;
      image.decode().then(
        () => {
          if (alive) setOriginal(photo.src);
        },
        () => {},
      );
    }, 800);
    return () => {
      alive = false;
      clearTimeout(task);
      image?.removeAttribute("src");
    };
  }, [photo.src]);
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    const selectors = nested
      ? ".fg-header, .ed-album-column, .ed-album-phone, .ed-album-controls, .ed-album-dismiss, .ed-album-top"
      : ".fg-header, main, .fg-footer";
    const former = [...document.querySelectorAll(selectors)].map((element) => ({
      element,
      inert: element.inert,
      hidden: element.getAttribute("aria-hidden"),
    }));
    former.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    const keys = (event) => {
      if (
        ["Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
          event.key,
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === "Escape") dismiss();
        else if (!closing.current)
          handlers.current.onChange(
            ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1,
          );
      }
      if (event.key === "Tab") {
        event.preventDefault();
        event.stopImmediatePropagation();
        const controls = [
          ...root.current.querySelectorAll("button:not([disabled])"),
        ].filter((element) => element.getClientRects().length);
        const position = controls.indexOf(document.activeElement);
        // Some browsers leave pointer-activated buttons unfocused. Own the
        // whole Tab cycle so keyboard input always returns inside this dialog.
        const next =
          position < 0
            ? event.shiftKey
              ? controls.length - 1
              : 0
            : (position + (event.shiftKey ? -1 : 1) + controls.length) %
              controls.length;
        controls[next]?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", keys, true);
    return () => {
      document.body.style.overflow = overflow;
      former.forEach(({ element, inert, hidden }) => {
        element.inert = inert;
        if (hidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", hidden);
      });
      window.removeEventListener("keydown", keys, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [dismiss, nested]);
  const change = (delta) => {
    if (!closing.current) onChange(delta);
  };
  return (
    <div
      ref={root}
      className="fg-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={"Photograph viewer: " + photo.name}
    >
      <div className="fg-viewer-bar tw:flex tw:items-center tw:justify-between">
        <span>ABHIMANYU SHARMA / PHOTOGRAPHY</span>
        <span aria-live="polite">
          {String(index + 1).padStart(2, "0")} —{" "}
          {loading ? "LOADING" : String(set.length).padStart(2, "0")}
        </span>
        <button
          ref={closeButton}
          type="button"
          onClick={dismiss}
          aria-label="Close photograph"
          className="fg-viewer-close"
        >
          CLOSE <Icon name="close" size={18} />
        </button>
      </div>
      <div
        className="fg-viewer-filmstrip"
        role="group"
        aria-label="Nearby photographs in this series"
      >
        {set.slice(filmstripStart, filmstripStart + 9).map((item, offset) => {
          const itemIndex = filmstripStart + offset;
          return (
            <button
              type="button"
              key={item.src}
              className={itemIndex === index ? "is-current" : ""}
              onClick={() => {
                if (!closing.current) onJump(itemIndex);
              }}
              aria-label={
                "Show photograph " + (itemIndex + 1) + ": " + item.name
              }
              aria-current={itemIndex === index ? "true" : undefined}
            >
              {itemIndex === index ? (
                <Photograph photo={item} sizes="38px" />
              ) : (
                <span className="fg-filmstrip-index">
                  {String(itemIndex + 1).padStart(2, "0")}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className="fg-viewer-stage"
        onTouchStart={(event) => {
          touch.current = {
            x: event.touches[0]?.clientX,
            y: event.touches[0]?.clientY,
          };
        }}
        onTouchEnd={(event) => {
          if (!touch.current) return;
          const dx = event.changedTouches[0].clientX - touch.current.x,
            dy = event.changedTouches[0].clientY - touch.current.y;
          if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.2)
            change(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
      >
        <button
          type="button"
          className="fg-viewer-prev"
          aria-label="Previous photograph"
          onClick={() => change(-1)}
        >
          <Icon name="arrow-left" size={25} />
        </button>
        <div ref={visual} className="fg-viewer-visual">
          <div ref={frame} className="fg-viewer-image-frame">
            <Photograph key={photo.src} photo={photo} eager sizes="95vw" />
            {original === photo.src && (
              <img
                className="fg-viewer-original"
                src={original}
                alt=""
                aria-hidden="true"
                decoding="async"
              />
            )}
          </div>
        </div>
        <button
          type="button"
          className="fg-viewer-next"
          aria-label="Next photograph"
          onClick={() => change(1)}
        >
          <Icon name="arrow-right" size={25} />
        </button>
      </div>
      <div className="fg-viewer-caption tw:flex tw:items-center tw:justify-between">
        <span>{photo.name}</span>
        <span>{photo.collection} / INDIA</span>
      </div>
    </div>
  );
}
