# OlyApp

An iPhone app that generates a single Olympic weightlifting solo-training session on demand, based on session length and recent training history. Built for Cara, an intermediate lifter who trains alone at a well-equipped commercial gym.

Native SwiftUI + SwiftData, no backend. See the original build spec for full requirements.

## Opening the project

Open `OlyApp.xcodeproj` in Xcode 16+ and run on an iOS 17+ simulator or device (SwiftData requires iOS 17).

## Architecture

- `OlyApp/Models` — `LoggedSession` and `LifterMax` (`@Model`, SwiftData-persisted), plus the `LiftEntry` and `LiftCategory` value types.
- `OlyApp/Precedent` — the static template bank (`PrecedentLibrary`): primary lift templates, the accessory movement bank, tempo/pause variants, and Cara's standing technique cues + required prep drills for Clean and Jerk.
- `OlyApp/Generator` — `WorkoutGenerator`, a plain Swift rules engine (no UI/persistence dependencies) that implements generation rules 1–9 from the spec over the precedent library and recent `LoggedSession` history. `GeneratedSession` and friends are the transient (not-yet-logged) result types; `GeneratedSession.toLoggedSession()` converts a completed session into the persisted model.
- `OlyApp/Views` — the five screens: Home, New Session, Session Detail, History, Maxes/Settings.
- `OlyAppTests/WorkoutGeneratorTests.swift` — unit tests covering each generation rule (family rotation, squat balance, intensity spacing, core-folded-into-accessory, push/pull balance, tempo variety, session-length scaling, lazy max entry, and the manual avoid-movement override) directly against `WorkoutGenerator`, independent of the UI.

## Resolved open question

**"Avoid a movement today" is a manual override**, not purely history-driven — it's a `Set<String>` on `GenerationOptions`, surfaced as a chip-based input on the New Session screen. History-driven balancing (family rotation, squat balance, intensity spacing) already happens automatically; the manual override exists for things the app has no way to infer (a tweaky shoulder that day, a busy rack, etc.).

## Notable implementation choices

- **1RM entry is lazy and in-session.** The first time a lift with no `LifterMax` on file is selected as a primary lift, `SessionDetailView` shows an inline prompt on that lift's card. Skipping just leaves the session on %-only guidance; saving a max immediately recomputes that lift's estimated working weight without re-rolling the rest of the generated session.
- **Session length interpolation.** `WorkoutGenerator.sessionStructure(for:)` buckets length into single / primary+secondary / dual-primary per the spec's 45/60/90-minute anchors, while warm-up duration, accessory round count, and movement count scale continuously with requested length rather than snapping to the three presets.
- **Edit-in-place.** Session Detail lets Cara swap an individual primary lift (redrawn from the same category pool, respecting the same intensity-spacing/squat-balance rules) or swap a single accessory exercise (same category, no duplicates) without discarding the rest of the generated plan.
- **Accessory bank vs. Catalyst/Torokhtiy-style class notes.** The accessory movement bank reflects the confirmed gym inventory (leg press, cable functional trainer, GHD-style bench, AirBike/rower/SkiErg, sandbags, etc.) rather than a minimal home-gym set. Conditioning-flavored moves are present in the data bank but intentionally excluded from the generator's default rotation pools, per the spec's "used sparingly, not the focus."
- **askbwell accessory ideas** weren't pulled in — that YouTube channel wasn't accessible at spec-writing time. `PrecedentLibrary.accessoryMoves` is the place to add specific moves once Cara has concrete examples.

## Known gaps for v2+

- Snatch/Squat cue and prep-drill fields are wired up (`technicalCues` / `requiredPrepDrills` on `PrimaryLiftFamily`) but only populated for Clean and Jerk per the spec; adding more is a one-line data change in `PrecedentLibrary.swift`.
- No iCloud/CloudKit sync yet (noted as a nice-to-have in the spec, not required for v1).
- Stale-max flagging (surfacing when a logged max is old) isn't implemented; `LifterMax.dateSet` is tracked so this can be added later without a data model change.
