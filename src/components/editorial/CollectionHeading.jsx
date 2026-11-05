import { useLayoutEffect, useRef } from "react";

const formatCount = (value) => String(value).padStart(2, "0");
const TYPE_EASE = "cubic-bezier(.3,0,.2,1)";
function galleryTitleStyle() {
  const source = document.querySelector(
    ".ed-gallery-heading .ed-page-title > span",
  );
  if (!source) return null;
  const rect = source.getBoundingClientRect(),
    css = getComputedStyle(source);
  return {
    left: rect.left + "px",
    top: rect.top + "px",
    width: rect.width + "px",
    height: rect.height + "px",
    // Numeric font variants make Chromium's computed font shorthand empty.
    // Copy the longhands so the returning title cannot inherit body-sized type.
    fontFamily: css.fontFamily,
    fontSize: css.fontSize,
    fontWeight: css.fontWeight,
    fontStyle: css.fontStyle,
    fontStretch: css.fontStretch,
    fontVariantNumeric: css.fontVariantNumeric,
    lineHeight: css.lineHeight,
    letterSpacing: css.letterSpacing,
    textTransform: css.textTransform,
  };
}

// One label owner for both directions. Only these two digits change on the
// main thread; the title masks and movement stay on the native animation clock.
export default function CollectionHeading({
  title,
  count,
  phone,
  closing,
  duration,
}) {
  const digitStyle = { "--count-length": formatCount(count).length };
  const galleryTitle = useRef(null),
    collectionTitle = useRef(null),
    phoneTitle = useRef(null),
    galleryMask = useRef(null),
    counter = useRef(null),
    digits = useRef(null);
  const animations = useRef([]),
    started = useRef(false),
    lastPhone = useRef(phone),
    displayedCount = useRef("07");

  useLayoutEffect(() => {
    const first = !started.current || lastPhone.current !== phone;
    if (phone) {
      const node = phoneTitle.current,
        css = getComputedStyle(node);
      const start = first
        ? { opacity: 0, transform: "translateY(-112%)" }
        : { opacity: css.opacity, transform: css.transform };
      const end = closing
        ? { opacity: 0, transform: "translateY(-112%)" }
        : { opacity: 1, transform: "none" };
      Object.assign(node.style, start);
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
      if (matchMedia("(prefers-reduced-motion:reduce)").matches || !duration)
        Object.assign(node.style, end);
      else {
        const animation = node.animate([start, end], {
          duration,
          easing: TYPE_EASE,
          fill: "both",
        });
        animation.id = closing
          ? "ed-collection-title-out"
          : "ed-collection-title-in";
        animations.current.push(animation);
      }
      started.current = true;
      lastPhone.current = phone;
      return;
    }
    const placement = !phone ? galleryTitleStyle() : null;
    const outgoing = closing ? collectionTitle.current : galleryTitle.current,
      incoming = closing ? galleryTitle.current : collectionTitle.current;
    const distance = 30;
    const nodes = [outgoing, incoming];
    // Read the painted pose before cancelling an unfinished entrance.
    const poses = nodes.map((node, i) => {
      if (first)
        return {
          opacity: i ? "0" : "1",
          transform: i ? `translateY(${distance}px)` : "none",
        };
      const css = getComputedStyle(node);
      return { opacity: css.opacity, transform: css.transform };
    });
    let countPose;
    if (!phone) {
      const source = document.querySelector(".ed-gallery-count"),
        node = counter.current,
        transform = getComputedStyle(node).transform,
        offset = new DOMMatrixReadOnly(transform).f,
        delta =
          source.getBoundingClientRect().top -
          node.getBoundingClientRect().top +
          offset;
      countPose = {
        from: first ? `translateY(${delta}px)` : transform,
        to: closing ? `translateY(${delta}px)` : "none",
      };
    }
    if (placement) Object.assign(galleryMask.current.style, placement);
    if (countPose) counter.current.style.transform = countPose.from;
    nodes.forEach((node, i) => Object.assign(node.style, poses[i]));
    animations.current.forEach((animation) => animation.cancel());
    animations.current = [];
    const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
    nodes.forEach((node, i) => {
      const end = {
        opacity: i ? "1" : "0",
        transform: i ? "none" : `translateY(${distance}px)`,
      };
      if (reduced || !duration) {
        Object.assign(node.style, end);
        return;
      }
      const delay = i && Number(poses[i].opacity) < 0.001 ? duration * 0.25 : 0;
      const animation = node.animate([poses[i], end], {
        duration: i ? duration - delay : duration * 0.48,
        delay,
        easing: TYPE_EASE,
        fill: "both",
      });
      animation.id = i ? "ed-collection-title-in" : "ed-collection-title-out";
      animations.current.push(animation);
    });
    if (countPose) {
      if (reduced || !duration) counter.current.style.transform = countPose.to;
      else {
        const animation = counter.current.animate(
          [{ transform: countPose.from }, { transform: countPose.to }],
          { duration, easing: TYPE_EASE, fill: "both" },
        );
        animation.id = "ed-collection-count-position";
        animations.current.push(animation);
      }
    }
    started.current = true;
    lastPhone.current = phone;
  }, [closing, duration, phone]);

  useLayoutEffect(() => {
    if (phone) return;
    const resize = () => {
      const placement = galleryTitleStyle();
      if (placement) Object.assign(galleryMask.current.style, placement);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [phone]);

  useLayoutEffect(() => {
    if (phone) return;
    const target = formatCount(closing ? 7 : count);
    const write = (value) => {
      displayedCount.current = value;
      digits.current.textContent = value;
    };
    const reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;
    if (reduced || !duration || displayedCount.current === target) {
      write(target);
      return;
    }
    write(displayedCount.current);
    let frame = 0,
      lastStep = 0,
      seed = Number(target) * 17 + Number(displayedCount.current) + 1;
    const start = performance.now() + duration * 0.15,
      length = Math.max(displayedCount.current.length, target.length),
      ceiling = 10 ** length;
    const tick = (now) => {
      // Settle one frame before the fold releases the real Gallery labels.
      const progress = Math.max(
        0,
        Math.min(1, (now - start) / (duration * 0.77)),
      );
      if (progress === 1) {
        write(target);
        return;
      }
      const step = Math.floor((1 - (1 - progress) ** 1.6) * 7);
      if (step > lastStep) {
        lastStep = step;
        seed = (seed * 9301 + 49297) % 233280;
        let next = String(Math.floor((seed / 233280) * ceiling)).padStart(
          length,
          "0",
        );
        while (next === target || next === displayedCount.current)
          next = String((Number(next) + 13) % ceiling).padStart(length, "0");
        write(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [closing, count, duration, phone]);

  useLayoutEffect(
    () => () => animations.current.forEach((animation) => animation.cancel()),
    [],
  );

  return (
    <>
      <div className="ed-album-top">
        <h2 className="ed-album-title-slot">
          <span ref={phoneTitle} className="ed-album-title-current">
            {title}
          </span>
        </h2>
      </div>
      <div className="ed-album-heading">
        <span ref={counter} aria-hidden="true">
          <span
            ref={digits}
            className="ed-count-digits"
            style={digitStyle}
            aria-hidden="true"
          >
            {formatCount(count)}
          </span>
        </span>
        <h2 className="ed-album-title-slot">
          <span ref={collectionTitle} className="ed-album-title-current">
            {title}
          </span>
        </h2>
      </div>
      <div
        ref={galleryMask}
        className="ed-album-return-heading"
        aria-hidden="true"
      >
        <span ref={galleryTitle}>Gallery</span>
      </div>
    </>
  );
}
