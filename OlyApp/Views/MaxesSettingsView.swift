import SwiftUI
import SwiftData

struct MaxesSettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \LifterMax.liftName) private var maxes: [LifterMax]

    @State private var isPresentingAdd = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(maxes) { max in
                    NavigationLink {
                        EditMaxView(max: max)
                    } label: {
                        HStack {
                            Text(max.liftName)
                            Spacer()
                            Text("\(Int(max.oneRepMax)) \(max.unit.rawValue)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .onDelete(perform: delete)
            }
            .navigationTitle("Maxes")
            .overlay {
                if maxes.isEmpty {
                    ContentUnavailableView(
                        "No Maxes Logged",
                        systemImage: "chart.bar",
                        description: Text("Maxes are added the first time a lift shows up as a primary lift, or you can add one manually.")
                    )
                }
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isPresentingAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $isPresentingAdd) {
                AddMaxView()
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(maxes[index])
        }
    }
}

private struct AddMaxView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var liftName: String = PrecedentLibrary.allPrimaryLifts.first?.name ?? ""
    @State private var weightText: String = ""
    @State private var unit: WeightUnit = .lb

    var body: some View {
        NavigationStack {
            Form {
                Picker("Lift", selection: $liftName) {
                    ForEach(PrecedentLibrary.allPrimaryLifts) { lift in
                        Text(lift.name).tag(lift.name)
                    }
                }
                TextField("Weight", text: $weightText)
                    .keyboardType(.decimalPad)
                Picker("Unit", selection: $unit) {
                    ForEach(WeightUnit.allCases) { u in
                        Text(u.rawValue.uppercased()).tag(u)
                    }
                }
                .pickerStyle(.segmented)
            }
            .navigationTitle("Add Max")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let weight = Double(weightText), weight > 0 else { return }
                        modelContext.insert(LifterMax(liftName: liftName, oneRepMax: weight, unit: unit))
                        dismiss()
                    }
                    .disabled(Double(weightText) == nil)
                }
            }
        }
    }
}

private struct EditMaxView: View {
    @Bindable var max: LifterMax
    @State private var weightText: String

    init(max: LifterMax) {
        self.max = max
        _weightText = State(initialValue: String(Int(max.oneRepMax)))
    }

    var body: some View {
        Form {
            Text(max.liftName).font(.headline)
            TextField("Weight", text: $weightText)
                .keyboardType(.decimalPad)
                .onChange(of: weightText) { _, newValue in
                    if let value = Double(newValue) { max.oneRepMax = value }
                }
            Picker("Unit", selection: $max.unit) {
                ForEach(WeightUnit.allCases) { u in
                    Text(u.rawValue.uppercased()).tag(u)
                }
            }
            .pickerStyle(.segmented)
            LabeledContent("Set on", value: max.dateSet.formatted(date: .abbreviated, time: .omitted))
        }
        .navigationTitle("Edit Max")
    }
}

#Preview {
    MaxesSettingsView()
        .modelContainer(for: [LoggedSession.self, LifterMax.self], inMemory: true)
}
