import {
  editorialLabels,
  editorialLinks,
  email,
  homeCameraPortrait,
  photographs,
  series,
} from "../../data/editorial.js";
import { Photograph } from "./Primitives.jsx";
import Publications from "./Publications.jsx";
import { useEffect, useRef, useState } from "react";
import HomePortraits from "./HomePortraits.jsx";
import HandwrittenSignature from "./HandwrittenSignature.jsx";

const journal = [
  {
    slug: "kumartuli",
    postSlug: "another-day-in-kolkata",
    place: "Kolkata",
    title: "INSIDE THE WORKSHOPS",
    photo: photographs[1],
    description:
      "Clay figures, crowded rooms and the people who bring them to life.",
  },
  {
    slug: "sikkim",
    postSlug: "a-few-days-in-the-hills",
    place: "Sikkim",
    title: "BEHIND THE CLOUDS",
    photo: photographs[14],
    description: "Mountains in the mist, and the changing light between them.",
  },
  {
    slug: "delhi",
    postSlug: "a-walk-through-delhi",
    place: "Delhi",
    title: "THROUGH THE TREES",
    photo: {
      src: "/gallery/DELHI/QUTUBMINAR BNW-1.JPG",
      preview: "/_concept/features/qutub-minar",
      alt: "Qutub Minar framed by dark tree branches in black and white.",
      width: 3000,
      height: 2000,
    },
    description:
      "Qutub Minar framed by dark branches, its carved stone rising into the sky.",
  },
];
const waysOfSeeing = [
  {
    title: "On the street",
    photo: photographs[6],
    description:
      "People, gestures and small scenes I notice while walking around Kolkata.",
  },
  {
    title: "Out of the city",
    photo: photographs[15],
    description:
      "Rivers, mountain valleys and the places I get to see when I travel.",
  },
  {
    title: "In black and white",
    photo: photographs[4],
    description:
      "Light, shadows and the shape of a moment, with the colour left aside.",
  },
];

