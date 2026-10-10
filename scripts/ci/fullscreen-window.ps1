# Opens a borderless, always-on-top window covering the primary screen, like a fullscreen
# video player or slideshow, so CI can check that strict-mode breaks still appear above it.
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Fullscreen test'
$form.FormBorderStyle = 'None'
$form.StartPosition = 'Manual'
$form.Bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::Firebrick
[System.Windows.Forms.Application]::Run($form)
