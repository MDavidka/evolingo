# Evölingo lesson UI — agent guide

## Goal

Use one reusable, mobile-first lesson renderer for every lesson. The lesson should read like a polished learning document: ChatGPT/Notion-inspired typography, strong heading hierarchy, short readable paragraphs, restrained monochrome styling, small Lucide icons, generous spacing, clear examples and scannable grammar tables. Do not turn every piece of content into a card.

This system supports simple legacy lessons and structured block-based lesson content. Prefer `blocks` when creating or substantially revising lesson content.

## Source files

- `app/page.tsx`
  - `LessonContentBlock`, `LessonSection`, and `LessonUnit` are the TypeScript content types.
  - The `lessons` array contains lesson data.
  - `LessonIntro` is the lesson reading screen.
  - `LessonSectionContent` normalizes old section fields into blocks.
  - `LessonContentBlockView` renders typed blocks.
  - `LessonInlineText` renders inline marks.
- `app/globals.css`
  - Contains shared lesson-reader, block, table, image-layout and exercise styles.
- `docs/lesson-content.cheatsheet.json`
  - Human/agent-readable component catalogue, types, fields, image layouts and examples.
- `docs/lesson-content.schema.json`
  - JSON Schema (Draft 2020-12) for validation and editor tooling.

## Lesson data shape

A lesson has an `id`, `title`, `level`, `summary`, `sections`, and `questions`. Each section needs a `title` and should provide either `body` (legacy paragraph) or `blocks` (preferred structured content). When `blocks` is present, it is the source of truth for that section. Do not duplicate the same content in both `body` and `blocks`.

Legacy `rows`, `examples`, and `tip` are still supported. If a section has no `blocks`, the renderer converts `body`, `rows`, `examples` and `tip` into equivalent paragraph, table, example, and callout blocks. This keeps existing lessons functional while they are gradually improved.

## Component catalogue

All block objects use a required `type` field. Their full field definitions and JSON examples are in the cheatsheet and schema.

| Type | Purpose |
|---|---|
| `paragraph` | Explanatory body text; supports size and alignment variants. |
| `heading` | Subheading inside a section; level 3 or 4. |
| `example` | Prominent target-language sentence plus translation and optional note. |
| `table` | Grammar forms, endings, comparisons or structured reference data. |
| `callout` | A brief tip, reminder, warning or success note with a small icon. |
| `list` | Bullet, numbered or checklist items. |
| `image` | Illustration, full-width image, contained figure or text/image split. |
| `quote` | A highlighted phrase or memorable rule; optional attribution. |
| `formula` | Grammar pattern or reusable sentence formula. |
| `vocabulary` | Term/meaning pairs with an optional example. |
| `comparison` | Two concise sets of information shown side-by-side. |
| `divider` | A subtle visual pause between related content. |

### Image layouts

- `hero`: primary lesson illustration, near full content width.
- `full`: large image spanning the available content width.
- `contained`: centered, narrower image for diagrams or screenshots.
- `split-image-left`: image on the left and title/text on the right.
- `split-image-right`: text on the left and image on the right.
- `inline-image-left`: compact image on the left beside a short note.
- `inline-image-right`: compact image on the right beside a short note.

A split/inline layout needs a meaningful `text` property. Add an accurate `alt` description every time. Use `caption` for context not already stated in the paragraph. Use `aspect` (`wide`, `square`, `portrait`, `natural`) and `fit` (`cover` or `contain`) when relevant. On narrow screens, split/inline layouts collapse to a single column; do not rely on left/right placement to convey meaning.

## Inline marks

Strings support these lightweight patterns:

- `**bold phrase**` for a rule or key term.
- `*italic phrase*` for light emphasis.
- `==important phrase==` for restrained gray highlighting.
- Backtick-delimited text for an exact formula or token.

For fully structured text, use an array of runs, for example:

    [
      { "text": "He / She / It", "marks": ["bold"] },
      { "text": " takes " },
      { "text": "-s", "marks": ["code", "highlight"] }
    ]

Supported run marks are `bold`, `italic`, `underline`, `highlight`, `code`, and `muted`. Never add raw HTML or JSX to lesson data.

## Example section

    {
      "title": "Állító mondatok",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Az **I, you, we, they** után az ige alapformája áll."
        },
        {
          "type": "table",
          "headers": ["Alany", "Ige"],
          "rows": [
            ["I / You / We / They", "play"],
            ["He / She / It", "plays"]
          ],
          "caption": "Present Simple — állító szerkezet"
        },
        {
          "type": "example",
          "sentence": "She likes music.",
          "translation": "Szereti a zenét."
        },
        {
          "type": "callout",
          "title": "Figyelj erre",
          "text": "He, she és it esetén általában **-s** vagy **-es** kerül az igére.",
          "tone": "tip",
          "icon": "lightbulb"
        }
      ]
    }

The examples above illustrate the data shape. For production image URLs, use an existing verified asset or add the real file to the repository.

## Content design rules

1. Teach one main idea per section. Use a meaningful title such as “Mikor használjuk?” or “A mondat szerkezete”.
2. Put the explanation before examples. Add examples close to the rule they illustrate, not all at the end.
3. Use `table` for real rows and columns, not for aligning a single sentence. Use `formula` for a short reusable pattern.
4. Keep callouts short and purposeful. Do not wrap ordinary paragraphs in callouts.
5. Use sentence-length paragraphs, usually 1–3 sentences each. Split long explanations into additional `paragraph` blocks or another section.
6. Use examples with both the English sentence and the Hungarian meaning whenever helpful.
7. Use `vocabulary` for several related terms; use `list` for steps or reminders.
8. Do not make meaning depend on color. Keep the palette mostly white, near-black and muted gray; green/red are reserved for answer feedback.
9. Use images to explain a concept, not simply to decorate the page. Use `hero` for one primary illustration; use split layouts only when the text and image belong together.
10. Do not put Markdown tables, raw HTML, React component names, or CSS into lesson text. Put structured information into typed blocks.

## Exercise content

Exercise questions are typed separately from reading blocks:

- `choice`: `options` array required.
- `text`: user enters a typed answer; use `answer` and optional `accepted` alternatives.
- `arrange`: `words` array; `answer` is the expected sentence.

Every question should provide `instruction`, `prompt`, `answer`, `explanation`, and `tip`. The exercise UI now shows the explanation/tip after checking, so keep the explanation pedagogical and concise. Do not change the answer-validation logic when only editing display content.

## Quality check for every lesson

- Verify title, level, summary and every section.
- Explain the use case, form/order, spelling or common mistakes, and give clear examples where relevant.
- Check every table row and translation for correctness.
- Confirm image URLs and alt text.
- Confirm all question answers appear in `options` / `words` where required and accepted alternatives are normalized appropriately.
- Keep the learning content intact when redesigning the interface.
- Run `npm run build` and inspect the lesson at mobile widths around 320, 390 and 430 px, plus a wider desktop viewport.
- Confirm exit, reading completion, practice navigation, question checking, retry and next-question flows still work.
