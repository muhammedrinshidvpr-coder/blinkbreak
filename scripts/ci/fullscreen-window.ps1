# Opens a borderless, always-on-top window covering the primary screen, like a fullscreen
# video player or slideshow, so CI can check that strict-mode breaks still appear above it.
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class Foreground {
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
  const uint SWP_NOSIZE = 0x0001, SWP_NOMOVE = 0x0002;
  const byte VK_MENU = 0x12;
  const uint KEYEVENTF_KEYUP = 0x0002;

  // A process started in the background may not take the foreground; a synthetic Alt press
  // lifts that lock, the way a person clicking the window would.
  public static void Take(IntPtr hwnd) {
    keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
    keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    SetForegroundWindow(hwnd);
    SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE);
  }
}
'@

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Fullscreen test'
$form.FormBorderStyle = 'None'
$form.StartPosition = 'Manual'
$form.Bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::Firebrick
$form.Add_Shown({ [Foreground]::Take($form.Handle) })
[System.Windows.Forms.Application]::Run($form)
