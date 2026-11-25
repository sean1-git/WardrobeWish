# Model assets

## Individual moving models

The current page uses six separately clipped model figures on a fixed background. Each figure glides independently from left to right, starting deeper inside the screen and moving toward the viewer on exit. One person rests centered in a soft spotlight at a time. CSS transforms use translation with perspective and no rotation. SVG framing centers each person and aligns the soles without changing the image files. The built-in image generation tool removed the backgrounds from the three existing pair photographs, preserving the people and outfits. All three inputs were inspected before editing.

Final transparent sprite assets (1122 × 1402 pixels, WebP quality 90 with alpha preserved):
- `public/model-pair-01.webp`: charcoal/plum and sand/lime models.
- `public/model-pair-02.webp`: burgundy/cream and olive/stone models.
- `public/model-pair-03.webp`: indigo/black and camel/navy models.

Each sprite has one complete model in each half. The website clips each half separately; photo backgrounds never move with the figures. Unused source photographs were removed during cleanup; their previous versions remain in the original Site repository history.

### Final background-extraction prompt

Use case: background-extraction. Asset type: transparent two-person fashion sprite atlas for a website; each person will be independently clipped and animated. Edit target: the attached photograph. Remove ONLY the entire studio background and floor, leaving exactly the two existing adult models as photorealistic full-body cutouts on actual transparent alpha. Preserve each person's face, hair, skin, outfit, pose, fabric detail, shoes, and original left/right order. Keep the full body of the left model wholly inside the left half of the canvas, and the full body of the right model wholly inside the right half, with a clear transparent gap at the exact middle. No touching, no overlap, no cropped hair or shoes. Maintain the original portrait 4:5 canvas proportions and original relative scale and placement. Transparent margins above heads and below soles. Remove ground shadows and all residual background between limbs and clothing; retain clean natural hair and garment edges. No floor, no backdrop, no checkerboard drawn into the image, no added objects, no text, no logos.

## Earlier pair photographs

The earlier carousel used six adult models across three pairs. Its original pair was stored as `public/look-01.webp`. The four additional models were created using the built-in image generation tool, with `public/campaign.png` as a visual reference. The original was inspected before generation. Sharp exports preserve the full framing and use WebP quality 86.

Historical assets (removed from the current checkout):
- `public/look-01.webp`: original charcoal/plum and sand/lime pair.
- `public/look-02.webp`: burgundy/cream and olive/stone pair.
- `public/look-03.webp`: indigo/black and camel/navy pair.

Each historical asset was 1122 × 1402 pixels. Source images and prior exports remain recoverable from the original Site repository history; the current page only needs the three transparent model sprites listed above.

## Final prompt for look 2

Use case: photorealistic-natural. Asset type: a portrait editorial fashion photograph for one face of a 3D revolving-door website carousel. The attached image is a style, lighting, camera and background reference ONLY. Create a NEW photograph of exactly two different adult fashion models; do not reuse the two people or outfits in the reference. Match the reference's pale cool gray-green seamless studio floor/background, natural soft editorial light, front-view full-body framing, realistic fabric and restrained independent fashion campaign art direction. Portrait 4:5 composition; both complete bodies and shoes in frame, modest space above heads and below feet, balanced left-right spacing, subjects standing separately and looking in slightly different directions. No text, no logos, no borders, no actual carousel or door, no props, no shadows cast on a wall. Natural skin and fabric detail, not glossy or plastic. Cast and wardrobe: on the left, an adult South Asian woman with shoulder-length dark wavy hair, a deep burgundy relaxed crew-neck knit, cream wide-leg tailored trousers, and dark brown loafers. On the right, an adult light-skinned man with close-cropped hair, an olive oversized utility jacket over a black T-shirt, stone wide-leg cargo trousers, and worn off-white low-top sneakers. Relaxed confident asymmetrical poses. No handbags.

## Final prompt for look 3

Use case: photorealistic-natural. Asset type: a portrait editorial fashion photograph for one face of a 3D revolving-door website carousel. The attached image is a style, lighting, camera and background reference ONLY. Create a NEW photograph of exactly two different adult fashion models; do not reuse the two people or outfits in the reference. Match the reference's pale cool gray-green seamless studio floor/background, natural soft editorial light, front-view full-body framing, realistic fabric and restrained independent fashion campaign art direction. Portrait 4:5 composition; both complete bodies and shoes in frame, modest space above heads and below feet, balanced left-right spacing, subjects standing separately and looking in slightly different directions. No text, no logos, no borders, no actual carousel or door, no props, no shadows cast on a wall. Natural skin and fabric detail, not glossy or plastic. Cast and wardrobe: on the left, an adult Black woman with short natural textured hair, an indigo boxy denim jacket over a white tee, a long straight black skirt, and black ankle boots. On the right, an adult Latino man with loose dark curls, a camel relaxed knit polo, navy pleated wide-leg trousers, and dark brown leather loafers. Relaxed confident asymmetrical poses. No handbags.
