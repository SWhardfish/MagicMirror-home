@echo off
SETLOCAL EnableDelayedExpansion
REM ============================================
REM MagicMirror Selective Deploy Script
REM Copies specific files to Pi and restarts MM
REM Usage: deploy_files.bat file1 file2 ...
REM
REM Examples:
REM   deploy_files.bat config\config.js
REM   deploy_files.bat modules\MMM-SL\MMM-SL.js modules\MMM-SL\css\mmm-sl.css
REM   deploy_files.bat ALL  (deploys everything)
REM ============================================

SET PI_USER=pi
SET PI_HOST=192.168.1.208
SET PI_MM_PATH=/home/pi/MagicMirror
SET LOCAL_PATH=C:\Users\rylanda\PycharmProjects\MagicMirror

echo ============================================
echo  MagicMirror Deploy to Pi (%PI_HOST%)
echo ============================================
echo.

IF "%1"=="" (
    echo Usage: deploy_files.bat [file_path_relative_to_project] ...
    echo.
    echo Examples:
    echo   deploy_files.bat config\config.js
    echo   deploy_files.bat modules\MMM-SL\MMM-SL.js
    echo   deploy_files.bat ALL
    echo.
    echo Available shortcuts:
    echo   CHANGED  - Deploy only files changed since last git commit
    echo   ALL      - Deploy all commonly changed files
    echo   SL       - Deploy MMM-SL files only
    echo   WEATHER  - Deploy MMM-OpenWeatherForecast files only
    echo   CONFIG   - Deploy config.js only
    echo.
    pause
    exit /b 1
)

IF /I "%1"=="CHANGED" (
    echo Detecting changed files via git...
    echo.
    SET FOUND=0
    SET FILE_COUNT=0
    SET "FILE_LIST="

    REM Collect changed files (unstaged)
    FOR /F "tokens=* usebackq" %%F IN (`git -C "%LOCAL_PATH%" diff --name-only HEAD 2^>nul`) DO (
        echo %%F | findstr /I /V "\.md$ \.bat$ \.log$ \.png$ \.jpg$" >nul && (
            SET /A FILE_COUNT+=1
            SET "FILE_LIST=!FILE_LIST!%%F|"
            echo   [!FILE_COUNT!] %%F
            SET FOUND=1
        )
    )

    REM Collect changed files (staged)
    FOR /F "tokens=* usebackq" %%F IN (`git -C "%LOCAL_PATH%" diff --name-only --cached HEAD 2^>nul`) DO (
        echo %%F | findstr /I /V "\.md$ \.bat$ \.log$ \.png$ \.jpg$" >nul && (
            REM Skip if already in list
            echo !FILE_LIST! | findstr /C:"%%F|" >nul || (
                SET /A FILE_COUNT+=1
                SET "FILE_LIST=!FILE_LIST!%%F|"
                echo   [!FILE_COUNT!] %%F
                SET FOUND=1
            )
        )
    )

    REM Collect untracked/modified files from status
    FOR /F "tokens=2* usebackq" %%A IN (`git -C "%LOCAL_PATH%" status --porcelain 2^>nul`) DO (
        SET "SFILE=%%A"
        IF NOT "%%B"=="" SET "SFILE=%%B"
        echo !SFILE! | findstr /I /V "\.md$ \.bat$ \.log$ \.png$ \.jpg$" >nul && (
            echo !FILE_LIST! | findstr /C:"!SFILE!|" >nul || (
                SET /A FILE_COUNT+=1
                SET "FILE_LIST=!FILE_LIST!!SFILE!|"
                echo   [!FILE_COUNT!] !SFILE!
                SET FOUND=1
            )
        )
    )

    IF "!FOUND!"=="0" (
        echo No changed files detected.
        pause
        exit /b 0
    )

    echo.
    echo Found !FILE_COUNT! changed file(s^).
    SET /P DODEPLOY="Deploy these files? (Y/N): "
    IF /I NOT "!DODEPLOY!"=="Y" (
        echo Deploy cancelled.
        pause
        exit /b 0
    )
    echo.

    REM Now deploy the collected files
    FOR %%F IN (!FILE_LIST!) DO (
        IF NOT "%%F"=="" call :DEPLOY_FILE "%%F"
    )
    goto RESTART
)

IF /I "%1"=="ALL" (
    echo Files to deploy:
    echo   [1] config\config.js
    echo   [2] modules\MMM-SL\MMM-SL.js
    echo   [3] modules\MMM-SL\css\mmm-sl.css
    echo   [4] modules\MMM-OpenWeatherForecast\MMM-OpenWeatherForecast.js
    echo   [5] modules\MMM-OpenWeatherForecast\node_helper.js
    echo   [6] monitor_mm.sh
    echo.
    SET /P DODEPLOY="Deploy these 6 files? (Y/N): "
    IF /I NOT "!DODEPLOY!"=="Y" (
        echo Deploy cancelled.
        pause
        exit /b 0
    )
    echo.
    call :DEPLOY_FILE config\config.js
    call :DEPLOY_FILE modules\MMM-SL\MMM-SL.js
    call :DEPLOY_FILE modules\MMM-SL\css\mmm-sl.css
    call :DEPLOY_FILE modules\MMM-OpenWeatherForecast\MMM-OpenWeatherForecast.js
    call :DEPLOY_FILE modules\MMM-OpenWeatherForecast\node_helper.js
    call :DEPLOY_FILE monitor_mm.sh
    ssh %PI_USER%@%PI_HOST% "chmod +x %PI_MM_PATH%/monitor_mm.sh"
    goto RESTART
)

IF /I "%1"=="SL" (
    echo Deploying MMM-SL files...
    call :DEPLOY_FILE modules\MMM-SL\MMM-SL.js
    call :DEPLOY_FILE modules\MMM-SL\css\mmm-sl.css
    goto RESTART
)

IF /I "%1"=="WEATHER" (
    echo Deploying MMM-OpenWeatherForecast files...
    call :DEPLOY_FILE modules\MMM-OpenWeatherForecast\MMM-OpenWeatherForecast.js
    call :DEPLOY_FILE modules\MMM-OpenWeatherForecast\node_helper.js
    goto RESTART
)

IF /I "%1"=="CONFIG" (
    echo Deploying config.js...
    call :DEPLOY_FILE config\config.js
    goto RESTART
)

REM Deploy individual files passed as arguments
:LOOP
IF "%1"=="" goto RESTART
call :DEPLOY_FILE %1
SHIFT
goto LOOP

:DEPLOY_FILE
SET FILE_PATH=%~1
REM Convert backslashes to forward slashes for remote path
SET REMOTE_FILE=%FILE_PATH:\=/%
echo   Deploying %FILE_PATH%...
scp "%LOCAL_PATH%\%FILE_PATH%" %PI_USER%@%PI_HOST%:%PI_MM_PATH%/%REMOTE_FILE%
IF %ERRORLEVEL% NEQ 0 (
    echo   *** FAILED to deploy %FILE_PATH% ***
) ELSE (
    echo   OK
)
exit /b 0

:RESTART
echo.
SET /P DORESTART="Restart MagicMirror on Pi? (Y/N): "
IF /I "%DORESTART%"=="Y" (
    echo Restarting MagicMirror...
    ssh %PI_USER%@%PI_HOST% "pm2 restart MagicMirror"
    echo MagicMirror restarted.
) ELSE (
    echo Skipping restart. Run manually: ssh %PI_USER%@%PI_HOST% "pm2 restart MagicMirror"
)

echo.
echo ============================================
echo  Deploy complete!
echo ============================================
pause

