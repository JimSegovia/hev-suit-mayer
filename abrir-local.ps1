Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Visor HEV local: http://127.0.0.1:8766'
Start-Process 'http://127.0.0.1:8766'
python -m http.server 8766
