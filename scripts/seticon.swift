import AppKit

let args = CommandLine.arguments
guard args.count > 2 else {
    print("Usage: seticon <imagePath> <filePath>")
    exit(1)
}

let imagePath = args[1]
let filePath = args[2]

guard let image = NSImage(contentsOfFile: imagePath) else {
    print("Error: Could not load image at \(imagePath)")
    exit(1)
}

if NSWorkspace.shared.setIcon(image, forFile: filePath, options: []) {
    print("Successfully set icon for \(filePath)")
} else {
    print("Failed to set icon for \(filePath)")
    exit(1)
}
