import Foundation
import SwiftData

enum WeightUnit: String, Codable, CaseIterable, Identifiable, Hashable {
    case lb
    case kg

    var id: String { rawValue }

    /// Typical plate-loading increment for rounding estimated working weights.
    var roundingIncrement: Double {
        switch self {
        case .lb: return 5
        case .kg: return 2.5
        }
    }
}

@Model
final class LifterMax {
    var liftName: String
    var oneRepMax: Double
    var dateSet: Date
    private var unitRawValue: String

    var unit: WeightUnit {
        get { WeightUnit(rawValue: unitRawValue) ?? .lb }
        set { unitRawValue = newValue.rawValue }
    }

    init(liftName: String, oneRepMax: Double, dateSet: Date = .now, unit: WeightUnit = .lb) {
        self.liftName = liftName
        self.oneRepMax = oneRepMax
        self.dateSet = dateSet
        self.unitRawValue = unit.rawValue
    }
}
