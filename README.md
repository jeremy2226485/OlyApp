# OlyApp

Generates a single Olympic weightlifting solo-training session on demand, based on session length and recent training history. Built for Cara, an intermediate lifter who trains alone at a well-equipped commercial gym.

**Primary deliverable: [`web/`](web/)** — a static, no-build-step web app (vanilla HTML/CSS/JS, installable as a home-screen PWA on iPhone). See [`web/README.md`](web/README.md) for how to run and deploy it.

`OlyApp/` and `OlyAppTests/` are an earlier native SwiftUI + SwiftData iOS prototype, kept for reference but no longer the active target — building/testing/deploying it requires a Mac and Xcode, which is why the project moved to the web. Its `OlyApp/README.md`-equivalent content (architecture, resolved decisions) is preserved below for that version.

## Why two implementations

The generation logic (precedent library + `WorkoutGenerator` rules engine) is the same in both — same nine v3 generation rules, same accessory bank, same Clean/Jerk cues and required prep drills — just written twice, once in Swift and once in vanilla JS. The web version is the one to use; the Swift version is left in place in case native iOS is revisited later (e.g. once there's a Mac available to build it, or the web app's users outgrow what a PWA can do — background notifications, deeper HealthKit integration, etc.).

## Resolved open question

**"Avoid a movement today" is a manual override**, not purely history-driven — a set of movement names threaded through as `GenerationOptions.avoidMovements`, surfaced as a chip-based input on the New Session screen. History-driven balancing (family rotation, squat balance, intensity spacing) already happens automatically; the manual override exists for things the app has no way to infer (a tweaky shoulder that day, a busy rack, etc.).

---

## iOS prototype (`OlyApp/`, `OlyAppTests/`) — reference only

Native SwiftUI + SwiftData. Open `OlyApp.xcodeproj` in Xcode 16+ and run on an iOS 17+ simulator or device (SwiftData requires iOS 17). Not covered by CI since it requires a macOS runner; the web app's tests are what actually run on every push.

### Architecture

- `OlyApp/Models` — `LoggedSession` and `LifterMax` (`@Model`, SwiftData-persisted), plus the `LiftEntry` and `LiftCategory` value types.
- `OlyApp/Precedent` — the static template bank (`PrecedentLibrary`): primary lift templates, the accessory movement bank, tempo/pause variants, and Cara's standing technique cues + required prep drills for Clean and Jerk.
- `OlyApp/Generator` — `WorkoutGenerator`, a plain Swift rules engine (no UI/persistence dependencies) that implements generation rules 1–9 from the spec over the precedent library and recent `LoggedSession` history.
- `OlyApp/Views` — the five screens: Home, New Session, Session Detail, History, Maxes/Settings.
- `OlyAppTests/WorkoutGeneratorTests.swift` — unit tests covering each generation rule.

### Notable implementation choices

- **1RM entry is lazy and in-session.** The first time a lift with no `LifterMax` on file is selected as a primary lift, `SessionDetailView` shows an inline prompt on that lift's card.
- **Session length interpolation.** Length buckets into single / primary+secondary / dual-primary per the spec's 45/60/90-minute anchors, while warm-up duration, accessory round count, and movement count scale continuously.
- **Edit-in-place.** Session Detail lets Cara swap an individual primary lift or a single accessory exercise without discarding the rest of the generated plan.
- **Accessory bank** reflects the confirmed gym inventory (leg press, cable functional trainer, GHD-style bench, AirBike/rower/SkiErg, sandbags, etc.). Conditioning-flavored moves are present in the data bank but intentionally excluded from the generator's default rotation, per the spec's "used sparingly, not the focus."

### Known gaps for v2+

- Snatch/Squat cue and prep-drill fields are wired up but only populated for Clean and Jerk per the spec.
- No iCloud/CloudKit sync.
- Stale-max flagging isn't implemented; `LifterMax.dateSet` is tracked so it can be added later.
