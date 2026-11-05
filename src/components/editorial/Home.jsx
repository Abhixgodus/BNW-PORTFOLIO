import { useEffect, useRef } from "react";
import { preloadCollection } from "./usePhotoViewer.js";
import HomeJournal from "./HomeJournal.jsx";
import HomeHero from "./HomeHero.jsx";
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
      <HomeHero />
      <HomeJournal openCollection={openCollection} prefetch={prefetch} />
    </>
  );
}
