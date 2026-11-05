import { useEffect, useRef, useState } from "react";
import { Photograph } from "./Primitives.jsx";
import { editorialLinks } from "../../data/editorial.js";
import { siteOrigin } from "../../data/site.js";
import {
  journalPosts,
  journalSubjects,
  journalHref,
  postHref,
  filterPosts,
  journalSearchPhotograph,
  journalPortrait,
} from "../../data/journal.js";

function StoryCard({ post, opening = false }) {
  return (
    <article
      className="ed-blog-story"
      {...(opening ? { "data-journal-enter": "" } : {})}
    >
      <a
        href={postHref(post)}
        className="ed-blog-story-photo"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Photograph
          photo={post.cover}
          eager={opening}
          priority={opening}
          sizes="(max-width:760px) 90vw, 43vw"
        />
      </a>
      <div className="ed-blog-story-copy">
        <p className="ed-blog-meta">
          {post.category} / {post.location}
        </p>
        <h2>
          <a href={postHref(post)}>{post.title}</a>
        </h2>
        <p className="ed-blog-excerpt">{post.excerpt}</p>
      </div>
    </article>
  );
}

export function Journal() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All");
  const searchRef = useRef(null);
  const filtersRef = useRef(null);
  const filtered = query.trim() !== "" || subject !== "All";
  const matches = filterPosts(query, subject);

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(location.search);
      setQuery(params.get("q") || "");
      setSubject(
        journalSubjects.includes(params.get("subject"))
          ? params.get("subject")
          : "All",
      );
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const update = (nextQuery, nextSubject) => {
    setQuery(nextQuery);
    setSubject(nextSubject);
    const url = new URL(location.href);
    nextQuery.trim()
      ? url.searchParams.set("q", nextQuery)
      : url.searchParams.delete("q");
    nextSubject !== "All"
      ? url.searchParams.set("subject", nextSubject)
      : url.searchParams.delete("subject");
    history.replaceState(history.state, "", url);
  };
  const chooseSubject = (value) => {
    update("", value);
    filtersRef.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    searchRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="ed-blog-page">
      <section
        className="ed-blog-opening ed-blog-shell"
        aria-labelledby="journal-title"
      >
        <header className="ed-blog-heading" data-journal-enter>
          <h1 id="journal-title">The Blog</h1>
          <p className="ed-blog-script">Notes from the photographs</p>
        </header>
        <div className="ed-blog-leads">
          {journalPosts.slice(0, 2).map((post) => (
            <StoryCard key={post.slug} post={post} opening />
          ))}
        </div>
      </section>

      <section
        className="ed-blog-find"
        ref={filtersRef}
        aria-labelledby="journal-find-title"
      >
        <div className="ed-blog-backdrop" aria-hidden="true">
          <Photograph photo={journalSearchPhotograph} sizes="100vw" />
        </div>
        <div className="ed-blog-shell ed-blog-find-inner" data-ed-reveal>
          <div>
            <h2 id="journal-find-title">
              A few photographs,
              <br />
              and what I remember.
            </h2>
            <p className="ed-blog-copy">
              Some walks around Kolkata, a few days away, and the things I
              stopped to look at. I’m keeping them here with a little more room
              for the photographs.
            </p>
          </div>
          <div className="ed-blog-search-tools">
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                document
                  .getElementById("journal-results-title")
                  ?.focus({ preventScroll: true });
              }}
            >
              <label htmlFor="journal-search">Find an entry</label>
              <div className="ed-blog-search-field">
                <svg
                  className="ed-blog-search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 5 5" />
                </svg>
                <input
                  ref={searchRef}
                  id="journal-search"
                  type="search"
                  name="q"
                  value={query}
                  onChange={(event) => update(event.target.value, subject)}
                  placeholder="Try Sikkim or the river"
                  aria-controls="journal-results"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      update("", subject);
                      searchRef.current?.focus();
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
            <div
              className="ed-blog-subject-filter"
              role="group"
              aria-label="Filter journal by subject"
            >
              {["All", ...journalSubjects].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={subject === value}
                  onClick={() => update(query, value)}
                >
                  {value === "All" ? "All entries" : value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="ed-blog-latest ed-blog-shell"
        aria-labelledby="journal-results-title"
      >
        <div className="ed-blog-section-heading" data-ed-reveal>
          <h2 id="journal-results-title" tabIndex={-1}>
            {filtered ? "From the blog" : "Latest posts"}
          </h2>
          <p
            className="ed-blog-result-count"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {filtered
              ? `${matches.length} ${matches.length === 1 ? "entry" : "entries"} found`
              : "More from my walks and travels"}
          </p>
        </div>
        <div id="journal-results" className="ed-blog-grid" data-ed-reveal>
          {(filtered ? matches : journalPosts.slice(2, 5)).map((post) => (
            <StoryCard key={post.slug} post={post} />
          ))}
        </div>
        {filtered && matches.length === 0 && (
          <div className="ed-blog-empty">
            <p>No entries match that search.</p>
            <button
              className="ed-blog-link"
              type="button"
              onClick={() => {
                update("", "All");
                searchRef.current?.focus();
              }}
            >
              Show all entries
            </button>
          </div>
        )}
      </section>

      <div hidden={filtered}>
        <section
          className="ed-blog-feature"
          aria-labelledby="journal-feature-title"
          data-ed-photo-motion="about"
          data-ed-photo-mobile
        >
          <div className="ed-blog-backdrop" aria-hidden="true">
            <Photograph photo={journalPosts[5].cover} sizes="100vw" />
          </div>
          <div className="ed-blog-shell" data-ed-reveal>
            <a
              className="ed-blog-feature-photo"
              data-ed-photo-layer
              href={postHref(journalPosts[5])}
              tabIndex={-1}
              aria-hidden="true"
            >
              <Photograph
                photo={journalPosts[5].cover}
                sizes="(max-width:760px) 90vw, 85vw"
              />
            </a>
            <div className="ed-blog-feature-copy">
              <div>
                <p className="ed-blog-meta">Kolkata / A photo story</p>
                <h2 id="journal-feature-title">
                  <a href={postHref(journalPosts[5])}>
                    {journalPosts[5].title}
                  </a>
                </h2>
                <a className="ed-blog-link" href={postHref(journalPosts[5])}>
                  Read the story
                </a>
              </div>
              <p className="ed-blog-copy">
                Workshop doors, unfinished figures and people getting on with
                their day. I don’t always have a plan when I go out with the
                camera. This is a small set of the things that make me stop.
              </p>
            </div>
          </div>
        </section>
        <section
          className="ed-blog-subjects ed-blog-shell"
          aria-labelledby="journal-subjects-title"
          data-ed-reveal
        >
          <p className="ed-blog-script ed-blog-subjects-script">
            Keep exploring
          </p>
          <h2 id="journal-subjects-title">Browse by subject</h2>
          <div>
            {journalSubjects.map((value, index) => (
              <button
                type="button"
                key={value}
                aria-label={`Browse ${value} entries`}
                onClick={() => chooseSubject(value)}
              >
                <span className="ed-blog-subject-photo">
                  <Photograph
                    photo={journalPosts[[2, 1, 3][index]].cover}
                    sizes="(max-width:760px) 28vw, 27vw"
                  />
                </span>
                <span className="ed-blog-subject-name">{value}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section
        className="ed-blog-author ed-blog-shell"
        aria-labelledby="journal-author-title"
        data-ed-reveal
      >
        <div className="ed-blog-author-intro">
          <h2 id="journal-author-title">
            About <br /> me
          </h2>
          <p className="ed-blog-copy">
            I’m Abhimanyu. I enjoy going out with my camera, getting a little
            lost, and coming home with more photographs than I meant to take.
          </p>
          <a className="ed-blog-about-button" href={editorialLinks.about}>
            More about me
          </a>
        </div>
        <Photograph
          className="ed-blog-author-portrait"
          photo={journalPortrait}
          sizes="(max-width:760px) 80vw, (max-width:1000px) 36vw, 30vw"
        />
        <p className="ed-blog-author-statement">
          This is where I write about the photographs I captured.
        </p>
      </section>
    </div>
  );
}

export function JournalPost({ post }) {
  const index = journalPosts.findIndex((item) => item.slug === post.slug);
  const previous =
    journalPosts[(index + journalPosts.length - 1) % journalPosts.length];
  const next = journalPosts[(index + 1) % journalPosts.length];
  const [copyStatus, setCopyStatus] = useState("");
  const fallbackRef = useRef(null);
  const [shareUrl, setShareUrl] = useState(`${siteOrigin}${postHref(post)}`);
  useEffect(() => {
    setShareUrl(location.origin + postHref(post));
  }, [post.slug]);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("Copied link");
    } catch {
      setCopyStatus("Select and copy the link below");
      requestAnimationFrame(() => {
        fallbackRef.current?.focus();
        fallbackRef.current?.select();
      });
    }
  };
  return (
    <article className="ed-post-page" aria-labelledby="journal-post-title">
      <header
        className="ed-post-hero"
        data-journal-enter
        data-ed-photo-motion="about"
      >
        <div className="ed-post-hero-image" data-ed-photo-layer>
          <Photograph photo={post.cover} eager priority sizes="100vw" />
        </div>
        <div className="ed-post-heading">
          <p className="ed-blog-meta">
            {post.category} / {post.location}
          </p>
          <h1 id="journal-post-title">{post.title}</h1>
        </div>
      </header>
      <div className="ed-post-body">
        <div className="ed-post-prose ed-post-intro" data-ed-reveal>
          {post.opening.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {[
          post.images.slice(0, 2),
          post.images.slice(2, 4),
          post.images.slice(4),
        ].map((photos, i) => (
          <section className="ed-post-passage" key={photos[0].src}>
            <div
              className={`ed-post-photos ed-post-frame${photos.length === 1 ? " is-wide" : ""}`}
              data-ed-reveal
            >
              {photos.map((photo) => (
                <figure key={photo.src}>
                  <Photograph
                    photo={photo}
                    sizes={
                      photos.length === 1
                        ? "(max-width:1200px) 94vw, 1120px"
                        : "(max-width:600px) 94vw, (max-width:1200px) 44vw, 548px"
                    }
                  />
                </figure>
              ))}
            </div>
            <div
              className={`ed-post-prose${photos.length === 2 ? " is-paired" : ""}`}
              data-ed-reveal
            >
              {photos.map((photo) => (
                <p key={photo.src}>{photo.note}</p>
              ))}
              {i === 2 && <p>{post.ending}</p>}
            </div>
            {i === 1 && (
              <blockquote className="ed-post-quote" data-ed-reveal>
                <span aria-hidden="true">“</span>
                <p>{post.quote}</p>
              </blockquote>
            )}
          </section>
        ))}
      </div>
      <div className="ed-post-share ed-post-prose">
        <button
          type="button"
          className="ed-post-copy-button"
          onClick={copyLink}
        >
          {copyStatus === "Copied link" ? "Copied link" : "Share this entry"}
        </button>
        <span
          className={
            copyStatus.startsWith("Select")
              ? "ed-post-copy-status"
              : "ed-sr-only"
          }
          role="status"
        >
          {copyStatus}
        </span>
        {copyStatus.startsWith("Select") && (
          <input
            aria-label="Link to this journal entry"
            value={shareUrl}
            readOnly
            ref={fallbackRef}
          />
        )}
      </div>
      <nav className="ed-post-navigation" aria-label="More journal entries">
        <a href={postHref(previous)}>
          <Photograph
            photo={{ ...previous.cover, alt: "" }}
            sizes="(max-width:600px) 100vw, 50vw"
          />
          <div className="ed-post-navigation-copy">
            <span>Previous entry</span>
            <p>{previous.title}</p>
          </div>
        </a>
        <a href={postHref(next)}>
          <Photograph
            photo={{ ...next.cover, alt: "" }}
            sizes="(max-width:600px) 100vw, 50vw"
          />
          <div className="ed-post-navigation-copy">
            <span>Next entry</span>
            <p>{next.title}</p>
          </div>
        </a>
      </nav>
    </article>
  );
}
