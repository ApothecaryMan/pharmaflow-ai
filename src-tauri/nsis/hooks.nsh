; ============================================================================
; ZINC Pharmacy Management System - NSIS Installer Hooks
; Features: Process Check, Pre-Update Database Snapshot, Uninstall Protection
; ============================================================================

!include "LogicLib.nsh"
!include "FileFunc.nsh"

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Checking for running instances of ZINC..."

  ; --------------------------------------------------------------------------
  ; 1. Check if zinc.exe is currently running
  ; --------------------------------------------------------------------------
  nsExec::ExecToStack 'cmd /c "tasklist /NH /FI \"IMAGENAME eq zinc.exe\" | find /I \"zinc.exe\""'
  Pop $0 ; Exit code
  Pop $1 ; Output string

  ${If} $0 == 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "برنامج ZINC يعمل حالياً. يرجى إغلاقه للمتابعة، أو اضغط موافق لإغلاقه تلقائياً.$\n$\nZINC is currently running. Click OK to close it automatically and proceed." \
      IDOK close_app IDCANCEL abort_install

    close_app:
      nsExec::ExecToLog 'taskkill /F /IM zinc.exe'
      Sleep 1000
      Goto continue_install

    abort_install:
      Abort "تم إلغاء التثبيت بواسطة المستخدم. / Installation aborted by user."
  ${EndIf}

  continue_install:

  ; --------------------------------------------------------------------------
  ; 2. Create Pre-Update Data Snapshot
  ; --------------------------------------------------------------------------
  DetailPrint "Creating pharmacy data backup snapshot..."
  
  StrCpy $R0 "$LOCALAPPDATA\com.zinc.pharmacy"
  StrCpy $R1 "$LOCALAPPDATA\ZINC_Backups"

  ${If} ${FileExists} "$R0\*.*"
    ; Get current date/time for timestamped folder
    ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
    ; $2=Day, $1=Month, $0=Year, $4=Hour, $5=Minute, $6=Second
    StrCpy $R2 "$R1\Backup_$0-$1-$2_$4-$5-$6"

    CreateDirectory "$R2"
    CopyFiles /SILENT "$R0\*.*" "$R2"
    DetailPrint "Backup snapshot created at: $R2"
  ${EndIf}
!macroend


!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Logging installation metadata..."
  
  StrCpy $R1 "$LOCALAPPDATA\ZINC_Backups"
  CreateDirectory "$R1"
  
  ${GetTime} "" "L" $0 $1 $2 $3 $4 $5 $6
  FileOpen $0 "$R1\install_history.log" a
  FileSeek $0 0 END
  FileWrite $0 "Installed ZINC v2.0.71 on $0-$1-$2 at $4:$5:$6$\r$\n"
  FileClose $0
!macroend


!macro NSIS_HOOK_PREUNINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "هل تريد الاحتفاظ بقواعد البيانات والنسخ الاحتياطية الخاصة بالصيدلية؟$\n$\nDo you want to preserve your pharmacy database and backup files?" \
    IDYES keep_data IDNO purge_data

  keep_data:
    DetailPrint "User requested to keep local pharmacy data."
    Goto done_uninstall_hook

  purge_data:
    DetailPrint "Purging local application data..."
    RMDir /r "$LOCALAPPDATA\com.zinc.pharmacy"
    RMDir /r "$LOCALAPPDATA\ZINC_Backups"

  done_uninstall_hook:
!macroend
