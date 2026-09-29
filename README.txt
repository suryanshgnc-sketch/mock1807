MOCK1807 STUDENT TEST PORTAL PATCH

Replace ONLY:
  index.html
  js/app.js
  js/backend-tests.js (new file)

Do NOT remove/replace:
  js/auth.js
  js/analysis.js
  css/
  GTM-PDFS/
  other files

This removes hardcoded GTM/test definitions from the student home and loads tests from Supabase public.tests created by the Admin Portal.
The question paper is fetched with a signed URL only after release_at. Answer keys are never fetched by the student site.

Requirements:
- js/auth.js from the Google-login backend step must remain.
- Supabase tests RLS should allow authenticated users to SELECT enabled tests.
- Storage bucket test-pdfs must remain PRIVATE and the released question-paper SELECT policy must be present.
