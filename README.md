# Luc Brun — AI safety, research & engineering

Personal website and CV, in English and French. Research, publications, industrial work, projects, skills and recommendations, connected through an interactive knowledge graph.

## Run locally

Open `index.html` in a modern browser. No build step, dependencies or backend are required.

## GitHub Pages

Select **Settings → Pages → Source → Deploy from a branch**, then choose **main** and **/(root)**. The site is static and requires no custom Actions workflow or build step. Keep `.nojekyll` and all assets alongside `index.html`. Relative URLs also support project-site deployment.

## Files

- `index.html` / `cv.html`, `style.css`, `app.js`, `polish.css`: content, responsive layout, languages, filters and readability refinements.
- `knowledge-data.js`, `knowledge.js`, `knowledge.css`: connected notes, graph navigation, search, history and zoom.
- `network.js`, `network.css`: continuous visual background.
- `Luc-Brun-CV.pdf`: Luc’s original LaTeX CV, supplied as a PDF. The language-independent download uses this original file. `Luc-Brun-CV-FR.pdf` retains the same file for older links.
- `publication-first-page.png`: first page of the original research paper, https://arxiv.org/abs/2405.00632.
- `dm-sans-*.ttf`, `FONT-LICENSE.txt`: DM Sans fonts, SIL Open Font License.

## Contact

[LinkedIn](https://www.linkedin.com/in/luc-brun/) · [GitHub](https://github.com/Luckyluuuc)

## Contact form

The contact section uses a native HTML POST form with [FormSubmit](https://formsubmit.co/), keeping the displayed page free of a direct email address. Name, reply email and message are required. Spam protection is handled by FormSubmit, with an additional honeypot field. Successful submissions return to `merci.html`.

**Owner activation is required:** the first submission triggers a confirmation email to the recipient. Follow the activation link before expecting visitors’ messages to arrive. Form markup and validation have been tested; recipient activation and real delivery must be confirmed by the owner.

The original downloadable LaTeX PDF is intentionally unchanged, including its contact information.

Graph labels use measured text widths and readable SVG label backgrounds; the certification icons are SVG line drawings so their appearance does not depend on mobile emoji fonts.
