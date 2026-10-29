# Evölingo optional Pixabay sound pack

Evölingo ships with original low-volume, segmented Web Audio cues for offline use.
There are **no Pixabay MP3 files in this directory by default**.

To install a reviewed Pixabay sound pack, download the tracks from the original
creator pages (use **Free download**, confirm the current Pixabay Content License),
rename the files as below, and place them here. Then enable the
`NEXT_PUBLIC_EVO_PIXABAY_SOUND_PACK=1` build-time environment variable and rebuild.
The app will use the corresponding MP3 instead of its Web Audio cue.

| File | Suggested Pixabay sound | Source |
| --- | --- | --- |
| `tab.mp3` | Minimal Pop Click UI 2 · floraphonic | https://pixabay.com/sound-effects/film-special-effects-minimal-pop-click-ui-2-198302/ |
| `select.mp3` | Minimal Pop Click UI 10 · floraphonic | https://pixabay.com/sound-effects/film-special-effects-minimal-pop-click-ui-10-198310/ |
| `open.mp3` | Casual Click Pop UI 2 · floraphonic | https://pixabay.com/sound-effects/film-special-effects-casual-click-pop-ui-2-262119/ |
| `correct.mp3` | Minimal Pop Click UI 8 · floraphonic | https://pixabay.com/sound-effects/film-special-effects-minimal-pop-click-ui-8-198308/ |
| `complete.mp3` | Minimal Pop Click UI 12 · floraphonic | https://pixabay.com/sound-effects/film-special-effects-minimal-pop-click-ui-12-198312/ |
| `notification.mp3` | Notification Click Sound · DRAGON-STUDIO | https://pixabay.com/sound-effects/technology-notification-click-sound-455421/ |

Pixabay license summary: https://pixabay.com/service/license-summary/
Record the creator and original URL for each downloaded asset; do not assume
downloads from other sources inherit this license.

Notes:
- Use compact edited clips around 0.1–0.35 seconds when appropriate.
- Normalize quietly (approximately −20 LUFS); do not play loud SFX on every keypress.
- If a file is missing with the environment flag enabled, the browser will skip it.
- Other actions (wrong answer, swipe, flip, chest, etc.) retain synthesized cues.
