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

# Local backup file (always saved alongside server)
$localBackupFile = Join-Path $root "data\db-backup.json"

# Ensure data directory exists
$dataDir = Join-Path $root "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }

# Helper: read network path from the JSON config stored in the local backup
function Get-NetworkPath {
    try {
        if (Test-Path $localBackupFile) {
            $json = Get-Content $localBackupFile -Raw | ConvertFrom-Json
            if ($json.networkPath) { return $json.networkPath }
        }
    } catch {}
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

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $resp = $ctx.Response
        $path = $req.Url.LocalPath

        try {
            # ===== API: POST /api/sync — save DB to local + network =====
            if ($path -eq '/api/sync' -and $req.HttpMethod -eq 'POST') {
                $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
                $body = $reader.ReadToEnd()
                $reader.Close()

                # Parse to extract networkPath if present
                try {
                    $parsed = $body | ConvertFrom-Json
                } catch {
                    Send-ErrorResponse $resp 400 "Invalid JSON"
                    continue
                }

                # Always save locally
                [System.IO.File]::WriteAllText($localBackupFile, $body, [System.Text.Encoding]::UTF8)
                $localOk = $true
                Write-Host "  [SYNC] Local backup saved: $localBackupFile" -ForegroundColor Green

                # Try to save to network path if provided
                $networkOk = $false
                $networkError = ""
                $networkDest = ""
                if ($parsed.networkPath -and $parsed.networkPath -ne '') {
                    $networkDest = Join-Path $parsed.networkPath "db-backup.json"
                    try {
                        # Ensure network directory exists
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
                    localPath = $localBackupFile
                    localOk = $localOk
                    networkPath = $networkDest
                    networkOk = $networkOk
                    networkError = $networkError
                    timestamp = (Get-Date).ToString("o")
                }
                Send-JsonResponse $resp 200 $result
            }
            # ===== API: GET /api/sync — load DB from network (fallback: local) =====
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
                            $source = "network"
                            Write-Host "  [SYNC] Loaded from network: $networkFile" -ForegroundColor Cyan
                        } catch {
                            Write-Host "  [SYNC] Network read failed: $_" -ForegroundColor Red
                        }
                    }
                }

                # Fallback to local
                if (-not $content -and (Test-Path $localBackupFile)) {
                    try {
                        $content = [System.IO.File]::ReadAllText($localBackupFile, [System.Text.Encoding]::UTF8)
                        $source = "local"
                        Write-Host "  [SYNC] Loaded from local: $localBackupFile" -ForegroundColor Yellow
                    } catch {
                        Write-Host "  [SYNC] Local read failed: $_" -ForegroundColor Red
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
            # ===== API: GET /api/sync/status — check sync config and file status =====
            elseif ($path -eq '/api/sync/status' -and $req.HttpMethod -eq 'GET') {
                $localExists = Test-Path $localBackupFile
                $localSize = if ($localExists) { (Get-Item $localBackupFile).Length } else { 0 }
                $localModified = if ($localExists) { (Get-Item $localBackupFile).LastWriteTime.ToString("o") } else { $null }

                $netPath = Get-NetworkPath
                $networkFile = if ($netPath) { Join-Path $netPath "db-backup.json" } else { "" }
                $networkExists = if ($networkFile -and $networkFile -ne "") { Test-Path $networkFile } else { $false }
                $networkSize = if ($networkExists) { (Get-Item $networkFile).Length } else { 0 }
                $networkModified = if ($networkExists) { (Get-Item $networkFile).LastWriteTime.ToString("o") } else { $null }

                $status = @{
                    localPath = $localBackupFile
                    localExists = $localExists
                    localSize = $localSize
                    localModified = $localModified
                    networkPath = $networkFile
                    networkExists = $networkExists
                    networkSize = $networkSize
                    networkModified = $networkModified
                }
                Send-JsonResponse $resp 200 $status
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
