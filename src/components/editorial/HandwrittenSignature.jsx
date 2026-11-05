import { useId } from "react";
import signature from "../../data/signature-strokes.json";

const WRITE_PACE = 0.2;

export default function HandwrittenSignature({ write = true }) {
  const id = useId();
  return (
    <span className="ed-signature-artwork" data-ed-reveal={write || undefined}>
      <span className="ed-signature-label">Abhimanyu Sharma</span>
      <svg
        className="ed-signature-drawing"
        viewBox={signature.viewBox}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {signature.glyphs.map((glyph, index) => (
            <mask
              key={index}
              id={`${id}-pen-${index}`}
              maskUnits="userSpaceOnUse"
              x={glyph.bounds.x}
              y={glyph.bounds.y}
              width={glyph.bounds.width}
              height={glyph.bounds.height}
            >
              {glyph.strokes.map((stroke, strokeIndex) => (
                <path
                  key={strokeIndex}
                  className="ed-signature-stroke"
                  d={stroke.d}
                  pathLength="1"
                  strokeWidth={glyph.width}
                  style={{
                    "--write-delay": `${Math.max(0, stroke.delay - 220) * WRITE_PACE}ms`,
                    "--write-duration": `${stroke.duration * WRITE_PACE}ms`,
                  }}
                />
              ))}
            </mask>
          ))}
        </defs>
        {signature.glyphs.map((glyph, index) => (
          <path
            key={index}
            d={glyph.ink}
            fill="currentColor"
            mask={`url(#${id}-pen-${index})`}
          />
        ))}
      </svg>
    </span>
  );
}
