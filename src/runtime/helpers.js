// Shared scroll timeline utility used by the current editorial portfolio.
export function createPortfolioScrollMotion(name, scope) {
  if (
    typeof ScrollTimeline !== "function" ||
    !CSS.supports("animation-range-start", "1px")
  )
    return null;
  let timeline;
  try {
    timeline = new ScrollTimeline({
      source: document.scrollingElement,
      axis: "block",
    });
  } catch {
    return null;
  }
  let animations = [],
    sequence = 0;
  const clear = () => {
    animations.forEach((entry) => entry.animation.cancel());
    animations = [];
  };
  scope?.cleanup(clear);
  return {
    get active() {
      return animations.length > 0;
    },
    clear,
    set(effects) {
      const next = [],
        unused = [...animations],
        created = [];
      try {
        effects.forEach(
          ({ element, keyframes, start, end, easing = "linear", key }) => {
            if (!element || !Number.isFinite(start) || !(end > start)) return;
            const signature = JSON.stringify({ keyframes, start, end, easing });
            // A decoded neighbour or an unchanged resize measurement must not
            // restart an effect that already owns the current scroll position.
            const previous = unused.findIndex(
              (entry) =>
                entry.element === element && entry.signature === signature,
            );
            if (previous >= 0) {
              next.push(unused.splice(previous, 1)[0]);
              return;
            }
            // A loading caption can change its final keyframe on the same clock.
            if (key !== undefined) {
              const reusable = unused.findIndex(
                (entry) =>
                  entry.element === element &&
                  entry.key === key &&
                  entry.start === start &&
                  entry.end === end &&
                  entry.easing === easing,
              );
              if (reusable >= 0) {
                const entry = unused.splice(reusable, 1)[0];
                entry.animation.effect.setKeyframes(keyframes);
                entry.signature = signature;
                next.push(entry);
                return;
              }
            }
            const animation = (
              scope
                ? scope.animate.bind(scope, element)
                : element.animate.bind(element)
            )(keyframes, {
              timeline,
              duration: "auto",
              fill: "both",
              easing,
              rangeStart: `${start}px`,
              rangeEnd: `${end}px`,
            });
            animation.id = `${name}-${++sequence}`;
            created.push(animation);
            next.push({
              element,
              signature,
              animation,
              key,
              start,
              end,
              easing,
            });
          },
        );
      } catch {
        created.forEach((animation) => animation.cancel());
        clear();
        return false;
      }
      unused.forEach((entry) => entry.animation.cancel());
      animations = next;
      return animations.length > 0;
    },
  };
}

// A short photographic lead-in on the existing document timeline. The
// stationary art window owns clipping; its image child supplies the drift.
// This creates an effect description, not another listener or animation clock.
