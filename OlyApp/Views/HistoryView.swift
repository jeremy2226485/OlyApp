import SwiftUI
import SwiftData

struct HistoryView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LoggedSession.date, order: .reverse) private var sessions: [LoggedSession]

    var body: some View {
        NavigationStack {
            List {
                if !sessions.isEmpty {
                    Section("Frequency") {
                        LabeledContent("Days since last heavy snatch", value: daysSinceHeavy(category: .snatchFamily))
                        LabeledContent("Days since last heavy clean/jerk", value: daysSinceHeavy(category: .cleanJerkFamily))
                        LabeledContent("Last squat variant", value: lastLiftName(category: .squat) ?? "—")
                        LabeledContent("Last pull variant", value: lastLiftName(category: .pull) ?? "—")
                    }
                    .font(.subheadline)
                }

                Section("Logged Sessions") {
                    ForEach(sessions) { session in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(session.date, style: .date)
                                    .font(.subheadline.weight(.semibold))
                                Spacer()
                                Text("\(session.lengthMinutes) min")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            ForEach(session.primaryLifts) { lift in
                                Text("\(lift.liftName) — \(lift.setsReps) @ \(lift.loadDescription)")
                                    .font(.caption)
                            }
                            if !session.accessoryMoves.isEmpty {
                                Text(session.accessoryMoves.joined(separator: ", "))
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                            if let tempo = session.tempoOrPauseVariant {
                                Text(tempo)
                                    .font(.caption2)
                                    .foregroundStyle(.tint)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    .onDelete(perform: delete)
                }
            }
            .navigationTitle("History")
            .overlay {
                if sessions.isEmpty {
                    ContentUnavailableView(
                        "No Sessions Yet",
                        systemImage: "clock",
                        description: Text("Completed sessions will show up here.")
                    )
                }
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(sessions[index])
        }
    }

    private func daysSinceHeavy(category: LiftCategory) -> String {
        guard let last = sessions.first(where: { session in
            session.primaryLifts.contains { $0.category == category && $0.wasHeavy }
        }) else { return "—" }
        let days = Int(Date().timeIntervalSince(last.date) / 86400)
        return "\(days)d ago"
    }

    private func lastLiftName(category: LiftCategory) -> String? {
        for session in sessions {
            if let lift = session.primaryLifts.first(where: { $0.category == category }) {
                return lift.liftName
            }
        }
        return nil
    }
}

#Preview {
    HistoryView()
        .modelContainer(for: [LoggedSession.self, LifterMax.self], inMemory: true)
}
