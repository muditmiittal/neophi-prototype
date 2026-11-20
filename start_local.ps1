# Starts the laptop Neophi server: serves the app, calls Gemini through your gcloud login, and pulls Instagram saves from the public host.
# Reads the relay token from D:\Neophi\_work\relay_token.txt (never printed). Run from anywhere:  powershell -File D:\Neophi\app\start_local.ps1
$ErrorActionPreference = 'Stop'
$app = 'D:\Neophi\app'
$work = 'D:\Neophi\_work'
$env:NEOPHI_PROVIDER = 'vertex'
$env:GOOGLE_CLOUD_PROJECT = 'neojaipur-rag-1'
$env:NEOPHI_RELAY_URL = 'https://20-219-13-184.sslip.io'
$env:NEOPHI_RELAY_TOKEN = (Get-Content "$work\relay_token.txt" -Raw).Trim()
$env:META_VERIFY_TOKEN = (Get-Content "$work\meta_verify_token.txt" -Raw).Trim()
Set-Location $app
# Windows PowerShell 5.1 treats redirected native stderr as a PowerShell error.
# Keep Node running through warnings and use its exit code for actual failures.
$previousErrorAction = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    node server/index.mjs 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath "$work\server.log" -Append
    $serverExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorAction
}
exit $serverExitCode
