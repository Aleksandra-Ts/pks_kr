format PE64 Console 5.0                 ; формат проекта
entry Start                             ; точка входа в пользовательскую программу
include 'win64a.inc'                    ; подключение библиотек и заголовков

section '.bss' readable writeable
  readBuf db ?                          ; доп.секция = буфер для ввода/вывода через консоль 

section '.idata' import data readable   ;доп.секция импортируемых данных
  library kernel,'KERNEL32.DLL'
  import  kernel, \
    SetConsoleTitleA,'SetConsoleTitleA', \
    GetStdHandle,'GetStdHandle', \
    WriteConsoleA,'WriteConsoleA', \
    ReadConsoleA,'ReadConsoleA', \
    ExitProcess,'ExitProcess'

section '.data' data readable writeable
  ; ДАНО: двухбайтная целая A, знаковые B и C
  A      dw  0FFFFh                     ; 16-битная (двухбайтная) A — пример начального значения
  B      dd  2000000000                        ; 32-битная знаковая переменная
  C      dd  2000000000                        ; 32-битная знаковая переменная

  ; строковые сообщения
  msgLess16   db 'Sum (B+C) is less than 16. Saving and clearing bit in A.',13,10,0   ; результат < 16
  lenLess16   = $-msgLess16
  msgGe16     db 'Sum (B+C) is not less than 16. No changes to A.',13,10,0            ; результат >= 16
  lenGe16     = $-msgGe16

  ; отладочные сообщения
  msgSaved    db 'Saved sum to SUM.',13,10,0
  lenSaved    = $-msgSaved
  msgBTR      db 'Cleared that bit in A via BTR.',13,10,0
  lenBTR      = $-msgBTR

  ; параметры для консольного ввода вывода 
  conTitle    db 'Variant: B+C, CMP<16, MOV, BTR',0
  hStdIn      dq 0
  hStdOut     dq 0
  chrsRead    dq 0
  chrsWritten dq 0
  STD_INP_HNDL  dq -10
  STD_OUTP_HNDL dq -11
  ; переменная для сохранения суммы (если <16)
  SUM        dd 0

section '.text' code readable executable
Start:
  ; инициализация консоли
  invoke SetConsoleTitleA, conTitle
    test eax, eax
    jz Exit

  ; организация ввода/вывода через консоль
  invoke GetStdHandle, [STD_OUTP_HNDL]
    mov [hStdOut], rax
  invoke GetStdHandle, [STD_INP_HNDL]
    mov [hStdIn], rax

  ; ОПЕРАЦИЯ НАД ЧИСЛАМИ
  ; pагружаем B и C как 32-битные со знаком
    mov eax, [B]                              ; EAX = B
    add eax, [C]                              ; EAX = B + C

  ; ПРОВЕРКА РЕЗУЛЬТАТА
  ; cравним с 16; затем Jump if Less
    cmp eax, 16
    jl  .Less16

  ; если сумма >= 16 сообщаем об этом
  invoke WriteConsoleA, [hStdOut], msgGe16, lenGe16, chrsWritten, 0       ; вывод текста
  jmp Exit

.Less16:
  invoke WriteConsoleA, [hStdOut], msgLess16, lenLess16, chrsWritten, 0   ; вывод текста

  ; СОХРАНИТЬ РЕЗУЛЬТАТ И УСТАНОВИТЬ В "0" БИТ
  ; сохраним результат
  mov [SUM], eax                            ; SUM = B+C [web:19]
  invoke WriteConsoleA, [hStdOut], msgSaved, lenSaved, chrsWritten, 0     ; подтверждение

  ; 2) Установить в «0» бит с номером = SUM в переменной A (двухбайтная), через BTR [web:9][web:19]
  ;    По условию: "бит с этим номером" — трактуем как номер бита равный значению результата (SUM).
  ;    Корректно используем только младшие 5 битов номера для диапазона 0..31, но A — 16 бит.
  ;    BTR w/m16, reg/imm8: если бит был 1, CF=1; затем целевой бит в A сбрасывается [web:9][web:19].
  mov ecx, [SUM]                      ; ECX = номер бита (из суммы) [web:19]
  and ecx, 15                         ; ограничим до диапазона 0..15, т.к. A — 16 бит [web:9]
  ; Вариант с регистровым индексом бита:
  ; btr r/m16, r16/r32: в 64-битном режиме индекс берётся по модулю размера операнда, CF получает старый бит [web:9]
  ; Адрес A: используем 16-битный доступ через AX, но операнд в памяти word [A]
  btr word [A], cx                    ; сбросить бит #ECX в A; CF=старый бит [web:9][web:19]
  invoke WriteConsoleA, [hStdOut], msgBTR, lenBTR, chrsWritten, 0        ; подтверждение [web:18]

Exit:
  ; Пауза перед выходом — ожидание 1 символа [ReadConsoleA] [web:2][web:5]
  invoke ReadConsoleA, [hStdIn], readBuf, 1, chrsRead, 0                 ; ReadConsoleA ожидает ввод, по умолчанию построчно [web:5][web:2]
  invoke ExitProcess, 0                                                   ; завершение [web:2]
