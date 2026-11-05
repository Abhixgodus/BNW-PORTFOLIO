const EASE = "cubic-bezier(.4,0,.2,1)";

export function playPageEntrance(root) {
  const animations = [];
  const cancel = () => animations.forEach((animation) => animation.cancel());
  const finish = () => {
    root.classList.add("has-entered");
    cancel();
  };
  const animate = (element, frames, duration, delay = 0) => {
    if (!element) return;
    const animation = element.animate(frames, {
      duration,
      delay,
      easing: EASE,
      fill: "both",
    });
    animation.id = "ed-page-opening";
    animations.push(animation);
    return animation;
  };
  root
    .querySelectorAll(
      "[data-about-enter], [data-contact-enter], [data-journal-enter]",
    )
    .forEach((element, index) => {
      animate(element, { opacity: [0, 1] }, 700, index * 120);
    });
  if (animations.length) animations.at(-1).finished.then(finish, () => {});
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
