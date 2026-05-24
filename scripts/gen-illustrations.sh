#!/usr/bin/env bash
# Generate warm, friendly, multi-household illustrations for bayit-beseder.
# Must run node from the skill scripts dir (ts-node lives there). Output → public/illustrations/<name>.jpg
set -u
SKILL="C:/Users/eladj/.claude/skills/nano-banana-poster/scripts"
GEN="$SKILL/generate_poster.ts"
OUT="C:/Users/eladj/projects/bayit-beseder/public/illustrations"
mkdir -p "$OUT"

STYLE="warm friendly flat vector illustration, soft rounded organic shapes, gentle hand-drawn feel, cozy and inviting home mood, brand colors indigo #6366F1 and violet #8B5CF6 paired with warm peach honey coral accents, soft warm cream background, playful but grown-up (NOT childish, NOT corporate, NOT metallic, NOT hi-tech), cheerful, generous negative space, subtle soft texture, NO text, NO words, NO letters"

gen () {
  local name="$1"; local aspect="$2"; local subject="$3"
  if [ -f "$OUT/$name.jpg" ]; then echo "skip $name (exists)"; return; fi
  echo "=== generating $name ($aspect) ==="
  ( cd "$SKILL" && rm -f poster_*.* 2>/dev/null
    timeout 120 node --loader ts-node/esm "$GEN" --aspect "$aspect" "$subject. $STYLE" 2>&1 | tail -2 )
  local f
  f=$(ls -t "$SKILL"/poster_*.jpg "$SKILL"/poster_*.png 2>/dev/null | head -1)
  if [ -n "$f" ] && [ -s "$f" ]; then mv "$f" "$OUT/$name.jpg"; echo ">> saved $OUT/$name.jpg ($(du -k "$OUT/$name.jpg" | cut -f1)KB)"; else echo "!! FAILED $name"; fi
}

# NET-NEW only (library already rich). Household-type scenes + mascot.
gen "household-couple"    "1:1" "two adult partners happily tidying their home together, sharing chores side by side, warm affection"
gen "household-family"    "1:1" "parents and two children organizing the home together as a team, everyone helping, joyful cooperation"
gen "household-roommates" "1:1" "three adult flatmates splitting household chores fairly, friendly and relaxed, shared apartment"
gen "household-solo"      "1:1" "one calm content adult organizing their own cozy home at their own pace, peaceful and self-sufficient"
gen "mascot-home"         "1:1" "an adorable friendly house-shaped companion character with warm eyes and a cozy smile, soft rounded mascot, waving hello"

echo "=== DONE ==="; ls -la "$OUT"/household-*.jpg "$OUT"/mascot-home.jpg 2>/dev/null
