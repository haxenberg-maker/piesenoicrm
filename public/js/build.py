#!/usr/bin/env python3
"""
build.py — CRM Piese Auto
Concateneaza modulele JS in bundle.js si injecteaza in dashboard.html

Utilizare:
  python3 build.py
"""

import os, re, subprocess, sys
from datetime import datetime

MODULES_ORDER = [
    'config', 'state', 'api', 'auth', 'ui',
    'orders', 'clients', 'products', 'gdrive',
    'invoices', 'delivery', 'logs', 'users'
]

JS_DIR      = os.path.join(os.path.dirname(__file__), 'js')
BUNDLE_PATH = os.path.join(JS_DIR, 'bundle.js')
HTML_PATH   = os.path.join(os.path.dirname(__file__), 'dashboard.html')

def build():
    print(f"🔨 Build CRM — {datetime.now().strftime('%H:%M:%S')}")
    print()

    parts = [f"'use strict';\n// Bundle generat: {datetime.now().isoformat()}\n\n"]
    total_lines = 0

    for mod in MODULES_ORDER:
        path = os.path.join(JS_DIR, f'{mod}.js')
        if not os.path.exists(path):
            print(f"  ⚠️  {mod}.js lipsă — skip")
            continue
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Remove duplicate 'use strict'
        content = content.replace("'use strict';\n", "")
        lines = content.count('\n')
        total_lines += lines
        parts.append(f"\n// {'═'*58}\n// {mod.upper()}\n// {'═'*58}\n\n")
        parts.append(content)
        print(f"  ✅ {mod}.js ({lines} linii)")

    bundle = ''.join(parts)

    # Add INIT block (from main.js or full_dashboard.js)
    init_path = os.path.join(JS_DIR, 'main.js')
    if os.path.exists(init_path):
        with open(init_path, 'r', encoding='utf-8') as f:
            main_content = f.read()
        # Remove import lines
        init_lines = [l for l in main_content.split('\n') if not l.startswith('import ')]
        bundle_parts.append('\n// INIT\n')
        bundle_parts.append('\n'.join(init_lines))

    # Syntax check
    tmp = '/tmp/crm_bundle_check.js'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(bundle)
    
    result = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"\n  ❌ Eroare sintaxă JS:")
        print(result.stderr[:500])
        sys.exit(1)
    
    # Write bundle.js
    with open(BUNDLE_PATH, 'w', encoding='utf-8') as f:
        f.write(bundle)
    print(f"\n  📦 bundle.js: {total_lines} linii, {len(bundle)//1024}KB")

    # Ensure dashboard.html references bundle.js (not inline script)
    with open(HTML_PATH, 'r', encoding='utf-8') as f:
        html = f.read()

    # Replace any inline <script> block with bundle reference
    if '<script src="js/bundle.js"></script>' not in html:
        # Remove old inline script if present
        if '<script>' in html and '</script>' in html:
            script_start = html.find('<script>')
            script_end   = html.rfind('</script>') + len('</script>')
            html = html[:script_start] + '<script src="js/bundle.js"></script>' + html[script_end:]
            with open(HTML_PATH, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"  🔗 dashboard.html actualizat cu referință bundle.js")
        else:
            print(f"  ✅ dashboard.html deja referențiază bundle.js")
    else:
        print(f"  ✅ dashboard.html OK")

    print(f"\n✅ Build complet!")
    print(f"   Pusheaza pe GitHub și Netlify va deploya automat.")

if __name__ == '__main__':
    build()