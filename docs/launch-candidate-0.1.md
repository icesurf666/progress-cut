# Launch Candidate 0.1

Status: preparation. Feature development is frozen while release gates are open.

Product promise: turn a long coding session into a short visual story worth watching
and sharing, with all frame processing on-device.

## Scope freeze

Ship capture, selection, preview, moment removal/replacement, re-render, MP4/GIF,
Story Lab and Share Pack. Fix defects in these flows before adding capabilities.
Defer AI integrations, plugins, pinning, editing tools, Windows and new export formats.

## Release gates and evidence

Implementation and automated tests do not count as real-session validation.
Record results against a commit SHA, app version, hardware and test date.

| Gate               | Current evidence                                                     | Required evidence                                                                   |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Story quality      | A/B uniform sampling and C/desktop parity tested on synthetic images | Blinded evaluation on 12 held-out sessions                                          |
| First launch       | Renderer smoke harness exists                                        | Fresh-install test of packaged app by 3 first-time users without README             |
| Long recording     | Adaptive capture implemented                                         | Successful 2-hour and 5-hour recordings with resource measurements                  |
| Recovery           | Manifest and unit tests exist                                        | Force-quit during capture and rendering; restart and recover actual frames          |
| Moment review      | Exclusion selector and UI implemented                                | Remove/rebuild, restart, reload history, rebuild again; exclusions remain respected |
| Export             | FFmpeg integration tests exist                                       | MP4, GIF and both modes verified from packaged app, including failed render retry   |
| Reports            | Story Lab and Share Pack implemented                                 | Assets match exported moments after review and repeated re-render                   |
| Privacy            | Local processing; raw PNGs retained                                  | Retention/deletion controls, accurate storage docs and inspected network behavior   |
| macOS distribution | DMG config exists; release disables automatic signing discovery      | Developer ID signing, notarization and fresh-machine installation verified          |
| Launch assets      | Public repo and article reported by maintainer                       | One real demo, downloadable release, verified README instructions                   |

## Execution order

1. Correct and test A/B/C comparison before gathering review scores.
2. Lock evaluation protocol, selector version and thresholds.
3. Run real-session evaluation while fixing first-launch and recovery defects.
4. Run long-recording and privacy checks on the packaged app.
5. Verify signed distribution and prepare demo from an evaluated session.
6. Release only with linked evidence for every gate; unresolved gates mean beta.

## Story-quality evaluation protocol

Use 12 held-out sessions, 2 each: frontend, terminal-heavy, refactor, debugging,
Claude-assisted and Codex-assisted. Keep development fixtures separate.
Do not tune thresholds on evaluation sessions after reviews begin.

A samples all observations uniformly. B samples deduplicated states uniformly.
C uses the same segmentation, selection and duration fitting as desktop.
All outputs use the same source, target duration, resolution and renderer.
Capture source duration and actual encoded duration in the results.

Uniform sampling spaces selections by sequence index, includes the first and last
state when selecting at least two moments, and uses equal playback durations.
For a one-moment baseline it selects the first state. Novelty does not affect A/B.
The C parity test compares selected IDs, timestamps, scores and playback durations
with desktop using the same synthetic image session and real engine processing.

Randomize video labels and viewing order; keep the mapping outside reviewer assets.
Recruit 3 independent reviewers per session. Permit ties and collect:

- Primary: which video best communicates how work progressed?
- Secondary: which video would you prefer to share?
- Failure notes: missed milestone, repetitive scene, unreadable frame, privacy issue.

Proposed gate, to lock before collecting scores: C beats B by majority preference
on at least 10 of 12 sessions; tied sessions count as non-wins. For 12 independent
session outcomes, 10 or more wins gives a one-sided binomial probability of
79/4096 under a 50% win null. Reviewers are not independent experimental units;
report session-level results and disclose session/reviewer selection limitations.
Do not change the gate after inspecting results. Publish ties and losses too.

### Generate reviewer kits

For each held-out session:

```bash
pnpm --filter @progresscut/cli start -- compare \
  /absolute/session/frames /absolute/evaluation/session-01 \
  --duration=60000 --blind
```

The command requires all three exports to succeed. It creates a fresh
`blind-evaluation-*/reviewers/` directory with three reviewer folders, neutral
`clip-1.mp4` through `clip-3.mp4`, instructions and a blank `ratings.csv`.
Initial assignment is random; rotating it across three reviewers balances each
pipeline's viewing position. Clip bytes are copied unchanged, not anonymized.
Review source content for identifying labels and sensitive information beforehand.

Give each reviewer only their designated `reviewer-N` folder. Never share the
whole output directory: it contains labeled exports and an organizer-only
`private/key.json` mapping with pipeline metrics. The key is owner-readable/writable
and its directory owner-only on POSIX systems. These permissions are not encryption.
Keep the mapping hidden until ratings have been returned. Record the commit SHA,
session category and protocol version separately before collecting ratings.

## Reliability run sheet

For each 2-hour and 5-hour run, record capture interval, source resolution,
monitor configuration, frame count, export duration, output sizes and errors.
Measure RSS and CPU for Electron, capture and FFmpeg processes, total session disk
usage and battery change where applicable. Keep a comparable idle measurement.
Set performance budgets before running and store raw measurements alongside results.

