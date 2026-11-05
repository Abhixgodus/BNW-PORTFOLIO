import { useEffect, useRef, useState } from "react";

export const COVER_SIZES = "(max-width:760px) 72vw, 24vw";

export function Icon({ name = "arrow-up-right", size = 20 }) {
  const paths = {
    "arrow-up-right": "M5 19 19 5M5 5h14v14",
    "arrow-right": "M4 12h16M13 5l7 7-7 7",
    "arrow-left": "M20 12H4m7-7-7 7 7 7",
    "arrow-down": "M12 4v16m-7-7 7 7 7-7",
    close: "M5 5l14 14M19 5 5 19",
    menu: "M3 8h18M12 15h9",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "menu" ? "2.5" : "1.2"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths["arrow-up-right"]} />
    </svg>
  );
}

export function Photograph({
  photo,
  className = "",
  eager = false,
  priority = false,
  coverSlug,
  full = false,
  sizes,
  entrance = false,
  large = false,
}) {
  const [failedSource, setFailedSource] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const imageRef = useRef(null);
  const name = photo.src.startsWith("/images/portfolio/")
    ? photo.src
        .split("/")
        .at(-1)
        .replace(/\.[^.]+$/, "")
    : null;
  const base = full
    ? null
    : coverSlug
      ? "/_concept/covers/" + coverSlug
      : photo.preview
        ? photo.preview
        : name
          ? "/_concept/folio/" + name
          : null;
  const optimized = base && failedSource !== photo.src;
  const intermediate = photo.preview?.startsWith("/_concept/features/");
  useEffect(() => {
    // A server-rendered image may fail before React attaches its error handler.
    // Recover that initial failure too, without restarting successful requests.
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) {
      if (optimized) setFailedSource(photo.src);
      else setUnavailable(true);
    }
  }, [photo.src, optimized]);
  if (unavailable)
    return (
      <div
        className={"fg-image-error " + className}
        role="img"
        aria-label={"Photograph unavailable: " + photo.alt}
      >
        Photograph unavailable
      </div>
    );
  return (
    <img
      ref={imageRef}
      className={className}
      src={optimized ? base + "-1280.webp" : photo.src}
      srcSet={
        optimized
          ? base +
            (photo.preview ? "-320.webp 320w, " : "-640.webp 640w, ") +
            (intermediate ? base + "-640.webp 640w, " : "") +
            base +
            "-1280.webp 1280w" +
            (large ? ", " + base + "-1920.webp 1920w" : "")
          : undefined
      }
      sizes={optimized ? sizes || "(max-width: 760px) 90vw, 45vw" : undefined}
      alt={photo.alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable="false"
      width={photo.width || 1200}
      height={photo.height || 800}
      data-entry-photo={entrance ? "" : undefined}
      onError={() =>
        optimized ? setFailedSource(photo.src) : setUnavailable(true)
      }
    />
  );
}

export function TextLink({ children, href, className = "", ...props }) {
  return (
    <a className={"ed-text-link " + className} href={href} {...props}>
      <span>{children}</span>
      <Icon />
    </a>
  );
}
