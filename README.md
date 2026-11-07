# Luc Brun — AI safety, research & engineering

Personal website and CV, in English and French. Research, publications, industrial work, projects, skills and recommendations, connected through a living spatial atlas: 63 notes and 107 documented relationships.

## Run locally

Open `index.html` in a modern browser. No build step, dependencies or backend are required.

## GitHub Pages

Select **Settings → Pages → Source → Deploy from a branch**, then choose **main** and **/(root)**. The site is static and requires no custom Actions workflow or build step. Keep `.nojekyll` and all assets alongside `index.html`. Relative URLs also support project-site deployment.

## Files

- `index.html` / `cv.html`, `style.css`, `app.js`, `polish.css`: content, responsive layout, languages, filters and contact form. The two entry points show the same site; `cv.html` points to the home page with its canonical link.
- `knowledge-data.js`: bilingual notes, sources and real relationships. Keep the note IDs and content targets synchronized when editing.
- `atlas.js`, `atlas.css`: spatial projection, neural fibres and signals, local connections view, second-degree exploration, bilingual search, navigation history, shortest connection paths, zoom and accessible native note buttons.
- `network.css`, `knowledge.css`: shared layout and component styles. Older `network.js` and `knowledge.js` remain for cached clients, but are no longer loaded by the current pages.
- `Luc-Brun-CV.pdf`: Luc’s original LaTeX CV, supplied as a PDF. The language-independent download uses this original file. `Luc-Brun-CV-FR.pdf` retains the same file for older links.
- `publication-first-page.png`: first page of the original research paper, https://arxiv.org/abs/2405.00632.
- `dm-sans-*.ttf`, `FONT-LICENSE.txt`: DM Sans fonts, SIL Open Font License.

## Contact

[LinkedIn](https://www.linkedin.com/in/luc-brun/) · [GitHub](https://github.com/Luckyluuuc)

## Contact form

The contact section uses a native HTML POST form with [FormSubmit](https://formsubmit.co/), keeping the displayed page free of a direct email address. Name, reply email and message are required. Spam protection is handled by FormSubmit, with an additional honeypot field. Successful submissions return to `merci.html`.

**Owner activation is required:** the first submission triggers a confirmation email to the recipient. Follow the activation link before expecting visitors’ messages to arrive. Form markup and validation have been tested; recipient activation and real delivery must be confirmed by the owner.

The original downloadable LaTeX PDF is intentionally unchanged, including its contact information.

Graph labels are native HTML buttons with measured text widths and collision avoidance. Canvas draws the spatial fibres and signals; the unlabeled dendrites and surrounding fibre envelope are decorative and do not claim to be a research architecture. The research section describes the actual PhD question instead of showing a hypothetical layered model.

The renderer adapts ornamental detail to device speed, stops when offscreen or hidden, respects reduced-motion preferences, and offers manual pause controls. Mobile scrolling remains available over the hero. The certification icons are SVG line drawings so their appearance does not depend on mobile emoji fonts.

## Validation

Verified in Chromium at desktop, tablet and two mobile sizes, including reduced motion. Checks cover graph connectivity, selection and history, bilingual search, zoom, pause, deep certification links, publication preview, content filters, form validation without submitting a message, absence of horizontal overflow, and the original CV file hash. No test harness or development dependencies are shipped with the static site.
