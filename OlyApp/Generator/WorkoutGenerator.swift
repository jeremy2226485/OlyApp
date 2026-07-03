import Foundation

/// Determines block structure from requested session length (rule 7).
enum SessionStructure {
    /// ~45 min: 1 primary lift + 1 accessory round.
    case single
    /// ~60 min: 1 primary lift + 1 secondary lift (squat or pull) + accessory round.
    case primaryPlusSecondary
    /// ~90 min (default): 2 primary lifts + accessory round.
    case dualPrimary
}

/// Pure rules engine over the precedent library + recent logged history.
/// Deliberately decoupled from SwiftUI/SwiftData so the rules can be tuned and
/// unit-tested independently of the app shell.
struct WorkoutGenerator {

    func generate(
        lengthMinutes: Int,
        history: [LoggedSession],
        maxes: [LifterMax],
        options: GenerationOptions = GenerationOptions()
    ) -> GeneratedSession {
        let sortedHistory = history.sorted { $0.date > $1.date }
        let lastSession = sortedHistory.first

        let structure = sessionStructure(for: lengthMinutes)
        let warmupMinutes = warmupDuration(for: lengthMinutes)

        // Rule 1: rotate competition-lift family vs. the most recent logged session.
        let compFamilyCategory = chooseCompetitionFamily(lastSession: lastSession)
        let compPool = compFamilyCategory == .snatchFamily
            ? PrecedentLibrary.snatchCompetitionLifts
            : PrecedentLibrary.cleanJerkCompetitionLifts
        let compTemplate = chooseLiftTemplate(from: compPool, history: sortedHistory, avoid: options.avoidMovements)

        var primaryLifts: [GeneratedPrimaryLift] = [
            buildPrimaryLift(template: compTemplate, history: sortedHistory, maxes: maxes, testMax: options.testMax)
        ]

        if structure != .single {
            let secondaryTemplate = chooseSecondaryTemplate(history: sortedHistory, avoid: options.avoidMovements)
            primaryLifts.append(
                buildPrimaryLift(template: secondaryTemplate, history: sortedHistory, maxes: maxes, testMax: false)
            )
        }

        let warmup = buildWarmup(primaryLifts: primaryLifts, minutes: warmupMinutes)

        let rounds = accessoryRounds(for: lengthMinutes, structure: structure)
        let movementCount = accessoryMovementCount(for: lengthMinutes)
        let accessory = buildAccessoryRound(
            history: sortedHistory,
            rounds: rounds,
            movementCount: movementCount,
            avoid: options.avoidMovements
        )

        return GeneratedSession(
            requestedLengthMinutes: lengthMinutes,
            date: .now,
            warmup: warmup,
            primaryLifts: primaryLifts,
            accessory: accessory,
            isMaxTestDay: options.testMax
        )
    }

    // MARK: - Rule 7: session length -> block count

    func sessionStructure(for minutes: Int) -> SessionStructure {
        switch minutes {
        case ..<50: return .single
        case 50..<75: return .primaryPlusSecondary
        default: return .dualPrimary
        }
    }

    /// Rule 8: warm-up scaled to session length, ~5-10 min.
    func warmupDuration(for minutes: Int) -> Int {
        Int(min(10, max(5, Double(minutes) * 0.11)).rounded())
    }

    func accessoryRounds(for minutes: Int, structure: SessionStructure) -> Int {
        switch structure {
        case .single: return 3
        case .primaryPlusSecondary: return minutes < 65 ? 2 : 3
        case .dualPrimary: return 3
        }
    }

    func accessoryMovementCount(for minutes: Int) -> Int {
        minutes >= 80 ? 4 : 3
    }

    // MARK: - Rule 1: rotate primary lift family

    func chooseCompetitionFamily(lastSession: LoggedSession?) -> LiftCategory {
        guard let last = lastSession else {
            return Bool.random() ? .snatchFamily : .cleanJerkFamily
        }
        let lastCategories = last.primaryCategories
        let hadSnatch = lastCategories.contains(.snatchFamily)
        let hadCleanJerk = lastCategories.contains(.cleanJerkFamily)
        if hadSnatch && !hadCleanJerk { return .cleanJerkFamily }
        if hadCleanJerk && !hadSnatch { return .snatchFamily }
        return Bool.random() ? .snatchFamily : .cleanJerkFamily
    }

