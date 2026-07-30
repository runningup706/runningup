// 목표와 Unity 캡처를 왜곡 없이 같은 1080x1920 캔버스로 정규화하고 좌우 비교 이미지를 만든다.
import AppKit
import Foundation

struct Arguments {
    let target: URL
    let unity: URL
    let outputDirectory: URL
}

func parseArguments() throws -> Arguments {
    guard CommandLine.arguments.count == 4 else {
        throw NSError(
            domain: "RunningUpArtPipeline",
            code: 2,
            userInfo: [
                NSLocalizedDescriptionKey:
                    "usage: compose-qa-images.swift <target> <unity> <output-directory>",
            ])
    }

    return Arguments(
        target: URL(fileURLWithPath: CommandLine.arguments[1]),
        unity: URL(fileURLWithPath: CommandLine.arguments[2]),
        outputDirectory: URL(fileURLWithPath: CommandLine.arguments[3],
                             isDirectory: true))
}

func loadImage(_ url: URL) throws -> NSImage {
    guard let image = NSImage(contentsOf: url) else {
        throw NSError(
            domain: "RunningUpArtPipeline",
            code: 3,
            userInfo: [NSLocalizedDescriptionKey: "cannot load image: \(url.path)"])
    }
    return image
}

func normalizedCanvas(
    image: NSImage,
    width: Int = 1080,
    height: Int = 1920
) -> NSBitmapImageRep {
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSColor(calibratedRed: 0.025, green: 0.05, blue: 0.10, alpha: 1).setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()

    let scale = min(CGFloat(width) / image.size.width,
                    CGFloat(height) / image.size.height)
    let drawSize = NSSize(width: image.size.width * scale,
                          height: image.size.height * scale)
    let drawRect = NSRect(
        x: (CGFloat(width) - drawSize.width) * 0.5,
        y: (CGFloat(height) - drawSize.height) * 0.5,
        width: drawSize.width,
        height: drawSize.height)
    image.draw(
        in: drawRect,
        from: NSRect(origin: .zero, size: image.size),
        operation: .copy,
        fraction: 1,
        respectFlipped: true,
        hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
    return bitmap
}

func comparison(
    left: NSBitmapImageRep,
    right: NSBitmapImageRep
) -> NSBitmapImageRep {
    let width = left.pixelsWide + right.pixelsWide
    let height = max(left.pixelsHigh, right.pixelsHigh)
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let leftImage = NSImage(size: NSSize(width: left.pixelsWide,
                                         height: left.pixelsHigh))
    leftImage.addRepresentation(left)
    let rightImage = NSImage(size: NSSize(width: right.pixelsWide,
                                          height: right.pixelsHigh))
    rightImage.addRepresentation(right)
    leftImage.draw(in: NSRect(x: 0, y: 0,
                              width: left.pixelsWide,
                              height: left.pixelsHigh))
    rightImage.draw(in: NSRect(x: left.pixelsWide, y: 0,
                               width: right.pixelsWide,
                               height: right.pixelsHigh))
    NSGraphicsContext.restoreGraphicsState()
    return bitmap
}

func writePng(_ bitmap: NSBitmapImageRep, to url: URL) throws {
    guard let data = bitmap.representation(
        using: .png,
        properties: [.compressionFactor: 1]) else {
        throw NSError(
            domain: "RunningUpArtPipeline",
            code: 4,
            userInfo: [NSLocalizedDescriptionKey: "cannot encode PNG"])
    }
    try data.write(to: url, options: .atomic)
}

let arguments = try parseArguments()
try FileManager.default.createDirectory(
    at: arguments.outputDirectory,
    withIntermediateDirectories: true)
let target = normalizedCanvas(image: try loadImage(arguments.target))
let unity = normalizedCanvas(image: try loadImage(arguments.unity))
try writePng(
    target,
    to: arguments.outputDirectory.appendingPathComponent("target-1080x1920.png"))
try writePng(
    unity,
    to: arguments.outputDirectory.appendingPathComponent("unity-1080x1920.png"))
try writePng(
    comparison(left: target, right: unity),
    to: arguments.outputDirectory.appendingPathComponent(
        "target-vs-unity-2160x1920.png"))
print("RUNNINGUP_V11_QA_COMPOSITE_PASS target=1080x1920 unity=1080x1920 comparison=2160x1920")
