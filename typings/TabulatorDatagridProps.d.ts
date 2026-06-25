/**
 * This file was generated from TabulatorDatagrid.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { ComponentType, CSSProperties, ReactNode } from "react";
import { ActionValue, DynamicValue, EditableValue, ListValue, ListActionValue, ListAttributeValue, ListExpressionValue, ListWidgetValue, SelectionSingleValue, SelectionMultiValue } from "mendix";
import { Big } from "big.js";

export type ShowContentAsEnum = "attribute" | "dynamicText" | "customContent";

export type FreezeEnum = "none" | "left";

export type HozAlignEnum = "auto" | "left" | "center" | "right";

export type FormatterEnum = "value" | "progressBar" | "star" | "tickCross" | "money" | "html" | "color" | "link" | "toggle" | "textarea" | "image" | "datetimediff" | "traffic" | "buttonTick" | "buttonCross";

export type AggregateFunctionEnum = "none" | "sum" | "count" | "average" | "max" | "min";

export interface ColumnsType {
    showContentAs: ShowContentAsEnum;
    attribute?: ListAttributeValue<string | Big | boolean | Date>;
    dynamicText?: ListExpressionValue<string>;
    content?: ListWidgetValue;
    width: number;
    minWidth: number;
    header?: DynamicValue<string>;
    sortable: boolean;
    headerFilter: boolean;
    editable: boolean;
    onCellEditAction?: ListActionValue;
    resizable: boolean;
    freeze: FreezeEnum;
    hozAlign: HozAlignEnum;
    cellClass?: ListExpressionValue<string>;
    formatter: FormatterEnum;
    decimalPlaces: number;
    currencySymbol: string;
    dateFormat: string;
    aggregateFunction: AggregateFunctionEnum;
    groupBy: boolean;
    xpathName: string;
    tooltip: boolean;
}

export type SummaryPositionEnum = "none" | "top" | "bottom";

export type LayoutEnum = "fitData" | "fitColumns" | "fitDataFill" | "fitDataStretch";

export type PaginationPositionEnum = "top" | "bottom";

export type SpreadsheetSourceEnum = "attribute" | "datasource";

export interface SpreadsheetSheetsType {
    sheetTitle: string;
    sheetKey: string;
    sheetRows: number;
    sheetColumns: number;
}

export interface ColumnsPreviewType {
    showContentAs: ShowContentAsEnum;
    attribute: string;
    dynamicText: string;
    content: { widgetCount: number; renderer: ComponentType<{ children: ReactNode; caption?: string }> };
    width: number | null;
    minWidth: number | null;
    header: string;
    sortable: boolean;
    headerFilter: boolean;
    editable: boolean;
    onCellEditAction: {} | null;
    resizable: boolean;
    freeze: FreezeEnum;
    hozAlign: HozAlignEnum;
    cellClass: string;
    formatter: FormatterEnum;
    decimalPlaces: number | null;
    currencySymbol: string;
    dateFormat: string;
    aggregateFunction: AggregateFunctionEnum;
    groupBy: boolean;
    xpathName: string;
    tooltip: boolean;
}

export interface SpreadsheetSheetsPreviewType {
    sheetTitle: string;
    sheetKey: string;
    sheetRows: number | null;
    sheetColumns: number | null;
}

export interface TabulatorDatagridContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    enableSpreadsheet: boolean;
    datasource: ListValue;
    columns: ColumnsType[];
    itemSelection?: SelectionSingleValue | SelectionMultiValue;
    enableSelectionColumn: boolean;
    autoSelectRow: number;
    onRowSelectAction?: ListActionValue;
    onRowDeselectAction?: ListActionValue;
    enableCsvExport: boolean;
    enableExcelExport: boolean;
    enableJsonExport: boolean;
    enablePdfExport: boolean;
    enableClipboardCopy: boolean;
    exportFilename: string;
    toolbarWidgets?: ReactNode;
    onRowClickAction?: ListActionValue;
    onRowDblClickAction?: ListActionValue;
    emptyPlaceholder: string;
    enableRowReorder: boolean;
    onRowReorderAction?: ListActionValue;
    reorderTargetIdAttribute?: EditableValue<string>;
    enableMasterDetail: boolean;
    detailContent?: ListWidgetValue;
    detailHeight: number;
    configAttribute?: EditableValue<string>;
    onConfigChangeAction?: ActionValue;
    filterXpathAttribute?: EditableValue<string>;
    enableFilters: boolean;
    enableFilterBar: boolean;
    summaryPosition: SummaryPositionEnum;
    enableGroupBy: boolean;
    enableColumnChooser: boolean;
    enableColumnReorder: boolean;
    rowStriping: boolean;
    rowHeight: number;
    gridHeight: number;
    layout: LayoutEnum;
    enableResponsiveLayout: boolean;
    enablePagination: boolean;
    pageSize: number;
    paginationPosition: PaginationPositionEnum;
    paginationSizeSelector: boolean;
    spreadsheetSource: SpreadsheetSourceEnum;
    spreadsheetHeaderRow: boolean;
    spreadsheetRows: number;
    spreadsheetColumns: number;
    spreadsheetDataAttribute?: EditableValue<string>;
    onSpreadsheetChangeAction?: ActionValue;
    spreadsheetSheetTabs: boolean;
    spreadsheetSheets: SpreadsheetSheetsType[];
    spreadsheetClipboard: boolean;
}

export interface TabulatorDatagridPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    enableSpreadsheet: boolean;
    datasource: {} | { caption: string } | { type: string } | null;
    columns: ColumnsPreviewType[];
    itemSelection: "None" | "Single" | "Multi";
    enableSelectionColumn: boolean;
    autoSelectRow: number | null;
    onRowSelectAction: {} | null;
    onRowDeselectAction: {} | null;
    enableCsvExport: boolean;
    enableExcelExport: boolean;
    enableJsonExport: boolean;
    enablePdfExport: boolean;
    enableClipboardCopy: boolean;
    exportFilename: string;
    toolbarWidgets: { widgetCount: number; renderer: ComponentType<{ children: ReactNode; caption?: string }> };
    onRowClickAction: {} | null;
    onRowDblClickAction: {} | null;
    emptyPlaceholder: string;
    enableRowReorder: boolean;
    onRowReorderAction: {} | null;
    reorderTargetIdAttribute: string;
    enableMasterDetail: boolean;
    detailContent: { widgetCount: number; renderer: ComponentType<{ children: ReactNode; caption?: string }> };
    detailHeight: number | null;
    configAttribute: string;
    onConfigChangeAction: {} | null;
    filterXpathAttribute: string;
    enableFilters: boolean;
    enableFilterBar: boolean;
    summaryPosition: SummaryPositionEnum;
    enableGroupBy: boolean;
    enableColumnChooser: boolean;
    enableColumnReorder: boolean;
    rowStriping: boolean;
    rowHeight: number | null;
    gridHeight: number | null;
    layout: LayoutEnum;
    enableResponsiveLayout: boolean;
    enablePagination: boolean;
    pageSize: number | null;
    paginationPosition: PaginationPositionEnum;
    paginationSizeSelector: boolean;
    spreadsheetSource: SpreadsheetSourceEnum;
    spreadsheetHeaderRow: boolean;
    spreadsheetRows: number | null;
    spreadsheetColumns: number | null;
    spreadsheetDataAttribute: string;
    onSpreadsheetChangeAction: {} | null;
    spreadsheetSheetTabs: boolean;
    spreadsheetSheets: SpreadsheetSheetsPreviewType[];
    spreadsheetClipboard: boolean;
}
