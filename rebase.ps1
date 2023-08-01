#! /usr/bin/env pwsh

#Requires -PSEdition Core
#Requires -Version 7

param(
    [Parameter(Mandatory = $true)][string] $RepoPath,
    [Parameter(Mandatory = $false)][string] $BaseBranch = ""
)

$ErrorActionPreference = "Stop"

$OutputFile = [System.IO.Path]::GetTempFileName()
$StepSummary = [System.IO.Path]::GetTempFileName()

if ([string]::IsNullOrWhiteSpace($BaseBranch)) {
    $BaseBranch = "origin/main"
}

try {
    ${env:GITHUB_ACTIONS} = ""
    ${env:GITHUB_OUTPUT} = $OutputFile
    ${env:GITHUB_STEP_SUMMARY} = $StepSummary
    ${env:INPUT_BRANCH} = $BaseBranch
    ${env:INPUT_REPOSITORY} = $RepoPath
    ${env:INPUT_USER-EMAIL} = (git -C $RepoPath config user.email).Trim()
    ${env:INPUT_USER-NAME} = (git -C $RepoPath config user.name).Trim()
    ${env:REBASER_INTERACTIVE} = "true"

    node (Join-Path $PSScriptRoot "dist/index.js")
}
finally {
    Remove-Item -Path $OutputFile -Force | Out-Null
    Remove-Item -Path $StepSummary -Force | Out-Null

    ${env:GITHUB_ACTIONS} = $null
    ${env:GITHUB_OUTPUT} = $null
    ${env:GITHUB_STEP_SUMMARY} = $null
    ${env:INPUT_BRANCH} = $null
    ${env:INPUT_REPOSITORY} = $null
    ${env:INPUT_USER-EMAIL} = $null
    ${env:INPUT_USER-NAME} = $null
    ${env:REBASER_INTERACTIVE} = $null
}
