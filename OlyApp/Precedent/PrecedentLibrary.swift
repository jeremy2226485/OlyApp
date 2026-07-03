import Foundation

/// Static template bank derived from ~50 screenshots of an in-person Olympic weightlifting
/// class, cross-referenced against Catalyst Athletics and Torokhtiy programming philosophy.
/// The generator samples from this bank rather than treating it as literal history.
enum PrecedentLibrary {

    // MARK: - Cara's standing technique cues

    static let cleanCue = "Control the pull. Smooth. Middle of foot balance. Push knees out, not just back. Smooth on the way up — slow until I'm near the top of my thigh."
    static let jerkCue = "Hips under shoulders. Piston. Lift knee. Reach the foot. Mindful of bending my back knee. Chin/head back. Split along the diagonal with a wider split stance. Turn back foot in the catch."

    static let cleanPrepDrills = ["Tall muscle clean", "Tall clean"]
    static let jerkPrepDrills = ["Behind-the-neck push jerk in split", "Press in split", "Widen my split"]

    // MARK: - Snatch family

    static let snatchFamily: [PrimaryLiftFamily] = [
        PrimaryLiftFamily(
            name: "Snatch",
            category: .snatchFamily,
            buildPattern: [0.4, 0.5, 0.6, 0.7],
            workSetPercentRange: 0.75...0.88
        ),
        PrimaryLiftFamily(
            name: "Hang Snatch",
            category: .snatchFamily,
            buildPattern: [0.4, 0.5, 0.6],
            workSetPercentRange: 0.65...0.78
        ),
        PrimaryLiftFamily(
            name: "Power Snatch",
            category: .snatchFamily,
            buildPattern: [0.4, 0.5, 0.6, 0.65],
            workSetPercentRange: 0.65...0.80
        ),
        PrimaryLiftFamily(
            name: "Snatch Balance",
            category: .snatchFamily,
            buildPattern: [0.3, 0.4, 0.5],
            workSetPercentRange: 0.60...0.80
        ),
        PrimaryLiftFamily(
            name: "Snatch Complex",
            category: .snatchFamily,
            buildPattern: [0.3, 0.4, 0.5],
            workSetPercentRange: 0.55...0.70,
            isComplex: true
        ),
        PrimaryLiftFamily(
            name: "Snatch Pull",
            category: .pull,
            buildPattern: [0.5, 0.6, 0.7, 0.8],
            workSetPercentRange: 0.85...1.05
        ),
        PrimaryLiftFamily(
            name: "Snatch Grip Deadlift",
            category: .pull,
            buildPattern: [0.5, 0.6, 0.7],
            workSetPercentRange: 0.90...1.15
        )
    ]

    // MARK: - Clean & jerk family

    static let cleanJerkFamily: [PrimaryLiftFamily] = [
        PrimaryLiftFamily(
            name: "Clean",
            category: .cleanJerkFamily,
            buildPattern: [0.4, 0.5, 0.6, 0.7],
            workSetPercentRange: 0.75...0.88,
            technicalCues: [cleanCue],
            requiredPrepDrills: cleanPrepDrills
        ),
        PrimaryLiftFamily(
            name: "Power Clean",
            category: .cleanJerkFamily,
            buildPattern: [0.4, 0.5, 0.6, 0.65],
            workSetPercentRange: 0.68...0.82,
            technicalCues: [cleanCue],
            requiredPrepDrills: cleanPrepDrills
        ),
        PrimaryLiftFamily(
            name: "Clean and Jerk",
            category: .cleanJerkFamily,
            buildPattern: [0.3, 0.4, 0.5, 0.6],
            workSetPercentRange: 0.65...0.82,
            technicalCues: [cleanCue, jerkCue],
            requiredPrepDrills: cleanPrepDrills + jerkPrepDrills,
            isComplex: true
        ),
        PrimaryLiftFamily(
            name: "Clean Complex",
            category: .cleanJerkFamily,
            buildPattern: [0.3, 0.4, 0.5],
            workSetPercentRange: 0.55...0.70,
            technicalCues: [cleanCue],
            requiredPrepDrills: cleanPrepDrills,
            isComplex: true
        ),
        PrimaryLiftFamily(
            name: "Jerk From Rack",
            category: .cleanJerkFamily,
            buildPattern: [0.4, 0.5, 0.6, 0.7],
            workSetPercentRange: 0.75...0.90,
            technicalCues: [jerkCue],
            requiredPrepDrills: jerkPrepDrills
        ),
        PrimaryLiftFamily(
            name: "Clean Pull",
            category: .pull,
            buildPattern: [0.5, 0.6, 0.7, 0.8],
            workSetPercentRange: 0.85...1.05
        )
    ]

    // MARK: - Squat variants

    static let squatVariants: [PrimaryLiftFamily] = [
        PrimaryLiftFamily(
            name: "Back Squat",
            category: .squat,
            buildPattern: [0.4, 0.5, 0.6, 0.7],
            workSetPercentRange: 0.75...0.90
        ),
        PrimaryLiftFamily(
            name: "Front Squat",
            category: .squat,
            buildPattern: [0.4, 0.5, 0.6, 0.65],
            workSetPercentRange: 0.70...0.85
        ),
        PrimaryLiftFamily(
            name: "Overhead Squat",
            category: .squat,
            buildPattern: [0.3, 0.4, 0.5],
            workSetPercentRange: 0.50...0.70
        )
    ]

    // MARK: - Derived pools

    static var snatchCompetitionLifts: [PrimaryLiftFamily] {
        snatchFamily.filter { $0.category == .snatchFamily }
    }

    static var cleanJerkCompetitionLifts: [PrimaryLiftFamily] {
        cleanJerkFamily.filter { $0.category == .cleanJerkFamily }
    }