    func chooseLiftTemplate(
        from pool: [PrimaryLiftFamily],
        history: [LoggedSession],
        avoid: Set<String>
    ) -> PrimaryLiftFamily {
        let available = pool.filter { !avoid.contains($0.name) }
        let recentNames = Set(history.prefix(3).flatMap { $0.primaryLifts.map(\.liftName) })
        let fresh = available.filter { !recentNames.contains($0.name) }
        let candidates = fresh.isEmpty ? available : fresh
        return candidates.randomElement() ?? pool.first!
    }

    // MARK: - Rule 2: squat balance + secondary slot (squat or pull)

    func chooseSecondaryTemplate(history: [LoggedSession], avoid: Set<String>) -> PrimaryLiftFamily {
        let squatSessionsAgo = sessionsAgo(history: history) { $0.primaryLifts.contains { $0.category == .squat } }
        let pullSessionsAgo = sessionsAgo(history: history) { $0.primaryLifts.contains { $0.category == .pull } }
        let preferSquat = (squatSessionsAgo ?? .max) >= (pullSessionsAgo ?? .max)

        if preferSquat {
            let lastHeavySquat = history.first {
                $0.primaryLifts.contains { ($0.liftName == "Back Squat" || $0.liftName == "Front Squat") && $0.wasHeavy }
            }
            let mustGoLight = lastHeavySquat.map { isRecent($0.date, withinHours: 48) } ?? false
            let pool = mustGoLight
                ? PrecedentLibrary.squatVariants.filter { $0.workSetPercentRange.upperBound < 0.75 }
                : PrecedentLibrary.squatVariants
            let filtered = pool.filter { !avoid.contains($0.name) }
            return filtered.randomElement() ?? PrecedentLibrary.squatVariants.first { $0.name == "Overhead Squat" }!
        } else {
            let pool = PrecedentLibrary.allPullVariants.filter { !avoid.contains($0.name) }
            return pool.randomElement() ?? PrecedentLibrary.allPullVariants.first!
        }
    }

    private func sessionsAgo(history: [LoggedSession], matching predicate: (LoggedSession) -> Bool) -> Int? {
        history.firstIndex(where: predicate)
    }

    private func isRecent(_ date: Date, withinHours hours: Double) -> Bool {
        Date().timeIntervalSince(date) < hours * 3600
    }

    // MARK: - Rule 4 (intensity spacing) + rule 6 (tempo variety) + prep drill/cue wiring

    func buildPrimaryLift(
        template: PrimaryLiftFamily,
        history: [LoggedSession],
        maxes: [LifterMax],
        testMax: Bool
    ) -> GeneratedPrimaryLift {
        let recentHeavyOnThisLift = history.contains {
            isRecent($0.date, withinHours: 48) && $0.hasHeavyLift(named: template.name)
        }

        var targetRange = template.workSetPercentRange
        if testMax {
            targetRange = 0.90...1.03
        } else if recentHeavyOnThisLift {
            let cappedUpper = min(targetRange.upperBound, 0.80)
            let lower = min(targetRange.lowerBound, cappedUpper)
            targetRange = lower...max(lower + 0.02, cappedUpper)
        }
        let isHeavyToday = testMax || targetRange.upperBound >= 0.85

        // Rule 6: if the same lift landed at a near-identical top % recently, prefer
        // varying via tempo/pause rather than only changing load.
        var tempoNote: String? = nil
        if !testMax {
            let priorEntry = history
                .flatMap(\.primaryLifts)
                .first { $0.liftName == template.name }
            if let priorPercent = priorEntry?.topPercent, abs(priorPercent - targetRange.upperBound) < 0.05 {
                tempoNote = PrecedentLibrary.tempoVariants
                    .filter { $0.appliesTo.contains(template.category) }
                    .randomElement()?.name
            }
        }

        let max = maxes.first { $0.liftName.caseInsensitiveCompare(template.name) == .orderedSame }
        let increment = max?.unit.roundingIncrement ?? 5
        let estimatedWeight = max.map { (($0.oneRepMax * targetRange.upperBound) / increment).rounded() * increment }

        let buildSets: [String] = ["Bar x5"] + template.buildPattern.map { pct in
            if let max {
                let weight = ((max.oneRepMax * pct) / increment).rounded() * increment
                return "\(Int(weight)) \(max.unit.rawValue) (\(Int(pct * 100))%)"
            }
            return "\(Int(pct * 100))%"
        }

        let workSetsDescription = testMax
            ? "Work up in small jumps to a new 1RM attempt"
            : "5 sets building to a top set at \(Int(targetRange.lowerBound * 100))-\(Int(targetRange.upperBound * 100))%"

        return GeneratedPrimaryLift(
            liftName: template.name,
            category: template.category,
            buildSets: buildSets,
            workSetsDescription: workSetsDescription,
            targetPercentRange: targetRange,
            estimatedWorkingWeight: estimatedWeight,
            weightUnit: max?.unit,
            tempoNote: tempoNote,
            technicalCues: template.technicalCues,
            requiredPrepDrills: template.requiredPrepDrills,
            needsMaxEntry: max == nil,
            isHeavyToday: isHeavyToday
        )
    }

