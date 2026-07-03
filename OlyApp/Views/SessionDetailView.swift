import SwiftUI
import SwiftData

struct SessionDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LoggedSession.date, order: .reverse) private var history: [LoggedSession]

    @State private var session: GeneratedSession
    @State private var isCompleted = false

    private let generator = WorkoutGenerator()

    init(session: GeneratedSession) {
        _session = State(initialValue: session)
    }

    var body: some View {
        List {
            Section("Warm-Up (~\(session.warmup.estimatedMinutes) min)") {
                ForEach(session.warmup.generalPrep, id: \.self) { item in
                    Label(item, systemImage: "figure.flexibility")
                        .font(.subheadline)
                }
                if !session.warmup.liftSpecificPrep.isEmpty {
                    ForEach(session.warmup.liftSpecificPrep, id: \.self) { item in
                        Label(item, systemImage: "figure.strengthtraining.traditional")
                            .font(.subheadline)
                    }
                }
            }

            ForEach(Array(session.primaryLifts.enumerated()), id: \.element.id) { index, lift in
                Section {
                    PrimaryLiftCard(
                        lift: binding(forLiftAt: index),
                        onSaveMax: { weight, unit in saveMax(forLiftAt: index, weight: weight, unit: unit) },
                        onSwap: { swapPrimaryLift(at: index) }
                    )
                } header: {
                    Text(lift.liftName)
                }
            }

            Section {
                ForEach(Array(session.accessory.exercises.enumerated()), id: \.element.id) { index, exercise in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                if exercise.category == .core {
                                    Image(systemName: "figure.core.training")
                                        .foregroundStyle(.secondary)
                                }
                                Text(exercise.name)
                                    .font(.body)
                            }
                            Text(exercise.prescription)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button {
                            swapAccessoryExercise(at: index)
                        } label: {
                            Image(systemName: "arrow.triangle.2.circlepath")
                        }
                        .buttonStyle(.borderless)
                    }
                }
            } header: {
                Text("Accessory — \(session.accessory.rounds) rounds, \(session.accessory.emphasis.rawValue.capitalized) emphasis")
            }

            Section {
                Button {
                    complete()
                } label: {
                    Text(isCompleted ? "Logged" : "Mark Complete")
                        .frame(maxWidth: .infinity)
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isCompleted)
            }
        }
        .navigationTitle(session.isMaxTestDay ? "Max Test Day" : "\(session.requestedLengthMinutes) min Session")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func binding(forLiftAt index: Int) -> Binding<GeneratedPrimaryLift> {
        Binding(
            get: { session.primaryLifts[index] },
            set: { session.primaryLifts[index] = $0 }
        )
    }

    private func saveMax(forLiftAt index: Int, weight: Double, unit: WeightUnit) {
        let lift = session.primaryLifts[index]
        let newMax = LifterMax(liftName: lift.liftName, oneRepMax: weight, unit: unit)
        modelContext.insert(newMax)

        let increment = unit.roundingIncrement
        let estimated = ((weight * lift.targetPercentRange.upperBound) / increment).rounded() * increment
        session.primaryLifts[index].estimatedWorkingWeight = estimated
        session.primaryLifts[index].weightUnit = unit
        session.primaryLifts[index].needsMaxEntry = false
    }

    private func swapPrimaryLift(at index: Int) {
        let current = session.primaryLifts[index]
        let pool: [PrimaryLiftFamily]
        switch current.category {
        case .snatchFamily: pool = PrecedentLibrary.snatchCompetitionLifts
        case .cleanJerkFamily: pool = PrecedentLibrary.cleanJerkCompetitionLifts
        case .squat: pool = PrecedentLibrary.squatVariants
        case .pull: pool = PrecedentLibrary.allPullVariants
        }
        let alternatives = pool.filter { $0.name != current.liftName }
        guard let newTemplate = alternatives.randomElement() else { return }
        let maxesSnapshot = fetchMaxes()
        session.primaryLifts[index] = generator.buildPrimaryLift(
            template: newTemplate,
            history: history,
            maxes: maxesSnapshot,
            testMax: session.isMaxTestDay && index == 0
        )
    }

    private func swapAccessoryExercise(at index: Int) {
        let current = session.accessory.exercises[index]
        let selectedNames = Set(session.accessory.exercises.map(\.name))
        let alternatives = PrecedentLibrary.accessoryMoves.filter {
            $0.category == current.category && !selectedNames.contains($0.name)
        }
        guard let newMove = alternatives.randomElement() else { return }
        session.accessory.exercises[index] = GeneratedExercise(
            name: newMove.name,
            prescription: "\(session.accessory.rounds) rounds x \(newMove.typicalPrescription)",
            category: newMove.category
        )
    }

    private func fetchMaxes() -> [LifterMax] {
        (try? modelContext.fetch(FetchDescriptor<LifterMax>())) ?? []
    }

    private func complete() {
        let logged = session.toLoggedSession()
        modelContext.insert(logged)
        isCompleted = true
    }
}

private struct PrimaryLiftCard: View {
    @Binding var lift: GeneratedPrimaryLift
    var onSaveMax: (Double, WeightUnit) -> Void
    var onSwap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if !lift.technicalCues.isEmpty {
                ForEach(lift.technicalCues, id: \.self) { cue in
                    Text(cue)
                        .font(.footnote)
                        .italic()
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color.accentColor.opacity(0.1)))
                }
            }

            if lift.isHeavyToday {
                Label("Heavy day", systemImage: "flame.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.orange)
            }

            ForEach(lift.buildSets, id: \.self) { step in
                Text(step)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(lift.workSetsDescription)
                .font(.subheadline.weight(.medium))

            if let weight = lift.estimatedWorkingWeight, let unit = lift.weightUnit {
                Text("Estimated top set: \(Int(weight)) \(unit.rawValue)")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.tint)
            }

            if let tempo = lift.tempoNote {
                Label(tempo, systemImage: "timer")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if lift.needsMaxEntry {
                MaxEntryPromptView(liftName: lift.liftName, onSave: onSaveMax)
            }

            Button("Swap Lift", action: onSwap)
                .font(.caption)
                .buttonStyle(.borderless)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NavigationStack {
        SessionDetailView(session: WorkoutGenerator().generate(lengthMinutes: 90, history: [], maxes: []))
    }
    .modelContainer(for: [LoggedSession.self, LifterMax.self], inMemory: true)
}