    static var allPullVariants: [PrimaryLiftFamily] {
        (snatchFamily + cleanJerkFamily).filter { $0.category == .pull }
    }

    static var allPrimaryLifts: [PrimaryLiftFamily] {
        snatchFamily + cleanJerkFamily + squatVariants
    }

    static func family(forLiftName name: String) -> PrimaryLiftFamily? {
        allPrimaryLifts.first { $0.name.caseInsensitiveCompare(name) == .orderedSame }
    }

    // MARK: - Tempo / pause variants

    static let tempoVariants: [TempoVariant] = [
        TempoVariant(name: "2-4 sec pause at the bottom of the squat", appliesTo: [.squat]),
        TempoVariant(name: "3 sec pause just below the knee", appliesTo: [.pull]),
        TempoVariant(name: "3-4 count slow eccentric", appliesTo: [.squat, .pull]),
        TempoVariant(name: "Only first rep paused", appliesTo: [.squat])
    ]

    // MARK: - Accessory movement bank
    // Confirmed equipment: barbells + plates, two power racks w/ pull-up bars, dumbbells,
    // kettlebells, bands + straps, slam/wall balls, ab/back extension bench, GHD-style bench,
    // leg press/hack squat sled, cable functional trainer, AirBike, rower, SkiErg, sandbags,
    // plyo box, stability ball, treadmill, chains.

    static let accessoryMoves: [AccessoryMove] = [
        // Pulling
        AccessoryMove(name: "Bent-Over Row", category: .pulling, typicalPrescription: "10-12 reps"),
        AccessoryMove(name: "Pendlay Row", category: .pulling, typicalPrescription: "6-8 reps"),
        AccessoryMove(name: "Bench-Supported DB Row", category: .pulling, typicalPrescription: "10-12 reps/side"),
        AccessoryMove(name: "Cable Row", category: .pulling, typicalPrescription: "12-15 reps"),
        AccessoryMove(name: "Chin-Up (banded if needed)", category: .pulling, typicalPrescription: "6-10 reps"),
        AccessoryMove(name: "Jumping Negatives", category: .pulling, typicalPrescription: "5-6 reps"),

        // Pressing
        AccessoryMove(name: "DB Strict Press", category: .pressing, typicalPrescription: "8-10 reps"),
        AccessoryMove(name: "Bench Press (paused)", category: .pressing, typicalPrescription: "6-8 reps"),
        AccessoryMove(name: "Push-Ups (weighted variant)", category: .pressing, typicalPrescription: "10-15 reps"),
        AccessoryMove(name: "Cable Press", category: .pressing, typicalPrescription: "12-15 reps"),

        // Posterior chain / hinge
        AccessoryMove(name: "RDL", category: .posteriorChain, typicalPrescription: "8-10 reps"),
        AccessoryMove(name: "SLDL", category: .posteriorChain, typicalPrescription: "8 reps/side"),
        AccessoryMove(name: "Back Extension (GHD-style bench)", category: .posteriorChain, typicalPrescription: "12-15 reps"),
        AccessoryMove(name: "Glute Bridge", category: .posteriorChain, typicalPrescription: "15 reps"),
        AccessoryMove(name: "Good Morning", category: .posteriorChain, typicalPrescription: "10 reps"),
        AccessoryMove(name: "Leg Press (light, high-rep)", category: .posteriorChain, typicalPrescription: "15-20 reps"),

        // Unilateral / stability
        AccessoryMove(name: "Single-Arm Overhead Carry", category: .unilateral, typicalPrescription: "30-40 ft/side"),
        AccessoryMove(name: "Single-Arm Farmer Carry", category: .unilateral, typicalPrescription: "40-50 ft/side"),
        AccessoryMove(name: "KB Windmill", category: .unilateral, typicalPrescription: "6-8 reps/side"),
        AccessoryMove(name: "Reverse Lunge (front rack or overhead)", category: .unilateral, typicalPrescription: "8 reps/side"),
        AccessoryMove(name: "RFE Split Squat", category: .unilateral, typicalPrescription: "8-10 reps/side"),
        AccessoryMove(name: "Bouncing OHS Walk", category: .unilateral, typicalPrescription: "20-30 ft"),
        AccessoryMove(name: "Sandbag Carry", category: .unilateral, typicalPrescription: "40-50 ft"),

        // Core (at least one required per accessory round)
        AccessoryMove(name: "Hollow Rocks", category: .core, typicalPrescription: "20-30 reps"),
        AccessoryMove(name: "Hollow-Ups", category: .core, typicalPrescription: "10-15 reps"),
        AccessoryMove(name: "V-Ups", category: .core, typicalPrescription: "12-15 reps"),
        AccessoryMove(name: "Ab-Saw", category: .core, typicalPrescription: "8-10 reps/side"),
        AccessoryMove(name: "Side Plank Hip Raise", category: .core, typicalPrescription: "10 reps/side"),
        AccessoryMove(name: "Weighted Plank", category: .core, typicalPrescription: "30-45 sec"),
        AccessoryMove(name: "GHD-Style Sit-Up", category: .core, typicalPrescription: "10-12 reps"),

        // Conditioning-flavored — used sparingly; not part of default rotation pools.
        AccessoryMove(name: "KB Swings", category: .conditioning, typicalPrescription: "15-20 reps"),
        AccessoryMove(name: "Box Jumps", category: .conditioning, typicalPrescription: "8-10 reps"),
        AccessoryMove(name: "Wall Ball / Slam Ball", category: .conditioning, typicalPrescription: "15 reps"),
        AccessoryMove(name: "AirBike / Rower / SkiErg Interval", category: .conditioning, typicalPrescription: "20-30 sec")
    ]
}
