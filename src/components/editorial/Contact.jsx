import { useEffect, useRef, useState } from "react";
import { email, series } from "../../data/editorial.js";
import { Photograph } from "./Primitives.jsx";

const cover = series.find((collection) => collection.slug === "princep-ghat");

const questions = [
  {
    title: "Can I ask about a photograph?",
    answer:
      "Of course. Mention the photograph or collection you’re asking about, and what you’d like to know.",
  },
  {
    title: "Can I use one of your photographs?",
    answer:
      "Please get in touch first. Tell me which photograph you have in mind and how you’d like to use it.",
  },
  {
    title: "Where are you based?",
    answer: "I’m based in Kolkata, India, where I’m also studying engineering.",
  },
  {
    title: "How do I identify a photograph?",
    answer:
      "Its collection name and photograph number are helpful. A title or a short description of the image works too.",
  },
  {
    title: "Do you photograph while travelling?",
    answer:
      "Yes. The photographs here include both everyday scenes around Kolkata and places I’ve visited while travelling.",
  },
  {
    title: "What should I include in a message?",
    answer:
      "Just a few details about your question. If it’s about a particular photograph, let me know which one.",
  },
];

function ContactQuestion({ title, answer, initialOpen, onExpandedChange }) {
  const detailsRef = useRef(null);
  useEffect(() => {
    const details = detailsRef.current;
    const summary = details.querySelector("summary");
    const content = details.querySelector(".ed-contact-answer");
    const paragraph = content.firstElementChild;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let animation = null;
    let expanded = details.open;
    let naturalHeight = 0;

    const settle = () => {
      const previous = animation;
      animation = null;
      previous?.cancel();
      details.open = expanded;
      details.removeAttribute("data-expanded");
    };

    const transitionTo = (nextExpanded) => {
      // Read the rendered height before cancelling, so a second click reverses
      // smoothly from the current frame rather than jumping to either end.
      const height = details.open ? content.getBoundingClientRect().height : 0;
      const opacity = details.open
        ? Number(getComputedStyle(content).opacity)
        : 0;
      animation?.cancel();
      expanded = nextExpanded;
      onExpandedChange(expanded);
      details.open = true;
      details.dataset.expanded = String(expanded);
      naturalHeight = paragraph.getBoundingClientRect().height;
      const next = content.animate(
        [
          { height: `${height}px`, opacity },
          {
            height: `${expanded ? naturalHeight : 0}px`,
            opacity: expanded ? 1 : 0,
          },
        ],
        {
          // Creativa's accordion timing, applied to the answer's actual height.
          duration: 250,
          easing: "cubic-bezier(.66,0,.34,1)",
          fill: "both",
        },
      );
      next.id = "editorial-contact-answer";
      animation = next;
      next.finished.then(
        () => {
          if (animation === next) settle();
        },
        () => {},
      );
    };

    const toggle = (event) => {
      if (!content.animate || preference.matches) return;
      event.preventDefault();
      transitionTo(animation ? !expanded : !details.open);
    };
    const reduceMotion = () => {
      if (preference.matches && animation) settle();
    };
    const observer = new ResizeObserver(() => {
      if (
        animation &&
        Math.abs(paragraph.getBoundingClientRect().height - naturalHeight) > 0.5
      ) {
        transitionTo(expanded);
      }
    });
    observer.observe(paragraph);
    summary.addEventListener("click", toggle);
    preference.addEventListener("change", reduceMotion);
    return () => {
      animation?.cancel();
      observer.disconnect();
      summary.removeEventListener("click", toggle);
      preference.removeEventListener("change", reduceMotion);
      details.removeAttribute("data-expanded");
    };
  }, []);

  return (
    <details
      ref={detailsRef}
      className="ed-contact-question"
      open={initialOpen}
      onToggle={(event) => {
        const details = event.currentTarget;
        onExpandedChange(
          details.hasAttribute("data-expanded")
            ? details.dataset.expanded === "true"
            : details.open,
        );
      }}
    >
      <summary>
        <span>{title}</span>
        <span className="ed-contact-question-mark" aria-hidden="true" />
      </summary>
      <div className="ed-contact-answer">
        <p>{answer}</p>
      </div>
    </details>
  );
}

