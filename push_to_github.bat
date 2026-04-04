@echo off
echo ========================================
echo  FINTEL AI - GitHub Push Script
echo ========================================
echo.

cd /d d:\IIT_GANDHINAGAR

echo [1/5] Initializing Git repository...
git init

echo.
echo [2/5] Adding remote repository...
git remote add origin https://github.com/Parth703-wq/HackOps7.git 2>nul
if errorlevel 1 (
    echo Remote already exists, updating...
    git remote set-url origin https://github.com/Parth703-wq/HackOps7.git
)

echo.
echo [3/5] Staging all files...
git add .

echo.
echo [4/5] Committing changes...
git commit -m "🤖 FINTEL AI - Autonomous Financial Intelligence Agent - Initial Commit"

echo.
echo [5/5] Pushing to GitHub...
echo.
echo NOTE: You will be asked for credentials:
echo - Username: Parth703-wq
echo - Password: Use your GitHub Personal Access Token
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo ========================================
    echo  Push failed! Trying 'master' branch...
    echo ========================================
    git push -u origin master
)

echo.
echo ========================================
echo  Push Complete!
echo ========================================
echo.
echo Your project is now on GitHub:
echo https://github.com/Parth703-wq/HackOps7
echo.
pause
