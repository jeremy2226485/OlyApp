import Foundation

/// Optional per-generation overrides, surfaced on the New Session screen.
struct GenerationOptions {
    /// "Test a 1RM today?" — swaps the top-set scheme for a true max-finder ladder.
    var testMax: Bool = false
    /// Manual "avoid X today" override. Kept independent of history-driven logic
    /// since Cara may want to dodge a movement for reasons the app can't infer
    /// (tweaky shoulder, gym is busy on that rack, etc.).
    var avoidMovements: Set<String> = []
}
