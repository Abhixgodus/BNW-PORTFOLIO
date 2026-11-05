import { useCallback, useState } from "react";
const modules = import.meta.glob("../../data/collections/*.json");
const requests = new Map();
export function preloadCollection(slug) {
  if (!requests.has(slug)) {
    const load = modules["../../data/collections/" + slug + ".json"];
    if (!load) return Promise.reject(new Error("Unknown collection"));
    requests.set(
      slug,
      load().catch((error) => {
        requests.delete(slug);
        throw error;
      }),
    );
  }
  return requests.get(slug);
}
export function usePhotoViewer() {
  const [viewer, setViewer] = useState(null);
  const close = useCallback(() => setViewer(null), []);
  const change = useCallback(
    (delta) =>
      setViewer((value) =>
        value
          ? {
              ...value,
              index: value.gallery
                ? Math.max(
                    0,
                    Math.min(value.set.length - 1, value.index + delta),
                  )
                : (value.index + delta + value.set.length) % value.set.length,
            }
          : null,
      ),
    [],
  );
  const jump = useCallback(
    (index) => setViewer((value) => (value ? { ...value, index } : null)),
    [],
  );
  const openSet = useCallback(
    (set, index) => setViewer({ set, index, loading: false }),
    [],
  );
  const openCollection = useCallback((item, presentation = {}) => {
    // A late response must never replace a newer or reopened album.
    const request = {};
    setViewer({
      set: item.frames,
      index: 0,
      slug: item.slug,
      request,
      loading: true,
      title: item.title,
      count: item.count,
      ...presentation,
    });
    preloadCollection(item.slug)
      .then((module) => {
        const data = module.default || module;
        const set = data.photos.map((frame, index) => ({
          src: "/" + frame.src.replace(/^\/+/, ""),
          name: frame.title,
          alt: frame.alt,
          collection: item.title,
          width: frame.width,
          height: frame.height,
          preview: "/_concept/albums/" + item.slug + "/" + index,
        }));
        setViewer((current) =>
          current?.request === request
            ? {
                ...current,
                set,
                index: Math.min(current.index, set.length - 1),
                loading: false,
              }
            : current,
        );
      })
      .catch(() =>
        setViewer((current) =>
          current?.request === request
            ? { ...current, loading: false }
            : current,
        ),
      );
  }, []);
  return { viewer, close, change, jump, openSet, openCollection };
}
