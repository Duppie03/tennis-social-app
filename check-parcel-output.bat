@echo off
echo ========================================
echo Checking Parcel HTML Output
echo ========================================
echo.

echo Looking at dist\index.html script tags...
echo.
powershell -Command "Get-Content dist\index.html | Select-String '<script' -Context 0,0"
echo.

echo ========================================
echo Looking for any .js references in HTML...
echo.
powershell -Command "Get-Content dist\index.html | Select-String '\.js' -Context 1,1"
echo.

echo ========================================
echo Checking if Parcel created a manifest...
echo.
if exist dist\*.json (
    echo Found JSON files:
    dir dist\*.json /b
    echo.
    echo Manifest content:
    type dist\*.json
) else (
    echo No manifest files found
)
echo.

echo ========================================
echo Checking .parcel-cache for clues...
echo.
if exist .parcel-cache (
    dir .parcel-cache /s /b | findstr "\.js$" | more
) else (
    echo No cache directory
)

pause
