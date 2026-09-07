# Image provenance audit

Audit of every image shipped in `public/`, done 2 September 2026.
The question each file has to answer: **is it AI-generated, or is it free of
someone else's copyright, trademark, and likeness?**

Note that "AI-generated" alone does not settle it. A generated image can still
reproduce a real logo, a real venue's trade dress, or a real person's name and
likeness, and the risk then comes from what it depicts rather than from who
drew it.

## Clear — generated, no marks, no real people

| File | Used by |
|---|---|
| `evening-track-sunset.png` | meditation.css |
| `kid-sports-mental-strength.png` | welcome.css |
| `sports-mental-strength.png` | welcome.css |
| `mental-strength-bg.png` | meditation.css |
| `zone-calm-mindset.jpg` | meditation.css |
| `zone-comeback.jpg` | meditation.css — generated in-repo by `scripts/generate-zone-art.py` |
| `characters/*.jpg`, `characters/bodies/*.png` | avatar roster — flat vector, no likeness |
| `deep-diver/images/*`, `game/images/*` | mini-game tiles and sprites |

## Removed

| File | Why |
|---|---|
| `background.jpg` | Fan-made NBA wallpaper: Josh Smith (Hawks #5) dunking over Eduardo Nájera (Bobcats #21). Real game photography, two identifiable players, Hawks logo and wordmark. Was unreferenced. |
| `frustrated-athlete.png` | Paid-stock studio portrait of an identifiable adult, no license on record. Replaced by `zone-comeback.jpg`. |
| `founder-mindzone.jpg` | Photo of a real person, unreferenced. |
| `images/nba/`, `images/mlb/`, `images/mls/` | ~60 press photographs of named professional athletes. |

## Replaced with generated art

Seven photographs had no recoverable provenance and several carried third-party
marks. Rather than guess at licensing they were regenerated from primitives by
`scripts/generate-page-art.py` — nothing is derived from another image.

| File | Was | Now |
|---|---|---|
| `bg-auth-arena.jpg` | Real arena; Toyota, Aquafina, U.S. Bank signage; Denver branding | Lane curves under stadium light |
| `bg-home-goal.jpg` | Real match photo; Derbystar ball | Goal box in perspective |
| `bg-welcome-lifting.jpg` | Identifiable adult with distinctive tattoos; Under Armour logo | Rising arc, warm accent |
| `card-mind.jpg` | Real sprinter; Brooks logo | Spark motif |
| `step-signup.jpg` | Real hands and laptop | Chevron motif |
| `step-questions.jpg` | Real runners | Target motif |
| `step-plan.jpg` | Phone home screen: Apple, Google, Meta, YouTube, Telegram icons | Steps motif |
| `wimbledon-baseline-match.png` → `onboarding-court.jpg` | Generated, but rendered Wimbledon and AELTC marks, a Rolex logo, a HEAD bag, and a scoreboard naming Djokovic and Sinner | Court lines under beams |

The mascot art (`krish*.png`) was generated but wore Air Jordan 1s with a
visible Swoosh and Jumpman on six pages. `scripts/clean-mascot-shoes.py` fades
the figure out below the knee. A first attempt faded across the shoe line and
left the Swoosh legible as a ghost; the fade now reaches full transparency
above the shoes, and the script asserts zero opaque pixels below the cut.

The seven wardrobe shoes were product photographs — `gear-shoe-sneakers` an Air
Jordan 4 "White Oreo", `gear-shoe-highs` an Air Jordan 6. Sneaker silhouettes
carry trade dress on top of the photographer's copyright, so a recolour would
not have cleared them. `scripts/generate-gear-shoes.py` draws flat illustrated
pairs in the colours the studio already records, and regenerates the thumbnails
to match.

## Still outstanding — the 45 garment items

`images/studio/gear/` still holds 45 tops, bottoms and hats that are
background-removed product photographs of the same provenance as the shoes.

They are a materially smaller risk than the footwear was: all are plain, with
no visible logos, so the exposure is the photographer's copyright rather than
anyone's trademark, and no garment silhouette is protected the way a sneaker's
is. They are left in place deliberately rather than by oversight. Clearing them
properly means either confirming where they came from or commissioning art —
45 flat-drawn garments would look worse than what is there now.
