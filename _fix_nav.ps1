$files = @(
    @{
        Path = 'c:\Users\Gianni\OneDrive\Desktop\Sito\Home Design Lab rev2\gestione-immobili.html'
        NavFix = $true
        FixDefaultActiveMenu = $true
        NewDefaultActiveMenu = "defaultActiveMenu: 'immobili',"
        FixAllowedRoles = $false
    },
    @{
        Path = 'c:\Users\Gianni\OneDrive\Desktop\Sito\Home Design Lab rev2\gestione-progetti.html'
        NavFix = $true
        FixDefaultActiveMenu = $false
        FixAllowedRoles = $true
        NewAllowedRoles = "allowedRoles: ['senior', 'admin', 'architect'],"
    },
    @{
        Path = 'c:\Users\Gianni\OneDrive\Desktop\Sito\Home Design Lab rev2\gestione-clienti.html'
        NavFix = $true
        FixDefaultActiveMenu = $false
        FixAllowedRoles = $false
    }
)

$newNav = '<nav id="sidebar-menu" class="h-screen w-64 fixed left-0 top-0 bg-[#f6f3f2] dark:bg-stone-900 flex flex-col py-8 z-50"></nav>'
$newNavIndented = '    ' + $newNav

foreach ($entry in $files) {
    $path = $entry.Path
    $content = [System.IO.File]::ReadAllText($path)
    $changed = $false

    if ($entry.NavFix) {
        # Match nav with or without quotes on attributes
        if ($content -match '<nav[^>]*id=["'']?sidebar-menu["'']?[^>]*>.*?</nav>') {
            $fileBase = [System.IO.Path]::GetFileName($path)
            if ($fileBase -eq 'gestione-clienti.html') {
                $content = $content -replace '<nav[^>]*id=["'']?sidebar-menu["'']?[^>]*>.*?</nav>', $newNavIndented
            } else {
                $content = $content -replace '<nav[^>]*id=["'']?sidebar-menu["'']?[^>]*>.*?</nav>', $newNav
            }
            $changed = $true
            Write-Host "$fileBase : nav replaced"
        } else {
            Write-Host "$fileBase : nav NOT FOUND"
        }
    }

    if ($entry.FixDefaultActiveMenu) {
        if ($content -match "defaultActiveMenu: 'overview',") {
            $content = $content -replace "defaultActiveMenu: 'overview',", $entry.NewDefaultActiveMenu
            $changed = $true
            Write-Host "$fileBase : defaultActiveMenu fixed"
        }
    }

    if ($entry.FixAllowedRoles) {
        if ($content -match "allowedRoles: \['senior', 'admin'\],") {
            $content = $content -replace "allowedRoles: \['senior', 'admin'\],", $entry.NewAllowedRoles
            $changed = $true
            Write-Host "$fileBase : allowedRoles fixed"
        }
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($path, $content)
        Write-Host "$fileBase : saved"
    } else {
        Write-Host "$fileBase : no changes needed"
    }
}
