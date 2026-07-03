import SwiftUI
import SwiftData

struct HomeView: View {
    @Query(sort: \LoggedSession.date, order: .reverse) private var sessions: [LoggedSession]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        NewSessionView()
                    } label: {
                        Label("New Session", systemImage: "plus.circle.fill")
                            .font(.headline)
                            .foregroundStyle(.tint)
                    }
                    .padding(.vertical, 6)
                }

                if !sessions.isEmpty {
                    Section("Recent Sessions") {
                        ForEach(sessions.prefix(3)) { session in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(session.date, style: .date)
                                    .font(.subheadline.weight(.semibold))
                                Text(session.primaryLifts.map(\.liftName).joined(separator: " + "))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                if !session.accessoryMoves.isEmpty {
                                    Text(session.accessoryMoves.joined(separator: ", "))
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                        .lineLimit(1)
                                }
                            }
                            .padding(.vertical, 2)
                        }
                    }
                } else {
                    Section {
                        Text("No sessions logged yet. Generate your first one above.")
                            .foregroundStyle(.secondary)
                            .font(.subheadline)
                    }
                }
            }
            .navigationTitle("OlyApp")
        }
    }
}

#Preview {
    HomeView()
        .modelContainer(for: [LoggedSession.self, LifterMax.self], inMemory: true)
}
