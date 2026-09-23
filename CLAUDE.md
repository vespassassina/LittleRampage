# Little Worlds (repo: Rampage)

Adds to the global CLAUDE.md. Read `docs/HANDOFF.md` first if it exists.

## Model routing

The main session runs on Sonnet and drives the sprint loop in `docs/PLAN.md`. It delegates:

| Work | Agent | Model |
|---|---|---|
| Failing check first, run tests.html, browser checks, ticking tasks, docs chores | `tester` | Haiku |
| Implementing a task until its checks pass | `coder` | Sonnet |
| Closing a task against its spec | `reviewer` | Sonnet |
| Decisions, scope conflicts, re-planning, sprint reviews | `developer` | Opus 5.5 |
| Hard bugs: not fixed after two tries, or rendering, performance or camera bugs with no clear cause | `developer`, with `/investigate` | Opus 5.5 |

Loop per task: tester writes the failing check → coder makes it pass → tester runs all checks
and a real browser run → reviewer closes. Anything that needs judgement goes to `developer`;
don't save cost on judgement.

## Project rules

- No build, no npm, no framework. The app is `index.html` plus static files.
- Checks run in the browser (`tests.html` from sprint F1). The browser pane throttles animation:
  step time with `LW.frame(1/60)`.
- Serve with `python3 -m http.server 8765` (8766 if taken).
- The app will be published as a public web app: every game works on touch, 60 fps desktop,
  30 fps on phone emulation with 4× CPU throttle.
