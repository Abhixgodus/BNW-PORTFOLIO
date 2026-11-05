import { useCallback, useEffect, useRef, useState } from "react";
import photographs from "../../data/home-hero.json";

const HOLD_MS = 10000;
const FADE_MS = 3000;
const topics = [
  "Places",
  "People",
  "Cultures",
  "Moments",
  "Landscapes",
  "Animals",
];

function HeroPhotograph({ index, priority }) {
  const photograph = photographs[index];
  const base = `/_concept/hero/${photograph.slug}`;
  return (
    <picture key={photograph.slug}>
      <source
        media="(max-width: 760px) and (orientation: portrait)"
        srcSet={`${base}-phone-640.webp 640w, ${base}-phone-960.webp 960w`}
        sizes="100vw"
      />
      <img
        src={`${base}-desktop-1920.webp`}
        srcSet={`${base}-desktop-1280.webp 1280w, ${base}-desktop-1920.webp 1920w, ${base}-desktop-2560.webp 2560w`}
        sizes="100vw"
        width="1920"
        height="1200"
        alt={photograph.alt}
        fetchPriority={priority ? "high" : "low"}
        decoding="async"
        draggable="false"
      />
    </picture>
  );
}

export default function HomeHero() {
  const hero = useRef(null);
  const playlist = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [scene, setScene] = useState({
    slides: [0, null],
    base: 0,
    revealing: false,
  });

  useEffect(() => {
    const element = hero.current;
    const site = element.closest(".ed-site");
    const main = element.closest("main");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let height = element.offsetHeight;
    let wasPlaying, wasSolid;
    const sync = () => {
      const visible = scrollY < height && !main.inert;
      const nextPlaying = visible && !document.hidden && !reduced.matches;
      const solid = scrollY >= height;
      if (nextPlaying !== wasPlaying) {
        wasPlaying = nextPlaying;
        setPlaying(nextPlaying);
      }
      if (solid !== wasSolid) {
        wasSolid = solid;
        site.classList.toggle("is-past-home-hero", solid);
      }
    };
    const measure = () => {
      height = element.offsetHeight;
      sync();
    };
    const observer = new ResizeObserver(measure);
    const visibility = new MutationObserver(sync);
    observer.observe(element);
    visibility.observe(main, { attributes: true, attributeFilter: ["inert"] });
    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener("scroll", sync);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      site.classList.remove("is-past-home-hero");
    };
  }, []);

  const finishFade = useCallback(() => {
    setScene((current) => {
      if (!current.revealing) return current;
      const slides = [...current.slides];
      slides[current.base] = null;
      return { slides, base: 1 - current.base, revealing: false };
    });
  }, []);

  useEffect(() => {
    if (!playing || scene.revealing) return;
    const nextSlot = 1 - scene.base;
    if (scene.slides[nextSlot] === null) {
      if (!playlist.current) {
        const remaining = photographs.map((_, index) => index).slice(1);
        for (let index = remaining.length - 1; index > 0; index--) {
          const other = Math.floor(Math.random() * (index + 1));
          [remaining[index], remaining[other]] = [
            remaining[other],
            remaining[index],
          ];
        }
        playlist.current = [0, ...remaining];
      }
      setScene((current) => {
        const slides = [...current.slides];
        const position = playlist.current.indexOf(slides[current.base]);
        slides[nextSlot] =
          playlist.current[(position + 1) % photographs.length];
        return { ...current, slides };
      });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const image = hero.current?.querySelector(
        `[data-hero-slot="${nextSlot}"] img`,
      );
      if (!image) return;
      try {
        await image.decode();
        if (!cancelled)
          setScene((current) => ({ ...current, revealing: true }));
      } catch {
        if (!cancelled)
          setScene((current) => {
            const slides = [...current.slides];
            const candidate = (slides[nextSlot] + 1) % photographs.length;
            slides[nextSlot] =
              candidate === slides[current.base]
                ? (candidate + 1) % photographs.length
                : candidate;
            return { ...current, slides };
          });
      }
    }, HOLD_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playing, scene]);

  useEffect(() => {
    if (!scene.revealing) return;
    if (!playing) {
      finishFade();
      return;
    }
    const timer = setTimeout(finishFade, FADE_MS + 80);
    return () => clearTimeout(timer);
  }, [scene.revealing, playing, finishFade]);

  return (
    <section
      ref={hero}
      id="home"
      className={"ed-story-hero" + (playing ? " is-playing" : "")}
      data-ed-photo-motion="home"
      aria-labelledby="ed-hero-title"
      style={{ "--hero-photo-fade": `${FADE_MS}ms` }}
    >
      <div
        className="ed-story-photographs"
        data-ed-photo-layer
        data-ed-photo-target
        aria-hidden="true"
      >
        {scene.slides.map((index, slot) => (
          <div
            key={slot}
            data-hero-slot={slot}
            className={
              "ed-story-photo" +
              (slot === scene.base ? " is-base" : " is-next") +
              (slot !== scene.base && scene.revealing ? " is-revealing" : "")
            }
            onTransitionEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.propertyName === "opacity"
              )
                finishFade();
            }}
          >
            {index !== null && (
              <HeroPhotograph
                index={index}
                priority={index === 0 && slot === 0}
              />
            )}
          </div>
        ))}
      </div>
      <div className="ed-story-shade" aria-hidden="true" />
      <h1
        id="ed-hero-title"
        className="ed-story-heading"
        aria-label="Landscape and street moments from ordinary lives"
      >
        <span className="ed-story-kicker">Landscape and street</span>
        <span className="ed-story-heading-line">
          <span>Moments</span>
          <span className="ed-story-script">from</span>
        </span>
        <span className="ed-story-heading-line">
          <span className="ed-story-script ed-story-script-ordinary">
            ordinary
          </span>
          <span className="ed-story-lives">Lives</span>
        </span>
      </h1>
      <div className="ed-story-marquee">
        <div className="ed-story-marquee-track">
          {[0, 1, 2, 3].map((repeat) => (
            <span
              className="ed-story-topics"
              key={repeat}
              aria-hidden={repeat > 0 ? true : undefined}
            >
              {topics.map((topic) => (
                <span className="ed-story-topic" key={topic}>
                  <span>{topic}</span>
                  <span className="ed-story-dot" aria-hidden="true">
                    ·
                  </span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
