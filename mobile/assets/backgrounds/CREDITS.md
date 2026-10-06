# Background image credits

Every file in this folder needs a row here before it is committed. Only photos from
Unsplash (Unsplash License) or Pexels (Pexels License) are allowed; never Getty,
Shutterstock, Adobe Stock, Dreamstime or Alamy.

Rules for a photo to qualify:

- Calm and non-threatening: no traffic jams, rubble, dark alleys, protests or political
  scenes (so no university campus photos).
- No clearly identifiable faces; people only from behind or in silhouette.
- Stays readable under the overlay and works as a portrait crop of about 1080×2340. The
  overlay is 0.55 by default and can be raised per photo up to 0.65 (`overlayOpacity` in
  `mobile/theme/backgrounds.ts`); record the value used and the lowest contrast it gives.
- Stored as WebP, about 1080×2340, 200 KB or less.
- Used only on welcome, sign-in/sign-up, onboarding and empty-state screens (see
  `mobile/theme/backgrounds.ts`).

When a photographer asks for credit on the source page, the credit must also appear in the
app, not only in this file.

| File                       | Source                                                                                                                                | Photographer                                                      | License        | Downloaded | Changes                                                                                                                                                                                        | Overlay | Lowest contrast |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- |
| `welcome.webp`             | [Pexels 298366](https://www.pexels.com/photo/city-landscape-during-nighttime-298366/)                                                 | [Humaied Ullah](https://www.pexels.com/@humaied)                  | Pexels License | 2026-10-01 | Portrait crop 1080×2340 from the 2340 px-tall rendition (left edge at x=760, which leaves out the photographer's watermark), WebP q82, metadata stripped                                       | 0.58    | 4.62:1          |
| `auth.webp`                | [Pexels 913612](https://www.pexels.com/photo/beautiful-bangladesh-golden-sunset-landscape-river-913612/)                              | [Humaied Ullah](https://www.pexels.com/@humaied)                  | Pexels License | 2026-10-01 | Portrait crop 1080×2340 from the 2340 px-tall rendition (left edge at x=780, keeps the sun and the boat), WebP q82, metadata stripped                                                          | 0.58    | 4.52:1          |
| `onboarding-student.webp`  | [Pexels 8549213](https://www.pexels.com/photo/person-holding-an-umbrella-walking-on-a-rice-field-8549213/)                            | [Janntul Hasan](https://www.pexels.com/@janntul-hasan-74914009/)  | Pexels License | 2026-10-06 | Portrait crop 1080×2340 from the 2340 px-tall rendition (left edge at x=1780, keeps the walker with the umbrella), light blur (σ 0.8) to stay under 200 KB, WebP q70, metadata stripped        | 0.55    | 4.67:1          |
| `onboarding-working.webp`  | [Pexels 19387247](https://www.pexels.com/photo/people-in-train-during-rain-19387247/)                                                 | [Rabeebur Rahman](https://www.pexels.com/@rabeebur/)              | Pexels License | 2026-10-06 | Portrait crop 1080×2340 from the 2340 px-tall rendition (left edge at x=1360, two middle windows; leaves out the window with a visible face), WebP q80, metadata stripped                      | 0.58    | 4.55:1          |
| `onboarding-guardian.webp` | [Pexels 17686729](https://www.pexels.com/photo/mother-in-traditional-clothing-walking-with-child-near-huge-tree-in-village-17686729/) | [Faruk Hossain](https://www.pexels.com/@faruk-hossain-306416520/) | Pexels License | 2026-10-06 | Portrait crop 1080×2340 from the 2340 px-tall rendition (left edge at x=1900, keeps the mother and child seen from behind), light blur (σ 1) to stay under 200 KB, WebP q55, metadata stripped | 0.58    | 4.63:1          |

None of the source pages ask for credit, so no in-app credit is shown. Lowest contrast is white
text at the brightest spot of the photo under its overlay, as measured by
`pnpm check:contrast`; the gradient in `Screen` only darkens further.
