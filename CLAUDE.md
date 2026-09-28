# Little Worlds (repo: Rampage)

Adds to the global CLAUDE.md. Read `docs/HANDOFF.md` first if it exists.

## Model routing

The main session runs on Sonnet and drives the sprint loop in `docs/PLAN.md`. It delegates:

| Work | Agent | Model |
|---|---|---|
| Failing check first, run tests.html, browser checks, ticking tasks, docs chores | `tester` | Haiku |
| Implementing a task until its checks pass | `coder` | Sonnet |
| Sprint-end review: the sprint's diff against its spec | `reviewer` | Sonnet |
| Decisions, scope conflicts, re-planning after the sprint review | `developer` | Opus 5.5 |
| Hard bugs: not fixed after two tries, or rendering, performance or camera bugs with no clear cause | `developer`, with `/investigate` | Opus 5.5 |

Loop per task: tester writes the failing check → coder makes it pass → tester runs all checks
and a real browser run → the task is ticked and committed. No review per task.

Sprint end: `reviewer` reviews the whole sprint once (this replaces the global rule of a `/review`
before every behaviour-changing commit), then `developer` re-plans. Anything that needs
judgement goes to `developer`; don't save cost on judgement.

## Project rules

- No build, no npm, no framework. The app is `index.html` plus static files.
- Checks run in the browser (`tests.html` from sprint F1). The browser pane throttles animation:
  step time with `LW.frame(1/60)`.
- Serve with `python3 -m http.server 8765` (8766 if taken).
- The app will be published as a public web app: every game works on touch, 60 fps desktop,
  30 fps on phone emulation with 4× CPU throttle.

## Process

Global section 6 (Design, spec, plan, test) applies; this is how it lands here.

1. Design: an interview before a new epic, same as global. Answers go into the spec, not
   left in chat.
2. Spec: `docs/specs/<name>.md`, acceptance criteria numbered (AC1, AC2, ...), referenced
   by both the tests and the reviewer.
3. Plan: `docs/PLAN.md`, one place for every epic, sprint and task. Ticked as work lands,
   never rewritten to hide what happened.
4. Test: the Model routing loop above is the sprint's TDD, task by task — tester writes
   the failing check, coder makes it pass, tester runs the full suite and a real browser
   check before the task is ticked and committed.

A bug report skips design/spec and goes straight to `/investigate`, per the global
skill-routing table. Root cause first, then the smallest fix that makes the check fail
before and pass after.

## Dev guide

Global section 8 (Code) applies. In this codebase specifically:

- `index.html` is one file with everything in it: state, rendering, input, game logic.
  Keep new code near the code it's related to, not off in a distant section, so a reader
  scrolling one feature sees the whole thing.
- KISS holds harder here than usual: no framework means no framework to lean on. A third
  repeated pattern earns a small helper (see `Batch`, `replay()`, `fly()`); two doesn't.
- Expose only what tests need on `LW`. Adding to `LW` is a small API surface, not a dumping
  ground — a getter for live state, not a snapshot that goes stale.
- Dispose what you create. Anything that rebuilds geometry (resize, quality switch) must
  free the old geometry and drop its ink-outline entries first — `clearBatch()` is the
  pattern to follow, not a one-off.
- No animation, no `setTimeout`-driven state. Everything steps through `LW.frame(dt)` so
  tests can drive time deterministically and the browser-pane throttle doesn't lie to them.
- Comments explain why a number or a shape is what it is (a clearance margin, a sample
  count tied to a real bug), never what the next line obviously does.
