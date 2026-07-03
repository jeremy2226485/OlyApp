import Foundation

/// A movement pattern from the precedent library: typical warm-up build ladder,
/// realistic working-set percent range, and any of Cara's standing technique
/// reminders that should surface whenever this lift appears as a primary lift.
struct PrimaryLiftFamily: Identifiable, Hashable {
    var id: String { name }
    var name: String
    var category: LiftCategory
    /// Fractions of 1RM for the warm-up ladder before work sets (e.g. 0.4, 0.5, 0.6, 0.7).
    var buildPattern: [Double]
    var workSetPercentRange: ClosedRange<Double>
    var technicalCues: [String]
    var requiredPrepDrills: [String]
    var isComplex: Bool

    init(
        name: String,
        category: LiftCategory,
        buildPattern: [Double] = [0.4, 0.5, 0.6, 0.7],
        workSetPercentRange: ClosedRange<Double> = 0.75...0.88,
        technicalCues: [String] = [],
        requiredPrepDrills: [String] = [],
        isComplex: Bool = false
    ) {
        self.name = name
        self.category = category
        self.buildPattern = buildPattern
        self.workSetPercentRange = workSetPercentRange
        self.technicalCues = technicalCues
        self.requiredPrepDrills = requiredPrepDrills
        self.isComplex = isComplex
    }
}
