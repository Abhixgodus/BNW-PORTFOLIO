const EASE = "cubic-bezier(.4,0,.2,1)";
const HERO_EASE = "cubic-bezier(.22,.61,.36,1)";

export function playPageEntrance(root) {
  const animations = [];
  const cancel = () => animations.forEach((animation) => animation.cancel());
  const finish = () => {
    root.classList.add("has-entered");
    cancel();
  };
  const animate = (element, frames, duration, delay = 0, easing = EASE) => {
    if (!element) return;
    const animation = element.animate(frames, {
      duration,
      delay,
      easing,
      fill: "both",
    });
    animation.id = "ed-page-opening";
    animations.push(animation);
    return animation;
  };
  const aboutHero = root.querySelector(".ed-about-hero");
  if (aboutHero) {
    const fade = (selector, duration, delay) =>
      aboutHero
        .querySelectorAll(selector)
        .forEach((element) =>
          animate(element, { opacity: [0, 1] }, duration, delay, HERO_EASE),
        );
    fade("[data-about-hero-image]", 1400, 0);
    fade('[data-about-hero-line="first"]', 1050, 100);
    fade('[data-about-hero-line="second"]', 1050, 400);
    fade('[data-about-hero-caption="primary"]', 950, 700);
    fade('[data-about-hero-caption="secondary"]', 950, 850);
  }
  root
    .querySelectorAll(
      "[data-about-enter], [data-contact-enter], [data-journal-enter]",
    )
    .forEach((element, index) => {
      const delay =
        element.dataset.journalEnter === "together" ? 0 : index * 120;
      animate(element, { opacity: [0, 1] }, 700, delay);
    });
  if (animations.length)
    Promise.all(animations.map((animation) => animation.finished)).then(
      finish,
      () => {},
    );
  else finish();
  return { finish, cancel };
}

// About and Contact leave quietly. Home/Gallery retain their own controller.
export function playPageExit(root) {
  const animations = [
    ...root.querySelectorAll(":scope > main, :scope > footer"),
  ].map((element) => {
    const animation = element.animate(
      { opacity: [1, 0] },
      {
        duration: 220,
        easing: EASE,
        fill: "forwards",
      },
    );
    animation.id = "ed-page-closing";
    return animation;
  });
  return {
    finished: Promise.all(animations.map((animation) => animation.finished)),
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}
