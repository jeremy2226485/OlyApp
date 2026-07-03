import Foundation

/// A tempo/pause lever used to add variety when a lift/rep/% scheme would otherwise repeat.
struct TempoVariant: Identifiable, Hashable {
    var id: String { name }
    var name: String
    var appliesTo: Set<LiftCategory>
}
