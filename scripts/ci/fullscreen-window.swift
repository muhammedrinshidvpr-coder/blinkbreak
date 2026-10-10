// Opens a window and puts it into macOS fullscreen (its own Space), like a fullscreen video,
// so CI can check that strict-mode breaks still appear above it.
import AppKit

let app = NSApplication.shared
app.setActivationPolicy(.regular)

let window = NSWindow(
  contentRect: NSRect(x: 100, y: 100, width: 800, height: 600),
  styleMask: [.titled, .closable, .resizable],
  backing: .buffered,
  defer: false
)
window.title = "Fullscreen test"
window.backgroundColor = .systemRed
window.collectionBehavior = [.fullScreenPrimary]
window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)
DispatchQueue.main.asyncAfter(deadline: .now() + 1) { window.toggleFullScreen(nil) }
app.run()
