// The server-rendered Home crop and its scroll animation share this geometry.
// Percentages keep the first frame aligned before viewport measurements run.
export const PHOTO_MOTION_PRESETS = {
  home: { intensity: 3, rotation: 115, zoomStart: 0, zoomEnd: 6 },
  hero: { intensity: 19, rotation: 295, zoomStart: 0, zoomEnd: 16 },
  about: { intensity: 7, rotation: 172, zoomStart: 2, zoomEnd: 23 },
};

export function photoMotionTransform(preset, strength, progress) {
  const amount = preset.intensity * 0.005 * strength;
  const angle = (preset.rotation * Math.PI) / 180;
  const zoom =
    (preset.zoomStart + (preset.zoomEnd - preset.zoomStart) * progress) *
    0.01 *
    strength;
  const scale = 1 / (1 - amount - zoom);
  const x = Math.cos(angle) * amount * (progress - 0.5) * scale * 100;
  const y = -Math.sin(angle) * amount * (progress - 0.5) * scale * 100;
  return `translate3d(${x.toFixed(6)}%,${y.toFixed(6)}%,0) scale(${scale.toFixed(6)})`;
}
