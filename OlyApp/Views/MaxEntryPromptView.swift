import SwiftUI

/// Inline "no max on file yet" prompt shown the first time a lift is used as a
/// primary lift with no `LifterMax` recorded. Lets Cara enter a real number,
/// or skip and keep going with %-only guidance until she logs one later.
struct MaxEntryPromptView: View {
    let liftName: String
    var onSave: (Double, WeightUnit) -> Void

    @State private var weightText: String = ""
    @State private var unit: WeightUnit = .lb
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                isExpanded.toggle()
            } label: {
                Label("No max on file for \(liftName) — tap to enter", systemImage: "exclamationmark.circle")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.orange)
            }
            .buttonStyle(.plain)

            if isExpanded {
                Text("Enter it now, estimate, or skip and add it later from Maxes.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                HStack {
                    TextField("Weight", text: $weightText)
                        .keyboardType(.decimalPad)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 90)
                    Picker("Unit", selection: $unit) {
                        ForEach(WeightUnit.allCases) { u in
                            Text(u.rawValue.uppercased()).tag(u)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 100)
                    Button("Save") {
                        guard let value = Double(weightText), value > 0 else { return }
                        onSave(value, unit)
                        isExpanded = false
                    }
                    .disabled(Double(weightText) == nil)
                }
            }
        }
        .padding(8)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.orange.opacity(0.08)))
    }
}

#Preview {
    MaxEntryPromptView(liftName: "Clean") { _, _ in }
        .padding()
}
