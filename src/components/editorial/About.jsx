import { useEffect, useRef, useState } from "react";
import {
  aboutPortrait,
  editorialLinks,
  homePortraits,
  photographs,
  series,
} from "../../data/editorial.js";
import { Photograph, Icon } from "./Primitives.jsx";
import { preloadCollection } from "./usePhotoViewer.js";
import HandwrittenSignature from "./HandwrittenSignature.jsx";

const questions = [
  {
    title: "WHAT DO YOU USUALLY PHOTOGRAPH?",
    answer:
      "Mostly streets, landscapes and everyday scenes. I take photographs when I’m out walking or travelling.",
  },
  {
    title: "HOW DID YOU GET INTO PHOTOGRAPHY?",
    answer:
      "I started with my phone. After getting my first camera, I became more interested in how photographs are made.",
  },
  {
    title: "DO YOU PLAN YOUR PHOTOGRAPHS?",
    answer:
      "Not usually. I like going out and seeing what catches my attention.",
  },
  {
    title: "WHERE ARE YOU BASED?",
    answer:
      "I’m based in Kolkata, though I also take photographs when I travel.",
  },
  {
    title: "CAN I USE ONE OF YOUR PHOTOGRAPHS?",
    answer:
      "Please get in touch first and let me know where you’d like to use it.",
  },
  {
    title: "CAN I ASK ABOUT A PARTICULAR PHOTO?",
    answer:
      "Yes. Mention the photograph or collection when you get in touch so I know which one you mean.",
  },
];

const approach = [
  {
    title: "NOTICE",
    text: "Something catches my attention while I’m out. That’s usually how it starts.",
  },
  {
    title: "FRAME",
    text: "I look at the light and decide what should be in the picture.",
  },
  {
    title: "KEEP",
    text: "I keep the photographs I enjoy coming back to.",
  },
];

const projects = ["kumartuli", "sikkim"].map((slug) =>
  series.find((item) => item.slug === slug),
);
const destinations = [
  {
    title: "THE GALLERY",
    label: "Explore the photographs",
    href: editorialLinks.gallery,
    photo: series.find((item) => item.slug === "mullick-market").cover,
    coverSlug: "mullick-market",
  },
  {
    title: "GET IN TOUCH",
    label: "Say hello",
    href: editorialLinks.contact,
    photo: homePortraits[1],
  },
  {
    title: "READ THE BLOG",
    label: "Visit the blog",
    href: editorialLinks.journal,
    photo: photographs[10],
  },
];

