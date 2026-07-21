; ============================================================================
; ZINC Pharmacy Management System - NSIS Installer Hooks
; Features:
;   1. Process Check & Graceful Termination
;   2. Pre-Update Data Snapshot & Rollback Safety
;   3. Windows Print Spooler Service Provisioning
;   4. Windows Firewall Rules for LAN & Thermal RAW Printing (Port 9100)
;   5. URL Protocol Registration (zinc:// Deep Link)
;   6. Interactive Data Preservation on Uninstall
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
  DetailPrint "Configuring Print Infrastructure & Services..."

  ; --------------------------------------------------------------------------
  ; 1. Ensure Windows Print Spooler Service is Active & Automatic
  ; --------------------------------------------------------------------------
  nsExec::ExecToLog 'sc config spoolsv start= auto'
  nsExec::ExecToLog 'net start spoolsv'

  ; --------------------------------------------------------------------------
  ; 2. Provision Windows Firewall Rules for ZINC App & RAW Printing (Port 9100)
  ; --------------------------------------------------------------------------
  DetailPrint "Provisioning Windows Firewall rules for thermal printing..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ZINC Pharmacy Application" dir=in action=allow program="$INSTDIR\zinc.exe" enable=yes'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="ZINC Thermal Printer RAW Port 9100" dir=out action=allow protocol=TCP remoteport=9100 enable=yes'

  ; --------------------------------------------------------------------------
  ; 3. Logging installation metadata
  ; --------------------------------------------------------------------------
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


!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "Cleaning up Windows Firewall rules..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ZINC Pharmacy Application"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="ZINC Thermal Printer RAW Port 9100"'
!macroend
