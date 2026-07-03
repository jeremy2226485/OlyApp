import Foundation
import SwiftData

@Model
final class LoggedSession {
    var date: Date
    var lengthMinutes: Int
    var primaryLifts: [LiftEntry]
    var accessoryMoves: [String]
    var tempoOrPauseVariant: String?

    init(
        date: Date = .now,
        lengthMinutes: Int,
        primaryLifts: [LiftEntry],
        accessoryMoves: [String],
        tempoOrPauseVariant: String? = nil
    ) {
        self.date = date
        self.lengthMinutes = lengthMinutes
        self.primaryLifts = primaryLifts
        self.accessoryMoves = accessoryMoves
        self.tempoOrPauseVariant = tempoOrPauseVariant
    }
}

extension LoggedSession {
    var primaryCategories: Set<LiftCategory> {
        Set(primaryLifts.map(\.category))
    }

    func hasHeavyLift(named liftName: String) -> Bool {
        primaryLifts.contains { $0.liftName.caseInsensitiveCompare(liftName) == .orderedSame && $0.wasHeavy }
    }

    var hoursSinceSession: Double {
        Date().timeIntervalSince(date) / 3600
    }
}
