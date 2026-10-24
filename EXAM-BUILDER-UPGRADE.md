# Exam builder upgrade — rollout notes

## What changed
- Admin test builder now accepts JEE Main, JEE Advanced-style, or custom format labels.
- Physics, Chemistry, Mathematics counts are individually configurable and must sum to total questions.
- Sections-per-subject and partial-credit policy metadata are configurable.
- Existing tests retain their current defaults and existing attempts lock exam structure from editing.
- The admin writes a versioned `exam_config` JSONB field.

## Required database step
Run `sql/EXAM-CONFIG-ADDITIVE-MIGRATION.sql` in Supabase SQL Editor **before deploying this version**. It only adds a nullable-safe/defaulted metadata column and does not replace existing RPCs.

## Important compatibility note
This is a backward-compatible first stage. Your current student CBT and `publish_answer_key` RPC use legacy assumptions (three subject blocks and binary correct/incorrect grading, with a special numerical tail heuristic). The new form deliberately does not replace those production functions automatically, because doing so could invalidate active attempts or scoring. Consequently, selecting Advanced/custom layout or a partial-credit mode saves the intended configuration but does **not** make the legacy CBT/scorer enforce it yet.

Before enabling these formats for students, the next deployment must update the student CBT to read `tests.exam_config` and replace the scoring RPC with a tested scorer that supports:
- per-subject question ranges and section navigation;
- single-correct, multi-correct, and numerical answer types;
- configurable marking rules by section/question type;
- partial credit with a clearly specified rule (for example, proportional subset credit with no credit for extra incorrect options, or official question-specific JEE Advanced rules);
- legacy fallback when `exam_config` is absent/default.

Do not advertise an Advanced test as live until that student-side and SQL scorer release has been deployed and tested on a staging copy. Existing Mains tests remain on the legacy path.
