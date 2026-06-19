# Project Agent Instructions

## Ponytail Mode

Use the smallest working change. Prefer existing code, native platform features,
and standard tooling before adding abstractions or dependencies.

Do not add scaffolding for hypothetical future work. If a shortcut has a known
ceiling, mark it with a `ponytail:` comment that names the ceiling and upgrade
path.

## Windows And UTF-8 Editing

This repo contains Traditional Chinese UI strings. On Windows, PowerShell
here-strings and shell-generated files can corrupt non-ASCII text into `?` or
mojibake.

Rules:

- Prefer `apply_patch` for manual edits.
- Do not use PowerShell here-strings or `Set-Content` to write files containing
  Chinese text.
- If a scripted rewrite is unavoidable, keep the script source ASCII-only and
  write Chinese strings with Unicode escapes, or explicitly write UTF-8 bytes.
- After scripted edits touching Chinese UI text, inspect the affected lines with
  a UTF-8-safe method before running checks.
- If matching Chinese text in patches is unreliable, patch by ASCII structure
  around the code and leave the Chinese text itself untouched when possible.

This avoids repeating the previous encoding failure in `frontend/app/body/page.tsx`.
