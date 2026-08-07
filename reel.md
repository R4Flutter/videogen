# REEL — BTK: THE FLOPPY DISK

The 9:16 cut of `story.txt`. The reel lives in story.txt itself, as the nine
`# SHORT — …` sections at the bottom of the file; this is the strategy behind
them and the metadata that ships with the upload.

**Style:** Deep Dive (mechanism-led), cut at Punchy pace — 9 beats in ~60s.
**Hook strategy:** Curiosity Gap / Mechanism Reveal, over a Specificity Slam.
**Loop:** the last line ("He asked police if the technology was safe") closes on
the hook's second line ("Then he asked them for technical advice").

## Hooks considered

- **A (used):** "For thirty-one years, Wichita police could not name BTK. Then he
  asked them for technical advice." — 31 years is the specificity, "technical
  advice" is the gap. Nine words to the turn.
- **B:** "He mailed police the evidence that named him. They just had to lie
  first." — stronger dark irony, weaker mechanism: it gives away the ending
  before the viewer knows what a floppy disk has to do with anything.

## Beats

| # | Module | On screen | Line |
|---|--------|-----------|------|
| 101 | EVIDENCE_CARD | BTK — UNIDENTIFIED SINCE 1974 · 31 YEARS | the hook |
| 102 | TEXT_MESSAGE | BTK — CAN A FLOPPY DISK BE TRACED? · POLICE — NO | the ask, and the lie |
| 103 | METADATA | METADATA | the mechanism |
| 104 | DOCUMENT | BTK.TXT — DELETED, RECOVERED | the deleted file |
| 105 | CASE_BOARD | FLOPPY DISK → LUTHERAN CHURCH → DENNIS | the chain |
| 106 | PERSON_CARD | DENNIS RADER — CHURCH COUNCIL PRESIDENT | the name |
| 107 | CASE_STATUS | ARRESTED — FEBRUARY 25, 2005 | the outcome |
| 108 | SPLIT_COMPARE | LETTERS 1974–1991 vs ONE FLOPPY DISK 2005 | the contrast |
| 109 | REVEAL | THE CLUE CAME FROM HIM | the callback, music out |

## Upload metadata

**Caption hook:** He spent thirty years making sure police never learned his
name, then asked them for tech support.

**Keywords:** #truecrime #btk #forensics #digitalforensics #coldcase

**Thumbnail text:** THE CLUE CAME FROM HIM

## Rebuild

```
npm run story                                    # story.txt -> script.json
..\.venv-tts\Scripts\python ..\tools\voice.py --track short
python ..\tools\align.py --track short           # the voice is the clock
npx remotion render CrimeShort ..\final.mp4
```