export default function HomeJournal({ openCollection, prefetch }) {
  const show = (slug) => {
    prefetch.cancel();
    openCollection(series.find((item) => item.slug === slug));
  };
  const intent = (slug) => ({
    onMouseEnter: () => {
      if (matchMedia("(hover:hover) and (pointer:fine)").matches)
        prefetch.queue(slug);
    },
    onMouseLeave: prefetch.cancel,
    onFocus: () => prefetch.queue(slug),
    onBlur: prefetch.cancel,
  });

  return (
    <div className="ed-journal">
      <section
        id="home-about"
        className="ed-journal-about ed-journal-section"
        aria-labelledby="home-about-title"
      >
        <div className="ed-journal-about-intro">
          <p className="ed-journal-greeting" data-ed-reveal>
            Hi, I’m
          </p>
          <h2 id="home-about-title" className="ed-journal-signature">
            <HandwrittenSignature />
          </h2>
        </div>
        <div className="ed-journal-about-portraits">
          <HomePortraits />
          <figure className="ed-home-camera ed-journal-media" data-ed-reveal>
            <Photograph
              photo={homeCameraPortrait}
              sizes="(max-width:700px) 45vw, (max-width:1300px) 44vw, 570px"
            />
          </figure>
          <div className="ed-journal-about-card" data-ed-reveal>
            <p className="ed-journal-about-lead">
              An engineering student,
              <br />
              usually out with a camera.
            </p>
          </div>
        </div>
        <div
          className="ed-journal-about-description ed-journal-body"
          data-ed-reveal
        >
          <p>
            <span className="ed-about-copy-desktop">
              I began with my phone: places I visited, people around me, sunsets
              and streets. I knew very little about photography. I just liked
              framing a moment and keeping it. After getting my first camera, I
              started paying closer attention to the light and to what I chose
              to include in the frame.
            </span>
            <span className="ed-about-copy-phone">
              I started with my phone, taking pictures of people, places,
              sunsets and streets. I didn’t know much about photography. I just
              liked framing a moment and keeping it.
            </span>
          </p>
          <p>
            <span className="ed-about-copy-desktop">
              These days, I photograph streets and landscapes. Sometimes that
              means walking around Kolkata. Sometimes it means getting away to
              the mountains. I don’t usually start with a plan. I follow what
              catches my attention and keep the photographs I enjoy coming back
              to.
            </span>
            <span className="ed-about-copy-phone">
              These days, I photograph streets and landscapes, around Kolkata or
              away in the mountains. I usually go out without a plan and see
              what catches my eye.
            </span>
          </p>
        </div>
        <a className="ed-journal-about-more" href={editorialLinks.about}>
          More about me
        </a>
      </section>

      <section
        className="ed-journal-thought ed-journal-section"
        aria-label="A thought on making photographs"
      >
        <div className="ed-journal-thought-composition">
          <div className="ed-journal-thought-center">
            <p className="ed-journal-script" data-ed-reveal>
              <span className="ed-journal-quote-mark" aria-hidden="true">
                “
              </span>
              On photography
            </p>
            <blockquote className="ed-journal-thought-copy" data-ed-reveal>
              <span>I just liked</span>
              <span>framing a moment</span>
              <span>and keeping it.</span>
            </blockquote>
            <p className="ed-journal-body" data-ed-reveal>
              I began with my phone. I still photograph for much the same
              reason.
            </p>
          </div>
        </div>
      </section>

      <Publications show={show} intent={intent} />

      <section
        className="ed-journal-notes ed-journal-section"
        aria-labelledby="home-notes-title"
      >
        <div className="ed-journal-section-head" data-ed-reveal>
          <h2 className="ed-journal-script" id="home-notes-title">
            How I see it
          </h2>
        </div>
        <div className="ed-journal-notes-grid tw:grid">
          {waysOfSeeing.map((way, index) => (
            <article
              key={way.title}
              className="ed-journal-note"
              data-ed-reveal
              style={{ "--reveal-order": index }}
            >
              <figure className="ed-journal-note-photo ed-journal-media">
                <Photograph photo={way.photo} sizes="88px" />
              </figure>
              <p className="ed-journal-note-thought">{way.description}</p>
              <h3 className="ed-journal-note-label">{way.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section
        className="ed-journal-entries ed-journal-section"
        aria-labelledby="home-journal-title"
      >
        <div className="ed-journal-section-head" data-ed-reveal>
          <h2 className="ed-journal-heading" id="home-journal-title">
            FROM THE BLOG
          </h2>
        </div>
        <div className="ed-journal-entry-grid tw:grid">
          {journal.map((entry, index) => (
            <article
              key={entry.slug}
              className="ed-journal-entry"
              data-ed-reveal
              style={{ "--reveal-order": index }}
            >
              <a
                href={`${editorialLinks.journal}/${entry.postSlug}`}
                className="ed-journal-entry-photo ed-journal-photo-link ed-journal-media"
                aria-label={"Read " + entry.title.toLowerCase()}
              >
                <Photograph
                  photo={entry.photo}
                  sizes="(max-width:600px) 88vw, (max-width:1300px) 29vw, 380px"
                />
              </a>
              <div className="ed-journal-entry-copy">
                <p className="ed-journal-place">{entry.place}</p>
                <h3>
                  <a href={`${editorialLinks.journal}/${entry.postSlug}`}>
                    {entry.title}
                  </a>
                </h3>
                <p className="ed-journal-body">{entry.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="ed-home-journal-cta" data-ed-reveal>
          <a className="ed-home-journal-link" href={editorialLinks.journal}>
            Read the blog
          </a>
        </div>
      </section>

      <section
        className="ed-journal-closing"
        aria-label="A closing thought"
        data-ed-photo-motion="hero"
      >
        <figure
          className="ed-journal-closing-photo ed-journal-media"
          aria-hidden="true"
          data-ed-reveal
          data-ed-photo-layer
        >
          <Photograph
            photo={photographs[10]}
            sizes="(max-width:700px) 100vw, 100vw"
            large
          />
        </figure>
        <div className="ed-journal-closing-copy" data-ed-reveal>
          <p className="ed-journal-script">A thought to leave with</p>
          <blockquote>
            Some places stay with you, not because of where they are, but
            because of how they made you feel.
          </blockquote>
        </div>
      </section>
    </div>
  );
}

const footerPhotographs = [
  photographs[2],
  photographs[1],
  photographs[10],
  photographs[8],
  photographs[4],
  photographs[3],
];

export function HomeFooter() {
  const strip = useRef(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = strip.current;
    if (!("IntersectionObserver" in window)) return;
    let visible = false;
    const sync = () =>
      element.classList.toggle("is-running", visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <footer className="fg-footer ed-journal-footer">
      <div className="ed-journal-footer-inner">
        <div className="ed-journal-colophon tw:grid" data-ed-reveal>
          <nav className="ed-journal-footer-nav" aria-label="Footer navigation">
            <p className="ed-journal-footer-label">Navigate</p>
            {Object.entries(editorialLinks)
              .filter(([name]) => name !== "journal")
              .map(([name, href]) => (
                <a key={name} href={href}>
                  {editorialLabels[name]}
                </a>
              ))}
          </nav>
          <div className="ed-journal-footer-studio">
            <span className="ed-journal-footer-identity">ABHIMANYU SHARMA</span>
            <p className="ed-journal-footer-description">
              Street and landscape photography.
              <br />
              Based in Kolkata, India.
            </p>
            <a
              className="ed-journal-footer-contact"
              href={editorialLinks.contact}
            >
              Get in touch
            </a>
          </div>
          <nav className="ed-journal-footer-connect" aria-label="Connect">
            <p className="ed-journal-footer-label">Connect</p>
            <a href="https://www.instagram.com/abhi.jxl/">Instagram</a>
            <a href="https://www.instagram.com/abhi.jxl.bnw/">Monochrome</a>
            <a href={"mailto:" + email}>Email me</a>
            <a href={editorialLinks.journal}>Blog</a>
          </nav>
        </div>
      </div>
      <div
        ref={strip}
        id="footer-photographs"
        className="ed-journal-footer-strip"
        aria-hidden="true"
      >
        <div
          className="ed-journal-footer-track"
          style={paused ? { animationPlayState: "paused" } : undefined}
        >
          {[0, 1].map((copy) => (
            <div className="ed-journal-footer-group" key={copy}>
              {footerPhotographs.map((photo) => (
                <div
                  className="ed-journal-footer-print ed-journal-media"
                  key={photo.src}
                >
                  <Photograph
                    photo={{ ...photo, alt: "" }}
                    sizes="(max-width:700px) 38vw, 20vw"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="ed-journal-footer-base">
        <span>© 2026 Abhimanyu Sharma</span>
        <div className="ed-journal-footer-tools">
          <button
            className="ed-journal-footer-motion"
            type="button"
            aria-controls="footer-photographs"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "Play photos" : "Pause photos"}
          </button>
          <a href="#top">Back to top</a>
        </div>
      </div>
    </footer>
  );
}
