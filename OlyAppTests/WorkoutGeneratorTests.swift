import XCTest
@testable import OlyApp

final class WorkoutGeneratorTests: XCTestCase {

    // MARK: - Rule 7: session length -> block count

    func testSessionStructureThresholds() {
        let generator = WorkoutGenerator()
        XCTAssertEqual(generator.sessionStructure(for: 45), .single)
        XCTAssertEqual(generator.sessionStructure(for: 60), .primaryPlusSecondary)
        XCTAssertEqual(generator.sessionStructure(for: 90), .dualPrimary)
        XCTAssertEqual(generator.sessionStructure(for: 30), .single)
        XCTAssertEqual(generator.sessionStructure(for: 120), .dualPrimary)
    }

    func testGenerateSingleStructureHasOnePrimaryLift() {
        let session = WorkoutGenerator().generate(lengthMinutes: 45, history: [], maxes: [])
        XCTAssertEqual(session.primaryLifts.count, 1)
        XCTAssertFalse(session.accessory.exercises.isEmpty)
    }

    func testGenerateDualPrimaryStructureHasTwoPrimaryLifts() {
        let session = WorkoutGenerator().generate(lengthMinutes: 90, history: [], maxes: [])
        XCTAssertEqual(session.primaryLifts.count, 2)
    }

    // MARK: - Rule 8: warm-up scales with session length

    func testWarmupDurationStaysWithinBounds() {
        let generator = WorkoutGenerator()
        for minutes in stride(from: 20, through: 120, by: 5) {
            let duration = generator.warmupDuration(for: minutes)
            XCTAssertGreaterThanOrEqual(duration, 5)
            XCTAssertLessThanOrEqual(duration, 10)
        }
    }

    // MARK: - Rule 1: rotate primary lift family

    func testFamilyRotatesAwayFromSnatchAfterSnatchSession() {
        let snatchEntry = LiftEntry(liftName: "Snatch", category: .snatchFamily, setsReps: "5x2", loadDescription: "80%", topPercent: 0.80)
        let lastSession = LoggedSession(date: .now, lengthMinutes: 60, primaryLifts: [snatchEntry], accessoryMoves: [])
        let family = WorkoutGenerator().chooseCompetitionFamily(lastSession: lastSession)
        XCTAssertEqual(family, .cleanJerkFamily)
    }

    func testFamilyRotatesAwayFromCleanJerkAfterCleanSession() {
        let cleanEntry = LiftEntry(liftName: "Clean", category: .cleanJerkFamily, setsReps: "5x2", loadDescription: "80%", topPercent: 0.80)
        let lastSession = LoggedSession(date: .now, lengthMinutes: 60, primaryLifts: [cleanEntry], accessoryMoves: [])
        let family = WorkoutGenerator().chooseCompetitionFamily(lastSession: lastSession)
        XCTAssertEqual(family, .snatchFamily)
    }

    // MARK: - Rule 2: squat balance

    func testSquatBalanceAvoidsHeavySquatWithin48Hours() {
        let heavySquat = LiftEntry(liftName: "Back Squat", category: .squat, setsReps: "5x3", loadDescription: "88%", topPercent: 0.88)
        let recentSession = LoggedSession(date: .now.addingTimeInterval(-3600), lengthMinutes: 60, primaryLifts: [heavySquat], accessoryMoves: [])
        let generator = WorkoutGenerator()
        for _ in 0..<25 {
            let template = generator.chooseSecondaryTemplate(history: [recentSession], avoid: [])
            if template.category == .squat {
                XCTAssertLessThan(template.workSetPercentRange.upperBound, 0.75)
            }
        }
    }

    // MARK: - Rule 4: intensity spacing

    func testIntensitySpacingCapsHeavyLiftWithin48Hours() {
        let heavyBackSquat = LiftEntry(liftName: "Back Squat", category: .squat, setsReps: "5x3", loadDescription: "88%", topPercent: 0.88)
        let recentSession = LoggedSession(date: .now.addingTimeInterval(-3600), lengthMinutes: 60, primaryLifts: [heavyBackSquat], accessoryMoves: [])
        let template = PrecedentLibrary.squatVariants.first { $0.name == "Back Squat" }!
        let result = WorkoutGenerator().buildPrimaryLift(template: template, history: [recentSession], maxes: [], testMax: false)
        XCTAssertLessThanOrEqual(result.targetPercentRange.upperBound, 0.80)
        XCTAssertFalse(result.isHeavyToday)
    }