Exercise sleep/wake, monitor disconnect, source-window resize/close, Retina/4K,
full disk simulation, unavailable FFmpeg and capture-permission denial.
Verify errors release session ownership and preserve recoverable data.

Recovery must be tested on a real process interruption, not just mocked filesystem
calls. Verify multiple failed/unfinished sessions cannot silently overwrite recovery
metadata, and that export failure never appears as successful completion.

Automated regression coverage now verifies that recovery-write failures still
emit a terminal session error, failed initialization does not modify prior recovery
metadata, unreadable frame directories do not trigger stale-manifest deletion,
and malformed/unsupported manifests are reported rather than silently ignored.
Startup shows a recovery-error dialog on lookup failures. Recovery records are now
stored separately in `~/Library/Application Support/ProgressCut/recovery/`, keyed
by session output directory. The legacy `active-session.json` is migrated on lookup;
it is removed only after a destination record exists. Successful recovery clears
only that session's record before emitting completion. Choosing Keep frames leaves
the record available on the next launch. New capture folders have UUID suffixes.
Filesystem integration tests cover independent retention, scoped cleanup, legacy
migration and rejected overwrites. These checks are not evidence of recovery after
a real application crash or power loss; atomic rename is not a durable fsync guarantee.

### Automated process-interruption smoke

Run `pnpm test:crash-recovery` on macOS with FFmpeg and ffprobe installed.
The harness starts isolated Electron main processes with temporary HOME, userData
and temporary-file directories. Only screen capture is substituted with synthetic
PNG frames; production capture orchestration, recovery storage, selection and
export pipeline run unchanged. It sends SIGKILL during capture and after a real
FFmpeg process starts, including that owned process group to avoid orphan encoders.

Fresh Electron processes must discover both unfinished sessions, re-render each,
preserve all source PNG bytes and clear only the recovered session's metadata.
ffprobe checks H.264, yuv420p and a three-second output within 150 ms tolerance.
The renderer also has a weighted-duration regression test with one-frame tolerance.
The harness prints JSON results and removes its synthetic sessions afterward.

This is backend process-crash coverage, not a packaged-app first-launch test:
it does not exercise the recovery dialog, actual screencapture permission, a long
recording, sleep/wake or power-loss durability. Keep those release gates open.

Observed smoke result on 2026-10-05: PASS on macOS 26.3, arm64 Mac17,2,
Node.js 22.14.0. Both interrupted sessions (three synthetic frames each) were
discovered by fresh Electron processes and recovered through real FFmpeg.
Source PNG bytes were unchanged; scoped manifest cleanup and ffprobe checks passed.
Source was an uncommitted working tree based on `4877e72`, not a release artifact.

### Startup and recovery UI checks

`pnpm test:desktop-ui` loads the production renderer and preload in an Electron
window with controlled IPC fixtures. Startup regressions now check that missing
FFmpeg or screencapture disables recording, including synthetic button events and
the start shortcut. An empty dependency notice clears the banner and restores Start.
Recovery pipeline events from Idle show Processing; failure returns to Idle without
creating a history entry. The smoke also covers settings, preview, history, re-render
and compact layout. This run passed on 2026-10-05; the Processing screenshot was
visually inspected. IPC payloads and exported media in this harness are fixtures.

Unit tests for the native-dialog orchestration cover Keep frames, selecting one
session, waiting for renderer load and surfaced lookup errors. The dialog itself
is mocked: actual macOS button interaction, capture permission UX and three
first-time-user packaged installs remain unverified.

### Packaged-app smoke

Build with `CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run pack`, then run
`pnpm test:packaged` (macOS, Node 22+, FFmpeg and ffprobe required).
Use `pnpm run pack`, not `pnpm pack`, which invokes pnpm's npm-tarball command.
An explicit app path can be passed to `pnpm test:packaged /path/ProgressCut.app`.

The harness launches the actual app executable with an ephemeral local Node
inspector port and temporary HOME/profile. It verifies `app.isPackaged`, bundled
main/Sharp resolution, renderer startup and brand image, invokes production IPC
to export synthetic PNGs, waits for Done and measures the MP4 with ffprobe.
It removes its fixture data and terminates only its own process group afterward.
It does not publish artifacts or capture the user's screen.

Observed on 2026-10-05: unsigned arm64 `.app` built and smoke passed on macOS
26.3 / Mac17,2, Node 22.14.0. Sharp resolved inside `app.asar/node_modules`, and
the exported MP4 duration was 3 seconds. FFmpeg was provided by the host.
This does not validate a fresh-machine install, DMG/Gatekeeper behavior,
Developer ID signing/notarization, x64 support, permissions or updater behavior.

## Publication checklist

- [ ] Evaluation protocol locked with commit SHA before reviews
- [ ] A/B/C results and limitations published
- [ ] Packaged first-launch and reliability runs documented
- [ ] Privacy/storage behavior documented and controls verified
- [ ] Signed/notarized release installed on a fresh machine
- [ ] Release tag matches app/package versions
- [ ] Release workflow runs quality checks before publishing
- [ ] Updater tested between two signed releases, or disabled for this beta
- [ ] README demo uses measured session counts rather than illustrative metrics
- [ ] Demo and Share Pack manually reviewed for sensitive screen content
- [ ] Public release includes installation instructions and known limitations
