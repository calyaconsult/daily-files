# Replace <USER> with your username
# Or replace 'C:\Users\<USER>\Documents' with the path to some other directory
# Set the cut-off date
# Modify the auto-tag rules to reflect your own preferences

param(
    [string]   $BasePath = 'C:\Users\<USER>\Documents',
    [datetime] $CutOff   = (Get-Date -Month 10 -Day 1).Date,   # Oct 1 of the current year
    [string]   $TagFile  = "$PSScriptRoot\tags.json",
    [string]   $OutFile  = "$PSScriptRoot\files.json"
)

# Normalize base path: absolute, no trailing backslash (keeps Substring math correct)
$BasePath = (Resolve-Path -LiteralPath $BasePath).ProviderPath.TrimEnd('\')

# Auto-tag rules, first match wins (regex on relative path, backslash form,
# matched with a leading '\' prepended so top-level folders match too)
$rules = [ordered]@{
    '\\generation-log\\' = 'GENLOG'
    '\\ccch\\'           = 'CCCH'
    'all-files\.html$'   = 'FILELISTS'
}

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# --- load persistent tag store (file is written as UTF-8 no BOM, so read it as UTF-8!) ---
$tags = @{}
if (Test-Path -LiteralPath $TagFile) {
    (Get-Content -LiteralPath $TagFile -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties |
        ForEach-Object { $tags[$_.Name] = $_.Value }
}

$files = Get-ChildItem -Path $BasePath -Recurse -File -Include *.html, *.txt, *.md |
    Where-Object { $_.LastWriteTime -ge $CutOff -and $_.FullName -notmatch '\\HTML-Mirror\\' }

$records = foreach ($f in $files) {
    $relWin = $f.FullName.Substring($BasePath.Length).TrimStart('\')
    $rel    = $relWin -replace '\\', '/'          # forward slashes for the web

    $tag = $tags[$rel]
    if (-not $tag) {
        foreach ($r in $rules.GetEnumerator()) {
            # prepend '\' so directory rules match even at the top level
            if ("\$relWin" -match $r.Key) { $tag = $r.Value; break }
        }
        if (-not $tag) { $tag = 'UNTAGGED' }
        $tags[$rel] = $tag                        # remember for next run
    }

    [pscustomobject]@{
        tag       = $tag
        path      = $rel
        name      = $f.Name
        extension = $f.Extension
        lastMod   = $f.LastWriteTime.ToString('yyyy-MM-ddTHH:mm:ss')
        sizeKB    = [math]::Round($f.Length / 1KB, 2)
    }
}

# --- write tag store back (sorted = diff-friendly) ---
$sorted = [ordered]@{}
$tags.Keys | Sort-Object | ForEach-Object { $sorted[$_] = $tags[$_] }

# -InputObject @(...) guarantees a JSON array even with 0 or 1 records
$recordsJson = ConvertTo-Json -InputObject @($records | Sort-Object lastMod)

[IO.File]::WriteAllText($TagFile, (ConvertTo-Json -InputObject $sorted), $utf8NoBom)
[IO.File]::WriteAllText($OutFile, $recordsJson, $utf8NoBom)