    func testIntensitySpacingDoesNotCapLiftOlderThan48Hours() {
        let heavyBackSquat = LiftEntry(liftName: "Back Squat", category: .squat, setsReps: "5x3", loadDescription: "88%", topPercent: 0.88)
        let oldSession = LoggedSession(date: .now.addingTimeInterval(-72 * 3600), lengthMinutes: 60, primaryLifts: [heavyBackSquat], accessoryMoves: [])
        let template = PrecedentLibrary.squatVariants.first { $0.name == "Back Squat" }!
        let result = WorkoutGenerator().buildPrimaryLift(template: template, history: [oldSession], maxes: [], testMax: false)
        XCTAssertEqual(result.targetPercentRange, template.workSetPercentRange)
    }

    // MARK: - Rule 5: core always folded into accessory round

    func testAccessoryRoundAlwaysIncludesCoreMovement() {
        let generator = WorkoutGenerator()
        for _ in 0..<25 {
            let round = generator.buildAccessoryRound(history: [], rounds: 3, movementCount: 4, avoid: [])
            XCTAssertTrue(round.exercises.contains { $0.category == .core })
        }
    }

    // MARK: - Rule 3: push/pull balance alternates

    func testAccessoryEmphasisFlipsFromPullingToPressing() {
        let pullingSession = LoggedSession(
            date: .now,
            lengthMinutes: 60,
            primaryLifts: [],
            accessoryMoves: ["Bent-Over Row", "Pendlay Row", "Hollow Rocks"]
        )
        let round = WorkoutGenerator().buildAccessoryRound(history: [pullingSession], rounds: 3, movementCount: 3, avoid: [])
        XCTAssertEqual(round.emphasis, .pressing)
    }

    // MARK: - Manual "avoid X today" override

    func testAvoidedMovementNeverSelectedInAccessory() {
        let round = WorkoutGenerator().buildAccessoryRound(history: [], rounds: 3, movementCount: 4, avoid: ["Hollow Rocks"])
        XCTAssertFalse(round.exercises.contains { $0.name == "Hollow Rocks" })
    }

    // MARK: - Implementation note: technical cues + required prep drills

    func testCleanCarriesCueAndRequiredPrepDrills() {
        let template = PrecedentLibrary.family(forLiftName: "Clean")!
        XCTAssertEqual(template.requiredPrepDrills, ["Tall muscle clean", "Tall clean"])
        XCTAssertTrue(template.technicalCues.contains(PrecedentLibrary.cleanCue))
    }

    func testJerkFromRackCarriesCueAndRequiredPrepDrills() {
        let template = PrecedentLibrary.family(forLiftName: "Jerk From Rack")!
        XCTAssertEqual(template.requiredPrepDrills, ["Behind-the-neck push jerk in split", "Press in split", "Widen my split"])
        XCTAssertTrue(template.technicalCues.contains(PrecedentLibrary.jerkCue))
    }

    func testWarmupAutomaticallyIncludesRequiredPrepDrills() {
        let generator = WorkoutGenerator()
        let cleanTemplate = PrecedentLibrary.family(forLiftName: "Clean")!
        let lift = generator.buildPrimaryLift(template: cleanTemplate, history: [], maxes: [], testMax: false)
        let warmup = generator.buildWarmup(primaryLifts: [lift], minutes: 8)
        XCTAssertTrue(warmup.liftSpecificPrep.contains { $0.hasPrefix("Tall muscle clean") })
        XCTAssertTrue(warmup.liftSpecificPrep.contains { $0.hasPrefix("Tall clean") })
    }

    // MARK: - Lazy 1RM entry

    func testNeedsMaxEntryWhenNoMaxOnFile() {
        let template = PrecedentLibrary.family(forLiftName: "Snatch")!
        let lift = WorkoutGenerator().buildPrimaryLift(template: template, history: [], maxes: [], testMax: false)
        XCTAssertTrue(lift.needsMaxEntry)
        XCTAssertNil(lift.estimatedWorkingWeight)
    }

    func testEstimatedWeightComputedWhenMaxOnFile() {
        let template = PrecedentLibrary.family(forLiftName: "Back Squat")!
        let max = LifterMax(liftName: "Back Squat", oneRepMax: 200, unit: .lb)
        let lift = WorkoutGenerator().buildPrimaryLift(template: template, history: [], maxes: [max], testMax: false)
        XCTAssertFalse(lift.needsMaxEntry)
        XCTAssertNotNil(lift.estimatedWorkingWeight)
    }

    // MARK: - Optional true 1RM-finder day

    func testTestMaxDayUsesMaxFinderLadder() {
        let template = PrecedentLibrary.family(forLiftName: "Snatch")!
        let lift = WorkoutGenerator().buildPrimaryLift(template: template, history: [], maxes: [], testMax: true)
        XCTAssertEqual(lift.targetPercentRange, 0.90...1.03)
        XCTAssertTrue(lift.isHeavyToday)
    }
}
