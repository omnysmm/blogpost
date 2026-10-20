' Launch node/vite with NO console window (used by start-server + tray)
' Usage: wscript run-vite-hidden.vbs "C:\path\node.exe" "C:\path\vite.js" "I:\blogpost" "3000"
Option Explicit
Dim shell, node, vite, cwd, port, cmd
Set shell = CreateObject("WScript.Shell")
node = WScript.Arguments(0)
vite = WScript.Arguments(1)
cwd = WScript.Arguments(2)
port = WScript.Arguments(3)

shell.CurrentDirectory = cwd
' 0 = hidden window, False = do not wait
cmd = """" & node & """ """ & vite & """ --host 0.0.0.0 --port " & port & " --strictPort"
shell.Run cmd, 0, False
