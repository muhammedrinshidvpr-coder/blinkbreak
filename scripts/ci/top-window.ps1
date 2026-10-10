# Usage: top-window.ps1 -ExpectTitle <title> -Screenshot <png>
# Saves a screenshot, then fails unless the window people see at the centre of the primary
# screen (the top-level window under that point) has the expected title.
param(
  [Parameter(Mandatory)] [string] $ExpectTitle,
  [Parameter(Mandatory)] [string] $Screenshot
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class TopWindow {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT point);
  [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
  const uint GA_ROOT = 2;

  public static string TitleAt(int x, int y) {
    IntPtr root = GetAncestor(WindowFromPoint(new POINT { X = x, Y = y }), GA_ROOT);
    var title = new StringBuilder(256);
    GetWindowText(root, title, title.Capacity);
    return title.ToString();
  }
}
'@

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save($Screenshot, [System.Drawing.Imaging.ImageFormat]::Png)

$title = [TopWindow]::TitleAt($bounds.X + [int]($bounds.Width / 2), $bounds.Y + [int]($bounds.Height / 2))
Write-Output "Top window at the screen centre: '$title' (screenshot: $Screenshot)"
if ($title -ne $ExpectTitle) {
  Write-Output "::error::expected '$ExpectTitle' on top, found '$title'"
  exit 1
}
