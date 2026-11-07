import { memo, useEffect, useRef, useState } from "react";
import { series } from "../../data/editorial.js";
import { Photograph, Icon, COVER_SIZES } from "./Primitives.jsx";
import { preloadCollection } from "./usePhotoViewer.js";

function Gallery({ openCollection, activeSlug, hovered, setHovered }) {
  const rail = useRef(null),
    drag = useRef(null),
    updateFrame = useRef(0),
    prefetchTimer = useRef(0);
  const cancelPrefetch = () => clearTimeout(prefetchTimer.current);
  useEffect(
    () => () => {
      cancelAnimationFrame(updateFrame.current);
      cancelPrefetch();
    },
    [],
  );
  const [position, setPosition] = useState({ index: 0, end: false });
  const update = () => {
    updateFrame.current = 0;
    const el = rail.current;
    const center = el.scrollLeft + el.clientWidth / 2;
    const phone = matchMedia("(max-width:760px)").matches;
    const target = phone ? center : el.scrollLeft;
    const cards = [...el.children];
    const distance = (card) =>
      Math.abs(card.offsetLeft + (phone ? card.offsetWidth / 2 : 0) - target);
    const index = cards.reduce(
      (best, card, i) => (distance(card) < distance(cards[best]) ? i : best),
      0,
    );
    const end = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    setPosition((old) =>
      old.index === index && old.end === end ? old : { index, end },
    );
  };
  const slide = (direction) => {
    const el = rail.current;
    const phone = matchMedia("(max-width:760px)").matches;
    const targets = [...el.children].map(
      (card) =>
        card.offsetLeft - (phone ? (el.clientWidth - card.offsetWidth) / 2 : 0),
    );
    const next =
      direction > 0
        ? targets.find((x) => x > el.scrollLeft + 4)
        : targets.findLast((x) => x < el.scrollLeft - 4);
    el.scrollTo({
      left: next ?? (direction > 0 ? el.scrollWidth : 0),
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const up = () => {
    rail.current.classList.remove("is-dragging");
    if (drag.current) drag.current.down = false;
  };
  return (
    <section
      className={"ed-gallery-stage" + (activeSlug ? " is-collection-open" : "")}
      aria-labelledby="gallery-title"
    >
      <div
        className="ed-collection-rail"
        ref={rail}
        tabIndex={0}
        aria-label="Photography collections. Drag, swipe, or use the arrow controls."
        onScroll={() => {
          cancelPrefetch();
          if (!updateFrame.current)
            updateFrame.current = requestAnimationFrame(update);
        }}
        onPointerDown={(event) => {
          cancelPrefetch();
          if (event.pointerType === "touch") {
            drag.current = null;
            setHovered(null);
          }
          if (event.pointerType !== "touch" && event.button === 0)
            drag.current = {
              x: event.clientX,
              scroll: rail.current.scrollLeft,
              down: true,
              moved: false,
            };
        }}
        onPointerMove={(event) => {
          if (!drag.current?.down) return;
          const delta = event.clientX - drag.current.x;
          if (Math.abs(delta) > 7) {
            if (!drag.current.moved) setHovered(null);
            drag.current.moved = true;
            rail.current.setPointerCapture(event.pointerId);
            rail.current.classList.add("is-dragging");
            rail.current.scrollLeft = drag.current.scroll - delta;
          }
        }}
        onPointerUp={up}
        onLostPointerCapture={up}
        onPointerCancel={() => {
          up();
          drag.current = null;
        }}
        onClickCapture={(event) => {
          if (drag.current?.moved) {
            event.preventDefault();
            event.stopPropagation();
            drag.current = null;
          }
        }}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            ["ArrowLeft", "ArrowRight"].includes(event.key)
          ) {
            event.preventDefault();
            slide(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {series.map((item, index) => (
          <button
            type="button"
            key={item.slug}
            className={
              "ed-collection-card" +
              (activeSlug === item.slug ? " is-active" : "") +
              (hovered === index ? " is-previewed" : "")
            }
            style={{ "--collection-order": index }}
            data-collection-index={index}
            data-collection-slug={item.slug}
            onClick={(event) => {
              const { left, top, width, height } = event.currentTarget
                .querySelector(".ed-image-window")
                .getBoundingClientRect();
              event.currentTarget
                .closest(".ed-site")
                .classList.add("has-entered");
              openCollection(item, {
                gallery: true,
                origin: { left, top, width, height },
                pointer: event.detail
                  ? { x: event.clientX, y: event.clientY }
                  : null,
              });
            }}
            onMouseEnter={() => {
              cancelPrefetch();
              if (
                !drag.current?.down &&
                matchMedia("(hover:hover) and (pointer:fine)").matches
              ) {
                setHovered(index);
                prefetchTimer.current = setTimeout(() => {
                  void preloadCollection(item.slug).catch(() => {});
                }, 180);
              }
            }}
            onMouseLeave={() => {
              cancelPrefetch();
              setHovered(null);
            }}
            onFocus={(event) => {
              if (event.currentTarget.matches(":focus-visible"))
                setHovered(index);
              void preloadCollection(item.slug).catch(() => {});
            }}
            aria-label={
              "Open " + item.title + ", " + item.count + " photographs"
            }
            onBlur={() => setHovered(null)}
          >
            <div className="ed-collection-media">
              <div className="ed-image-window">
                <Photograph
                  photo={item.cover}
                  coverSlug={item.slug + "-mono"}
                  eager
                  sizes={COVER_SIZES}
                />
                <span className="ed-cover-colour" aria-hidden="true">
                  <Photograph
                    photo={{ ...item.cover, alt: "" }}
                    coverSlug={item.slug}
                    eager
                    sizes={COVER_SIZES}
                  />
                </span>
                <span className="ed-collection-plus" aria-hidden="true">
                  +
                </span>
              </div>
            </div>
            <div className="ed-collection-caption">
              <h2>
                <span>{item.title}</span>
              </h2>
              <span>{item.count} images</span>
            </div>
          </button>
        ))}
      </div>
      <div className="ed-rail-controls">
        <span aria-live="polite">
          {String(position.index + 1).padStart(2, "0")} / 07
        </span>
        <div className="tw:flex tw:items-center">
          <button
            type="button"
            disabled={position.index === 0}
            onClick={() => slide(-1)}
            aria-label="Previous collection"
          >
            <Icon name="arrow-left" />
          </button>
          <button
            type="button"
            disabled={position.end}
            onClick={() => slide(1)}
            aria-label="Next collection"
          >
            <Icon name="arrow-right" />
          </button>
        </div>
      </div>
      <div className="ed-gallery-heading">
        <span className="ed-gallery-count" aria-label="7 collections">
          07
        </span>
        <h1 id="gallery-title" className="ed-page-title">
          <span>Portfolio</span>
        </h1>
      </div>
    </section>
  );
}

// Browsing the opened strip does not change any background cover.
export default memo(Gallery);
