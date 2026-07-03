import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house") }

            HistoryView()
                .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }

            MaxesSettingsView()
                .tabItem { Label("Maxes", systemImage: "chart.bar.fill") }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [LoggedSession.self, LifterMax.self], inMemory: true)
}
