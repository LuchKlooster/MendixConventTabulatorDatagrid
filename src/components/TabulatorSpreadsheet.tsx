import { CSSProperties, ReactElement, memo, useCallback, useEffect, useRef } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import { ActionValue, EditableValue } from "mendix";

export interface SheetConfig {
    title: string;
    key: string;
    rows: number;
    columns: number;
}

export interface TabulatorSpreadsheetProps {
    spreadsheetRows: number;
    spreadsheetColumns: number;
    spreadsheetDataAttribute?: EditableValue<string>;
    onSpreadsheetChangeAction?: ActionValue;
    spreadsheetSheetTabs: boolean;
    spreadsheetSheets: SheetConfig[];
    spreadsheetClipboard: boolean;
    /** When set, the sheet is filled from this 2D array (datasource mode) instead
     *  of the JSON data attribute. The attribute then only receives edits (output). */
    externalData?: string[][] | null;
    gridHeight: number;
    className?: string;
    style?: CSSProperties;
}

function parseJson(json: string | undefined): any | null {
    if (!json) return null;
    try { return JSON.parse(json); } catch { return null; }
}

export const TabulatorSpreadsheet = memo(function TabulatorSpreadsheet({
    spreadsheetRows,
    spreadsheetColumns,
    spreadsheetDataAttribute,
    onSpreadsheetChangeAction,
    spreadsheetSheetTabs,
    spreadsheetSheets,
    spreadsheetClipboard,
    externalData,
    gridHeight,
    className,
    style,
}: TabulatorSpreadsheetProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const tabulatorRef = useRef<InstanceType<typeof Tabulator> | null>(null);
    const tableBuiltRef = useRef(false);

    const dataAttrRef = useRef(spreadsheetDataAttribute);
    dataAttrRef.current = spreadsheetDataAttribute;
    const onChangeRef = useRef(onSpreadsheetChangeAction);
    onChangeRef.current = onSpreadsheetChangeAction;
    const sheetsRef = useRef(spreadsheetSheets);
    sheetsRef.current = spreadsheetSheets;
    const spreadsheetRowsRef = useRef(spreadsheetRows);
    spreadsheetRowsRef.current = spreadsheetRows;
    const spreadsheetColumnsRef = useRef(spreadsheetColumns);
    spreadsheetColumnsRef.current = spreadsheetColumns;
    const externalDataRef = useRef(externalData);
    externalDataRef.current = externalData;

    // Prevent the reload effect from re-loading data we just saved
    const justSavedRef = useRef(false);
    const sheetKeysStr = spreadsheetSheets.map(s => s.key).join(",");

    // ── Apply stored data to the active sheet ─────────────────────────────────

    const applyStoredData = useCallback((table: InstanceType<typeof Tabulator>) => {
        const json = dataAttrRef.current?.value;
        const parsed = parseJson(json);
        if (parsed == null) return;

        const sheets = sheetsRef.current;
        if (sheets.length > 0) {
            for (const sheet of sheets) {
                const sheetData = parsed?.[sheet.key];
                if (!Array.isArray(sheetData)) continue;
                try { (table as any).setSheetData(sheet.key, sheetData); } catch { /* swallow */ }
            }
        } else {
            if (!Array.isArray(parsed)) return;
            // setSheetData(data) — no key arg → uses activeSheet
            try { (table as any).setSheetData(parsed); } catch { /* swallow */ }
        }
    }, []);

    // ── Save ──────────────────────────────────────────────────────────────────

    const saveData = useCallback(() => {
        const table = tabulatorRef.current;
        const attr = dataAttrRef.current;
        if (!table || !tableBuiltRef.current) return;
        if (!attr || attr.status !== "available" || attr.readOnly) return;

        let data: any;
        // Datasource mode is always single-sheet — ignore the sheets config
        const sheets = externalDataRef.current ? [] : sheetsRef.current;
        if (sheets.length > 0) {
            data = {};
            for (const sheet of sheets) {
                try { data[sheet.key] = (table as any).getSheetData(sheet.key) ?? []; }
                catch { data[sheet.key] = []; }
            }
        } else {
            try { data = (table as any).getSheetData(); }
            catch { data = table.getData(); }
        }

        try {
            const json = JSON.stringify(data);
            if (attr.value === json) return;
            justSavedRef.current = true;
            attr.setValue(json);
            const action = onChangeRef.current;
            if (action?.canExecute) action.execute();
        } catch { /* swallow */ }
    }, []);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveData(), 600);
    }, [saveData]);

    // ── Table initialization ───────────────────────────────────────────────────

    useEffect(() => {
        if (!containerRef.current) return;

        tableBuiltRef.current = false;
        if (tabulatorRef.current) {
            tabulatorRef.current.destroy();
            tabulatorRef.current = null;
        }

        const rows = spreadsheetRowsRef.current;
        const cols = spreadsheetColumnsRef.current;
        // Datasource mode is always single-sheet — ignore the sheets config
        const sheetDefs = externalDataRef.current ? [] : sheetsRef.current;

        const options: any = {
            spreadsheet: true,
            spreadsheetRows: rows,
            spreadsheetColumns: cols,
            spreadsheetColumnDefinition: { editor: "input" },
            rowHeight: 25,
            height: gridHeight,
            // Always use spreadsheetSheets so rows/columns dims are explicit —
            // spreadsheetData creates sheets without dims → Math.max(undefined,n) = NaN → no cells
            spreadsheetSheets: sheetDefs.length > 0
                ? sheetDefs.map(s => ({
                    title: s.title,
                    key: s.key,
                    rows: s.rows > 0 ? s.rows : rows,
                    columns: s.columns > 0 ? s.columns : cols,
                }))
                : [{ rows, columns: cols }],
            spreadsheetSheetTabs: spreadsheetSheetTabs && sheetDefs.length > 0,
        };

        // Row header column: shows row numbers (formatter:"rownum"), no editor so no warning.
        options.rowHeader = {
            formatter: "rownum",
            hozAlign: "center",
            resizable: false,
            frozen: true,
            headerSort: false,
            width: 40,
        };
        // Range selection — selectableRangeRows uses the rowHeader column (index 0, no editor)
        options.selectableRange = 1;
        options.selectableRangeColumns = true;
        options.selectableRangeRows = true;
        // Default editTriggerEvent "focus" conflicts with range selection (editor opens
        // mid-drag). dblclick = single click selects, double click edits.
        options.editTriggerEvent = "dblclick";
        // Note: clipboard handled by our own keydown listener, not Tabulator's clipboard module.

        const table = new Tabulator(containerRef.current, options);

        // tableBuilt fires asynchronously (via Promise.finally in Tabulator).
        // Load data here — this handles BOTH cases:
        //   1. Data available at init → loads on tableBuilt
        //   2. Data arrives later (datasource loading / attribute) → reload effects below
        table.on("tableBuilt", () => {
            tableBuiltRef.current = true;
            const external = externalDataRef.current;
            if (external) {
                try { (table as any).setSheetData(external); } catch { /* swallow */ }
            } else {
                applyStoredData(table);
            }
        });

        table.on("cellEdited", () => scheduleSave());

        tabulatorRef.current = table;

        return () => {
            tableBuiltRef.current = false;
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            table.destroy();
            tabulatorRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spreadsheetRows, spreadsheetColumns, gridHeight, spreadsheetSheetTabs, spreadsheetClipboard, sheetKeysStr]);

    // ── Custom clipboard (Ctrl+C / Ctrl+V) ───────────────────────────────────
    // Tabulator's built-in clipboard module uses deprecated execCommand and its paste
    // action calls row.updateData() which conflicts with Mendix objects.
    // We implement clipboard directly using navigator.clipboard and setSheetData.

    useEffect(() => {
        if (!spreadsheetClipboard) return;
        const container = containerRef.current;
        if (!container) return;

        // Track whether the last mousedown was inside this spreadsheet
        const hasFocusRef = { current: false };
        const onMouseDown = (e: MouseEvent) => {
            hasFocusRef.current = container.contains(e.target as Node);
        };
        document.addEventListener("mousedown", onMouseDown);

        const onKeyDown = async (e: KeyboardEvent) => {
            if (!hasFocusRef.current) return;
            if (!tabulatorRef.current || !tableBuiltRef.current) return;
            if (!(e.ctrlKey || e.metaKey)) return;

            const table = tabulatorRef.current;
            const selectRange = (table as any).modules?.selectRange;
            if (!selectRange) return;

            // ── Copy ──────────────────────────────────────────────────────────
            if (e.key === "c" || e.key === "C") {
                const activeRange = selectRange.activeRange;
                if (!activeRange) return;

                // Use getSheetData (full 2D array) instead of activeRange.getData()
                // because getData() uses getDisplayRows() which only returns visible
                // rows — column selection breaks when rows are outside the viewport.
                const colOffset: number = selectRange.rowHeader ? 1 : 0;
                const dataTop: number = activeRange.top;
                const dataBottom: number = activeRange.bottom;
                const dataLeft: number = activeRange.left - colOffset;
                const dataRight: number = activeRange.right - colOffset;

                let sheetData: any[][];
                try { sheetData = (table as any).getSheetData() ?? []; }
                catch { sheetData = []; }

                const tsv = sheetData
                    .slice(dataTop, dataBottom + 1)
                    .map((row: any[]) =>
                        Array.from({ length: dataRight - dataLeft + 1 }, (_, ci) => {
                            const v = row[dataLeft + ci];
                            return v == null ? "" : String(v);
                        }).join("\t")
                    )
                    .join("\n");

                try {
                    await navigator.clipboard.writeText(tsv);
                    e.preventDefault();
                    e.stopPropagation();
                } catch { /* clipboard denied — let browser handle */ }
                return;
            }

            // ── Paste ─────────────────────────────────────────────────────────
            if (e.key === "v" || e.key === "V") {
                try {
                    const text = await navigator.clipboard.readText();
                    if (!text) return;

                    const activeRange = selectRange.activeRange;
                    if (!activeRange) return;

                    const pastedRows = text.split("\n").map((r: string) => r.split("\t"));
                    const startRow: number = activeRange.top;   // 0-based row index
                    // left is 1-based when rowHeader exists (col A = left 1, data index 0)
                    const colOffset: number = selectRange.rowHeader ? 1 : 0;
                    const startCol: number = activeRange.left - colOffset;

                    // Get current sheet data (2D array) and clone it
                    let current: any[][];
                    try { current = (table as any).getSheetData() ?? []; }
                    catch { current = []; }
                    const newData = current.map((r: any[]) => [...r]);

                    pastedRows.forEach((pastedRow: string[], ri: number) => {
                        const rowIdx = startRow + ri;
                        if (rowIdx < 0 || rowIdx >= newData.length) return;
                        pastedRow.forEach((val: string, ci: number) => {
                            const colIdx = startCol + ci;
                            if (colIdx < 0 || colIdx >= (newData[rowIdx]?.length ?? 0)) return;
                            newData[rowIdx][colIdx] = val;
                        });
                    });

                    (table as any).setSheetData(newData);
                    scheduleSave();
                    e.preventDefault();
                    e.stopPropagation();
                } catch { /* clipboard denied */ }
            }
        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spreadsheetClipboard, scheduleSave]);

    // ── Reload when attribute value changes externally ────────────────────────
    // Skipped in datasource mode: there the attribute is output-only.

    useEffect(() => {
        if (justSavedRef.current) { justSavedRef.current = false; return; }
        if (externalDataRef.current) return;
        const table = tabulatorRef.current;
        if (!table || !tableBuiltRef.current) return;
        applyStoredData(table);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spreadsheetDataAttribute?.value]);

    // ── Reload when the datasource data changes (datasource mode) ──────────────

    useEffect(() => {
        const table = tabulatorRef.current;
        if (!externalData || !table || !tableBuiltRef.current) return;
        try { (table as any).setSheetData(externalData); } catch { /* swallow */ }
    }, [externalData]);

    return (
        <div
            className={`widget-tabulator-datagrid widget-tabulator-datagrid--spreadsheet${className ? ` ${className}` : ""}`}
            style={style}
        >
            <div ref={containerRef} />
        </div>
    );
});
