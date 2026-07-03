import SwiftUI
import SwiftData

struct NewSessionView: View {
    @Query(sort: \LoggedSession.date, order: .reverse) private var history: [LoggedSession]
    @Query private var maxes: [LifterMax]

    @State private var lengthMinutes: Double = 90
    @State private var testMax: Bool = false
    @State private var avoidMovements: Set<String> = []
    @State private var avoidInput: String = ""
    @State private var generatedSession: GeneratedSession?

    private let lengthPresets: [Double] = [45, 60, 90]

    var body: some View {
        Form {
            Section("Session Length") {
                HStack {
                    Text("\(Int(lengthMinutes)) min")
                        .font(.title2.weight(.semibold))
                        .monospacedDigit()
                    Spacer()
                    ForEach(lengthPresets, id: \.self) { preset in
                        Button("\(Int(preset))") { lengthMinutes = preset }
                            .buttonStyle(.bordered)
                            .tint(Int(lengthMinutes) == Int(preset) ? .accentColor : .gray)
                    }
                }
                Slider(value: $lengthMinutes, in: 20...120, step: 5)
            }

            Section("Options") {
                Toggle("Test a 1RM today?", isOn: $testMax)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Avoid a movement today")
                        .font(.subheadline)
                    HStack {
                        TextField("e.g. Snatch Balance", text: $avoidInput)
                            .textFieldStyle(.roundedBorder)
                        Button("Add") {
                            let trimmed = avoidInput.trimmingCharacters(in: .whitespaces)
                            guard !trimmed.isEmpty else { return }
                            avoidMovements.insert(trimmed)
                            avoidInput = ""
                        }
                        .disabled(avoidInput.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                    if !avoidMovements.isEmpty {
                        FlowChips(items: Array(avoidMovements).sorted()) { item in
                            avoidMovements.remove(item)
                        }
                    }
                }
                .padding(.vertical, 4)
            }

            Section {
                Button {
                    generate()
                } label: {
                    Text("Generate Session")
                        .frame(maxWidth: .infinity)
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .navigationTitle("New Session")
        .navigationDestination(item: $generatedSession) { session in
            SessionDetailView(session: session)
        }
    }

    private func generate() {
        let options = GenerationOptions(testMax: testMax, avoidMovements: avoidMovements)
        generatedSession = WorkoutGenerator().generate(
            lengthMinutes: Int(lengthMinutes),
            history: history,
            maxes: maxes,
            options: options
        )
    }
}

/// Simple wrapping chip layout for the "avoid movement" tags.
private struct FlowChips: View {
    let items: [String]
    let onRemove: (String) -> Void

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                HStack(spacing: 4) {
                    Text(item)
                        .font(.caption)
                        .lineLimit(1)
                    Button {
                        onRemove(item)
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.caption)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule().fill(Color.gray.opacity(0.2)))
            }
        }
    }
}

#Preview {
    NavigationStack {
        NewSessionView()
    }
    .modelContainer(for: [LoggedSession.self, LifterMax.self], inMemory: true)
}
