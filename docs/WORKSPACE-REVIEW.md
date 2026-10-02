# Workspace · October 2026

## Product changes

- Removed automatic AI solution controls, provider status, polling and worker startup from the running product. Result release and manual grading no longer construct an AI service or enqueue jobs. Existing database records and migration history are retained.
- New teacher and student dashboards, focused navigation, filtered exam cards, searchable and paginated question bank, and a simpler login page.
- Three-step import flow: choose file, review/edit individual questions and answer keys, assign section points and create a draft. Review changes and metadata are saved to PostgreSQL.
- Explicit answer labels, per-section numbered answer keys and underlined option labels in DOCX are supported. Conflicts and missing answers stay unresolved. PDF text extraction does not replace OCR and cannot guarantee equation/image layout.
- Shared section normalization and integer-unit score distribution (four decimals) keep section totals consistent. Direct exam edits preserve existing frozen assignment content.
- Essay grading records points per question, validates bounds server-side and recomputes the objective score on every save. Legacy aggregate marks can be kept without inventing a per-question breakdown.
- Teachers independently choose score, answer and saved explanation visibility. Student question payloads omit answer keys; release timing and ownership are enforced server-side.
- The active client excludes AI and prepared-solution bundles and the obsolete score decorator. The import editor renders one question at a time; exam cards and question bank use client-side pagination. Main data remains server-side.

## Validation

`npm test`: 18 tests, all passing. Includes isolated PostgreSQL/Express workflows, publication timing, unauthorized access, conflicting saves, frozen exam versions, Word/PDF import, answer-key conflict detection, exact section sums, wizard edits, manual grading and native student answer persistence.

`npm run build`: successful. Hashed JS/CSS and gzip files are generated at startup and excluded from Git.

Cloud Browser rejected the internal preview URL with ERR_BLOCKED_BY_CLIENT. Desktop/mobile CSS and JSDOM interactions have been checked in code; full visual verification of signed-in teacher/student screens remains a separate check. No claim of multi-user load testing or universal document recognition is made.
