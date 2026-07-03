import SwiftUI
import SwiftData

@main
struct OlyAppApp: App {
    let sharedModelContainer: ModelContainer = {
        let schema = Schema([LoggedSession.self, LifterMax.self])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
