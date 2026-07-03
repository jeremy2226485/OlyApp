import Foundation

enum AccessoryCategory: String, Codable, CaseIterable, Hashable {
    case pulling
    case pressing
    case posteriorChain
    case unilateral
    case core
    case conditioning
}

struct AccessoryMove: Identifiable, Hashable {
    var id: String { name }
    var name: String
    var category: AccessoryCategory
    var typicalPrescription: String
}
