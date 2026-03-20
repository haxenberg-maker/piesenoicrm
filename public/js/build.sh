#!/bin/bash
# build.sh — CRM Piese Auto
# Utilizare: ./build.sh  (Mac/Linux)

MODULES="config state api auth ui orders clients products gdrive invoices delivery logs users"
BUNDLE="js/bundle.js"

echo "🔨 Build CRM..."
echo "" > "$BUNDLE"
echo "'use strict';" >> "$BUNDLE"
echo "" >> "$BUNDLE"

for mod in $MODULES; do
  FILE="js/${mod}.js"
  if [ -f "$FILE" ]; then
    echo "" >> "$BUNDLE"
    echo "// ════ ${mod^^} ════" >> "$BUNDLE"
    # Remove 'use strict' from individual files
    grep -v "^'use strict';" "$FILE" >> "$BUNDLE"
    echo "  ✅ ${mod}.js"
  else
    echo "  ⚠️  ${mod}.js lipsă"
  fi
done

echo ""
echo "✅ bundle.js generat!"
echo "   Pushează pe GitHub → Netlify deployează automat."
