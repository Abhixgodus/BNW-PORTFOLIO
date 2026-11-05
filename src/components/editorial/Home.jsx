import { useEffect, useRef } from "react";
import { series } from "../../data/editorial.js";
import { Photograph, COVER_SIZES } from "./Primitives.jsx";
import { preloadCollection } from "./usePhotoViewer.js";
import HomeJournal from "./HomeJournal.jsx";
function usePublicationPrefetch() {
  const intent = useRef({ slug: null, timer: 0 });
  const cancel = () => {
    clearTimeout(intent.current.timer);
    intent.current.slug = null;
  };
  const queue = (slug) => {
    cancel();
    intent.current.slug = slug;
    intent.current.timer = setTimeout(() => {
      void preloadCollection(slug).catch(() => {});
      intent.current.slug = null;
    }, 180);
  };
  useEffect(() => {
    // Moving pictures pass underneath a stationary pointer. That is not an
    // intention to open every album, so wait for scrolling to settle first.
    const defer = () => {
      if (intent.current.slug) queue(intent.current.slug);
    };
    window.addEventListener("scroll", defer, { passive: true });
    return () => {
      cancel();
      window.removeEventListener("scroll", defer);
    };
  }, []);
  return { queue, cancel };
}

export default function Home({ openCollection }) {
  const prefetch = usePublicationPrefetch();
  return (
    <>
      <section id="home" className="ed-hero" aria-labelledby="ed-hero-title">
        <div className="ed-hero-photographs" aria-hidden="true">
          {[...series].reverse().map((item, reverseIndex) => {
            const index = series.length - 1 - reverseIndex;
            const x = index === 0 ? 0 : index === 1 ? 22 : 42 + (index - 2) * 5;
            const y =
              index === 0 ? 0 : index === 1 ? -17 : -28 - (index - 2) * 5;
            const angle =
              index === 0 ? 0 : index === 1 ? 8 : 14 + (index - 2) * 2;
            return (
              <div
                key={item.slug}
                className="ed-hero-print"
                data-hero-print={index}
                style={{
                  "--print-x": x + "px",
                  "--print-y": y + "px",
                  "--print-angle": angle + "deg",
                }}
              >
                <Photograph
                  photo={item.cover}
                  coverSlug={item.slug + "-mono"}
                  eager
                  priority={index === 0}
                  entrance
                  sizes={COVER_SIZES}
                />
              </div>
            );
          })}
        </div>
        <div className="ed-hero-heading">
          <h1
            id="ed-hero-title"
            className="ed-hero-title"
            aria-label="Myself, Abhimanyu Sharma"
          >
            <span className="ed-hero-greeting-line">
              <span>Myself</span>
            </span>
            <span className="ed-hero-name-line">
              <span>Abhimanyu</span>
            </span>
            <span className="ed-hero-script-line">
              <span className="ed-hero-script">Sharma</span>
            </span>
          </h1>
          <div className="ed-hero-bottom">
            <span className="ed-hero-role">MY PHOTOGRAPHIC JOURNAL</span>
          </div>
        </div>
      </section>
      <HomeJournal openCollection={openCollection} prefetch={prefetch} />
    </>
  );
}
