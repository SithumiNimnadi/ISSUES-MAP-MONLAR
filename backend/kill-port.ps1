$port = 5000
$connections = netstat -ano | findstr ":$port"

if ($connections) {
    Write-Host "Found processes using port $port :" -ForegroundColor Yellow
    Write-Host $connections
    
    $pids = $connections | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -Unique
    
    foreach ($pid in $pids) {
        Write-Host "Killing process ID: $pid" -ForegroundColor Red
        taskkill /PID $pid /F
    }
    Write-Host "Port $port has been freed!" -ForegroundColor Green
} else {
    Write-Host "No processes found using port $port" -ForegroundColor Green
}