    // MARK: - Rule 8 (warm-up) + required prep drills

    func buildWarmup(primaryLifts: [GeneratedPrimaryLift], minutes: Int) -> GeneratedWarmup {
        let generalPrep = [
            "Bike or row, 2-3 min easy",
            "Banded shoulder dislocates + pass-throughs",
            "Cossack squats x8/side",
            "Empty-bar good morning + RDL + back squat complex x5"
        ]
        let liftSpecific = primaryLifts.flatMap { lift -> [String] in
            var drills = lift.requiredPrepDrills.map { "\($0) x5" }
            drills.append("\(lift.liftName) build-up: " + lift.buildSets.joined(separator: " -> "))
            return drills
        }
        return GeneratedWarmup(generalPrep: generalPrep, liftSpecificPrep: liftSpecific, estimatedMinutes: minutes)
    }

    // MARK: - Rule 3 (push/pull balance) + rule 5 (core folded into accessory)

    func buildAccessoryRound(
        history: [LoggedSession],
        rounds: Int,
        movementCount: Int,
        avoid: Set<String>
    ) -> GeneratedAccessoryRound {
        let lastEmphasis = lastAccessoryEmphasis(history: history)
        let todayEmphasis: AccessoryCategory = lastEmphasis == .pressing ? .pulling : .pressing

        let emphasisPool = PrecedentLibrary.accessoryMoves.filter { $0.category == todayEmphasis && !avoid.contains($0.name) }
        let corePool = PrecedentLibrary.accessoryMoves.filter { $0.category == .core && !avoid.contains($0.name) }
        let supportPool = PrecedentLibrary.accessoryMoves.filter {
            [.posteriorChain, .unilateral].contains($0.category) && !avoid.contains($0.name)
        }

        var selected: [AccessoryMove] = []
        if let emphasisMove = emphasisPool.randomElement() { selected.append(emphasisMove) }
        // Core is always one of the rotating movements within the round(s) — never a
        // separate finisher section (rule 5).
        if let coreMove = corePool.randomElement() { selected.append(coreMove) }
        while selected.count < movementCount {
            let remaining = (supportPool + emphasisPool).filter { candidate in !selected.contains(candidate) }
            guard let next = remaining.randomElement() else { break }
            selected.append(next)
        }

        let exercises = selected.map { move in
            GeneratedExercise(name: move.name, prescription: "\(rounds) rounds x \(move.typicalPrescription)", category: move.category)
        }

        return GeneratedAccessoryRound(rounds: rounds, exercises: exercises, emphasis: todayEmphasis)
    }

    private func lastAccessoryEmphasis(history: [LoggedSession]) -> AccessoryCategory? {
        guard let last = history.first else { return nil }
        let names = Set(last.accessoryMoves)
        let pullingCount = PrecedentLibrary.accessoryMoves.filter { $0.category == .pulling && names.contains($0.name) }.count
        let pressingCount = PrecedentLibrary.accessoryMoves.filter { $0.category == .pressing && names.contains($0.name) }.count
        if pullingCount == 0 && pressingCount == 0 { return nil }
        return pullingCount >= pressingCount ? .pulling : .pressing
    }
}
