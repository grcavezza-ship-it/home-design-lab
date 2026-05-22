$file = "c:\Users\Gianni\OneDrive\Desktop\Sito\Home Design Lab rev2\gestione-team.html"
$content = Get-Content $file -Raw
$content = $content -replace '(?s)<nav id="sidebar-menu".*?</nav>', '<nav id="sidebar-menu" class="h-screen w-64 fixed left-0 top-0 bg-[#f6f3f2] dark:bg-stone-900 flex flex-col py-8 z-50"></nav>'
$content = $content -replace "allowedRoles: \['senior', 'admin', 'operator'\]", "allowedRoles: ['senior', 'admin', 'operator', 'architect']"
$content = $content -replace "defaultActiveMenu: 'overview'", "defaultActiveMenu: 'team'"
Set-Content $file $content -NoNewline
Write-Host "gestione-team.html done"
