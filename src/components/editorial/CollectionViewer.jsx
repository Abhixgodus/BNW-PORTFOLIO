import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Photograph, Icon, COVER_SIZES } from "./Primitives.jsx";
import GalleryZoom from "./GalleryZoom.jsx";
import { photographBox } from "./PhotoViewer.jsx";
import CollectionHeading from "./CollectionHeading.jsx";

// Both ends settle gently; opening and folding use the same clock and curve.
const EASE = "cubic-bezier(.37,0,.63,1)";
const OPEN_DURATION = 1500;
const PHONE_DURATION = 700;
const UNFOLD_COUNT = 8;
const PRINT_STAGGER = 65;
const isPhone = () => matchMedia("(max-width:760px)").matches;
const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion:reduce)").matches;

function PhonePhotoContent({ photo, index, count }) {
  return (
    <>
      <div
        className="ed-album-phone-frame"
        style={{
          "--photo-ratio": (photo.width || 1200) / (photo.height || 800),
        }}
      >
        <Photograph photo={photo} eager sizes="(max-width:760px) 100vw, 45vw" />
      </div>
      <div className="ed-album-phone-caption">
        <span className="ed-album-photo-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(count).padStart(2, "0")}
        </span>
        <h3>{photo.name}</h3>
      </div>
    </>
  );
}

function PhonePhotograph({ photo, index, count }) {
  const [shown, setShown] = useState({ photo, index, count });
  const [previous, setPrevious] = useState(null);
  const current = useRef(null),
    outgoing = useRef(null),
    animations = useRef([]),
    alive = useRef(true),
    latest = useRef(null),
    displayed = useRef(shown);
  latest.current = { photo, index, count };
  displayed.current = shown;
  const pending = shown.photo.src !== photo.src;

  const ready = async (event) => {
    const image = event.target,
      requested = latest.current;
    if (!(image instanceof HTMLImageElement)) return;
    await image.decode().catch(() => {});
    if (
      !alive.current ||
      !image.naturalWidth ||
      latest.current.photo.src !== requested.photo.src ||
      displayed.current.photo.src === requested.photo.src
    )
      return;
    animations.current.forEach((animation) => animation.finish());
    setPrevious(displayed.current);
    setShown(requested);
  };

  useLayoutEffect(() => {
    if (!previous) return;
    if (reducedMotion()) {
      setPrevious(null);
      return;
    }
    const fades = [
      current.current.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 380,
        easing: EASE,
        fill: "both",
      }),
      outgoing.current.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 380,
        easing: EASE,
        fill: "both",
      }),
    ];
    fades.forEach((animation) => {
      animation.id = "ed-collection-photo-fade";
    });
    animations.current = fades;
    fades[0].finished.then(
      () => {
        if (alive.current && animations.current === fades) setPrevious(null);
      },
      () => {},
    );
    return () => fades.forEach((animation) => animation.cancel());
  }, [shown]);

  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      animations.current.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <>
      {previous && (
        <div
          className="ed-album-phone-previous"
          ref={outgoing}
          aria-hidden="true"
        >
          <PhonePhotoContent {...previous} />
        </div>
      )}
      <div className="ed-album-phone-photo" ref={current}>
        <PhonePhotoContent {...(pending ? shown : latest.current)} />
      </div>
      {pending && (
        <div
          className="ed-album-phone-preload"
          aria-hidden="true"
          onLoadCapture={ready}
        >
          <Photograph
            key={photo.src}
            photo={{ ...photo, alt: "" }}
            eager
            sizes="100vw"
          />
        </div>
      )}
    </>
  );
}

const AlbumPrint = memo(function AlbumPrint({
  item,
  current,
  eager,
  onOpen,
  order,
  coverSlug,
}) {
  return (
    <figure
      className={current ? "is-current" : undefined}
      style={{
        zIndex: order < UNFOLD_COUNT ? UNFOLD_COUNT - order : undefined,
      }}
    >
      <button
        type="button"
        className="ed-album-print"
        aria-label={"Enlarge " + item.name}
        onClick={(event) => onOpen(item, event.currentTarget)}
      >
        {coverSlug ? (
          <>
            <Photograph
              photo={{ ...item, preview: undefined }}
              coverSlug={coverSlug + "-mono"}
              eager
              sizes={COVER_SIZES}
            />
            <span className="ed-album-cover-colour" aria-hidden="true">
              <Photograph
                photo={{ ...item, preview: undefined, alt: "" }}
                coverSlug={coverSlug}
                eager
                sizes={COVER_SIZES}
              />
            </span>
          </>
        ) : (
          <Photograph
            photo={item}
            eager={eager}
            sizes="(max-width:760px) 90vw, 24vw"
          />
        )}
        <span className="ed-print-zoom-icon" aria-hidden="true">
          +
        </span>
      </button>
    </figure>
  );
});

