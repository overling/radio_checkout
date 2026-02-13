$port = 8000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:${port}/")
$listener.Start()

Write-Host ""
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host "   Asset Tracker - Local Server" -ForegroundColor Cyan
Write-Host "  ======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Running at: http://localhost:$port" -ForegroundColor Green
Write-Host "  Serving from: $root" -ForegroundColor Gray
Write-Host "  Camera scanning enabled (localhost)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:$port"

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.ico'  = 'image/x-icon'
    '.md'   = 'text/plain; charset=utf-8'
    '.xlsx' = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    '.zip'  = 'application/zip'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
}

# Dual local backup files (A/B alternation for redundancy)
$dataDir = Join-Path $root "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
$localBackupA = Join-Path $dataDir "db-backup-A.json"
$localBackupB = Join-Path $dataDir "db-backup-B.json"

# Determine which slot to write next (alternates A→B→A→B)
function Get-NextSlot {
    $aExists = Test-Path $localBackupA
    $bExists = Test-Path $localBackupB
    if (-not $aExists) { return "A" }
    if (-not $bExists) { return "B" }
    # Both exist — write to the OLDER one
    $aTime = (Get-Item $localBackupA).LastWriteTimeUtc
    $bTime = (Get-Item $localBackupB).LastWriteTimeUtc
    if ($aTime -le $bTime) { return "A" } else { return "B" }
}

function Get-SlotPath($slot) {
    if ($slot -eq "A") { return $localBackupA } else { return $localBackupB }
}

# Get the newest valid local backup
function Get-NewestValidBackup {
    $best = $null
    $bestTime = [DateTime]::MinValue
    $bestSlot = ""
    foreach ($slot in @("A","B")) {
        $p = Get-SlotPath $slot
        if (Test-Path $p) {
            try {
                $raw = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
                $null = $raw | ConvertFrom-Json  # validate JSON
                $t = (Get-Item $p).LastWriteTimeUtc
                if ($t -gt $bestTime) { $bestTime = $t; $best = $raw; $bestSlot = $slot }
            } catch {
                Write-Host "  [BACKUP] Slot $slot is corrupt or unreadable: $_" -ForegroundColor Red
            }
        }
    }
    return @{ content = $best; slot = $bestSlot; time = $bestTime }
}

# Validate a JSON backup file — returns hashtable with ok, size, modified, error
function Test-BackupFile($filePath) {
    if (-not (Test-Path $filePath)) { return @{ ok = $false; exists = $false; error = "File not found" } }
    try {
        $raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        $parsed = $raw | ConvertFrom-Json
        $hasData = ($null -ne $parsed.data)
        $item = Get-Item $filePath
        return @{
            ok = $hasData
            exists = $true
            size = $item.Length
            modified = $item.LastWriteTime.ToString("o")
            error = if ($hasData) { "" } else { "Missing 'data' field" }
        }
    } catch {
        return @{ ok = $false; exists = $true; error = $_.Exception.Message }
    }
}

# Helper: read network path from either local backup
function Get-NetworkPath {
    foreach ($slot in @("A","B")) {
        try {
            $p = Get-SlotPath $slot
            if (Test-Path $p) {
                $json = Get-Content $p -Raw | ConvertFrom-Json
                if ($json.networkPath) { return $json.networkPath }
            }
        } catch {}
    }
    return $null
}

# Helper: send JSON response
function Send-JsonResponse($resp, $statusCode, $obj) {
    $resp.StatusCode = $statusCode
    $resp.ContentType = 'application/json; charset=utf-8'
    $resp.KeepAlive = $false
    $resp.Headers.Add("Connection", "close")
    $jsonStr = $obj | ConvertTo-Json -Depth 20 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
    $resp.ContentLength64 = $bytes.Length
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    $resp.OutputStream.Flush()
}

