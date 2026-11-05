# Journal implementation

The new journal extends the black portfolio. It uses the supplied post templates for the reading rhythm and Covent Garden for the index sequence, without importing their fonts, branding or sample text.

- Palette: existing black `#000000`, white `#ffffff`, body `#c2c2bf`, secondary text `#a4a4a1`, neutral rule `#343432`. A quiet `#101010` surface distinguishes the search and featured sections.
- Type: existing Cormorant Unicase for titles; Raleway for readable paragraphs and controls; Pinyon Script for the short introduction; Brittany Signature only for the existing identity.
- Layout: centered title, two square opening photographs, a statement/search band, three latest entries, one broad featured story, subject links and a small author section. Headlines align with photograph edges. Article text stays within 68 characters per line and alternates with wider and narrower photographs.

```text
shared header
           THE JOURNAL
       photograph | photograph
       story      | story
statement         | search + subjects
         LATEST ENTRIES
     story | story | story
       wide featured photograph
       title       | introduction
       subjects / about the author
shared photograph strip + footer
```

On phones the columns become a single reading sequence. Photographs retain their full composition inside posts; only index thumbnails use a cover crop. Search and subject filters expose all six entries, with a clear empty state and reset. Each article has a real route, previous/next links and copy/email sharing.

Motion is opacity only, using the existing page and scroll controller. There are no image zooms, cursor effects or new loading screens. Reduced motion shows content immediately. The existing Home/Gallery transition and Publications controller retain ownership of their animations.

The first six supplied titles are used. New prose describes the existing photographs and the photographer's stated approach. No invented interviews, itineraries, publication claims, comment system or photograph dates are added.

## Journal index refinement, 2026-11-05

Retain the five existing color roles and local type families above. The requested changes are specific to the index: wider gaps between latest-entry and subject photographs; a centered search composition with 142px of equal desktop padding; the supplied bridge photograph and Kumartuli cover as quiet monochrome backgrounds. Search subjects use text contrast and weight for selection, without underlines.

The author composition follows the supplied template rather than the former two-column biography:

```text
ABOUT       |                 | THIS IS WHERE
   ME       | new camera      | I WRITE ABOUT
short bio   | portrait        | THE PHOTOGRAPHS.
solid CTA   |                 |
```

Use the supplied IMG_8003 portrait at its native proportions, preserve the camera and hair, and use the homepage's light rectangular button. Desktop author spacing is symmetric at 125px. At smaller widths the three parts become one centered reading sequence. The only new motion is the requested subject-image hover/focus response: monochrome to color with a small, reversible zoom; reduced motion omits that zoom. Existing entry/scroll fades remain unchanged.

Latest spacing pass: the author now has equal 214px top/bottom margins at the annotated desktop width, scaling down for tablets and phones. Subject-section margins are 70px above and 57px below on desktop, with the existing responsive top padding reduced by 2px (125.26px at 1414px). Phone margins are 45px/35px so the extra desktop air does not turn into long blank stretches on small screens.