// Native bounded scrolling and one opening/folding owner. Only the nearest
// photograph enters React; velocity changes touch the visible prints alone.
export default function CollectionViewer({
  set,
  index,
  title,
  slug,
  count,
  origin,
  loading,
  pointer,
  onHoverReturn,
  onJump,
  onClose,
}) {
  const album = useRef(null),
    column = useRef(null),
    phoneView = useRef(null);
  const motion = useRef(null),
    controlsMotion = useRef(null),
    unfolds = useRef([]),
    coverMotion = useRef([]),
    returnFrame = useRef(0),
    lastPointer = useRef(pointer),
    zoomActive = useRef(false),
    returnHover = useRef(null),
    timer = useRef(0),
    closeDuration = useRef(OPEN_DURATION),
    closingRef = useRef(false);
  const afterClose = useRef([]),
    indexRef = useRef(index),
    jumpRef = useRef(null),
    requestedIndex = useRef(null);
  const touch = useRef(null);
  const [closing, setClosing] = useState(false),
    [zoom, setZoom] = useState(null),
    [phone, setPhone] = useState(isPhone);
  const closeZoom = useCallback(() => {
    zoomActive.current = false;
    setZoom(null);
  }, []);
  const openZoom = useCallback(
    (item, element) => {
      if (closingRef.current || isPhone()) return;
      zoomActive.current = true;
      const strip = column.current;
      if (strip) strip.scrollTo({ top: strip.scrollTop, behavior: "instant" });
      element.closest("figure")?.style.removeProperty("--scroll-stretch");
      const next = set.findIndex((photo) => photo.src === item.src);
      if (next >= 0) {
        indexRef.current = next;
        requestedIndex.current = null;
        onJump(next);
      }
      setZoom({ src: item.src, origin: photographBox(element) });
    },
    [set, onJump],
  );
  const coverElement = useCallback(
    () =>
      document.querySelector(
        `[data-collection-slug="${slug}"] .ed-image-window`,
      ),
    [slug],
  );
  const animatePrints = useCallback(
    (target, compact, duration, initial = false) => {
      const prints = [...target.children].slice(1, UNFOLD_COUNT);
      // Capture every current pose first, including an interrupted opening.
      const coverTop = target.firstElementChild.getBoundingClientRect().top;
      const poses = prints.map((node) => {
        const from = getComputedStyle(node).transform;
        // offsetTop rounds fractional print heights and can expose a thin edge
        // below the cover. Measure the untransformed position without rounding.
        const offset =
          node.getBoundingClientRect().top -
          coverTop -
          new DOMMatrixReadOnly(from).f;
        return {
          node,
          offset,
          from: initial ? `translateY(${-offset}px)` : from,
        };
      });
      poses.forEach(({ node, from }) => {
        node.style.transform = from;
      });
      unfolds.current.forEach((animation) => animation.cancel());
      // The deepest prints must fall first: moving the nearest one first masks
      // every other print. Reverse this order when returning behind the cover.
      const stagger = PRINT_STAGGER * (duration / OPEN_DURATION);
      const travel = duration - Math.max(0, poses.length - 1) * stagger;
      unfolds.current = poses
        .map(({ node, from, offset }, i) => {
          const end = compact ? `translateY(${-offset}px)` : "none";
          if (!duration) {
            node.style.transform = end;
            return null;
          }
          const animation = node.animate(
            [{ transform: from }, { transform: end }],
            {
              duration: travel,
              delay: (compact ? i : poses.length - 1 - i) * stagger,
              easing: EASE,
              fill: "both",
            },
          );
          animation.id = compact
            ? "ed-collection-fold"
            : "ed-collection-unfold";
          if (!compact)
            animation.finished.then(
              () => {
                if (!closingRef.current) {
                  node.style.transform = "none";
                  animation.cancel();
                }
              },
              () => {},
            );
          return animation;
        })
        .filter(Boolean);
    },
    [],
  );
  const animateCover = useCallback(
    (colour, transform, duration, fromCover = false) => {
      const first = column.current?.firstElementChild;
      if (!first) return;
      const source = coverElement();
      const colourLayer = first.querySelector(".ed-album-cover-colour");
      const images = [...first.querySelectorAll("img")];
      const values = images.map((node) => ({
        node,
        from:
          fromCover && source
            ? getComputedStyle(source.querySelector("img")).transform
            : getComputedStyle(node).transform,
        to: transform || getComputedStyle(node).transform,
      }));
      const opacity =
        fromCover && source
          ? getComputedStyle(source.querySelector(".ed-cover-colour")).opacity
          : getComputedStyle(colourLayer).opacity;
      values.forEach(({ node, from }) => {
        node.style.transform = from;
      });
      colourLayer.style.opacity = opacity;
      coverMotion.current.forEach((animation) => animation.cancel());
      coverMotion.current = [];
      for (const { node, from, to } of values) {
        if (!duration) {
          node.style.transform = to;
          continue;
        }
        const animation = node.animate(
          [{ transform: from }, { transform: to }],
          { duration, easing: EASE, fill: "both" },
        );
        animation.id = "ed-collection-cover";
        coverMotion.current.push(animation);
      }
      if (!duration) colourLayer.style.opacity = String(colour);
      else {
        const animation = colourLayer.animate(
          [{ opacity }, { opacity: colour }],
          { duration, easing: EASE, fill: "both" },
        );
        animation.id = "ed-collection-colour";
        coverMotion.current.push(animation);
      }
    },
    [coverElement],
  );
  const syncReturnHover = useCallback(
    (duration) => {
      const cover = coverElement();
      if (!cover) return null;
      const box = cover.getBoundingClientRect(),
        cursor = lastPointer.current;
      const keepColour =
        !cursor ||
        Boolean(
          matchMedia("(hover:hover) and (pointer:fine)").matches &&
          cursor.x >= box.left &&
          cursor.x <= box.right &&
          cursor.y >= box.top &&
          cursor.y <= box.bottom,
        );
      if (
        duration === undefined &&
        returnHover.current?.keepColour === keepColour
      )
        return returnHover.current;
      const now = performance.now();
      const remaining =
        duration ?? Math.max(0, returnHover.current.endsAt - now);
      const order = Number(
        cover.closest("[data-collection-index]").dataset.collectionIndex,
      );
      returnHover.current = { keepColour, order, endsAt: now + remaining };
      onHoverReturn?.(keepColour ? order : null);
      animateCover(
        keepColour ? 1 : 0,
        keepColour ? "scale(1.025)" : "scale(1)",
        remaining,
      );
      return returnHover.current;
    },
    [coverElement, onHoverReturn, animateCover],
  );
  const requestClose = useCallback(
    (options = {}) => {
      if (options.after) afterClose.current.push(options.after);
      if (closingRef.current) return;
      closingRef.current = true;
      const reduced = reducedMotion(),
        mobile = isPhone();
      const duration = reduced
        ? 0
        : options.fast
          ? 480
          : mobile
            ? PHONE_DURATION
            : OPEN_DURATION;
      closeDuration.current = duration;
      const target = mobile ? phoneView.current : column.current;
      target.inert = true;
      album.current.querySelector(".ed-album-controls").inert = true;
      const finish = () => {
        const callbacks = afterClose.current.splice(0);
        const hover = returnHover.current;
        flushSync(onClose);
        // Focus restoration must not turn a mouse-exited card back into a hover.
        if (hover) onHoverReturn?.(hover.keepColour ? hover.order : null);
        callbacks.forEach((callback) => callback());
      };
      const fold = () => {
        album.current.dataset.phase = "folding";
        const css = getComputedStyle(target);
        const start = {
          clipPath: css.clipPath,
          opacity: css.opacity,
          transform: css.transform,
        };
        Object.assign(target.style, start);
        motion.current?.cancel();
        if (!mobile) {
          flushSync(() => onJump(0));
          syncReturnHover(duration);
          animatePrints(target, true, duration);
        } else if (duration) {
          motion.current = target.animate(
            [{ opacity: start.opacity }, { opacity: 0 }],
            { duration, easing: EASE, fill: "both" },
          );
          motion.current.id = "ed-collection-fold";
          const controls = album.current.querySelector(".ed-album-controls"),
            opacity = getComputedStyle(controls).opacity;
          controlsMotion.current?.cancel();
          controlsMotion.current = controls.animate(
            [{ opacity }, { opacity: 0 }],
            { duration, easing: EASE, fill: "both" },
          );
          controlsMotion.current.id = "ed-collection-controls-fade";
        }
        setClosing(true);
        timer.current = setTimeout(finish, duration);
      };
      const top = mobile ? 0 : target.scrollTop;
      if (!mobile) {
        // Stop native momentum. This one short return runs before folding, so
        // later photographs never fly over the cover from a scrolled position.
        target.scrollTo({ top, behavior: "instant" });
        target.style.overflowY = "hidden";
      }
      if (!reduced && top > 1) {
        album.current.dataset.phase = "returning";
        const start = performance.now(),
          length = Math.min(900, 350 + Math.sqrt(top) * 9);
        const tick = (now) => {
          const progress = Math.min(1, (now - start) / length);
          const eased = progress * progress * (3 - 2 * progress);
          target.scrollTop = top * (1 - eased);
          if (progress < 1) returnFrame.current = requestAnimationFrame(tick);
          else {
            target.scrollTop = 0;
            fold();
          }
        };
        returnFrame.current = requestAnimationFrame(tick);
      } else {
        if (!mobile) target.scrollTop = 0;
        fold();
      }
    },
    [
      onClose,
      onJump,
      onHoverReturn,
      coverElement,
      origin,
      animatePrints,
      syncReturnHover,
    ],
  );

  useLayoutEffect(() => {
    if (closingRef.current || reducedMotion()) return;
    const target = phone ? phoneView.current : column.current;
    if (!phone) {
      animatePrints(target, false, OPEN_DURATION, true);
      animateCover(1, null, OPEN_DURATION, true);
    }
    const opening = phone
      ? target.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: PHONE_DURATION,
          easing: EASE,
          fill: "both",
        })
      : null;
    if (phone) {
      controlsMotion.current = album.current
        .querySelector(".ed-album-controls")
        .animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: PHONE_DURATION,
          easing: EASE,
          fill: "both",
        });
      controlsMotion.current.id = "ed-collection-controls-fade";
    }
    motion.current = opening;
    if (opening) {
      opening.id = "ed-collection-opening";
      opening.finished.then(
        () => {
          if (!closingRef.current && motion.current === opening)
            opening.cancel();
        },
        () => {},
      );
    }
    return () => {
      opening?.cancel();
      controlsMotion.current?.cancel();
      unfolds.current.forEach((animation) => animation.cancel());
      coverMotion.current.forEach((animation) => animation.cancel());
    };
  }, [phone, origin.top, origin.height, animatePrints, animateCover]);
  const jump = useCallback(
    (next, instant = false) => {
      if (closingRef.current) return;
      next = Math.max(0, Math.min(set.length - 1, next));
      indexRef.current = next;
      onJump(next);
      if (!isPhone()) {
        requestedIndex.current = next;
        column.current?.scrollTo({
          top: column.current.children[next]?.offsetTop || 0,
          behavior: instant || reducedMotion() ? "instant" : "smooth",
        });
      }
    },
    [set.length, onJump],
  );
  indexRef.current = index;
  jumpRef.current = jump;
  useEffect(() => {
    const media = matchMedia("(max-width:760px)");
    let frame = 0;
    const change = () => {
      setPhone(media.matches);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!media.matches) jumpRef.current(indexRef.current, true);
      });
    };
    media.addEventListener("change", change);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", change);
    };
  }, []);
  useEffect(() => {
    const move = (event) => {
      if (event.pointerType !== "touch") {
        lastPointer.current = { x: event.clientX, y: event.clientY };
        if (returnHover.current) syncReturnHover();
      }
    };
    const keys = (event) => {
      if (event.key === "Escape") lastPointer.current = null;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("keydown", keys, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("keydown", keys, true);
    };
  }, [syncReturnHover]);
  useEffect(() => {
    const root = album.current.closest(".ed-site");
    const closeForRoute = (event) => {
      event.detail.handled = true;
      requestClose({ fast: true, after: event.detail.complete });
    };
    root.addEventListener("ed:close-collection", closeForRoute);
    return () => root.removeEventListener("ed:close-collection", closeForRoute);
  }, [requestClose]);
  useEffect(() => {
    const previous =
        coverElement()?.closest("[data-collection-slug]") ||
        document.activeElement,
      overflow = document.body.style.overflow;
    const backgrounds = [
      document.querySelector("main"),
      phone ? document.querySelector(".fg-header") : null,
      document.querySelector(".fg-footer"),
    ].filter(Boolean);
    const states = backgrounds.map((el) => el.inert);
    backgrounds.forEach((el) => {
      el.inert = true;
    });
    document.body.style.overflow = "hidden";
    (phone
      ? phoneView.current?.querySelector("button[aria-current]")
      : column.current
    )?.focus({ preventScroll: true });
    const keys = (event) => {
      if (
        event.defaultPrevented ||
        album.current.inert ||
        album.current.querySelector(".fg-viewer")
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
      if (
        ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(
          event.key,
        ) &&
        document.activeElement?.closest(".ed-album")
      ) {
        event.preventDefault();
        jumpRef.current(
          indexRef.current +
            (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1),
        );
      }
      if (event.key === "Tab" && phone) {
        const controls = [
          ...album.current.querySelectorAll(
            "button:not([disabled]),[tabindex='0']",
          ),
        ].filter((el) => el.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("keydown", keys);
      document.body.style.overflow = overflow;
      backgrounds.forEach((el, i) => {
        el.inert = states[i];
      });
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [requestClose, phone, coverElement]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      motion.current?.cancel();
      controlsMotion.current?.cancel();
      unfolds.current.forEach((animation) => animation.cancel());
      coverMotion.current.forEach((animation) => animation.cancel());
      cancelAnimationFrame(returnFrame.current);
    },
    [],
  );
  useEffect(() => {
    if (phone) return;
    const el = column.current;
    const preference = matchMedia("(prefers-reduced-motion:reduce)");
    let frame = 0,
      positions = [],
      previousTop = el.scrollTop,
      previousTime = 0,
      lastInput = 0,
      stretch = 1,
      touched = [];
    const measure = () => {
      positions = [...el.children].map((node) => ({
        node,
        top: node.offsetTop,
        height: node.offsetHeight,
      }));
    };
    const reset = () => {
      touched.forEach((node) => node.style.removeProperty("--scroll-stretch"));
      touched = [];
      stretch = 1;
    };
    const update = (now) => {
      frame = 0;
      if (closingRef.current || zoomActive.current) {
        reset();
        previousTop = el.scrollTop;
        previousTime = 0;
        return;
      }
      const top = el.scrollTop,
        elapsed = previousTime ? Math.min(64, now - previousTime) : 16.7;
      const speed = Math.abs(top - previousTop) / Math.max(8, elapsed);
      const target =
        !preference.matches && now - lastInput < 100
          ? 1 + Math.min(0.065, speed * 0.009)
          : 1;
      stretch += (target - stretch) * (1 - Math.exp(-elapsed / 65));
      const visible = positions.filter(
        (item) =>
          item.top + item.height >= top && item.top <= top + el.clientHeight,
      );
      touched.forEach((node) => {
        if (!visible.some((item) => item.node === node))
          node.style.removeProperty("--scroll-stretch");
      });
      touched = visible.map((item) => item.node);
      touched.forEach((node) =>
        node.style.setProperty("--scroll-stretch", stretch.toFixed(4)),
      );
      if (
        requestedIndex.current !== null &&
        Math.abs(top - (positions[requestedIndex.current]?.top || 0)) < 3
      )
        requestedIndex.current = null;
      if (requestedIndex.current === null && positions.length) {
        const nearest = positions.reduce(
          (best, item, i) =>
            Math.abs(item.top - top) < Math.abs(positions[best].top - top)
              ? i
              : best,
          0,
        );
        if (nearest !== indexRef.current) {
          indexRef.current = nearest;
          onJump(nearest);
        }
      }
      previousTop = top;
      previousTime = now;
      if (Math.abs(stretch - 1) > 0.0003 || now - lastInput < 100)
        frame = requestAnimationFrame(update);
      else {
        reset();
        previousTime = 0;
      }
    };
    const scroll = () => {
      lastInput = performance.now();
      if (!frame) frame = requestAnimationFrame(update);
    };
    const interrupt = () => {
      requestedIndex.current = null;
    };
    const keys = (event) => {
      if (["PageUp", "PageDown", "Home", "End", " "].includes(event.key))
        interrupt();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    [...el.children].forEach((node) => resize.observe(node));
    el.addEventListener("scroll", scroll, { passive: true });
    el.addEventListener("wheel", interrupt, { passive: true });
    el.addEventListener("pointerdown", interrupt, { passive: true });
    el.addEventListener("keydown", keys);
    el.addEventListener("scrollend", interrupt);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      reset();
      el.removeEventListener("scroll", scroll);
      el.removeEventListener("wheel", interrupt);
      el.removeEventListener("pointerdown", interrupt);
      el.removeEventListener("keydown", keys);
      el.removeEventListener("scrollend", interrupt);
    };
  }, [set, onJump, phone]);

  const start = Math.max(0, Math.min(set.length - 5, index - 2)),
    photo = set[index];
  const zoomIndex = zoom
    ? Math.max(
        0,
        set.findIndex((item) => item.src === zoom.src),
      )
    : 0;
  const changeZoom = (next) => {
    next = (next + set.length) % set.length;
    setZoom((value) => ({ ...value, src: set[next].src }));
    jump(next, true);
  };
  return (
    <div
      ref={album}
      className={"ed-album" + (closing ? " is-closing" : "")}
      role="dialog"
      aria-modal={phone ? "true" : undefined}
      aria-label={title + " photographs"}
      style={{
        "--column-left": origin.left + "px",
        "--column-top": origin.top + "px",
        "--column-width": origin.width + "px",
      }}
    >
      {!phone && (
        <button
          type="button"
          className="ed-album-dismiss"
          aria-label="Close collection"
          onClick={requestClose}
        />
      )}
      <CollectionHeading
        title={title}
        count={loading ? (count ?? set.length) : set.length}
        phone={phone}
        closing={closing}
        duration={
          closing
            ? closeDuration.current
            : phone
              ? PHONE_DURATION
              : OPEN_DURATION
        }
      />
      <span className="ed-sr-only" role="status" aria-live="polite">
        Photograph {index + 1} of {set.length}: {photo.name}
      </span>
      <div
        className="ed-album-column"
        ref={column}
        tabIndex={-1}
        aria-hidden={phone ? "true" : undefined}
        aria-label={title + " photographs; scroll vertically to browse"}
      >
        {!phone &&
          set.map((item, i) => (
            <AlbumPrint
              key={item.src}
              item={item}
              order={i}
              coverSlug={i === 0 ? slug : undefined}
              current={i === index}
              eager={!phone && i < UNFOLD_COUNT}
              onOpen={openZoom}
            />
          ))}
      </div>
      {phone && (
        <div className="ed-album-phone" ref={phoneView}>
          <div
            className="ed-album-thumbnails"
            aria-label="Photographs in this collection"
          >
            {set.slice(start, start + 5).map((item, i) => (
              <button
                key={item.src}
                type="button"
                aria-current={start + i === index ? "true" : undefined}
                aria-label={
                  "Show photograph " + (start + i + 1) + ": " + item.name
                }
                onClick={() => jump(start + i)}
              >
                <Photograph photo={item} sizes="80px" />
              </button>
            ))}
          </div>
          <div
            className="ed-album-phone-image"
            onTouchStart={(event) => {
              touch.current = event.touches[0]
                ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
                : null;
            }}
            onTouchEnd={(event) => {
              if (!touch.current) return;
              const dx = event.changedTouches[0].clientX - touch.current.x,
                dy = event.changedTouches[0].clientY - touch.current.y;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                jump(indexRef.current + (dx < 0 ? 1 : -1));
              }
              touch.current = null;
            }}
            onTouchCancel={() => {
              touch.current = null;
            }}
          >
            <PhonePhotograph
              photo={photo}
              index={index}
              count={loading ? (count ?? set.length) : set.length}
            />
          </div>
        </div>
      )}
      <div className="ed-album-controls">
        <button
          type="button"
          onClick={() => jump(indexRef.current - 1)}
          disabled={index === 0}
          aria-label="Previous photograph"
        >
          <Icon name="arrow-left" />
        </button>
        {phone && (
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close collection"
          >
            <Icon name="close" />
          </button>
        )}
        <button
          type="button"
          onClick={() => jump(indexRef.current + 1)}
          disabled={index === set.length - 1}
          aria-label="Next photograph"
        >
          <Icon name="arrow-right" />
        </button>
      </div>
      {zoom && (
        <GalleryZoom
          set={set}
          index={zoomIndex}
          origin={zoom.origin}
          onChange={(delta) => changeZoom(zoomIndex + delta)}
          onJump={changeZoom}
          onClose={closeZoom}
          returnTarget={() =>
            phone
              ? phoneView.current?.querySelector(".ed-album-phone-frame")
              : column.current?.children[zoomIndex]?.querySelector("button")
          }
        />
      )}
    </div>
  );
}
