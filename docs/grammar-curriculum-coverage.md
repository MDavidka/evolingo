# EvoLingo English Grammar Curriculum — Coverage Report

**Audit date:** 22 October 2026  
**Scope:** The 59-topic “Angol nyelvtan B2 – Erasmus” syllabus supplied for the learning path.

## Executive summary

| Metric | Result |
|---|---:|
| Syllabus topics checked | 59 |
| Topics with learnable instructional coverage after this change | **59 / 59 (100%)** |
| Previously missing or insufficient topics now covered | **44 / 44** |
| Supplementary topic modules upgraded with expanded instructional content | 53 |
| Existing core lesson modules retained | 10 |
| Unique syllabus topics still missing | **0** |

The app already contained 53 supplementary topic entries, but most only had a short summary and two versions of essentially the same question. This change turns those entries into more useful lessons: a meaning/use explanation, a form/pattern section, contextual examples with Hungarian translations, and a common-error section. Each supplementary lesson has both a multiple-choice item and a Hungarian-to-English translation item.

The 53 supplementary modules overlap with topics already taught in the 10 core lessons. Those repeats are intentional reinforcement, not additional unique syllabus topics. The 44 remaining unique syllabus topics are now covered by the supplementary modules; the overlapping entries also received richer lesson content.

## Coverage by syllabus section

### 1. Tenses — 11/11

| Topic | Learnable module |
|---|---|
| Present Simple | Core lesson #1 |
| Present Continuous | Core lesson #2 |
| Past Simple | Core lesson #3 |
| Past Continuous | Core lesson #4 |
| Present Perfect Simple | Supplementary #11 |
| Present Perfect Continuous | Supplementary #12 |
| Past Perfect Simple | Supplementary #13 |
| Future Simple | Core lesson #5 |
| Future Continuous | Supplementary #14 |
| Future Perfect Simple | Core lesson #6; reinforcement #15 |
| Be going to | Supplementary #16; also contrasted in core lesson #5 |

### 2. Quantifiers — 8/8

| Topic | Learnable module |
|---|---|
| Some / Any | Core lesson #7 |
| Much / Many | Core lesson #8; reinforcement #17 |
| A few / A little | Supplementary #18 |
| Few / Little | Supplementary #19 |
| A lot of / Lots of | Supplementary #20; also introduced in core lesson #8 |
| Enough | Supplementary #21 |
| Too much / Too many | Supplementary #22 |
| Countable / Uncountable Nouns | Supplementary #23; also introduced in core lesson #8 |

### 3. Adjectives and adverbs — 4/4

| Topic | Learnable module |
|---|---|
| Comparative Adjectives | Core lesson #9; reinforcement #24 |
| Superlative Adjectives | Core lesson #9; reinforcement #25 |
| Adjectives and Adverbs | Supplementary #26 |
| Irregular Comparatives and Superlatives | Supplementary #27; also introduced in core lesson #9 |

### 4. Conditionals — 4/4

| Topic | Learnable module |
|---|---|
| Zero Conditional | Supplementary #28 |
| First Conditional | Core lesson #10; reinforcement #29 |
| Second Conditional | Supplementary #30 |
| Third Conditional | Supplementary #31 |

### 5. Auxiliary verbs and possession — 5/5

| Topic | Learnable module |
|---|---|
| Have / Has | Supplementary #32 |
| Do / Does | Supplementary #33 |
| Have got / Has got | Supplementary #34 |
| Possessive Adjectives | Supplementary #35 |
| Possessive Pronouns | Supplementary #36 |

### 6. Modal verbs — 7/7

| Topic | Learnable module |
|---|---|
| Can / Could | Supplementary #37 |
| May / Might | Supplementary #38 |
| Must | Supplementary #39 |
| Have to / Has to | Supplementary #40 |
| Should / Ought to | Supplementary #41 |
| Mustn't / Don't have to | Supplementary #42 |
| Would | Supplementary #43 |

### 7. Other grammar structures — 20/20

| Topic | Learnable module |
|---|---|
| Used to | Supplementary #44 |
| Passive Voice | Supplementary #45 |
| Reported Speech | Supplementary #46 |
| Relative Clauses | Supplementary #47 |
| Gerunds and Infinitives | Supplementary #48 |
| Articles | Supplementary #49 |
| Prepositions | Supplementary #50 |
| Question Tags | Supplementary #51 |
| Word Formation | Supplementary #52 |
| Phrasal Verbs | Supplementary #53 |
| Conjunctions and Linking Words | Supplementary #54 |
| Too / Enough | Supplementary #55 |
| So / Such | Supplementary #56 |
| Both / Either / Neither | Supplementary #57 |
| Reflexive Pronouns | Supplementary #58 |
| Question Forms | Supplementary #59 |
| Direct and Indirect Questions | Supplementary #60 |
| Present and Past Habits | Supplementary #61 |
| Inversion | Supplementary #62 |
| Wishes and Regrets | Supplementary #63 |

## What changed in the app

- **53 supplementary grammar lessons** now contain four instructional sections: meaning/use, formation, contextual examples, and common mistakes.
- Each guide includes two example sentences with Hungarian translations.
- Each supplementary lesson now uses two different practice formats: multiple choice and translation, instead of repeating the same fill-in-the-blank prompt.
- Existing core lessons and the learning-path UI were preserved.
- Supplementary lessons keep their existing IDs (11–63), so the path-generation logic can continue using the lesson registry.

## Verification and limitations

This is a static audit of the lesson registry and instructional content. All 53 supplementary topics have a matching guide entry, and the syllabus mapping above covers all 59 unique syllabus topics. **No syllabus topics remain missing in the content map.**

The repository's `package.json` does not define an automated test suite (the test script is a placeholder). This report does not claim that a production build or a full device-level click-through test has been run. A build/runtime check should be run in the project's deployment environment to verify rendering, question completion, saving, and lesson unlock behavior.
