$ErrorActionPreference = 'Stop'
$nodeHome = 'C:\Program Files\nodejs'
$env:Path = "$nodeHome;$env:Path"
& "$nodeHome\npm.cmd" run dev
