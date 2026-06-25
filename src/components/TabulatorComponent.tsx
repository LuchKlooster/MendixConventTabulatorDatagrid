import {
    CSSProperties, ReactElement, ReactNode, ReactPortal,
    memo, useCallback, useEffect, useMemo, useRef, useState
} from "react";
import { createPortal, flushSync } from "react-dom";
import Big from "big.js";
import { TabulatorFull as Tabulator, ColumnDefinition, RowComponent, CellComponent } from "tabulator-tables";
import * as XLSX from "xlsx";
import {
    ObjectItem, ListAttributeValue, ListActionValue, ListWidgetValue,
    ListExpressionValue, EditableValue, ActionValue,
    SelectionMultiValue, SelectionSingleValue
} from "mendix";

// Make xlsx available globally for Tabulator's xlsx download module
(window as any).XLSX = XLSX;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColumnConfig {
    columnKey: string;
    showContentAs: "attribute" | "dynamicText" | "customContent";
    attribute?: ListAttributeValue<string | Big | Date | boolean>;
    dynamicText?: ListExpressionValue<string>;
    content?: ListWidgetValue;
    header: string;
    width: number;
    minWidth: number;
    sortable: boolean;
    resizable: boolean;
    freeze: "none" | "left";
    hozAlign: "auto" | "left" | "center" | "right";
    formatter: "value" | "progressBar" | "star" | "tickCross" | "money" | "html" | "color" | "link" | "toggle" | "textarea" | "image" | "datetimediff" | "traffic" | "buttonTick" | "buttonCross";
    decimalPlaces: number;
    currencySymbol: string;
    dateFormat: string;
    aggregateFunction: "none" | "sum" | "count" | "average" | "max" | "min";
    headerFilter: boolean;
    editable: boolean;
    onCellEditAction?: ListActionValue;
    cellClass?: ListExpressionValue<string>;
    groupBy: boolean;
    xpathName: string;
    tooltip: boolean;
}

export interface TabulatorComponentProps {
    rows: ObjectItem[];
    columns: ColumnConfig[];
    rowHeight: number;
    gridHeight: number;
    layout: "fitData" | "fitColumns" | "fitDataFill" | "fitDataStretch";
    enableResponsiveLayout: boolean;
    onRowClickAction?: ListActionValue;
    onRowDblClickAction?: ListActionValue;
    emptyPlaceholder: string;
    className?: string;
    style?: CSSProperties;
    itemSelection?: SelectionSingleValue | SelectionMultiValue;
    onRowSelectAction?: ListActionValue;
    onRowDeselectAction?: ListActionValue;
    autoSelectRow: number;
    enableSelectionColumn: boolean;
    enableCsvExport: boolean;
    enableExcelExport: boolean;
    enableJsonExport: boolean;
    enablePdfExport: boolean;
    enableClipboardCopy: boolean;
    exportFilename: string;
    toolbarWidgets?: ReactNode;
    enableFilters: boolean;
    enableFilterBar: boolean;
    enableGroupBy: boolean;
    enableColumnChooser: boolean;
    enableColumnReorder: boolean;
    summaryPosition: "none" | "top" | "bottom";
    configAttribute?: EditableValue<string>;
    onConfigChangeAction?: ActionValue;
    filterXpathAttribute?: EditableValue<string>;
    enableMasterDetail: boolean;
    detailContent?: ListWidgetValue;
    detailHeight: number;
    rowStriping: boolean;
    enablePagination: boolean;
    pageSize: number;
    paginationPosition: "top" | "bottom";
    paginationSizeSelector: boolean;
    enableRowReorder: boolean;
    onRowReorderAction?: ListActionValue;
    reorderTargetIdAttribute?: EditableValue<string>;
    isLoading?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateValue(date: Date, format: string): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthAbbr  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dayNames   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayAbbr    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return format.replace(/EEEE|E|MMMM|MMM|MM|M|LLLL|LLL|LL|L|yyyy|YYYY|yy|dd|d|HH|H|hh|h|mm|m|ss|s|a/g, token => {
        switch (token) {
            case "EEEE": return dayNames[date.getDay()];
            case "E":    return dayAbbr[date.getDay()];
            case "MMMM": case "LLLL": return monthNames[date.getMonth()];
            case "MMM":  case "LLL":  return monthAbbr[date.getMonth()];
            case "MM":   case "LL":   return pad(date.getMonth() + 1);
            case "M":    case "L":    return String(date.getMonth() + 1);
            case "yyyy": case "YYYY": return String(date.getFullYear());
            case "yy":   return pad(date.getFullYear() % 100);
            case "dd":   return pad(date.getDate());
            case "d":    return String(date.getDate());
            case "HH":   return pad(date.getHours());
            case "H":    return String(date.getHours());
            case "hh":   return pad(date.getHours() % 12 || 12);
            case "h":    return String(date.getHours() % 12 || 12);
            case "mm":   return pad(date.getMinutes());
            case "m":    return String(date.getMinutes());
            case "ss":   return pad(date.getSeconds());
            case "s":    return String(date.getSeconds());
            case "a":    return date.getHours() < 12 ? "AM" : "PM";
            default:     return token;
        }
    });
}

function resolveAlignment(col: ColumnConfig): "left" | "center" | "right" | undefined {
    if (col.hozAlign !== "auto") return col.hozAlign;
    if (!col.attribute) return undefined;
    const t = col.attribute.type;
    if (t === "Integer" || t === "Long" || t === "Decimal" || t === "AutoNumber") return "right";
    if (t === "Boolean") return "center";
    return undefined;
}

function extractRowData(item: ObjectItem, columns: ColumnConfig[]): Record<string, unknown> {
    const row: Record<string, unknown> = { _id: item.id as string };
    for (const col of columns) {
        if (col.showContentAs === "attribute" && col.attribute) {
            const val = col.attribute.get(item);
            const raw = val.value;
            if (raw instanceof Big) {
                row[col.columnKey] = raw.toNumber();
            } else if (raw instanceof Date) {
                row[col.columnKey] = raw.getTime();
                row[`${col.columnKey}_disp`] = val.displayValue ?? "";
            } else if (raw === true || raw === false) {
                row[col.columnKey] = raw;
            } else {
                row[col.columnKey] = raw ?? null;
                row[`${col.columnKey}_disp`] = val.displayValue ?? "";
            }
        } else if (col.showContentAs === "dynamicText" && col.dynamicText) {
            row[col.columnKey] = col.dynamicText.get(item).value ?? "";
        } else {
            row[col.columnKey] = null;
        }
    }
    return row;
}

