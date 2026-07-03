import Foundation

/// Transient (not-yet-logged) representation of a generated accessory movement.
struct GeneratedExercise: Identifiable, Hashable {
    var id = UUID()
    var name: String
    var prescription: String
    var category: AccessoryCategory
}

/// Transient representation of a generated primary lift, before it's logged.
struct GeneratedPrimaryLift: Identifiable, Hashable {
    var id = UUID()
    var liftName: String
    var category: LiftCategory
    var buildSets: [String]
    var workSetsDescription: String
    var targetPercentRange: ClosedRange<Double>
    var estimatedWorkingWeight: Double?
    var weightUnit: WeightUnit?
    var tempoNote: String?
    var technicalCues: [String]
    var requiredPrepDrills: [String]
    var needsMaxEntry: Bool
    var isHeavyToday: Bool
}

struct GeneratedWarmup: Hashable {
    var generalPrep: [String]
    var liftSpecificPrep: [String]
    var estimatedMinutes: Int
}

struct GeneratedAccessoryRound: Hashable {
    var rounds: Int
    var exercises: [GeneratedExercise]
    var emphasis: AccessoryCategory
}

struct GeneratedSession: Identifiable, Hashable {
    var id = UUID()
    var requestedLengthMinutes: Int
    var date: Date
    var warmup: GeneratedWarmup
    var primaryLifts: [GeneratedPrimaryLift]
    var accessory: GeneratedAccessoryRound
    var isMaxTestDay: Bool

    func toLoggedSession() -> LoggedSession {
        let entries = primaryLifts.map { lift -> LiftEntry in
            let load: String
            if let weight = lift.estimatedWorkingWeight, let unit = lift.weightUnit {
                load = "\(Int(weight)) \(unit.rawValue)"
            } else {
                load = "\(Int(lift.targetPercentRange.lowerBound * 100))-\(Int(lift.targetPercentRange.upperBound * 100))%"
            }
            return LiftEntry(
                liftName: lift.liftName,
                category: lift.category,
                setsReps: lift.workSetsDescription,
                loadDescription: load,
                topPercent: lift.targetPercentRange.upperBound,
                notes: lift.tempoNote
            )
        }
        let accessoryNames = accessory.exercises.map(\.name)
        let tempo = primaryLifts.compactMap(\.tempoNote).first
        return LoggedSession(
            date: date,
            lengthMinutes: requestedLengthMinutes,
            primaryLifts: entries,
            accessoryMoves: accessoryNames,
            tempoOrPauseVariant: tempo
        )
    }
}
