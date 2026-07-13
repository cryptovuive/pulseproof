$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Wallet = Join-Path $Root ".local-wallets\phantom-test-wallet.json"

if (-not (Test-Path -LiteralPath $Wallet)) {
  npm run wallet:create
  if ($LASTEXITCODE -ne 0) { throw "Test wallet creation failed" }
}

npm run wallet:test
if ($LASTEXITCODE -ne 0) { throw "Test wallet signature checks failed" }

$env:LOCALNET_WALLET = $Wallet
& (Join-Path $PSScriptRoot "run-localnet-e2e.ps1")
if ($LASTEXITCODE -ne 0) { throw "Wallet-backed local validator E2E failed" }
