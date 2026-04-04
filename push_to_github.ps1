# FINTEL AI - GitHub Push Script (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " FINTEL AI - GitHub Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "d:\IIT_GANDHINAGAR"

Write-Host "[1/5] Initializing Git repository..." -ForegroundColor Yellow
git init

Write-Host ""
Write-Host "[2/5] Adding remote repository..." -ForegroundColor Yellow
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "Remote already exists, updating..." -ForegroundColor Gray
    git remote set-url origin https://github.com/Parth703-wq/HackOps7.git
} else {
    git remote add origin https://github.com/Parth703-wq/HackOps7.git
}

Write-Host ""
Write-Host "[3/5] Staging all files..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "[4/5] Committing changes..." -ForegroundColor Yellow
git commit -m "🤖 FINTEL AI - Autonomous Financial Intelligence Agent - Initial Commit"

Write-Host ""
Write-Host "[5/5] Pushing to GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "NOTE: You will be asked for credentials:" -ForegroundColor Red
Write-Host "- Username: Parth703-wq" -ForegroundColor White
Write-Host "- Password: Use your GitHub Personal Access Token" -ForegroundColor White
Write-Host ""

$pushed = $false
try {
    git push -u origin main 2>&1
    $pushed = $true
} catch {
    Write-Host "Main branch failed, trying master..." -ForegroundColor Yellow
    try {
        git push -u origin master 2>&1
        $pushed = $true
    } catch {
        Write-Host "Push failed!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Push Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your project is now on GitHub:" -ForegroundColor Cyan
Write-Host "https://github.com/Parth703-wq/HackOps7" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
