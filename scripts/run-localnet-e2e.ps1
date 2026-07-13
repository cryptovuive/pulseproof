$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AnchorDir = Join-Path $Root ".anchor"
New-Item -ItemType Directory -Force -Path $AnchorDir | Out-Null

$WslRoot = (wsl -d Ubuntu-24.04 -- wslpath -a ($Root -replace "\\", "/")).Trim()
$RunId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$Ledger = "$WslRoot/.anchor/test-ledger-$RunId"
$RpcPort = Get-Random -Minimum 18000 -Maximum 22000
$FaucetPort = $RpcPort + 50
$DynamicStart = $RpcPort + 100
$DynamicEnd = $RpcPort + 200
$PayerWindows = Join-Path $AnchorDir "test-payer.json"
$GeneratePayer = $true
if ($env:LOCALNET_WALLET) {
  $Candidate = $env:LOCALNET_WALLET
  if (-not [System.IO.Path]::IsPathRooted($Candidate)) { $Candidate = Join-Path $Root $Candidate }
  $PayerWindows = (Resolve-Path -LiteralPath $Candidate).Path
  $GeneratePayer = $false
}
$Payer = (wsl -d Ubuntu-24.04 -- wslpath -a ($PayerWindows -replace "\\", "/")).Trim()
$LogFile = "$WslRoot/.anchor/validator-$RunId.log"
$ValidatorPid = ""

try {
  if ($GeneratePayer) {
    $KeygenCommand = "source ~/.profile; solana-keygen new --no-bip39-passphrase --silent --force -o '$Payer'"
    wsl -d Ubuntu-24.04 -- bash -lc $KeygenCommand
  }
  $StartCommand = "source ~/.profile; setsid -f solana-test-validator --ledger '$Ledger' --rpc-port $RpcPort --faucet-port $FaucetPort --dynamic-port-range '$DynamicStart-$DynamicEnd' > '$LogFile' 2>&1 < /dev/null; sleep 1; pgrep -f '^solana-test-validator --ledger $Ledger ' | head -n 1"
  $ValidatorPid = (wsl -d Ubuntu-24.04 -- bash -lc $StartCommand).Trim()
  if (-not $ValidatorPid) { throw "Local validator did not start. See .anchor/validator-$RunId.log" }

  $Ready = $false
  for ($Attempt = 0; $Attempt -lt 30; $Attempt++) {
    Start-Sleep -Milliseconds 500
    $ProbeCommand = "source ~/.profile; solana cluster-version --url http://127.0.0.1:$RpcPort >/dev/null 2>&1"
    wsl -d Ubuntu-24.04 -- bash -lc $ProbeCommand
    if ($LASTEXITCODE -eq 0) { $Ready = $true; break }
  }
  if (-not $Ready) { throw "Local validator did not become ready. See .anchor/validator-$RunId.log" }

  $AirdropCommand = "source ~/.profile; solana airdrop 100 --url http://127.0.0.1:$RpcPort --keypair '$Payer' >/dev/null"
  wsl -d Ubuntu-24.04 -- bash -lc $AirdropCommand
  $DeployCommand = "source ~/.profile; cd '$WslRoot'; solana program deploy target/deploy/pulseproof.so --program-id target/deploy/pulseproof-keypair.json --keypair '$Payer' --url http://127.0.0.1:$RpcPort"
  wsl -d Ubuntu-24.04 -- bash -lc $DeployCommand
  if ($LASTEXITCODE -ne 0) { throw "Program deployment to local validator failed" }

  $env:LOCALNET_WALLET = $PayerWindows
  $env:LOCALNET_RPC_URL = "http://127.0.0.1:$RpcPort"
  $env:NEXT_PUBLIC_PULSEPROOF_PROGRAM_ID = "74cvsTMZpcgrzVT7ufSjtjy8gqU2m1q3jy3n1UGxRMkn"
  npm run contract:e2e
  if ($LASTEXITCODE -ne 0) { throw "On-chain E2E assertions failed" }
}
finally {
  if ($ValidatorPid) {
    $StopCommand = "kill -TERM $ValidatorPid >/dev/null 2>&1 || true"
    wsl -d Ubuntu-24.04 -- bash -lc $StopCommand
  }
}
