import { photographs } from "../../data/editorial.js";
import { Photograph } from "./Primitives.jsx";

export default function HomeSocial() {
  return (
    <section
      className="ed-journal-social ed-journal-section"
      aria-labelledby="home-instagram-title"
    >
      <div className="ed-journal-section-head" data-ed-reveal>
        <h2 className="ed-journal-heading" id="home-instagram-title">
          Recent photographs
        </h2>
      </div>
      <div className="ed-journal-social-prints tw:grid" data-ed-reveal>
        {[4, 0, 2, 3].map((index) => (
          <a
            key={index}
            href="https://www.instagram.com/abhi.jxl/"
            className="ed-journal-social-print ed-journal-photo-link ed-journal-media"
            aria-label={
              "See more photographs on Instagram: " + photographs[index].name
            }
          >
            <Photograph
              photo={photographs[index]}
              sizes="(max-width:600px) 42vw, 21vw"
            />
          </a>
        ))}
      </div>
      <div className="ed-journal-social-copy" data-ed-reveal>
        <p>I share new photographs on Instagram.</p>
        <a
          className="ed-journal-social-link"
          href="https://www.instagram.com/abhi.jxl/"
        >
          Instagram
        </a>
      </div>
    </section>
  );
}
