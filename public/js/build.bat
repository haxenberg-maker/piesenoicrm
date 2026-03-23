@echo off
:: build.bat — CRM Piese Auto
:: Utilizare: dublu-click pe build.bat (Windows)

set BUNDLE=js\bundle.js
echo 'use strict'; > %BUNDLE%

for %%m in (config state api auth ui orders clients products gdrive invoices delivery logs users) do (
  if exist js\%%m.js (
    echo. >> %BUNDLE%
    echo // ════ %%m ════ >> %BUNDLE%
    type js\%%m.js >> %BUNDLE%
    echo   OK: %%m.js
  ) else (
    echo   LIPSA: %%m.js
  )
)

echo.
echo Build complet! Pushaza pe GitHub.
pause