function buildFilterXpath(
    col: ColumnConfig,
    filterValue: string
): string {
    if (!col.attribute) return "";
    const name = col.xpathName?.trim() ?? "";
    const f = filterValue.trim();
    if (!f) return "";
    const type = col.attribute.type;

    if (type === "Boolean") {
        return `[${name} = ${f === "true" ? "true()" : "false()"}]`;
    }
    if (type === "Integer" || type === "Long" || type === "Decimal" || type === "AutoNumber") {
        const m = f.match(/^(>=|<=|!=|>|<|=)?\s*(-?\d+(?:[.,]\d+)?)$/);
        if (m) {
            const op = m[1] || "=";
            const num = m[2].replace(",", ".");
            return `[${name} ${op} ${num}]`;
        }
        return "";
    }
    if (type === "DateTime") {
        const m = f.match(/^(>=|<=|>|<|=)(\d{4}-\d{2}-\d{2})$/);
        if (m) {
            const op = m[1], d = m[2];
            const [dy, dm, dd] = d.split("-").map(Number);
            const nx = new Date(dy, dm - 1, dd + 1);
            const dn = `${nx.getFullYear()}-${String(nx.getMonth()+1).padStart(2,"0")}-${String(nx.getDate()).padStart(2,"0")}`;
            if (op === "=")  return `[${name} >= '${d}T00:00:00'][${name} < '${dn}T00:00:00']`;
            if (op === ">")  return `[${name} >= '${dn}T00:00:00']`;
            if (op === ">=") return `[${name} >= '${d}T00:00:00']`;
            if (op === "<")  return `[${name} < '${d}T00:00:00']`;
            if (op === "<=") return `[${name} < '${dn}T00:00:00']`;
        }
        return "";
    }
    if (type === "Enum" || type === "EnumSet") {
        const escaped = f.replace(/'/g, "''");
        return `[${name} = '${escaped}']`;
    }
    // String
    const escaped = f.replace(/'/g, "''");
    return `[contains(lower-case(${name}), lower-case('${escaped}'))]`;
}

// ── Column chooser panel ───────────────────────────────────────────────────────

function ColumnChooserPanel({
    columns,
    hiddenColumns,
    onToggle,
    onClose
}: {
    columns: ColumnConfig[];
    hiddenColumns: Set<string>;
    onToggle: (key: string) => void;
    onClose: () => void;
}): ReactElement {
    return (
        <div className="tab-column-chooser" role="dialog" aria-label="Column visibility">
            <div className="tab-column-chooser__header">
                <span>Columns</span>
                <button className="tab-column-chooser__close" onClick={onClose} aria-label="Close">✕</button>
            </div>
            <ul className="tab-column-chooser__list">
                {columns.map(col => (
                    <li key={col.columnKey} className="tab-column-chooser__item">
                        <label>
                            <input
                                type="checkbox"
                                checked={!hiddenColumns.has(col.columnKey)}
                                onChange={() => onToggle(col.columnKey)}
                            />
                            <span>{col.header}</span>
                        </label>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Group-by bar ──────────────────────────────────────────────────────────────

function GroupByBar({
    columns,
    activeGroupBySet,
    onToggle
}: {
    columns: ColumnConfig[];
    activeGroupBySet: Set<string>;
    onToggle: (key: string) => void;
}): ReactElement {
    const groupableColumns = columns.filter(c => c.groupBy && c.showContentAs === "attribute" && c.attribute);
    return (
        <div className="tab-groupby-bar">
            <span className="tab-groupby-bar__label">Group by:</span>
            {groupableColumns.map(col => (
                <label key={col.columnKey} className="tab-groupby-bar__item">
                    <input
                        type="checkbox"
                        checked={activeGroupBySet.has(col.columnKey)}
                        onChange={() => onToggle(col.columnKey)}
                    />
                    {col.header}
                </label>
            ))}
            {groupableColumns.length === 0 && (
                <span className="tab-groupby-bar__empty">No columns have "Group by" enabled</span>
            )}
        </div>
    );
}

// ── Filter bar (setFilter) ────────────────────────────────────────────────────

type FilterBarProps = {
    columns: ColumnConfig[];
    onApply: (field: string, type: string, value: unknown) => void;
    onClear: () => void;
};

function FilterBar({ columns, onApply, onClear }: FilterBarProps): ReactElement {
    const filterable = columns.filter(c => c.showContentAs === "attribute" && c.attribute);
    const [field, setField] = useState("");
    const [fType, setFType] = useState("like");
    const [value, setValue] = useState("");

    const selCol = filterable.find(c => c.columnKey === field);
    const attrType = selCol?.attribute?.type ?? "String";

    type TOpt = { v: string; l: string };
    const typeOpts: TOpt[] =
        attrType === "Boolean"
            ? [{ v: "=", l: "=" }]
            : (attrType === "Integer" || attrType === "Long" || attrType === "Decimal" || attrType === "AutoNumber")
            ? [{ v: "=", l: "=" }, { v: "!=", l: "≠" }, { v: "<", l: "<" }, { v: "<=", l: "≤" }, { v: ">", l: ">" }, { v: ">=", l: "≥" }]
            : (attrType === "Enum" || attrType === "EnumSet")
            ? [{ v: "=", l: "=" }, { v: "!=", l: "≠" }]
            : attrType === "DateTime"
            ? [{ v: "like", l: "contains" }]
            : [{ v: "like", l: "contains" }, { v: "=", l: "=" }, { v: "!=", l: "≠" }, { v: "starts", l: "starts with" }, { v: "ends", l: "ends with" }];

    const handleFieldChange = (f: string) => {
        setField(f);
        setValue("");
        const t = filterable.find(c => c.columnKey === f)?.attribute?.type;
        setFType(
            t === "DateTime" ? "like"
            : (t === "Integer" || t === "Long" || t === "Decimal" || t === "AutoNumber") ? "="
            : "like"
        );
    };

    const handleApply = () => {
        if (!field) return;
        if (attrType === "DateTime") {
            // Filter against the display string stored in _disp field
            onApply(`${field}_disp`, "like", value);
        } else if (attrType === "Boolean") {
            onApply(field, "=", value === "true");
        } else if (attrType === "Integer" || attrType === "Long" || attrType === "Decimal" || attrType === "AutoNumber") {
            onApply(field, fType, parseFloat(value));
        } else {
            onApply(field, fType, value);
        }
    };

    const handleClear = () => {
        setField("");
        setValue("");
        setFType("like");
        onClear();
    };

    let valueInput: ReactElement;
    if (attrType === "Boolean") {
        valueInput = (
            <select className="tab-filterbar__select" value={value} onChange={e => setValue(e.target.value)}>
                <option value="">Select...</option>
                <option value="true">Yes (✓)</option>
                <option value="false">No (✗)</option>
            </select>
        );
    } else if (attrType === "Enum" || attrType === "EnumSet") {
        valueInput = (
            <select className="tab-filterbar__select" value={value} onChange={e => setValue(e.target.value)}>
                <option value="">Select...</option>
                {((selCol?.attribute?.universe ?? []) as string[]).map(v => (
                    <option key={v} value={v}>{v}</option>
                ))}
            </select>
        );
    } else if (attrType === "Integer" || attrType === "Long" || attrType === "Decimal" || attrType === "AutoNumber") {
        valueInput = (
            <input type="number" className="tab-filterbar__input" value={value}
                onChange={e => setValue(e.target.value)} placeholder="Number..." />
        );
    } else {
        valueInput = (
            <input type="text" className="tab-filterbar__input" value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={attrType === "DateTime" ? "e.g. Jan 2024 or 15-01..." : "Filter value..."} />
        );
    }

    return (
        <div className="tab-filterbar">
            <span className="tab-filterbar__label">Filter:</span>
            <select className="tab-filterbar__select" value={field} onChange={e => handleFieldChange(e.target.value)}>
                <option value="">Column...</option>
                {filterable.map(col => <option key={col.columnKey} value={col.columnKey}>{col.header}</option>)}
            </select>
            {field && (
                <select className="tab-filterbar__select" value={fType} onChange={e => setFType(e.target.value)}>
                    {typeOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
            )}
            {field && valueInput}
            <button type="button" className="tab-toolbar__btn" onClick={handleApply} disabled={!field}>Apply</button>
            <button type="button" className="tab-toolbar__btn" onClick={handleClear}>Clear</button>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const TabulatorComponent = memo(function TabulatorComponent({
    rows,
    columns,
    rowHeight,
    gridHeight,
    layout,
    enableResponsiveLayout,
    onRowClickAction,
    onRowDblClickAction,
    emptyPlaceholder,
    className,
    style,
    itemSelection,
    onRowSelectAction,
    onRowDeselectAction,
    autoSelectRow,
    enableSelectionColumn,
    enableCsvExport,
    enableExcelExport,
    enableJsonExport,
    enablePdfExport,
    enableClipboardCopy,
    exportFilename,
    toolbarWidgets,
    enableFilters,
    enableFilterBar,
    enableGroupBy,
    enableColumnChooser,
    enableColumnReorder,
    summaryPosition,
    configAttribute,
    onConfigChangeAction,
    filterXpathAttribute,
    enableMasterDetail,
    detailContent,
    detailHeight,
    rowStriping,
    enablePagination,
    pageSize,
    paginationPosition,
    paginationSizeSelector,
    enableRowReorder,
    onRowReorderAction,
    reorderTargetIdAttribute,
    isLoading
}: TabulatorComponentProps): ReactElement {

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const tabulatorRef = useRef<InstanceType<typeof Tabulator> | null>(null);
    const tableBuiltRef = useRef(false);
    const rowMapRef = useRef<Map<string, ObjectItem>>(new Map());
    const portalContainerMapRef = useRef<Map<string, HTMLElement>>(new Map());
    const expandedRowIdsRef = useRef<Set<string>>(new Set());
    const autoSelectAppliedRef = useRef(false);
    const configAppliedRef = useRef(false);
    const configJustLoadedRef = useRef(false);
    const selectedRowIdRef = useRef<string | null>(null);

    // Stable refs for callbacks (avoid stale closures)
    const onRowClickRef = useRef(onRowClickAction);       onRowClickRef.current = onRowClickAction;
    const onRowDblClickRef = useRef(onRowDblClickAction); onRowDblClickRef.current = onRowDblClickAction;
    const onRowSelectRef = useRef(onRowSelectAction);     onRowSelectRef.current = onRowSelectAction;
    const onRowDeselectRef = useRef(onRowDeselectAction); onRowDeselectRef.current = onRowDeselectAction;
    const onRowReorderRef = useRef(onRowReorderAction);   onRowReorderRef.current = onRowReorderAction;
    const itemSelectionRef = useRef(itemSelection);       itemSelectionRef.current = itemSelection;
    const reorderTargetRef = useRef(reorderTargetIdAttribute); reorderTargetRef.current = reorderTargetIdAttribute;
    const configAttrRef = useRef(configAttribute);        configAttrRef.current = configAttribute;
    const onConfigChangeRef = useRef(onConfigChangeAction); onConfigChangeRef.current = onConfigChangeAction;
    const filterXpathRef = useRef(filterXpathAttribute);  filterXpathRef.current = filterXpathAttribute;
    const columnsRef = useRef(columns);                   columnsRef.current = columns;
    const rowsRef = useRef(rows);                         rowsRef.current = rows;

    // UI state
    const [portalTick, setPortalTick] = useState(0);
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set());
    const [activeGroupBySet, setActiveGroupBySet] = useState<Set<string>>(() => new Set());
    const [groupByBarVisible, setGroupByBarVisible] = useState(false);
    const [columnChooserVisible, setColumnChooserVisible] = useState(false);

    const activeGroupBySetRef = useRef(activeGroupBySet);
    activeGroupBySetRef.current = activeGroupBySet;

    const selectionType = !itemSelection ? "none" : itemSelection.type === "Single" ? "single" : "multi";

    // ── Portal sync ────────────────────────────────────────────────────────────
    const syncPortals = useCallback(() => {
        if (!tableContainerRef.current) return;
        const newMap = new Map<string, HTMLElement>();
        tableContainerRef.current.querySelectorAll("[data-tab-portal]").forEach(el => {
            const key = (el as HTMLElement).dataset.tabPortal;
            if (key) newMap.set(key, el as HTMLElement);
        });
        portalContainerMapRef.current = newMap;
        setPortalTick(t => t + 1);
    }, []);

    const syncPortalsRef = useRef(syncPortals);
    syncPortalsRef.current = syncPortals;

    // ── Table data extraction ─────────────────────────────────────────────────
    const tableData = useMemo(() => {
        rowMapRef.current = new Map(rows.map(item => [item.id as string, item]));
        return rows.map(item => extractRowData(item, columns));
    }, [rows, columns]);

    // ── Tabulator column definitions ──────────────────────────────────────────
    const tabulatorCols = useMemo((): ColumnDefinition[] => {
        const cols: ColumnDefinition[] = [];

        // Row reorder handle
        if (enableRowReorder) {
            cols.push({
                formatter: "handle" as any,
                headerSort: false,
                frozen: true,
                width: 30,
                minWidth: 30,
                maxWidth: 30,
                resizable: false,
                title: "",
                field: "__handle__",
            } as ColumnDefinition);
        }

        // Expand/detail toggle
        if (enableMasterDetail && detailContent) {
            cols.push({
                title: "",
                field: "__expand__",
                width: 35,
                minWidth: 35,
                maxWidth: 35,
                frozen: true,
                headerSort: false,
                resizable: false,
                formatter: (cell: CellComponent) => {
                    const rowId = (cell.getData() as any)._id as string;
                    const isExpanded = expandedRowIdsRef.current.has(rowId);
                    const btn = document.createElement("button");
                    btn.className = `tab-expand-btn${isExpanded ? " tab-expand-btn--open" : ""}`;
                    btn.innerHTML = isExpanded ? "&#9660;" : "&#9654;";
                    btn.addEventListener("click", e => {
                        e.stopPropagation();
                        const set = expandedRowIdsRef.current;
                        if (set.has(rowId)) set.delete(rowId); else set.add(rowId);
                        // Toggle detail panel visibility on the row element
                        const rowEl = cell.getRow().getElement();
                        const panel = rowEl.querySelector(".tab-detail-panel") as HTMLElement | null;
                        if (panel) {
                            const open = set.has(rowId);
                            panel.style.display = open ? "block" : "none";
                            panel.style.height = open ? `${detailHeight}px` : "0";
                            btn.innerHTML = open ? "&#9660;" : "&#9654;";
                            btn.classList.toggle("tab-expand-btn--open", open);
                        }
                        setTimeout(() => syncPortalsRef.current(), 50);
                    });
                    return btn;
                }
            } as ColumnDefinition);
        }

        // Selection checkbox
        if (enableSelectionColumn && selectionType !== "none") {
            cols.push({
                formatter: "rowSelection" as any,
                titleFormatter: "rowSelection" as any,
                hozAlign: "center",
                width: 40,
                minWidth: 40,
                maxWidth: 40,
                headerSort: false,
                resizable: false,
            } as ColumnDefinition);
        }

        // Data columns
        for (const col of columns) {
            if (hiddenColumns.has(col.columnKey)) continue;

            const align = resolveAlignment(col);
            const isAttr = col.showContentAs === "attribute" && col.attribute != null;

            // Formatter
            let formatter: ColumnDefinition["formatter"];
            let formatterParams: ColumnDefinition["formatterParams"];

            if (col.showContentAs === "customContent") {
                formatter = (cell: CellComponent) => {
                    const rowId = (cell.getData() as any)._id as string;
                    const div = document.createElement("div");
                    div.className = "tab-custom-content";
                    div.dataset.tabPortal = `${rowId}|${col.columnKey}`;
                    return div;
                };
            } else if (col.formatter === "progressBar") {
                formatter = "progress";
                formatterParams = { min: 0, max: 100, color: "#264ae5", legendColor: "#000" };
            } else if (col.formatter === "star") {
                formatter = "star";
                formatterParams = { stars: 5 };
            } else if (col.formatter === "tickCross" || (isAttr && col.attribute!.type === "Boolean")) {
                formatter = "tickCross";
                formatterParams = { allowEmpty: true, allowTruthy: true };
            } else if (col.formatter === "toggle") {
                formatter = "toggle" as any;
            } else if (col.formatter === "color") {
                formatter = "color";
            } else if (col.formatter === "html") {
                formatter = "html";
            } else if (col.formatter === "link") {
                formatter = "link";
                formatterParams = { target: "_blank" };
            } else if (col.formatter === "textarea") {
                formatter = "textarea" as any;
            } else if (col.formatter === "image") {
                formatter = "image";
            } else if (col.formatter === "datetimediff") {
                formatter = "datetimediff" as any;
            } else if (col.formatter === "traffic") {
                formatter = "traffic" as any;
            } else if (col.formatter === "buttonTick") {
                formatter = "buttonTick" as any;
            } else if (col.formatter === "buttonCross") {
                formatter = "buttonCross" as any;
            } else if (isAttr && col.attribute!.type === "DateTime") {
                const colCopy = col;
                formatter = (cell: CellComponent) => {
                    const ts = cell.getValue() as number;
                    if (!ts) return "";
                    const date = new Date(ts);
                    if (colCopy.dateFormat) return formatDateValue(date, colCopy.dateFormat);
                    const disp = (cell.getData() as any)[`${colCopy.columnKey}_disp`] as string;
                    return disp || date.toLocaleDateString();
                };
            } else if (
                isAttr &&
                ["Decimal","Integer","Long","AutoNumber"].includes(col.attribute!.type) &&
                (col.formatter === "money" || col.decimalPlaces >= 0)
            ) {
                const colCopy = col;
                formatter = (cell: CellComponent) => {
                    const val = cell.getValue() as number;
                    if (val == null) return "";
                    const num = typeof val === "number" ? val : parseFloat(String(val));
                    if (isNaN(num)) return "";
                    const places = colCopy.decimalPlaces >= 0 ? colCopy.decimalPlaces : 2;
                    const fixed = num.toFixed(places);
                    return colCopy.currencySymbol ? `${colCopy.currencySymbol} ${fixed}` : fixed;
                };
            } else {
                // Plain value - use display value if available
                const colCopy = col;
                formatter = (cell: CellComponent) => {
                    const disp = (cell.getData() as any)[`${colCopy.columnKey}_disp`] as string;
                    if (disp != null) return String(disp);
                    const v = cell.getValue();
                    return v != null ? String(v) : "";
                };
            }

            // Header filter
            let headerFilter: ColumnDefinition["headerFilter"];
            let headerFilterParams: ColumnDefinition["headerFilterParams"] = {};
            let headerFilterFunc: ColumnDefinition["headerFilterFunc"];

            if (enableFilters && col.headerFilter && isAttr) {
                const attrType = col.attribute!.type;
                if (attrType === "Boolean") {
                    // tri-state: null=all, true=✓, false=✗
                    headerFilter = "tickCross" as any;
                    headerFilterParams = { tristate: true };
                } else if (attrType === "Enum" || attrType === "EnumSet") {
                    // "list" replaces "select" in Tabulator v6
                    headerFilter = "list" as any;
                    const listVals: Array<{ label: string; value: string }> = [{ label: "(All)", value: "" }];
                    ((col.attribute!.universe ?? []) as string[]).forEach(v => listVals.push({ label: v, value: v }));
                    headerFilterParams = { values: listVals, clearable: true };
                    // Match against display value (_disp) so localised captions filter correctly
                    const enumColKey = col.columnKey;
                    headerFilterFunc = (hv: string, _rv: unknown, rd: Record<string, unknown>) => {
                        if (!hv) return true;
                        const raw = String(rd[enumColKey] ?? "");
                        const disp = String(rd[`${enumColKey}_disp`] ?? "");
                        return raw === hv || disp === hv;
                    };
                } else if (attrType === "Integer" || attrType === "Long" || attrType === "Decimal" || attrType === "AutoNumber") {
                    headerFilter = "number" as any;
                } else if (attrType === "DateTime") {
                    // Dates stored as timestamps — filter against the display string
                    const dtColKey = col.columnKey;
                    headerFilter = "input" as any;
                    headerFilterFunc = (hv: string, _rv: unknown, rd: Record<string, unknown>) => {
                        if (!hv) return true;
                        const disp = String(rd[`${dtColKey}_disp`] ?? "");
                        return disp.toLowerCase().includes(hv.toLowerCase());
                    };
                } else {
                    headerFilter = "input" as any;
                }
            }

            // Inline editor
            let editor: ColumnDefinition["editor"];
            let editorParams: ColumnDefinition["editorParams"];

            if (col.editable && isAttr) {
                const et = col.attribute!.type;
                if (et === "String") {
                    editor = "input";
                } else if (et === "Integer" || et === "Long" || et === "Decimal") {
                    editor = "number";
                    editorParams = { step: et === "Decimal" ? 0.01 : 1 };
                } else if (et === "Boolean") {
                    editor = "tickCross" as any;
                    editorParams = { tristate: false };
                } else if (et === "Enum" || et === "EnumSet") {
                    editor = "list" as any;
                    const eVals: Array<{ label: string; value: string }> = [];
                    ((col.attribute!.universe ?? []) as string[]).forEach(v => eVals.push({ label: v, value: v }));
                    editorParams = { values: eVals };
                } else if (et === "DateTime") {
                    const containerRef = tableContainerRef;
                    editor = ((cell: CellComponent, onRendered: (fn: () => void) => void, success: (val: unknown) => void, cancel: () => void) => {
                        const inp = document.createElement("input");
                        inp.type = "date";
                        const originalTs = cell.getValue() as number | null;
                        if (originalTs) {
                            const d = new Date(originalTs);
                            inp.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                        }
                        Object.assign(inp.style, { border: "1px solid #264ae5", borderRadius: "2px", padding: "2px 4px", fontSize: "12px", width: "100%", boxSizing: "border-box" });

                        let committed = false;

                        // Tabulator listens for document mousedown (capture phase) to detect
                        // "click outside editor → cancel". The native date picker popup fires
                        // mousedown outside any DOM element in the table, so Tabulator would
                        // cancel the editor before the user finishes picking a date.
                        // Fix: suppress mousedown events that originate outside the table
                        // container (= the picker), but let in-table clicks through so normal
                        // cell navigation still works (blur then commits the current value).
                        const suppressPickerCancel = (e: MouseEvent) => {
                            if (!containerRef.current?.contains(e.target as Node)) {
                                e.stopImmediatePropagation();
                            }
                        };

                        const cleanup = () => {
                            document.removeEventListener("mousedown", suppressPickerCancel, { capture: true });
                        };

                        const doSuccess = () => {
                            if (committed) return;
                            committed = true;
                            cleanup();
                            const val = inp.value;
                            if (!val) { cancel(); return; }
                            const [y, m, d] = val.split("-").map(Number);
                            const newTs = new Date(y, m - 1, d).getTime();
                            if (newTs === originalTs) { cancel(); return; }
                            success(newTs);
                        };

                        // Register BEFORE returning to Tabulator so our capture handler
                        // is queued ahead of Tabulator's own outside-click handler.
                        // stopImmediatePropagation only works on handlers not yet called,
                        // so we must be first in the capture chain.
                        document.addEventListener("mousedown", suppressPickerCancel, { capture: true });

                        onRendered(() => { inp.focus(); });

                        // 'change' fires immediately when a date is selected from the picker
                        inp.addEventListener("change", doSuccess);

                        // 'blur' fires when clicking another cell or tabbing away.
                        // BUT: in some browsers the input loses focus when the native calendar
                        // popup opens — a pointerdown on the input itself triggers this.
                        // Guard: if blur fires within 300 ms of a pointerdown on the input,
                        // the picker is likely just opening → skip the commit.
                        let lastInputPointerdown = 0;
                        inp.addEventListener("pointerdown", () => { lastInputPointerdown = Date.now(); });
                        inp.addEventListener("blur", () => {
                            if (Date.now() - lastInputPointerdown < 300) return;
                            setTimeout(doSuccess, 100);
                        });

                        inp.addEventListener("keydown", (e: KeyboardEvent) => {
                            if (e.key === "Enter") { e.preventDefault(); doSuccess(); }
                            else if (e.key === "Escape") {
                                if (!committed) { committed = true; cleanup(); cancel(); }
                            }
                        });
                        return inp;
                    }) as any;
                }
            }

            // Bottom/top calc for summary row
            let bottomCalc: ColumnDefinition["bottomCalc"];
            let topCalc: ColumnDefinition["topCalc"];
            let bottomCalcFormatter: ColumnDefinition["bottomCalcFormatter"];
            let topCalcFormatter: ColumnDefinition["topCalcFormatter"];
            let bottomCalcFormatterParams: ColumnDefinition["bottomCalcFormatterParams"];
            let topCalcFormatterParams: ColumnDefinition["topCalcFormatterParams"];
            const isNumericAttr = isAttr && col.attribute != null &&
                ["Integer","Long","Decimal","AutoNumber"].includes(col.attribute.type);

            if (col.aggregateFunction !== "none" && summaryPosition !== "none") {
                const calcMap: Record<string, string> = {
                    sum: "sum", average: "avg", max: "max", min: "min"
                };
                // Built-in "count" skips null values → off by one. Use data.length instead.
                const countFn = (_vals: unknown[], data: unknown[]) => data.length;
                const calcFn = col.aggregateFunction === "count"
                    ? countFn
                    : isNumericAttr ? calcMap[col.aggregateFunction] : undefined;

                if (calcFn) {
                    const hasDecimal = isNumericAttr && col.decimalPlaces >= 0;
                    const calcFmtParams = hasDecimal
                        ? { precision: col.decimalPlaces, symbol: col.currencySymbol || "" }
                        : undefined;
                    if (summaryPosition === "bottom") {
                        bottomCalc = calcFn as any;
                        if (hasDecimal) {
                            bottomCalcFormatter = "money" as any;
                            bottomCalcFormatterParams = calcFmtParams;
                        }
                    } else {
                        topCalc = calcFn as any;
                        if (hasDecimal) {
                            topCalcFormatter = "money" as any;
                            topCalcFormatterParams = calcFmtParams;
                        }
                    }
                }
            }

            cols.push({
                title: col.header,
                field: col.columnKey,
                width: col.width > 0 ? col.width : undefined,
                minWidth: col.minWidth > 0 ? col.minWidth : undefined,
                resizable: col.resizable,
                frozen: col.freeze === "left" ? true : undefined,
                hozAlign: align,
                headerHozAlign: align,
                headerSort: col.sortable && col.showContentAs !== "customContent",
                formatter,
                formatterParams,
                cssClass: col.showContentAs === "customContent" ? "tab-custom-col" : undefined,
                headerFilter,
                headerFilterParams,
                headerFilterFunc,
                headerFilterPlaceholder: enableFilters && col.headerFilter ? "Filter..." : undefined,
                editor,
                editorParams,
                bottomCalc,
                topCalc,
                bottomCalcFormatter,
                topCalcFormatter,
                bottomCalcFormatterParams,
                topCalcFormatterParams,
                tooltip: col.tooltip ? true : undefined,
                responsive: enableResponsiveLayout ? 1 : undefined,
            } as ColumnDefinition);
        }

        return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        columns, hiddenColumns, enableFilters, selectionType, enableSelectionColumn,
        enableRowReorder, enableMasterDetail, summaryPosition, enableResponsiveLayout,
        detailHeight
    ]);

    // Config signature for when to recreate table vs just update data
    const configSignature = useMemo(() => JSON.stringify({
        enablePagination, pageSize, paginationPosition, paginationSizeSelector,
        layout, enableRowReorder, selectionType, enableResponsiveLayout,
        enableMasterDetail: enableMasterDetail && !!detailContent,
        rowStriping, rowHeight,
    }), [
        enablePagination, pageSize, paginationPosition, paginationSizeSelector,
        layout, enableRowReorder, selectionType, enableResponsiveLayout,
        enableMasterDetail, detailContent, rowStriping, rowHeight
    ]);

    // ── Tabulator initialization ───────────────────────────────────────────────
    useEffect(() => {
        if (!tableContainerRef.current) return;

        tableBuiltRef.current = false;
        if (tabulatorRef.current) {
            tabulatorRef.current.destroy();
            tabulatorRef.current = null;
        }
        portalContainerMapRef.current.clear();
        expandedRowIdsRef.current.clear();

        const table = new Tabulator(tableContainerRef.current, {
            data: [],
            index: "_id",
            columns: tabulatorCols,
            height: gridHeight,
            rowHeight: rowHeight > 0 ? rowHeight : undefined,
            layout: layout as any,
            layoutColumnsOnNewData: true,
            movableColumns: enableColumnReorder,
            movableRows: enableRowReorder,
            selectableRows: selectionType === "none" ? 0 : selectionType === "single" ? 1 : (true as any),
            selectableRowsRangeMode: selectionType === "multi" ? "drag" : "click",
            pagination: enablePagination,
            paginationMode: "local",
            paginationSize: pageSize,
            paginationSizeSelector: paginationSizeSelector ? [10, 25, 50, 100, true] : false,
            paginationCounter: "rows" as any,
            paginationButtonCount: 5,
            paginationPosition,
            headerSort: true,
            placeholder: emptyPlaceholder,
            printAsHtml: true,
            printStyled: true,
            clipboard: enableClipboardCopy ? "copy" : false,
            clipboardCopyConfig: { rowHeaders: false, columnHeaders: true } as any,
            responsiveLayout: enableResponsiveLayout ? "collapse" : false,
            rowFormatter: (enableMasterDetail && detailContent)
                ? (row: RowComponent) => {
                    const rowId = (row.getData() as any)._id as string;
                    const existing = row.getElement().querySelector(".tab-detail-panel");
                    if (existing) return;
                    const panel = document.createElement("div");
                    panel.className = "tab-detail-panel";
                    panel.style.display = "none";
                    panel.style.height = "0";
                    panel.dataset.tabPortal = `detail|${rowId}`;
                    row.getElement().appendChild(panel);
                }
                : undefined,
        } as any);

        // ── Events ──────────────────────────────────────────────────────────
        table.on("tableBuilt", () => {
            tableBuiltRef.current = true;
            table.setData(rowsRef.current.map(item => extractRowData(item, columnsRef.current)));
        });

        table.on("dataProcessed", () => {
            setTimeout(() => syncPortalsRef.current(), 10);
        });

        table.on("rowClick", (_e: UIEvent, row: RowComponent) => {
            const rowId = (row.getData() as any)._id as string;
            const item = rowMapRef.current.get(rowId);
            if (!item) return;
            if (selectionType === "single") {
                // Tabulator selects the row BEFORE firing rowClick, so row.isSelected()
                // is always true here. Track selection state ourselves via a ref.
                const wasSelected = selectedRowIdRef.current === rowId;
                if (wasSelected) {
                    row.deselect();
                    selectedRowIdRef.current = null;
                    (itemSelectionRef.current as SelectionSingleValue | undefined)?.setSelection(undefined);
                    const act = onRowDeselectRef.current?.get(item);
                    if (act?.canExecute) act.execute();
                } else {
                    row.select();
                    selectedRowIdRef.current = rowId;
                    (itemSelectionRef.current as SelectionSingleValue | undefined)?.setSelection(item);
                    const act = onRowSelectRef.current?.get(item);
                    if (act?.canExecute) act.execute();
                }
            }
            const clickAct = onRowClickRef.current?.get(item);
            if (clickAct?.canExecute) clickAct.execute();
        });

        table.on("rowDblClick", (_e: UIEvent, row: RowComponent) => {
            const item = rowMapRef.current.get((row.getData() as any)._id);
            if (!item) return;
            const act = onRowDblClickRef.current?.get(item);
            if (act?.canExecute) act.execute();
        });

        table.on("rowSelected", (row: RowComponent) => {
            if (selectionType === "single") return; // handled in rowClick
            const item = rowMapRef.current.get((row.getData() as any)._id);
            if (!item) return;
            if (selectionType === "multi" && itemSelectionRef.current?.type === "Multi") {
                const allSelected = (tabulatorRef.current?.getSelectedRows() ?? [])
                    .map(r => rowMapRef.current.get((r.getData() as any)._id))
                    .filter(Boolean) as ObjectItem[];
                (itemSelectionRef.current as SelectionMultiValue).setSelection(allSelected);
            }
            const act = onRowSelectRef.current?.get(item);
            if (act?.canExecute) act.execute();
        });

        table.on("rowDeselected", (row: RowComponent) => {
            if (selectionType === "single") return;
            const item = rowMapRef.current.get((row.getData() as any)._id);
            if (!item) return;
            if (selectionType === "multi" && itemSelectionRef.current?.type === "Multi") {
                const allSelected = (tabulatorRef.current?.getSelectedRows() ?? [])
                    .map(r => rowMapRef.current.get((r.getData() as any)._id))
                    .filter(Boolean) as ObjectItem[];
                (itemSelectionRef.current as SelectionMultiValue).setSelection(allSelected);
            }
            const act = onRowDeselectRef.current?.get(item);
            if (act?.canExecute) act.execute();
        });

        table.on("rowMoved", (row: RowComponent) => {
            const rowId = (row.getData() as any)._id as string;
            const item = rowMapRef.current.get(rowId);
            if (!item) return;
            const allRows = table.getRows("active");
            const rowIdx = allRows.findIndex(r => (r.getData() as any)._id === rowId);
            const successorId = rowIdx < allRows.length - 1 ? (allRows[rowIdx + 1].getData() as any)._id : "";
            const targetAttr = reorderTargetRef.current;
            if (targetAttr?.status === "available" && !targetAttr.readOnly) {
                targetAttr.setValue(successorId);
            }
            const act = onRowReorderRef.current?.get(item);
            if (act?.canExecute) act.execute();
        });

        table.on("columnMoved", () => {
            scheduleSaveConfig();
        });

        table.on("dataSorted", () => {
            scheduleSaveConfig();
            setTimeout(() => syncPortalsRef.current(), 30);
        });

        table.on("dataFiltered", () => {
            scheduleSaveConfig();
            setTimeout(() => syncPortalsRef.current(), 30);
            updateFilterXpath();
        });

        table.on("groupVisibilityChanged", () => {
            setTimeout(() => syncPortalsRef.current(), 30);
        });

        table.on("pageLoaded", () => {
            setTimeout(() => syncPortalsRef.current(), 30);
        });

        // Re-sync portals after full renders (data load, sort, filter) and after
        // virtual-scroll position changes (scrollVertical). renderComplete does NOT
        // fire for scroll-triggered virtual renders in Tabulator v6.
        table.on("renderComplete", () => {
            setTimeout(() => syncPortalsRef.current(), 0);
        });
        table.on("scrollVertical", () => {
            setTimeout(() => syncPortalsRef.current(), 0);
        });

        table.on("cellEdited", (cell: CellComponent) => {
            const rowId = (cell.getData() as any)._id as string;
            const item = rowMapRef.current.get(rowId);
            if (!item) return;
            const colKey = cell.getColumn().getField();
            const col = columnsRef.current.find(c => c.columnKey === colKey);
            if (!col?.editable || !col.attribute) return;

            const rawVal = cell.getValue();
            const attrType = col.attribute.type;
            const editable = col.attribute.get(item);

            // Convert Tabulator's raw value to the Mendix attribute type.
            let newValue: any;
            try {
                if (attrType === "String" || attrType === "Enum" || attrType === "EnumSet") {
                    newValue = rawVal != null ? String(rawVal) : "";
                } else if (attrType === "Boolean") {
                    newValue = Boolean(rawVal);
                } else if (attrType === "DateTime") {
                    newValue = rawVal ? new Date(rawVal as number) : undefined;
                } else if (attrType === "Integer" || attrType === "Long" || attrType === "Decimal") {
                    newValue = rawVal != null ? new Big(rawVal as number) : undefined;
                }
            } catch { /* swallow */ }

            const capturedRowId  = rowId;
            const capturedColKey = colKey;
            const capturedAction = col.onCellEditAction;

            const tryExecute = (retriesLeft: number) => {
                const freshItem = rowsRef.current.find(r => String(r.id) === capturedRowId);
                const freshAction =
                    columnsRef.current.find(c => c.columnKey === capturedColKey)?.onCellEditAction
                    ?? capturedAction;
                if (freshAction && freshItem) {
                    const actionVal = freshAction.get(freshItem);
                    if (actionVal?.canExecute) {
                        try { actionVal.execute(); } catch { /* swallow */ }
                        return;
                    }
                }
                if (retriesLeft > 0) {
                    setTimeout(() => tryExecute(retriesLeft - 1), 100);
                }
            };

            // DateTime: editable.setValue() is not supported on datasource list attributes
            // (Mendix throws "not yet supported on attributes linked to a datasource").
            // Fix: mx.data.get → mxObj.set(attrName, msTimestamp) → fire nanoflow.
            // Once the object is in the local cache execute() reuses it without a second
            // retrieve_by_ids round-trip, so the nanoflow sees the new value.
            //
            // Attribute name resolution (in order):
            //  1. col.xpathName (explicit override in Studio Pro — always wins if set)
            //  2. Auto-detect: find the DateTime attribute in the fetched MxObject whose
            //     current server value matches editable.value (the pre-edit value).
            //     Uses mx.meta to filter to DateTime attrs; falls back to the sole DateTime
            //     attr when the value is null or matches multiple attrs.
            if (attrType === "DateTime") {
                const mxClient2 = (window as any).mx;
                if (!mxClient2?.data?.get) {
                    setTimeout(() => tryExecute(10), 0);
                    return;
                }
                // Capture pre-edit value now (before the async mx.data.get round-trip).
                const preEditMs = editable.value instanceof Date ? (editable.value as Date).getTime() : null;
                const xpathOverride = col.xpathName?.split("/").pop() ?? "";

                mxClient2.data.get({
                    guid: capturedRowId,
                    callback: (mxObj: any) => {
                        let attrName2 = xpathOverride;

                        if (!attrName2) {
                            // Auto-detect the attribute name.
                            const allAttrs: string[] = typeof mxObj.getAttributes === "function"
                                ? mxObj.getAttributes() : [];
                            const entityType: string = typeof mxObj.getEntity === "function"
                                ? mxObj.getEntity() : "";
                            const meta = entityType
                                ? (window as any).mx?.meta?.getMetaObject?.(entityType) : null;

                            // Filter to DateTime attributes using mx.meta when available.
                            const dtAttrs: string[] = meta
                                ? allAttrs.filter((n: string) => meta.getAttributeType?.(n) === "DateTime")
                                : allAttrs;

                            if (preEditMs !== null) {
                                // Match by current server value (most reliable).
                                attrName2 = dtAttrs.find((n: string) => mxObj.get(n) === preEditMs) ?? "";
                            }
                            if (!attrName2 && dtAttrs.length === 1) {
                                // Only one candidate — unambiguous even when value is null.
                                attrName2 = dtAttrs[0];
                            }
                        }

                        if (attrName2) {
                            try { mxObj.set(attrName2, rawVal as number); } catch { /* swallow */ }
                        }
                        setTimeout(() => tryExecute(10), 0);
                    },
                    error: () => setTimeout(() => tryExecute(10), 0)
                });
                return;
            }

            // Normal path for non-DateTime types: EditableValue is writable.
            if (!(editable as any).readOnly) {
                try { flushSync(() => { (editable as any).setValue(newValue); }); } catch { /* swallow */ }
                setTimeout(() => tryExecute(10), 0);
                return;
            }

            // Fallback: EditableValue is readOnly — write directly to the underlying
            // MxObject via mx.data.get (same pattern as SVARdatagrid readOnly fallback).
            const mxClient = (window as any).mx;
            const attrName = col.xpathName?.split("/").pop() ?? "";

            if (!mxClient?.data?.get || !attrName) {
                setTimeout(() => tryExecute(10), 0);
                return;
            }

            let mxVal: any;
            if (newValue === undefined)        mxVal = "";
            else if (newValue instanceof Big)  mxVal = newValue.toNumber();
            else if (newValue instanceof Date) mxVal = newValue;
            else                               mxVal = newValue;

            mxClient.data.get({
                guid: capturedRowId,
                callback: (mxObj: any) => {
                    if (mxObj && attrName) try { mxObj.set(attrName, mxVal); } catch { /* swallow */ }
                    setTimeout(() => tryExecute(10), 0);
                },
                error: () => { setTimeout(() => tryExecute(10), 0); }
            });
        });

        tabulatorRef.current = table;

        return () => {
            tableBuiltRef.current = false;
            table.destroy();
            tabulatorRef.current = null;
            portalContainerMapRef.current.clear();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configSignature, tabulatorCols, gridHeight, emptyPlaceholder, enableColumnReorder]);

    // ── Update data when rows change ──────────────────────────────────────────
    useEffect(() => {
        const table = tabulatorRef.current;
        if (!table || !tableBuiltRef.current) return;
        table.replaceData(tableData).catch(() => {});
    }, [tableData]);

    // ── Auto-select ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (autoSelectAppliedRef.current || autoSelectRow <= 0) return;
        if (rows.length < autoSelectRow) return;
        autoSelectAppliedRef.current = true;
        const item = rows[autoSelectRow - 1];
        setTimeout(() => {
            const table = tabulatorRef.current;
            if (!table) return;
            try {
                table.selectRow(item.id as string);
            } catch { /* ignore */ }
            itemSelectionRef.current?.type === "Single" &&
                (itemSelectionRef.current as SelectionSingleValue).setSelection(item);
            if (itemSelectionRef.current?.type === "Multi")
                (itemSelectionRef.current as SelectionMultiValue).setSelection([item]);
            const act = onRowSelectRef.current?.get(item);
            if (act?.canExecute) act.execute();
        }, 200);
    }, [rows, autoSelectRow]);

    // ── Group by ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const table = tabulatorRef.current;
        if (!table || !tableBuiltRef.current) return;
        const groupableColumns = columns.filter(c => c.groupBy && c.showContentAs === "attribute");
        const activeFields = groupableColumns
            .filter(c => activeGroupBySet.has(c.columnKey))
            .map(c => c.columnKey);
        try {
            table.setGroupBy(activeFields.length > 0 ? activeFields : ([] as any));
        } catch { /* ignore */ }
        setTimeout(() => syncPortalsRef.current(), 50);
    }, [activeGroupBySet, columns]);

    // ── Config persistence ────────────────────────────────────────────────────
    const saveConfigTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleSaveConfig = useCallback(() => {
        if (saveConfigTimerRef.current) clearTimeout(saveConfigTimerRef.current);
        saveConfigTimerRef.current = setTimeout(() => {
            if (configJustLoadedRef.current) { configJustLoadedRef.current = false; return; }
            const table = tabulatorRef.current;
            const attr = configAttrRef.current;
            if (!table || !attr || attr.status !== "available" || attr.readOnly) return;
            try {
                const sorters = (table.getSorters() as any[]).map((s: any) => ({ field: s.field, dir: s.dir }));
                const filters = table.getFilters(true).map((f: any) => ({
                    field: f.field,
                    type: typeof f.type === "string" ? f.type : "like",
                    value: f.value
                }));
                const colLayout = (table as any).getColumnLayout?.() ?? [];
                // columnMeta maps each column's Mendix attribute ID to its xpathName and type.
                // Stored alongside user state so server-side TAB actions can resolve
                // filter/sorter fields (Mendix IDs like "attr_cdf_8") to XPath attribute names.
                const columnMeta: Record<string, { xpathName: string; type: string }> = {};
                for (const col of columnsRef.current) {
                    if (col.showContentAs !== "attribute" || !col.attribute) continue;
                    const xname = col.xpathName?.trim();
                    if (!xname) continue;
                    columnMeta[col.columnKey] = { xpathName: xname, type: col.attribute.type };
                }
                const fullJson = JSON.stringify({ sorters, filters, colLayout, columnMeta });
                if (attr.value === fullJson) return;

                // Determine whether the user-visible state (sorters/filters/colLayout) changed,
                // or only columnMeta changed (first-time metadata write on page load).
                // Avoid firing onConfigChangeAction for silent metadata saves — this prevents
                // Mendix nanoflow loops that could be triggered by automatic initialization.
                let userStateChanged = true;
                try {
                    const prev = JSON.parse(attr.value ?? "{}");
                    const prevDynamic = JSON.stringify({
                        sorters: prev.sorters ?? [],
                        filters: prev.filters ?? [],
                        colLayout: prev.colLayout ?? []
                    });
                    userStateChanged = prevDynamic !== JSON.stringify({ sorters, filters, colLayout });
                } catch { /* parse error — treat as user change */ }

                attr.setValue(fullJson);
                if (userStateChanged) {
                    const act = onConfigChangeRef.current;
                    if (act?.canExecute) act.execute();
                }
            } catch { /* swallow */ }
        }, 800);
    }, []);

    // Load config
    const rawConfigValue: string | undefined = configAttribute?.status === "available"
        ? (configAttribute.value ?? "")
        : undefined;

    useEffect(() => {
        if (configAppliedRef.current || rawConfigValue === undefined) return;
        configAppliedRef.current = true;
        configJustLoadedRef.current = true;
        if (!rawConfigValue) return;
        const table = tabulatorRef.current;
        if (!table) return;
        try {
            const cfg = JSON.parse(rawConfigValue);
            if (Array.isArray(cfg.sorters) && cfg.sorters.length > 0) {
                (table as any).setSort(cfg.sorters);
            }
            if (Array.isArray(cfg.filters) && cfg.filters.length > 0) {
                (table as any).setFilter(cfg.filters);
            }
            if (Array.isArray(cfg.colLayout) && cfg.colLayout.length > 0) {
                (table as any).setColumnLayout?.(cfg.colLayout);
            }
        } catch { /* invalid json, ignore */ }
    }, [rawConfigValue]);

    // ── XPath filter output ───────────────────────────────────────────────────
    const updateFilterXpath = useCallback(() => {
        const attr = filterXpathRef.current;
        if (!attr || attr.readOnly) return;
        const table = tabulatorRef.current;
        if (!table) return;
        const activeFilters = table.getFilters(true);
        let xpath = "";
        if (activeFilters.length > 0) {
            const parts = activeFilters.flatMap((f: any) => {
                const col = columnsRef.current.find(c => c.columnKey === f.field);
                if (!col) return [];
                return [buildFilterXpath(col, String(f.value))];
            });
            xpath = parts.join("");
        }
        setTimeout(() => {
            const a = filterXpathRef.current;
            if (!a || a.readOnly) return;
            if (a.value === xpath) return;
            try { a.setValue(xpath); } catch { /* swallow */ }
        }, 0);
    }, []);

    // ── Column visibility ─────────────────────────────────────────────────────
    const handleToggleColumnVisibility = useCallback((key: string) => {
        setHiddenColumns(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);

    // ── Group by toggle ───────────────────────────────────────────────────────
    const handleToggleGroupBy = useCallback((key: string) => {
        setActiveGroupBySet(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);

    // ── Export handlers ───────────────────────────────────────────────────────
    const handleCsvExport = useCallback(() => {
        tabulatorRef.current?.download("csv", `${exportFilename}.csv`);
    }, [exportFilename]);

    const handleExcelExport = useCallback(() => {
        (window as any).XLSX = XLSX;
        tabulatorRef.current?.download("xlsx", `${exportFilename}.xlsx`, { sheetName: "Data" } as any);
    }, [exportFilename]);

    const handleJsonExport = useCallback(() => {
        tabulatorRef.current?.download("json", `${exportFilename}.json`);
    }, [exportFilename]);

    const handlePdfExport = useCallback(() => {
        tabulatorRef.current?.print(undefined, true);
    }, []);

    const handleClipboardCopy = useCallback(() => {
        (tabulatorRef.current as any)?.copyToClipboard("all");
    }, []);

    // ── Filter bar callbacks ──────────────────────────────────────────────────
    const handleFilterBarApply = useCallback((field: string, type: string, value: unknown) => {
        const table = tabulatorRef.current;
        if (!table) return;
        table.setFilter(field, type as any, value);
        setTimeout(() => updateFilterXpath(), 0);
    }, [updateFilterXpath]);

    const handleFilterBarClear = useCallback(() => {
        // false = keep header filters, only remove programmatic setFilter
        tabulatorRef.current?.clearFilter(false);
        setTimeout(() => updateFilterXpath(), 0);
    }, [updateFilterXpath]);

    // ── Portals for custom content ─────────────────────────────────────────────
    const portals = useMemo((): ReactPortal[] => {
        const result: ReactPortal[] = [];
        for (const [key, el] of portalContainerMapRef.current) {
            if (!document.contains(el)) continue;
            if (key.startsWith("detail|")) {
                const rowId = key.slice(7);
                const item = rowMapRef.current.get(rowId);
                if (!item || !detailContent) continue;
                result.push(createPortal(detailContent.get(item) as ReactNode, el, key));
            } else {
                const pipeIdx = key.indexOf("|");
                const rowId = key.slice(0, pipeIdx);
                const colKey = key.slice(pipeIdx + 1);
                const item = rowMapRef.current.get(rowId);
                const col = columns.find(c => c.columnKey === colKey);
                if (!item || !col?.content) continue;
                result.push(createPortal(col.content.get(item) as ReactNode, el, key));
            }
        }
        return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [portalTick, columns, detailContent]);

    // ── Toolbar visibility ────────────────────────────────────────────────────
    const hasToolbar = enableCsvExport || enableExcelExport || enableJsonExport ||
        enablePdfExport || enableClipboardCopy || enableFilters ||
        enableGroupBy || enableColumnChooser || !!toolbarWidgets;

    return (
        <div
            className={`widget-tabulator-datagrid${rowStriping ? " widget-tabulator-datagrid--striped" : ""} ${className ?? ""}`}
            style={style}
        >
            {isLoading && (
                <div className="tab-loading-overlay" aria-label="Loading">
                    <span className="tab-loading-overlay__spinner" />
                </div>
            )}

            {enableGroupBy && groupByBarVisible && (
                <GroupByBar
                    columns={columns}
                    activeGroupBySet={activeGroupBySet}
                    onToggle={handleToggleGroupBy}
                />
            )}

            {hasToolbar && (
                <div className="tab-toolbar">
                    {toolbarWidgets && <div className="tab-toolbar__custom">{toolbarWidgets}</div>}
                    {enableFilters && (
                        <button
                            type="button"
                            className="tab-toolbar__btn"
                            onClick={() => tabulatorRef.current?.clearFilter(true)}
                            title="Clear all filters"
                        >
                            ✕ Filters
                        </button>
                    )}
                    {enableGroupBy && (
                        <button
                            type="button"
                            className={`tab-toolbar__btn${groupByBarVisible ? " tab-toolbar__btn--active" : ""}`}
                            onClick={() => setGroupByBarVisible(v => !v)}
                            title="Group by"
                        >
                            ⊞ Group by{activeGroupBySet.size > 0 ? ` (${activeGroupBySet.size})` : ""}
                        </button>
                    )}
                    {enableColumnChooser && (
                        <div style={{ position: "relative" }}>
                            <button
                                type="button"
                                className={`tab-toolbar__btn${columnChooserVisible ? " tab-toolbar__btn--active" : ""}`}
                                onClick={() => setColumnChooserVisible(v => !v)}
                                title="Show / hide columns"
                            >
                                ☰ Columns
                            </button>
                            {columnChooserVisible && (
                                <ColumnChooserPanel
                                    columns={columns}
                                    hiddenColumns={hiddenColumns}
                                    onToggle={handleToggleColumnVisibility}
                                    onClose={() => setColumnChooserVisible(false)}
                                />
                            )}
                        </div>
                    )}
                    {enableCsvExport && (
                        <button type="button" className="tab-toolbar__btn" onClick={handleCsvExport} title="Export CSV">
                            ⬇ CSV
                        </button>
                    )}
                    {enableExcelExport && (
                        <button type="button" className="tab-toolbar__btn" onClick={handleExcelExport} title="Export Excel">
                            ⬇ Excel
                        </button>
                    )}
                    {enableJsonExport && (
                        <button type="button" className="tab-toolbar__btn" onClick={handleJsonExport} title="Export JSON">
                            ⬇ JSON
                        </button>
                    )}
                    {enablePdfExport && (
                        <button type="button" className="tab-toolbar__btn" onClick={handlePdfExport} title="Print / PDF">
                            🖨 Print
                        </button>
                    )}
                    {enableClipboardCopy && (
                        <button type="button" className="tab-toolbar__btn" onClick={handleClipboardCopy} title="Copy to clipboard">
                            📋 Copy
                        </button>
                    )}
                </div>
            )}

            {enableFilterBar && (
                <FilterBar
                    columns={columns}
                    onApply={handleFilterBarApply}
                    onClear={handleFilterBarClear}
                />
            )}

            <div ref={tableContainerRef} className="tab-table-container" />

            {portals}
        </div>
    );
});
