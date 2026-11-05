import { useCallback, useEffect, useRef, useState } from "react";
import { homePortraits } from "../../data/editorial.js";
import { Photograph } from "./Primitives.jsx";

const PORTRAIT_INTERVAL_MS = 9000;
const PORTRAIT_FADE_MS = 1600;

export default function HomePortraits() {
  const frame = useRef(null);
  const remaining = useRef([]);
  const [{ active, previous }, setSlide] = useState({
    active: 0,
    previous: null,
  });
  const [visible, setVisible] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [phone, setPhone] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const viewport = matchMedia("(max-width:700px)");
    const sync = () => {
      setPhone(viewport.matches);
      setMotionAllowed(
        viewport.matches && !preference.matches && !document.hidden,
      );
    };
    sync();
    preference.addEventListener("change", sync);
    viewport.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const observer = new IntersectionObserver(
      ([entry]) => {
        const showing = entry.intersectionRatio >= 0.15;
        setVisible(showing);
        if (showing) setPrepared(true);
      },
      { threshold: 0.15 },
    );
    observer.observe(frame.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
      viewport.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!visible || !motionAllowed) return;
    let cancelled = false;
    let decoding = false;
    const timer = setInterval(async () => {
      if (decoding) return;
      if (!remaining.current.length) {
        const nextPortraits = homePortraits
          .map((_, index) => index)
          .filter((index) => index !== active);
        for (let index = nextPortraits.length - 1; index > 0; index--) {
          const other = Math.floor(Math.random() * (index + 1));
          [nextPortraits[index], nextPortraits[other]] = [
            nextPortraits[other],
            nextPortraits[index],
          ];
        }
        remaining.current = nextPortraits;
      }
      const next = remaining.current.at(-1);
      const image = frame.current?.querySelector(
        `[data-portrait-index="${next}"] img`,
      );
      if (!image?.complete || !image.naturalWidth) return;
      decoding = true;
      try {
        await image.decode();
        if (!cancelled) {
          remaining.current.pop();
          setSlide({ active: next, previous: active });
        }
      } catch {
        return;
      } finally {
        decoding = false;
      }
    }, PORTRAIT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, visible, motionAllowed]);

  const finishFade = useCallback((index) => {
    setSlide((slide) =>
      slide.active === index && slide.previous !== null
        ? { active: index, previous: null }
        : slide,
    );
  }, []);

  useEffect(() => {
    if (previous === null) return;
    const timer = setTimeout(() => finishFade(active), PORTRAIT_FADE_MS + 100);
    return () => clearTimeout(timer);
  }, [active, previous, finishFade]);

  return (
    <figure
      ref={frame}
      className="ed-home-portraits ed-journal-portrait ed-journal-media"
      style={{ "--portrait-fade-duration": `${PORTRAIT_FADE_MS}ms` }}
      data-ed-reveal
    >
      {phone ? (
        homePortraits.map((photo, index) => (
          <div
            key={photo.src}
            data-portrait-index={index}
            className={
              "ed-home-portrait-slide" +
              (active === index
                ? " is-active"
                : previous === index
                  ? " is-previous"
                  : "")
            }
            aria-hidden={active !== index}
            onTransitionEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.propertyName === "opacity"
              )
                finishFade(index);
            }}
          >
            {(index === active ||
              index === previous ||
              (prepared && motionAllowed)) && (
              <Photograph
                photo={photo}
                eager={visible}
                sizes="(max-width:400px) calc(100vw - 40px), 360px"
              />
            )}
          </div>
        ))
      ) : (
        <picture>
          <source
            media="(max-width:700px)"
            srcSet={`${homePortraits[0].preview}-320.webp 320w, ${homePortraits[0].preview}-640.webp 640w, ${homePortraits[0].preview}-1280.webp 1280w`}
            sizes="(max-width:400px) calc(100vw - 40px), 360px"
          />
          <Photograph
            photo={homePortraits[1]}
            sizes="(max-width:700px) calc(100vw - 40px), (max-width:1300px) 44vw, 410px"
          />
        </picture>
      )}
    </figure>
  );
}