# Helper: send text error
function Send-ErrorResponse($resp, $statusCode, $message) {
    $resp.StatusCode = $statusCode
    $resp.KeepAlive = $false
    $resp.Headers.Add("Connection", "close")
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($message)
    $resp.ContentLength64 = $bytes.Length
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    $resp.OutputStream.Flush()
}

# Pre-load Windows Forms for folder browser dialog
Add-Type -AssemblyName System.Windows.Forms | Out-Null

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $resp = $ctx.Response
        $path = $req.Url.LocalPath

        try {
            # ===== API: GET /api/browse-folder — open native Windows folder picker =====
            if ($path -eq '/api/browse-folder' -and $req.HttpMethod -eq 'GET') {
                Write-Host "  [BROWSE] Opening folder picker..." -ForegroundColor Yellow
                $selectedPath = ""
                try {
                    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
                    $dialog.Description = "Select a shared network folder for database sync"
                    $dialog.ShowNewFolderButton = $true
                    $dialog.RootFolder = [System.Environment+SpecialFolder]::MyComputer
                    $result = $dialog.ShowDialog()
                    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
                        $selectedPath = $dialog.SelectedPath
                        Write-Host "  [BROWSE] Selected: $selectedPath" -ForegroundColor Green
                    } else {
                        Write-Host "  [BROWSE] Cancelled by user" -ForegroundColor Gray
                    }
                    $dialog.Dispose()
                } catch {
                    Write-Host "  [BROWSE] Error: $_" -ForegroundColor Red
                }
                $obj = @{ ok = $true; path = $selectedPath }
                Send-JsonResponse $resp 200 $obj
            }
            # ===== API: POST /api/sync — save DB to local (dual A/B) + network =====
            elseif ($path -eq '/api/sync' -and $req.HttpMethod -eq 'POST') {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $body = $reader.ReadToEnd()
                $reader.Close()

                try {
                    $parsed = $body | ConvertFrom-Json
                } catch {
                    Send-ErrorResponse $resp 400 "Invalid JSON"
                    continue
                }

                # Save to the next local slot (A/B alternation)
                $slot = Get-NextSlot
                $slotPath = Get-SlotPath $slot
                [System.IO.File]::WriteAllText($slotPath, $body, [System.Text.Encoding]::UTF8)
                $localOk = $true
                Write-Host "  [SYNC] Local backup slot $slot saved: $slotPath" -ForegroundColor Green

                # Try to save to network path if provided
                $networkOk = $false
                $networkError = ""
                $networkDest = ""
                if ($parsed.networkPath -and $parsed.networkPath -ne '') {
                    $networkDest = Join-Path $parsed.networkPath "db-backup.json"
                    try {
                        if (-not (Test-Path $parsed.networkPath)) {
                            New-Item -ItemType Directory -Path $parsed.networkPath -Force | Out-Null
                        }
                        [System.IO.File]::WriteAllText($networkDest, $body, [System.Text.Encoding]::UTF8)
                        $networkOk = $true
                        Write-Host "  [SYNC] Network backup saved: $networkDest" -ForegroundColor Cyan
                    } catch {
                        $networkError = $_.Exception.Message
                        Write-Host "  [SYNC] Network backup FAILED: $networkError" -ForegroundColor Red
                    }
                }

                $result = @{
                    ok = $true
                    localSlot = $slot
                    localPath = $slotPath
                    localOk = $localOk
                    networkPath = $networkDest
                    networkOk = $networkOk
                    networkError = $networkError
                    timestamp = (Get-Date).ToString("o")
                }
                Send-JsonResponse $resp 200 $result
            }
            # ===== API: GET /api/sync — load DB from network (fallback: newest valid local) =====
            elseif ($path -eq '/api/sync' -and $req.HttpMethod -eq 'GET') {
                $source = ""
                $content = $null

                # Try network first
                $netPath = Get-NetworkPath
                if ($netPath) {
                    $networkFile = Join-Path $netPath "db-backup.json"
                    if (Test-Path $networkFile) {
                        try {
                            $content = [System.IO.File]::ReadAllText($networkFile, [System.Text.Encoding]::UTF8)
                            $null = $content | ConvertFrom-Json  # validate
                            $source = "network"
                            Write-Host "  [SYNC] Loaded from network: $networkFile" -ForegroundColor Cyan
                        } catch {
                            Write-Host "  [SYNC] Network read/parse failed: $_" -ForegroundColor Red
                            $content = $null
                        }
                    }
                }

                # Fallback to newest valid local backup (A or B)
                if (-not $content) {
                    $best = Get-NewestValidBackup
                    if ($best.content) {
                        $content = $best.content
                        $source = "local-$($best.slot)"
                        Write-Host "  [SYNC] Loaded from local slot $($best.slot)" -ForegroundColor Yellow
                    }
                }

                if ($content) {
                    $resp.StatusCode = 200
                    $resp.ContentType = 'application/json; charset=utf-8'
                    $resp.KeepAlive = $false
                    $resp.Headers.Add("Connection", "close")
                    $resp.Headers.Add("X-Sync-Source", $source)
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $resp.ContentLength64 = $bytes.Length
                    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
                    $resp.OutputStream.Flush()
                } else {
                    Send-ErrorResponse $resp 404 "No backup found"
                }
            }
            # ===== API: GET /api/sync/status — check dual local backups + network file status =====
            elseif ($path -eq '/api/sync/status' -and $req.HttpMethod -eq 'GET') {
                $slotA = Test-BackupFile $localBackupA
                $slotA["path"] = $localBackupA
                $slotA["slot"] = "A"

                $slotB = Test-BackupFile $localBackupB
                $slotB["path"] = $localBackupB
                $slotB["slot"] = "B"

                $netPath = Get-NetworkPath
                $networkFile = if ($netPath) { Join-Path $netPath "db-backup.json" } else { "" }
                $netStatus = @{ ok = $false; exists = $false; path = $networkFile; error = "" }
                if ($networkFile -and $networkFile -ne "") {
                    $netStatus = Test-BackupFile $networkFile
                    $netStatus["path"] = $networkFile
                }

                $nextSlot = Get-NextSlot

                $status = @{
                    slotA = $slotA
                    slotB = $slotB
                    nextSlot = $nextSlot
                    network = $netStatus
                    dataDir = $dataDir
                }
                Send-JsonResponse $resp 200 $status
            }
            # ===== API: GET /api/open-folder?path=... — open folder in Windows Explorer =====
            elseif ($path -eq '/api/open-folder' -and $req.HttpMethod -eq 'GET') {
                $folderPath = $req.QueryString["path"]
                if ($folderPath -and (Test-Path $folderPath)) {
                    Start-Process explorer.exe -ArgumentList $folderPath
                    Send-JsonResponse $resp 200 @{ ok = $true }
                } else {
                    Send-JsonResponse $resp 200 @{ ok = $false; error = "Path not found" }
                }
            }
            # ===== Static file serving =====
            else {
                if ($path -eq '/') { $path = '/index.html' }

                $filePath = Join-Path $root ($path -replace '/', '\')

                if (Test-Path $filePath -PathType Leaf) {
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $resp.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
                    $resp.StatusCode = 200
                    $resp.ContentLength64 = $bytes.Length
                    $resp.KeepAlive = $false
                    $resp.Headers.Add("Cache-Control", "no-cache")
                    $resp.Headers.Add("Connection", "close")
                    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
                    $resp.OutputStream.Flush()
                } else {
                    $resp.StatusCode = 404
                    $resp.KeepAlive = $false
                    $resp.Headers.Add("Connection", "close")
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
                    $resp.ContentLength64 = $msg.Length
                    $resp.OutputStream.Write($msg, 0, $msg.Length)
                    $resp.OutputStream.Flush()
                }
            }
        } catch {
            Write-Host "  Error serving ${path}: $_" -ForegroundColor Red
        } finally {
            try { $resp.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
    Write-Host "Server stopped." -ForegroundColor Red
}
