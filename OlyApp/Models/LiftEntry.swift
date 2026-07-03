import Foundation

/// A single primary-lift record within a `LoggedSession`.
struct LiftEntry: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var liftName: String
    var category: LiftCategory
    var setsReps: String
    var loadDescription: String
    var topPercent: Double?
    var wasHeavy: Bool
    var notes: String?

    init(
        liftName: String,
        category: LiftCategory,
        setsReps: String,
        loadDescription: String,
        topPercent: Double? = nil,
        notes: String? = nil
    ) {
        self.liftName = liftName
        self.category = category
        self.setsReps = setsReps
        self.loadDescription = loadDescription
        self.topPercent = topPercent
        self.wasHeavy = (topPercent ?? 0) >= 0.85
        self.notes = notes
    }
}
