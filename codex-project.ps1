$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$projectCodexHome = Join-Path $projectRoot ".codex"
$previousCodexHome = $env:CODEX_HOME

try {
    $env:CODEX_HOME = $projectCodexHome
    & codex -C $projectRoot @args
    exit $LASTEXITCODE
}
finally {
    if ([string]::IsNullOrEmpty($previousCodexHome)) {
        Remove-Item Env:CODEX_HOME -ErrorAction SilentlyContinue
    }
    else {
        $env:CODEX_HOME = $previousCodexHome
    }
}
