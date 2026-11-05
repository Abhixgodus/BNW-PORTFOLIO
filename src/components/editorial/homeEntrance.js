const EASE = "cubic-bezier(.2,.75,.25,1)";
export const HERO_TEXT_EASE = "cubic-bezier(.65,0,.25,1)";
export const HERO_TEXT_EXIT_EASE = HERO_TEXT_EASE;
let inkContext;

export function heroLineReveal(line) {
  const css = getComputedStyle(line);
  const context = (inkContext ||= document
    .createElement("canvas")
    .getContext("2d"));
  context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
  const text =
    css.textTransform === "uppercase"
      ? line.textContent.toUpperCase()
      : line.textContent;
  const ink = context.measureText(text);
  const baseline =
    (parseFloat(css.lineHeight) -
      ink.fontBoundingBoxAscent -
      ink.fontBoundingBoxDescent) /
      2 +
    ink.fontBoundingBoxAscent;
  const mask = line.parentElement.getBoundingClientRect();
  const origin =
    line.getBoundingClientRect().top -
    mask.top -
    new DOMMatrixReadOnly(css.transform).m42;
  const bottom = Math.max(
    0,
    mask.height - origin - baseline - ink.actualBoundingBoxDescent - 3,
  );
  return {
    hidden: `inset(${Math.ceil(mask.height - bottom)}px -20% ${bottom}px -20%)`,
    mask: `inset(${Math.min(0, Math.floor(origin + baseline - ink.actualBoundingBoxAscent - 3))}px -20% ${bottom}px -20%)`,
  };
}

export function measureHomeEntrance(root, loader) {
  if (!loader) return null;
  const front = root.querySelector('[data-hero-print="0"]');
  const box = front.getBoundingClientRect();
  loader.style.setProperty("--intro-x", box.left + box.width / 2 + "px");
  loader.style.setProperty("--intro-bottom", box.bottom + "px");
  loader.style.setProperty("--intro-height", box.height + "px");
  return box;
}

export function paintHomeProgress(loader, progress, height) {
  if (!loader) return;
  const value = Math.max(0, Math.min(1, progress));
  loader.firstElementChild.textContent = Math.round(value * 100) + "%";
  loader.firstElementChild.style.transform = `translate(-100%, ${-height * value}px)`;
  loader.lastElementChild.style.transform = `scaleY(${value})`;
}

export function playHomeEntrance(root, loader, onComplete) {
  const animations = [];
  const loading = Boolean(loader);
  let complete = false;
  const finish = () => {
    if (complete) return;
    complete = true;
    root.classList.add("has-entered");
    root.classList.remove("is-intro-playing");
    if (loader) loader.hidden = true;
    animations.forEach((animation) => animation.cancel());
    onComplete();
    root.dispatchEvent(new Event("ed:entrance-complete"));
  };
  const animate = (element, frames, duration, delay = 0, easing = EASE) => {
    if (!element) return;
    const animation = element.animate(frames, {
      duration,
      delay,
      easing,
      fill: "both",
    });
    animation.id = "ed-home-intro";
    animations.push(animation);
    return animation;
  };
  root.classList.add("is-intro-playing");
  if (loading) {
    measureHomeEntrance(root, loader);
    loader.classList.add("is-unveiling");
    for (const part of loader.children)
      animate(part, { opacity: [1, 0] }, 420, 60, "cubic-bezier(.4,0,.2,1)");
    const prints = [...root.querySelectorAll("[data-hero-print]")];
    const front = prints.find((print) => print.dataset.heroPrint === "0");
    animate(
      front,
      {
        opacity: [1, 1],
        clipPath: ["inset(0 calc(50% - .5px))", "inset(0 0)"],
      },
      760,
      200,
      "cubic-bezier(.4,0,.2,1)",
    );
    prints.forEach((print) => {
      const index = Number(print.dataset.heroPrint);
      if (!index) return;
      animate(
        print,
        [
          { opacity: 0, transform: "translate(0, 0) rotate(0deg)" },
          { opacity: 1, transform: getComputedStyle(print).transform },
        ],
        760,
        610 + (index - 1) * 36,
      );
    });
    const lines = [...root.querySelectorAll(".ed-hero-title > span > span")];
    const reveals = lines.map(heroLineReveal);
    lines.forEach((line, index) => {
      const reveal = reveals[index];
      animate(
        line.parentElement,
        { clipPath: [reveal.hidden, reveal.mask] },
        980,
        1030 + index * 95,
      );
      animate(line, { opacity: [1, 1] }, 980, 1030 + index * 95);
    });
    animate(root.querySelector(".fg-header"), { opacity: [0, 1] }, 650, 1060);
    animate(
      root.querySelector(".ed-hero-bottom"),
      { opacity: [0, 1] },
      980,
      1325,
    );
  } else {
    const fadeEase = "cubic-bezier(.4,0,.2,1)";
    const prints = [...root.querySelectorAll("[data-hero-print]")].sort(
      (a, b) => Number(a.dataset.heroPrint) - Number(b.dataset.heroPrint),
    );
    prints.forEach((print, index) => {
      // Keep the front print opaque before any photograph behind it appears.
      const delay = index === 0 ? 0 : 760 + (index - 1) * 140;
      animate(print, { opacity: [0, 1] }, 760, delay, fadeEase);
    });
    root
      .querySelectorAll(".ed-hero-title > span > span")
      .forEach((line, index) => {
        animate(line, { opacity: [0, 1] }, 1000, 300 + index * 200, fadeEase);
      });
    animate(
      root.querySelector(".ed-hero-bottom"),
      { opacity: [0, 1] },
      1000,
      900,
      fadeEase,
    );
  }
  Promise.all(animations.map((animation) => animation.finished)).then(
    finish,
    () => {},
  );
  return {
    finish,
    cancel() {
      complete = true;
      if (loader) loader.hidden = true;
      animations.forEach((animation) => animation.cancel());
      root.classList.remove("is-intro-playing");
    },
  };
}
