import { ReactElement, useMemo, useRef } from "react";
import { TabulatorDatagridContainerProps } from "../typings/TabulatorDatagridProps";
import { TabulatorComponent, ColumnConfig } from "./components/TabulatorComponent";
import { TabulatorSpreadsheet, SheetConfig } from "./components/TabulatorSpreadsheet";
import "./ui/TabulatorDatagrid.css";

export function TabulatorDatagrid(props: TabulatorDatagridContainerProps): ReactElement {
    const {
        datasource: ds,
        columns,
        rowHeight,
        gridHeight,
        layout,
        enableResponsiveLayout,
        onRowClickAction,
        onRowDblClickAction,
        emptyPlaceholder,
        autoSelectRow,
        itemSelection,
        onRowSelectAction,
        onRowDeselectAction,
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
        enableSpreadsheet,
        spreadsheetSource,
        spreadsheetHeaderRow,
        spreadsheetRows,
        spreadsheetColumns,
        spreadsheetDataAttribute,
        onSpreadsheetChangeAction,
        spreadsheetSheetTabs,
        spreadsheetSheets,
        spreadsheetClipboard,
        class: className,
        style
    } = props;

    // Theme is chosen via the "Theme" design property (Styling tab in Studio Pro),
    // which delivers a wtd-theme-* class through the class prop. Without one,
    // fall back to the widget's default Mendix look.
    const themedClassName = className?.includes("wtd-theme-")
        ? className
        : `wtd-theme-mendix${className ? ` ${className}` : ""}`;

    const rawRows = ds?.items ?? [];
    const stableRowsRef = useRef(rawRows);
    if (rawRows.length !== stableRowsRef.current.length || rawRows.some((r, i) => r !== stableRowsRef.current[i])) {
        stableRowsRef.current = rawRows;
    }
    const rows = stableRowsRef.current;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const columnConfigs = useMemo((): ColumnConfig[] => columns.map((col, idx) => ({
        columnKey: col.attribute?.id ?? `__${col.showContentAs}_${idx}`,
        showContentAs: (col.showContentAs ?? "attribute") as "attribute" | "dynamicText" | "customContent",
        attribute: col.attribute ?? undefined,
        dynamicText: col.dynamicText ?? undefined,
        content: col.content ?? undefined,
        header: col.header?.value ?? "",
        width: col.width ?? 150,
        minWidth: col.minWidth ?? 50,
        sortable: col.sortable ?? true,
        resizable: col.resizable ?? true,
        freeze: (col.freeze ?? "none") as "none" | "left",
        hozAlign: (col.hozAlign ?? "auto") as "auto" | "left" | "center" | "right",
        formatter: (col.formatter ?? "value") as ColumnConfig["formatter"],
        decimalPlaces: col.decimalPlaces ?? -1,
        currencySymbol: col.currencySymbol ?? "",
        dateFormat: col.dateFormat ?? "",
        aggregateFunction: (col.aggregateFunction ?? "none") as ColumnConfig["aggregateFunction"],
        headerFilter: col.headerFilter ?? false,
        editable: col.editable ?? false,
        onCellEditAction: col.onCellEditAction ?? undefined,
        cellClass: col.cellClass ?? undefined,
        groupBy: col.groupBy ?? false,
        xpathName: col.xpathName ?? "",
        tooltip: col.tooltip ?? false,
    // Include action availability in dep so memo rebuilds when actions become defined.
    // This ensures onCellEditAction is never stale (e.g. undefined at initial load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [columns.map((c, i) => {
        const k = c.attribute?.id ?? `__${c.showContentAs}_${i}`;
        return c.onCellEditAction ? `${k}+` : k;
    }).join("|")]);

    // Datasource mode: fill the sheet from the datasource items and column config.
    // Custom-content columns cannot be rendered in a spreadsheet cell and are skipped.
    const spreadsheetExternalData = useMemo((): string[][] | null => {
        if (!enableSpreadsheet || spreadsheetSource !== "datasource") return null;
        const dataCols = columnConfigs.filter(c => c.showContentAs !== "customContent");
        const out: string[][] = [];
        if (spreadsheetHeaderRow ?? true) {
            out.push(dataCols.map(c => c.header));
        }
        for (const item of rows) {
            out.push(dataCols.map(c => {
                if (c.showContentAs === "dynamicText") {
                    return c.dynamicText?.get(item).value ?? "";
                }
                return c.attribute?.get(item).displayValue ?? "";
            }));
        }
        return out;
    }, [enableSpreadsheet, spreadsheetSource, spreadsheetHeaderRow, rows, columnConfigs]);

    if (enableSpreadsheet) {
        const sheetConfigs: SheetConfig[] = (spreadsheetSheets ?? []).map(s => ({
            title: s.sheetTitle ?? "Sheet",
            key: s.sheetKey || `sheet_${s.sheetTitle ?? ""}`,
            rows: s.sheetRows ?? 0,
            columns: s.sheetColumns ?? 0,
        }));
        return (
            <TabulatorSpreadsheet
                spreadsheetRows={spreadsheetRows ?? 50}
                spreadsheetColumns={spreadsheetColumns ?? 26}
                spreadsheetDataAttribute={spreadsheetDataAttribute}
                onSpreadsheetChangeAction={onSpreadsheetChangeAction}
                spreadsheetSheetTabs={spreadsheetSheetTabs ?? false}
                spreadsheetSheets={sheetConfigs}
                spreadsheetClipboard={spreadsheetClipboard ?? true}
                externalData={spreadsheetExternalData}
                gridHeight={gridHeight ?? 400}
                className={themedClassName}
                style={style}
            />
        );
    }

    return (
        <TabulatorComponent
            rows={rows}
            columns={columnConfigs}
            rowHeight={rowHeight ?? 35}
            gridHeight={gridHeight ?? 400}
            layout={(layout ?? "fitData") as "fitData" | "fitColumns" | "fitDataFill" | "fitDataStretch"}
            enableResponsiveLayout={enableResponsiveLayout ?? false}
            onRowClickAction={onRowClickAction}
            onRowDblClickAction={onRowDblClickAction}
            emptyPlaceholder={emptyPlaceholder ?? "No data"}
            className={themedClassName}
            style={style}
            autoSelectRow={autoSelectRow ?? 0}
            itemSelection={itemSelection}
            onRowSelectAction={onRowSelectAction}
            onRowDeselectAction={onRowDeselectAction}
            enableSelectionColumn={enableSelectionColumn ?? true}
            enableCsvExport={enableCsvExport ?? false}
            enableExcelExport={enableExcelExport ?? false}
            enableJsonExport={enableJsonExport ?? false}
            enablePdfExport={enablePdfExport ?? false}
            enableClipboardCopy={enableClipboardCopy ?? false}
            exportFilename={exportFilename ?? "export"}
            toolbarWidgets={toolbarWidgets}
            enableFilters={enableFilters ?? false}
            enableFilterBar={enableFilterBar ?? false}
            enableGroupBy={enableGroupBy ?? false}
            enableColumnChooser={enableColumnChooser ?? false}
            enableColumnReorder={enableColumnReorder ?? false}
            summaryPosition={(summaryPosition ?? "none") as "none" | "top" | "bottom"}
            configAttribute={configAttribute}
            onConfigChangeAction={onConfigChangeAction}
            filterXpathAttribute={filterXpathAttribute}
            enableMasterDetail={enableMasterDetail ?? false}
            detailContent={enableMasterDetail ? detailContent : undefined}
            detailHeight={detailHeight ?? 200}
            rowStriping={rowStriping ?? false}
            enablePagination={enablePagination ?? false}
            pageSize={pageSize ?? 20}
            paginationPosition={(paginationPosition ?? "bottom") as "top" | "bottom"}
            paginationSizeSelector={paginationSizeSelector ?? false}
            enableRowReorder={enableRowReorder ?? false}
            onRowReorderAction={onRowReorderAction}
            reorderTargetIdAttribute={reorderTargetIdAttribute}
            isLoading={ds?.status === "loading"}
        />
    );
}
