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

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $resp = $ctx.Response
        $path = $req.Url.LocalPath

        try {
            if ($path -eq '/') { $path = '/index.html' }

            $filePath = Join-Path $root ($path -replace '/', '\')

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $resp.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
                $resp.StatusCode = 200
                $resp.ContentLength64 = $bytes.Length
                # Disable keep-alive to prevent Firefox connection issues
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
