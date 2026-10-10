// Usage: onscreen-windows <fullscreen-owner> [<reminder-owner>]
// Lists the windows macOS has on screen, front to back. Fails unless <fullscreen-owner> has a
// window covering the whole main display (it really is fullscreen and its Space is showing)
// and, when <reminder-owner> is given, that app has a full-display window in front of it.
import CoreGraphics
import Foundation

let args = CommandLine.arguments
guard args.count >= 2 else {
  FileHandle.standardError.write("usage: onscreen-windows <fullscreen-owner> [<reminder-owner>]\n".data(using: .utf8)!)
  exit(2)
}
let fullscreenOwner = args[1].lowercased()
let reminderOwner = args.count > 2 ? args[2].lowercased() : nil

let display = CGDisplayBounds(CGMainDisplayID())
let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)
  as? [[String: Any]] ?? []

func coversDisplay(_ window: [String: Any]) -> Bool {
  guard let raw = window[kCGWindowBounds as String] as? NSDictionary,
        let bounds = CGRect(dictionaryRepresentation: raw) else { return false }
  return bounds.minX <= display.minX && bounds.minY <= display.minY
    && bounds.maxX >= display.maxX && bounds.maxY >= display.maxY
}
func owner(_ window: [String: Any]) -> String {
  (window[kCGWindowOwnerName as String] as? String ?? "?").lowercased()
}

for (index, window) in windows.enumerated() {
  let layer = window[kCGWindowLayer as String] as? Int ?? 0
  let raw = window[kCGWindowBounds as String] as? NSDictionary
  let bounds = raw.flatMap { CGRect(dictionaryRepresentation: $0) } ?? .zero
  print("\(index): owner=\(owner(window)) layer=\(layer) bounds=\(bounds)")
}

guard let fullscreenIndex = windows.firstIndex(where: { owner($0) == fullscreenOwner && coversDisplay($0) }) else {
  print("::error::no fullscreen window from \(fullscreenOwner) is on screen")
  exit(1)
}
print("Fullscreen window from \(fullscreenOwner) is on screen at position \(fullscreenIndex)")

if let reminderOwner {
  guard let reminderIndex = windows.firstIndex(where: { owner($0) == reminderOwner && coversDisplay($0) }) else {
    print("::error::no full-display window from \(reminderOwner) is on screen over the fullscreen app")
    exit(1)
  }
  guard reminderIndex < fullscreenIndex else {
    print("::error::\(reminderOwner)'s window is behind the fullscreen window")
    exit(1)
  }
  print("Break window from \(reminderOwner) is in front of the fullscreen window")
}
