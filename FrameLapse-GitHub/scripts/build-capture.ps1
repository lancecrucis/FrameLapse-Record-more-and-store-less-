$ErrorActionPreference = 'Stop'
$toolsDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\tools'))
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /r:Microsoft.VisualBasic.dll "/win32manifest:$toolsDir\app.manifest" "/out:$toolsDir\capture.exe" "$toolsDir\capture.cs"
if ($LASTEXITCODE -ne 0) { throw 'Capture helper compilation failed' }
