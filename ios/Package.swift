// swift-tools-version: 6.0
import PackageDescription

let package = Package(name: "Evolingo", platforms: [.iOS(.v17)], products: [
    .library(name: "Evolingo", targets: ["Evolingo"])
], targets: [.target(name: "Evolingo", resources: [.process("Resources")])])
