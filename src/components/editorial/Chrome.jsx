import { useEffect, useRef, useState } from "react";
import {
  editorialLabels,
  editorialLinks,
  email,
} from "../../data/editorial.js";
import { HomeFooter } from "./HomeJournal.jsx";

export function Header({ page }) {
  const [phase, setPhase] = useState("closed");
  const open = phase === "open",
    present = phase !== "closed";
  const nav = useRef(null),
    toggle = useRef(null);
  const closeMenu = () => {
    setPhase((value) => (value === "closed" ? value : "closing"));
    toggle.current?.focus({ preventScroll: true });
  };
  const followLink = (event) => {
    const destination = new URL(event.currentTarget.href, location.href);
    const changingPage =
      destination.origin === location.origin &&
      destination.pathname.replace(/\/$/, "") !==
        location.pathname.replace(/\/$/, "");
    if (open && changingPage) {
      return;
    }
    closeMenu();
  };
  useEffect(() => setPhase("closed"), [page]);
  useEffect(() => {
    if (phase !== "closing") return;
    const delay = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 340;
    const timer = setTimeout(() => setPhase("closed"), delay);
    return () => clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if (!present) return;
    const header = toggle.current.closest("header");
    const backgrounds = [
      document.querySelector("main"),
      document.querySelector("footer"),
    ].filter(Boolean);
    const former = backgrounds.map((element) => element.inert);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    backgrounds.forEach((element) => {
      element.inert = true;
    });
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const controls = [...header.querySelectorAll("a,button")].filter(
        (element) =>
          element.getClientRects().length &&
          element.tabIndex >= 0 &&
          !element.disabled &&
          !element.closest("[inert]"),
      );
      if (!controls.length) return;
      event.preventDefault();
      const index = controls.indexOf(document.activeElement);
      const next = event.shiftKey
        ? index <= 0
          ? controls.length - 1
          : index - 1
        : (index + 1) % controls.length;
      controls[next].focus();
    };
    header.addEventListener("keydown", trap);
    return () => {
      header.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      backgrounds.forEach((element, index) => {
        element.inert = former[index];
      });
    };
  }, [present]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      nav.current.querySelector("a")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    const phone = matchMedia("(max-width: 760px)");
    const sync = () => {
      const staticFallback =
        document.documentElement.classList.contains("ed-entry-timeout");
      nav.current.inert = phone.matches && !open && !staticFallback;
      if (!phone.matches) setPhase("closed");
    };
    const keys = (event) => {
      if (event.key === "Escape" && open) {
        closeMenu();
      }
    };
    sync();
    phone.addEventListener("change", sync);
    window.addEventListener("keydown", keys);
    return () => {
      phone.removeEventListener("change", sync);
      window.removeEventListener("keydown", keys);
    };
  }, [open]);
  return (
    <header className={"fg-header" + (open ? " is-menu-open" : "")}>
      <button
        ref={toggle}
        className="ed-menu-toggle"
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="editorial-navigation"
        onClick={() => {
          if (open) closeMenu();
          else setPhase("open");
        }}
      >
        <span className="ed-menu-mark" aria-hidden="true">
          <i />
          <i />
        </span>
      </button>
      <nav
        ref={nav}
        id="editorial-navigation"
        className={
          "ed-navigation" +
          (open ? " is-open" : "") +
          (phase === "closing" ? " is-closing" : "")
        }
        aria-label="Main navigation"
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === "opacity" &&
            phase === "closing"
          )
            setPhase("closed");
        }}
      >
        <div className="ed-navigation-links">
          {Object.entries(editorialLinks).map(([name, href], index) => (
            <a
              key={name}
              href={href}
              aria-current={page === name ? "page" : undefined}
              style={{ "--link-order": index }}
              onClick={followLink}
            >
              {editorialLabels[name]}
            </a>
          ))}
          <a
            className="ed-navigation-social"
            href="https://www.instagram.com/abhi.jxl/"
            style={{ "--link-order": Object.keys(editorialLinks).length }}
            onClick={closeMenu}
          >
            Instagram
          </a>
        </div>
      </nav>
      <a
        href={page === "home" ? "#top" : editorialLinks.home}
        className="ed-wordmark"
        aria-label="Abhimanyu Sharma, home"
        onClick={followLink}
      >
        <span className="ed-wordmark-name">Abhimanyu Sharma</span>
        <span className="ed-wordmark-home">Home</span>
      </a>
      <nav className="ed-header-links" aria-label="Contact and social">
        <a href={`mailto:${email}`}>Email</a>
        <a href="https://www.instagram.com/abhi.jxl/">Instagram</a>
      </nav>
    </header>
  );
}

export function Footer({ page }) {
  return page === "gallery" ? null : <HomeFooter />;
}
