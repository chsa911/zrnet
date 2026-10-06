# Set aside: translated book titles + language fields (not deployed)

Taken out of the working tree on 2026-10-06 so the deploy changes **no database operations**.
Nothing here is active. To bring it back later:

1. `git apply "Claude outputs/feature-title-translations/tracked-changes.patch"`
   (or copy the files from `files/` over the repo – they are the complete versions)
2. Copy the new files from `files/` back to the same paths:
   - backend/flyway/migration/V20261006_01__book_title_translations.sql
   - backend/flyway/migration/V20261006_02__seed_highlight_title_translations.sql
   - backend/utils/titleLocale.js
   - frontend/src/pages/AdminTitleTranslationsPage.jsx
   - frontend/src/utils/bookLanguages.js
3. Re-add the admin route in frontend/src/App.jsx:
   `<Route path="admin/title-translations" element={<AdminOnly><AdminTitleTranslationsPage /></AdminOnly>} />`
4. Run the two migrations (01, then 02) on the database, then deploy backend + frontend.

Contents: book_title_translations table (title per language, original/official/free, edition available),
books.original_title, default books.language = 'de' for new books, researched titles for the 27 highlights,
public API ?lang=, admin page "Titel-Übersetzungen", collection buckets "all" (no wishlist) and "available".
The backend also contains a safety check: without the migrations it falls back to original titles.