function ContactQuestions() {
  const [columns, setColumns] = useState(false);
  const expanded = useRef(new Set());
  useEffect(() => {
    const desktop = matchMedia("(min-width: 761px)");
    const sync = () => setColumns(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);
  const renderQuestion = (question) => (
    <ContactQuestion
      key={question.title}
      {...question}
      initialOpen={expanded.current.has(question.title)}
      onExpandedChange={(open) => {
        if (open) expanded.current.add(question.title);
        else expanded.current.delete(question.title);
      }}
    />
  );
  return (
    <div className="ed-contact-question-list" data-ed-reveal>
      {columns
        ? [0, 1].map((column) => (
            <div className="ed-contact-question-column" key={column}>
              {questions
                .filter((_, index) => index % 2 === column)
                .map(renderQuestion)}
            </div>
          ))
        : questions.map(renderQuestion)}
    </div>
  );
}

function ContactForm() {
  const [draftReady, setDraftReady] = useState(false);
  const prepareEmail = (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = [fields.get("firstName"), fields.get("lastName")]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");
    const address = String(fields.get("email")).trim();
    const message = String(fields.get("message")).trim();
    const body = `${message}\n\n${name}\n${address}`;
    const draft = `mailto:${email}?subject=${encodeURIComponent("Photography enquiry")}&body=${encodeURIComponent(body)}`;
    setDraftReady(true);
    window.location.href = draft;
  };

  return (
    <form
      className="ed-contact-form"
      action={`mailto:${email}`}
      method="post"
      encType="text/plain"
      onSubmit={prepareEmail}
      onChange={() => setDraftReady(false)}
      aria-label="Write to Abhimanyu Sharma"
      data-contact-enter
    >
      <div className="ed-contact-form-pair">
        <label htmlFor="contact-first-name">
          First name <span>(required)</span>
          <input
            id="contact-first-name"
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={120}
          />
        </label>
        <label htmlFor="contact-last-name">
          Last name <span>(optional)</span>
          <input
            id="contact-last-name"
            name="lastName"
            autoComplete="family-name"
            maxLength={120}
          />
        </label>
      </div>
      <label htmlFor="contact-email">
        Email <span>(required)</span>
        <input
          id="contact-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label htmlFor="contact-message">
        Message <span>(required)</span>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          required
          maxLength={4000}
        />
      </label>
      <div className="ed-contact-form-action">
        <button type="submit" className="ed-contact-submit">
          Open email
        </button>
        <p className="ed-contact-form-help">
          Opens your email app with your message ready to send.
          <br />
          Or <a href={`mailto:${email}`}>email me directly</a>.
        </p>
      </div>
      <p className="ed-contact-form-status" role="status" aria-live="polite">
        {draftReady && (
          <>
            Your email draft is ready. It hasn’t been sent yet. If your email
            app didn’t open, you can write directly to{" "}
            <a href={`mailto:${email}`}>{email}</a>.
          </>
        )}
      </p>
    </form>
  );
}

export default function Contact() {
  return (
    <div className="ed-contact-page">
      <section
        className="ed-contact-hero"
        aria-labelledby="contact-title"
        data-ed-photo-motion="about"
      >
        <figure
          className="ed-contact-photo"
          data-contact-enter
          aria-hidden="true"
          data-ed-photo-layer
        >
          <Photograph
            photo={cover.cover}
            coverSlug={cover.slug}
            large
            eager
            priority
            sizes="100vw"
          />
        </figure>
        <div className="ed-contact-hero-inner">
          <p className="ed-contact-eyebrow" data-contact-enter>
            Inquire
          </p>
          <h1 id="contact-title" data-contact-enter>
            GET IN TOUCH.
          </h1>
          <p className="ed-contact-description" data-contact-enter>
            Have a question about a photograph?
            <br />
            You can write to me here.
          </p>
          <ContactForm />
        </div>
      </section>

      <section
        className="ed-contact-questions ed-contact-shell"
        aria-labelledby="contact-questions-title"
      >
        <h2 id="contact-questions-title" data-ed-reveal>
          FREQUENTLY ASKED
          <br />
          QUESTIONS.
        </h2>
        <ContactQuestions />
      </section>
    </div>
  );
}
