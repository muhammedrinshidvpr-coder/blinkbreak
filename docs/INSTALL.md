# Install BlinkBreak (about 1 minute)

BlinkBreak is a small, free desktop app that reminds you to **blink**, **look far away**,
**sit tall**, and **move** while you study or work on your laptop. It's private: no internet,
no account, and nothing leaves your computer.

**You need one of these:**

- Windows 10 or 11 (no admin password needed)
- macOS 10.15 or newer, on Apple Silicon (M1 or newer) or Intel
- 64-bit Linux: Ubuntu 22.04 or newer, Debian 12 or newer, or a similar recent distribution
  (GNOME or KDE recommended)

## 1. Download

Click the file for your computer. It always downloads the newest version:

| Your computer | Download |
|---|---|
| Windows 10 / 11 | [**BlinkBreak-Windows-Setup.exe**](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest/download/BlinkBreak-Windows-Setup.exe) (about 2 MB) |
| Mac with Apple Silicon (M1, M2, M3, M4…) | [**BlinkBreak-Mac-AppleSilicon.dmg**](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest/download/BlinkBreak-Mac-AppleSilicon.dmg) |
| Mac with an Intel processor | [**BlinkBreak-Mac-Intel.dmg**](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest/download/BlinkBreak-Mac-Intel.dmg) |
| Ubuntu / Debian | [**BlinkBreak-Linux.deb**](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest/download/BlinkBreak-Linux.deb) |
| Any other Linux | [**BlinkBreak-Linux.AppImage**](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest/download/BlinkBreak-Linux.AppImage) |

Not sure which Mac you have? Click the **Apple menu → About This Mac**. If it says **Chip: Apple M…**,
take **AppleSilicon**. If it says **Processor: … Intel**, take **Intel**.

You can also see every version, with what changed, on the
[releases page](https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases).

## 2. Install

### Windows

1. Open the downloaded `.exe` file.
2. If a blue box says **"Windows protected your PC"**, click **More info**, then **Run anyway**.
   This happens because the app is new and not paid-code-signed yet, not because anything is wrong.
   The whole source code is public on GitHub for anyone to check.
3. Follow the installer. It only takes a few seconds.

### macOS

1. Open the downloaded `.dmg` file.
2. Drag **BlinkBreak** onto the **Applications** folder in the window that opens.
3. Open **Applications** (or Launchpad) and open **BlinkBreak**.
4. The first time, macOS says it can't verify BlinkBreak. Click **Done** (or **OK**).
   Don't click Move to Trash.
5. Open **System Settings → Privacy & Security**, scroll down, and click **Open Anyway** next to
   BlinkBreak. Confirm when macOS asks again (enter your Mac password if asked).

This happens because the app isn't notarized by Apple yet (that needs a paid developer
account). You only have to do it once. You can then eject the BlinkBreak disk image in Finder.

If macOS ever says BlinkBreak **"is damaged and can't be opened"**, open **Terminal** and run
this once, then open BlinkBreak again:

```bash
xattr -dr com.apple.quarantine /Applications/BlinkBreak.app
```

### Linux

**Ubuntu / Debian (`.deb`):** open **Terminal** in the folder with the download (usually
`cd ~/Downloads`) and run:

```bash
sudo apt install ./BlinkBreak-Linux.deb
```

Then open **BlinkBreak** from your app menu.

**Any distribution (`.AppImage`):** make the file executable, then run it:

```bash
chmod +x BlinkBreak-Linux.AppImage
./BlinkBreak-Linux.AppImage
```

If nothing happens on Ubuntu, install FUSE support first: `sudo apt install libfuse2`
(on Ubuntu 24.04 or newer: `sudo apt install libfuse2t64`).

## 3. Use it

BlinkBreak opens its dashboard the first time, then keeps running as a small icon:

- **Windows:** in the system tray at the bottom-right of the screen. If you can't see it,
  click the **^** arrow there.
- **macOS:** in the menu bar at the top-right of the screen.
- **Linux:** in the top bar (Ubuntu) or the system tray (KDE). Some GNOME desktops, such as
  Fedora, hide tray icons until you add the
  [AppIndicator extension](https://extensions.gnome.org/extension/615/appindicator-support/).

**Click the icon** for:

- **Open dashboard**: see today's breaks and change settings
- **Take a break now**
- **Pause 15 min**: handy for exams or online classes
- **Quit BlinkBreak**

Closing the dashboard window doesn't quit BlinkBreak. It keeps reminding you from the icon.
Use **Quit BlinkBreak** in the icon's menu to stop it.

Reminders appear by themselves, stay a few seconds, and close on their own. They are designed
not to steal typing focus. On Windows they also wait if a fullscreen video, game, or presentation
is open; that detection isn't available on macOS/Linux yet.

On Linux, BlinkBreak notices when you step away on GNOME and KDE desktops. On other desktops
the timers count while the app is open, and **Settings** tells you so.

## Handy settings

Open the dashboard → **Settings**:

- **Start at login**: on from the first launch, so BlinkBreak opens by itself, quietly in the
  tray / menu bar, every time you start your computer. Turn it off here if you prefer
- **Appearance**: Light, Dark, or follow the system
- **Reminders**: turn each one on/off and choose how often
- **Quiet hours**: no reminders at night

## Uninstall

First turn off **Settings → Start at login**, then **Quit BlinkBreak** from the icon's menu.

- **Windows:** **Settings → Apps → Installed apps → BlinkBreak → Uninstall**
- **macOS:** drag **BlinkBreak** from **Applications** to the **Trash**
- **Linux (`.deb`):** `sudo apt remove blink-break`
- **Linux (`.AppImage`):** delete the `.AppImage` file

## Questions or ideas?

- Say hi or ask anything in [Discussions](https://github.com/muhammedrinshidvpr-coder/blinkbreak/discussions)
- Found a bug? [Open an issue](https://github.com/muhammedrinshidvpr-coder/blinkbreak/issues/new/choose)

*BlinkBreak encourages healthy screen habits (based on the 20-20-20 rule for eye strain). It is
not a medical device. If your eyes hurt often, see an eye doctor.*
