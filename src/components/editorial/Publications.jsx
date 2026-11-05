import { useRef } from "react";
import { series } from "../../data/editorial.js";
import { Photograph } from "./Primitives.jsx";
import { usePublicationScroll } from "./useHomeScroll.js";

export default function Publications({ show, intent }) {
  const rootRef = useRef(null);
  usePublicationScroll(rootRef);

  return (
    <section
      ref={rootRef}
      className="ed-publications"
      id="publications"
      aria-labelledby="publications-title"
    >
      <div className="ed-publications-chapter">
        <div className="ed-publications-sticky">
          <h2 className="ed-sr-only" id="publications-title">
            PUBLICATIONS
          </h2>
          <div className="ed-publications-marquee" aria-hidden="true">
            <div className="ed-publications-type">
              <span>{Array(8).fill("PUBLICATIONS").join("\u00a0\u00a0 ")}</span>
            </div>
          </div>
          <div className="ed-publications-window">
            <div className="ed-publications-track">
              {series.map((collection, index) => (
                <button
                  key={collection.slug}
                  type="button"
                  className="ed-publication"
                  data-publication-index={index}
                  onClick={() => show(collection.slug)}
                  {...intent(collection.slug)}
                  aria-label={"View " + collection.title + " photographs"}
                >
                  <span className="ed-publication-picture">
                    <span className="ed-publication-warp">
                      <span className="ed-publication-image">
                        <Photograph
                          photo={collection.cover}
                          coverSlug={collection.slug}
                          sizes="(max-width:760px) 76vw, 31vw"
                        />
                        <img
                          className="ed-publication-blur"
                          src={`/_concept/covers/${collection.slug}-motion.webp`}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      </span>
                    </span>
                  </span>
                  <span className="ed-publication-caption">
                    <span>{collection.title}</span>
                    <span>{collection.count} photographs</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
