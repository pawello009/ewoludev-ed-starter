#!/bin/bash
# .claude/hooks/typecheck-after-edit.sh
MAX_ATTEMPTS=5
INPUT=$(cat)
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // "unknown"')
SESSION_KEY=$(printf '%s' "$SESSION_ID" | tr -cd '[:alnum:]_-')

if [ -z "$SESSION_KEY" ]; then
  SESSION_KEY="unknown"
fi

COUNTER_FILE="${TMPDIR:-/tmp}/claude-typecheck-counter-${SESSION_KEY}"

# Licznik prób - zabezpieczenie przed nieskończoną pętlą
COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
fi

if [ "$COUNT" -ge "$MAX_ATTEMPTS" ]; then
  exit 0  # Po 5 próbach przepuść - wymaga interwencji człowieka
fi

printf '%s\n' "$((COUNT + 1))" > "$COUNTER_FILE"

# Uruchom typecheck
OUTPUT=$(npm run typecheck 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  rm -f "$COUNTER_FILE"  # Reset licznika po sukcesie
  exit 0
fi

# Typecheck nie przeszedł - zwróć błędy do agenta
ERRORS=$(printf '%s\n' "$OUTPUT" | tail -20)
printf -v REASON 'TypeScript errors found (attempt %s/%s). Fix them before continuing:\n%s' \
  "$((COUNT + 1))" "$MAX_ATTEMPTS" "$ERRORS"

jq -n --arg reason "$REASON" '{
  decision: "block",
  reason: $reasons
}'