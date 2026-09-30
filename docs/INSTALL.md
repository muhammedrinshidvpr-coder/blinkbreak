# Install BlinkBreak (about 1 minute)

BlinkBreak is a small, free desktop app that reminds you to **blink**, **look far away**,
**sit tall**, and **move** while you study or work on your laptop. It's private: no internet,
no account, and nothing leaves your computer.

**You need:** Windows 10/11, macOS 10.15+, or a modern Linux desktop (GNOME/KDE recommended).
No admin password needed on Windows.

## 1. Download

Open the latest release:
**https://github.com/muhammedrinshidvpr-coder/blinkbreak/releases/latest**

Under **Assets**, pick your system:

- Windows: **`BlinkBreak_x.y.z_x64-setup.exe`** (about 2 MB)
- macOS: **`BlinkBreak_x.y.z_x64.dmg`** (Intel) or **`BlinkBreak_x.y.z_aarch64.dmg`** (Apple Silicon)
- Linux: **`.deb`** (Debian/Ubuntu) or portable **`.AppImage`**

## 2. Install

**Windows:** open the downloaded file.

If a blue box says **"Windows protected your PC"**:

1. Click **More info**
2. Click **Run anyway**

This happens because the app is new and not paid-code-signed yet, not because anything is wrong.
The whole source code is public on GitHub for anyone to check.

Then follow the installer. It only takes a few seconds.

**macOS:** open the `.dmg` and drag BlinkBreak to Applications. Published release DMGs are
signed and notarized by Apple.

**Linux:** install the `.deb` (`sudo apt install ./blinkbreak_x.y.z_amd64.deb`) or make the
`.AppImage` executable and run it. System-wide idle and fullscreen detection are not
implemented on Linux yet: timers count while the app is open, and Settings explains this.

## 3. Use it

BlinkBreak starts in the **system tray / menu bar**.
On Windows the icons sit at the bottom-right of your screen; if you can't see it, click the **^** arrow there.

**Right-click the icon** for:

- **Open dashboard**: see today's breaks and change settings
- **Take a break now**
- **Pause 15 min**: handy for exams or online classes
- **Quit**

Reminders appear by themselves, stay a few seconds, and close on their own. They are designed
not to steal typing focus. On Windows they also wait if a fullscreen video, game, or presentation
is open; that detection isn't available on macOS/Linux yet.

## Handy settings

Open the dashboard → **Settings**:

- **Appearance**: Light, Dark, or follow the system
- **Reminders**: turn each one on/off and choose how often
- **Quiet hours**: no reminders at night
- **Start at login**: on by default, so you never have to remember to open it

## Uninstall

Quit BlinkBreak from the tray, then on Windows go to **Settings → Apps → Installed apps →
BlinkBreak → Uninstall**. On macOS delete it from Applications; on Linux remove the `.deb`
or delete the `.AppImage`.

## Questions or ideas?

- Say hi or ask anything in [Discussions](https://github.com/muhammedrinshidvpr-coder/blinkbreak/discussions)
- Found a bug? [Open an issue](https://github.com/muhammedrinshidvpr-coder/blinkbreak/issues/new/choose)

*BlinkBreak encourages healthy screen habits (based on the 20-20-20 rule for eye strain). It is
not a medical device. If your eyes hurt often, see an eye doctor.*
