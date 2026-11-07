import entries from "./journal-posts.json" with { type: "json" };

export const journalPosts = entries;
export const journalSubjects = ["Kolkata", "Delhi", "Travel"];
export const journalHref = "/concept/journal";
export const journalSearchPhotograph = {
  src: "/gallery/PRINCEP GHAT/PRINCEPGHAT COLOUR - 24.JPG",
  preview: "/_concept/albums/princep-ghat/13",
  alt: "Vidyasagar Setu crossing the river at sunset.",
  width: 3000,
  height: 2000,
};
export const journalPortrait = {
  src: "/images/editorial/abhimanyu-journal-portrait.jpg",
  preview: "/_concept/features/abhimanyu-journal-portrait",
  alt: "Abhimanyu holding his camera beside a car in Kolkata.",
  width: 2210,
  height: 2763,
};
export const postHref = (post) => `${journalHref}/${post.slug}`;
export const findPost = (slug) =>
  journalPosts.find((post) => post.slug === slug);
export function filterPosts(query = "", subject = "All") {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return journalPosts.filter((post) => {
    const content = [
      post.title,
      post.category,
      post.location,
      post.excerpt,
      ...post.opening,
      ...post.images.map((photo) => photo.note),
      post.ending,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (subject === "All" || post.category === subject) &&
      words.every((word) => content.includes(word))
    );
  });
}
