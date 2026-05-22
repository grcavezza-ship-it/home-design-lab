Write-Host '=== PULIZIA DISCO C ===' -ForegroundColor Green
$drive = Get-PSDrive C
Write-Host ('Spazio usato: ' + [math]::Round($drive.Used/1GB,2) + ' GB')
Write-Host ('Spazio libero: ' + [math]::Round($drive.Free/1GB,2) + ' GB')
Write-Host ''

Write-Host '1. Svuoto TEMP...' -ForegroundColor Yellow
@("$env:TEMP", "C:\Windows\Temp") | ForEach-Object {
    if (Test-Path $_) {
        Get-ChildItem $_ -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object { !$_.PSIsContainer } |
            Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host ('  OK: ' + $_)
    }
}

Write-Host '2. Svuoto cache browser...' -ForegroundColor Yellow
@("$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
   "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache",
   "$env:LOCALAPPDATA\Microsoft\Windows\INetCache") |
ForEach-Object {
    if (Test-Path $_) {
        Remove-Item "$_\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host ('  OK: cache browser')
    }
}

Write-Host '3. Pulizia Windows Update...' -ForegroundColor Yellow
if (Test-Path 'C:\Windows\SoftwareDistribution\Download') {
    Remove-Item 'C:\Windows\SoftwareDistribution\Download\*' -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host '  OK: update cache'
}

Write-Host '4. Svuoto Cestino...' -ForegroundColor Yellow
(New-Object -ComObject Shell.Application).NameSpace(0xA).Items() |
    ForEach-Object { $_.InvokeVerb('delete') }
Write-Host '  OK: cestino'

Write-Host '5. Analizzo node_modules...' -ForegroundColor Yellow
if (Test-Path 'node_modules') {
    $nm = Get-ChildItem 'node_modules' -Recurse -File -ErrorAction SilentlyContinue |
          Measure-Object -Property Length -Sum
    Write-Host ('  node_modules: ' + [math]::Round($nm.Sum/1GB,2) + ' GB')
}

Write-Host '6. Cartelle grandi...' -ForegroundColor Yellow
Get-ChildItem 'C:\Users' -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
        $s = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
              Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{Folder=$_.Name; GB=[math]::Round(($s/1GB),2)}
    } | Sort-Object GB -Descending | Select-Object -First 10 |
    ForEach-Object { Write-Host ('  ' + $_.Folder + ': ' + $_.GB + ' GB') }

$drive2 = Get-PSDrive C
Write-Host ''
Write-Host '=== FATTO ===' -ForegroundColor Green
Write-Host ('Spazio libero ora: ' + [math]::Round($drive2.Free/1GB,2) + ' GB')

pause
