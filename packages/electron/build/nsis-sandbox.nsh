!ifndef BUILD_UNINSTALLER

!include "LogicLib.nsh"

!macro customInstall
  StrCpy $0 "$INSTDIR\resources\sandbox-runtime\vendor\srt-win\x64\srt-win.exe"
  ${IfNot} ${FileExists} "$0"
    StrCpy $0 "$INSTDIR\resources\sandbox-runtime\vendor\srt-win\arm64\srt-win.exe"
  ${EndIf}

  ${If} ${FileExists} "$0"
    DetailPrint "Checking OpenCodex sandbox runtime status..."
    nsExec::ExecToStack '"$0" user status'
    Pop $1
    Pop $2
    StrCpy $1 $2
    StrCpy $2 '$\"exists$\":true'
    Call SandboxIsProvisioned
    ${If} $R9 == "0"
      StrCpy $2 '$\"exists$\": true'
      Call SandboxIsProvisioned
    ${EndIf}
    ${If} $R9 == "0"
      DetailPrint "Sandbox runtime not provisioned, installing (one UAC prompt)..."
      nsExec::ExecToStack '"$0" install'
      Pop $1
      DetailPrint "Sandbox runtime install exit code: $1"
    ${EndIf}
  ${EndIf}
!macroend

Function SandboxIsProvisioned
  StrCpy $R9 "0"
  StrLen $R8 $2
  StrLen $R7 $1
  StrCpy $R0 0
  Loop:
    IntOp $R4 $R0 + $R8
    IntCmp $R4 $R7 0 0 Done
    StrCpy $R6 $1 $R8 $R0
    StrCmp $R6 $2 Found
    IntOp $R0 $R0 + 1
    Goto Loop
  Found:
    StrCpy $R9 "1"
  Done:
FunctionEnd

!endif