function AboutQuestions() {
  const track = useRef(null),
    requested = useRef(0);
  const [active, setActive] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const element = track.current;
    let frame = 0,
      settled = 0;
    const closest = () => {
      const start =
        element.getBoundingClientRect().left +
        parseFloat(getComputedStyle(element).paddingLeft);
      let index = 0,
        distance = Infinity;
      for (const [i, card] of [...element.children].entries()) {
        const box = card.getBoundingClientRect();
        const next = Math.abs(box.left - start);
        if (next < distance) {
          index = i;
          distance = next;
        }
      }
      return index;
    };
    const sync = () => {
      frame = 0;
      setActive(closest());
      setAtEnd(
        element.scrollWidth - element.clientWidth - element.scrollLeft <= 1,
      );
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(sync);
      clearTimeout(settled);
      settled = setTimeout(() => {
        requested.current = closest();
      }, 150);
    };
    const resize = new ResizeObserver(() => {
      const card = element.children[requested.current];
      element.scrollTo({
        left:
          element.scrollLeft +
          card.getBoundingClientRect().left -
          element.getBoundingClientRect().left -
          parseFloat(getComputedStyle(element).paddingLeft),
        behavior: "instant",
      });
      sync();
    });
    element.addEventListener("scroll", scroll, { passive: true });
    resize.observe(element);
    sync();
    return () => {
      element.removeEventListener("scroll", scroll);
      resize.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settled);
    };
  }, []);

  const go = (index) => {
    const element = track.current;
    const maximum = element.scrollWidth - element.clientWidth;
    const step =
      element.children[1].getBoundingClientRect().left -
      element.children[0].getBoundingClientRect().left;
    const last = Math.round(maximum / step);
    requested.current = Math.max(0, Math.min(last, index));
    const card = element.children[requested.current];
    const box = card.getBoundingClientRect();
    const left =
      element.scrollLeft +
      box.left -
      element.getBoundingClientRect().left -
      parseFloat(getComputedStyle(element).paddingLeft);
    element.scrollTo({
      left: requested.current === last ? maximum : left,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <section
      className="ed-about-questions"
      aria-labelledby="about-questions-title"
    >
      <div className="ed-about-section-heading ed-about-shell" data-ed-reveal>
        <p className="ed-about-eyebrow">A few things about photography</p>
        <h2 id="about-questions-title">FREQUENTLY ASKED QUESTIONS</h2>
      </div>
      <div
        ref={track}
        id="about-questions-track"
        className="ed-about-question-track"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Photography questions. Swipe or use the arrow keys to browse."
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            go(requested.current + (event.key === "ArrowRight" ? 1 : -1));
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            go(event.key === "Home" ? 0 : questions.length - 1);
          }
        }}
      >
        {questions.map((question, index) => (
          <article
            key={question.title}
            className="ed-about-question"
            data-ed-reveal
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${questions.length}`}
          >
            <span className="ed-about-question-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{question.title}</h3>
            <p>{question.answer}</p>
          </article>
        ))}
      </div>
      <div className="ed-about-question-footer ed-about-shell" data-ed-reveal>
        <span
          className="ed-about-question-count ed-about-status"
          aria-live="polite"
          aria-atomic="true"
        >
          {String(active + 1).padStart(2, "0")} / 06
        </span>
        <div className="ed-about-question-controls">
          <button
            type="button"
            aria-label="Show previous question"
            aria-controls="about-questions-track"
            disabled={active === 0}
            onClick={() => go(requested.current - 1)}
          >
            <Icon name="arrow-left" size={24} />
          </button>
          <button
            type="button"
            aria-label="Show next question"
            aria-controls="about-questions-track"
            disabled={atEnd}
            onClick={() => go(requested.current + 1)}
          >
            <Icon name="arrow-right" size={24} />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function About({ openCollection }) {
  return (
    <div className="ed-about-page">
      <section
        className="ed-about-intro ed-about-shell"
        aria-labelledby="about-title"
      >
        <figure className="ed-about-portrait" data-about-enter>
          <Photograph
            photo={aboutPortrait}
            eager
            priority
            large
            sizes="(max-width:760px) 100vw, (min-width:1414px) 630px, 45vw"
          />
        </figure>
        <div className="ed-about-intro-copy">
          <p className="ed-about-greeting" data-about-enter>
            Hello, I’m
          </p>
          <div className="ed-about-signature" data-about-enter>
            <HandwrittenSignature />
          </div>
          <h1 id="about-title" data-about-enter>
            An engineering student,
            <br />
            usually out with a camera.
          </h1>
          <p className="ed-about-body" data-about-enter>
            I’m based in Kolkata and studying engineering. I like taking
            photographs when I’m outside, especially of places I visit and
            people I come across.
          </p>
        </div>
      </section>

      <div className="ed-about-content">
        <section
          className="ed-about-story ed-about-shell"
          id="about-story"
          aria-labelledby="about-story-title"
        >
          <h2 id="about-story-title" data-ed-reveal>
            IT BEGAN
            <br />
            WITH A PHONE.
          </h2>
          <div className="ed-about-story-copy" data-ed-reveal>
            <p className="ed-about-body">
              I started taking photographs on my phone, mostly of everyday
              things that caught my attention.
            </p>
            <p className="ed-about-body">
              After getting my first camera, I began paying more attention to
              light, composition, exposure and editing. I still enjoy going out
              without having much of a plan.
            </p>
          </div>
        </section>
        <figure
          className="ed-about-wide"
          data-ed-reveal
          data-ed-photo-motion="about"
        >
          <div className="ed-about-wide-image" data-ed-photo-layer>
            <Photograph
              photo={photographs[15]}
              sizes="(max-width:760px) max(100vw, 150svh), 110vw"
              large
            />
          </div>
        </figure>

        <section
          className="ed-about-approach ed-about-shell"
          aria-labelledby="about-approach-title"
        >
          <h2 id="about-approach-title" data-ed-reveal>
            HOW I APPROACH A PHOTOGRAPH.
          </h2>
          <div className="ed-about-approach-grid">
            {approach.map((item) => (
              <article key={item.title} data-ed-reveal>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="ed-about-interlude"
          aria-labelledby="about-interlude-title"
          data-ed-photo-motion="hero"
        >
          <div
            className="ed-about-interlude-image"
            aria-hidden="true"
            data-ed-reveal
            data-ed-photo-layer
          >
            <Photograph
              photo={{ ...photographs[2], alt: "" }}
              sizes="100vw"
              large
            />
          </div>
          <div className="ed-about-interlude-copy" data-ed-reveal>
            <p className="ed-about-interlude-script">A little more about me</p>
            <h2 id="about-interlude-title">OUT WITH A CAMERA.</h2>
            <p>
              Some days I come back with a few photographs. Other days, hardly
              any. I still like going out.
            </p>
          </div>
        </section>

        <AboutQuestions />

        <section
          className="ed-about-projects"
          aria-labelledby="about-projects-title"
        >
          <div className="ed-about-projects-heading" data-ed-reveal>
            <h2 id="about-projects-title">RECENT PROJECTS</h2>
            <p>Two collections from my photographs.</p>
          </div>
          <div className="ed-about-project-grid">
            {projects.map((project) => (
              <button
                type="button"
                className="ed-about-project"
                data-ed-reveal
                key={project.slug}
                onClick={() => openCollection(project)}
                onPointerEnter={() =>
                  preloadCollection(project.slug).catch(() => {})
                }
                onFocus={() => preloadCollection(project.slug).catch(() => {})}
                aria-label={`View ${project.title} photographs`}
              >
                <Photograph
                  photo={project.cover}
                  coverSlug={project.slug}
                  sizes="(max-width:500px) 100vw, 50vw"
                  large={project.slug === "sikkim"}
                />
                <span className="ed-about-project-name">
                  {project.title[0] + project.title.slice(1).toLowerCase()}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          className="ed-about-next ed-about-shell"
          aria-labelledby="about-next-title"
        >
          <div className="ed-about-section-heading" data-ed-reveal>
            <h2 id="about-next-title">KEEP LOOKING AROUND</h2>
          </div>
          <div className="ed-about-destinations">
            {destinations.map((destination) => (
              <article
                key={destination.title}
                className="ed-about-destination"
                data-ed-reveal
              >
                <a
                  href={destination.href}
                  className="ed-about-destination-photo"
                  aria-label={destination.label}
                  tabIndex={-1}
                >
                  <Photograph
                    photo={destination.photo}
                    coverSlug={destination.coverSlug}
                    sizes="(max-width:760px) 90vw, 28vw"
                  />
                </a>
                <h3>{destination.title}</h3>
                <a className="ed-about-next-link" href={destination.href}>
                  {destination.label}
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
