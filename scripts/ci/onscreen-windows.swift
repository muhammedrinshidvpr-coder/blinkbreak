// Usage: onscreen-windows [--fullscreen <owner>] [--break <owner>]
// Lists the windows macOS has on screen, front to back, then checks:
//   --fullscreen <owner>: that app has an on-screen window covering the whole main display
//                         (it really is fullscreen and its Space is showing);
//   --break <owner>:      that app has an on-screen full-display window, in front of the
//                         fullscreen window when both are given.
// When the break window is missing, it also lists every window of that app, on screen or not.
import CoreGraphics
import Foundation

var fullscreenOwner: String?
var breakOwner: String?
var rest = CommandLine.arguments.dropFirst()
while let flag = rest.popFirst() {
  guard let value = rest.popFirst() else { break }
  switch flag {
  case "--fullscreen": fullscreenOwner = value.lowercased()
  case "--break": breakOwner = value.lowercased()
  default:
    FileHandle.standardError.write("unknown option \(flag)\n".data(using: .utf8)!)
    exit(2)
  }
}

let display = CGDisplayBounds(CGMainDisplayID())

func windowList(_ options: CGWindowListOption) -> [[String: Any]] {
  CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] ?? []
}
func bounds(_ window: [String: Any]) -> CGRect {
  (window[kCGWindowBounds as String] as? NSDictionary).flatMap { CGRect(dictionaryRepresentation: $0) } ?? .zero
}
func coversDisplay(_ window: [String: Any]) -> Bool {
  let frame = bounds(window)
  return frame.minX <= display.minX && frame.minY <= display.minY
    && frame.maxX >= display.maxX && frame.maxY >= display.maxY
}
func owner(_ window: [String: Any]) -> String {
  (window[kCGWindowOwnerName as String] as? String ?? "?").lowercased()
}
func describe(_ window: [String: Any]) -> String {
  let layer = window[kCGWindowLayer as String] as? Int ?? 0
  let onScreen = window[kCGWindowIsOnscreen as String] as? Bool ?? false
  let alpha = window[kCGWindowAlpha as String] as? Double ?? 0
  return "owner=\(owner(window)) layer=\(layer) onscreen=\(onScreen) alpha=\(alpha) bounds=\(bounds(window))"
}

let onScreen = windowList([.optionOnScreenOnly, .excludeDesktopElements])
print("On screen, front to back (display \(display)):")
for (index, window) in onScreen.enumerated() { print("  \(index): \(describe(window))") }

var fullscreenIndex: Int?
if let fullscreenOwner {
  fullscreenIndex = onScreen.firstIndex { owner($0) == fullscreenOwner && coversDisplay($0) }
  guard let fullscreenIndex else {
    print("::error::no fullscreen window from \(fullscreenOwner) is on screen")
    exit(1)
  }
  print("Fullscreen window from \(fullscreenOwner) is on screen at position \(fullscreenIndex)")
}

if let breakOwner {
  guard let breakIndex = onScreen.firstIndex(where: { owner($0) == breakOwner && coversDisplay($0) }) else {
    print("All windows from \(breakOwner):")
    for window in windowList([.optionAll]) where owner(window) == breakOwner { print("  \(describe(window))") }
    print("::error::no full-display break window from \(breakOwner) is on screen")
    exit(1)
  }
  if let fullscreenIndex, breakIndex > fullscreenIndex {
    print("::error::the break window from \(breakOwner) is behind the fullscreen window")
    exit(1)
  }
  print("Break window from \(breakOwner) is on screen at position \(breakIndex)")
}
