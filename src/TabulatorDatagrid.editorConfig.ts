import { TabulatorDatagridPreviewProps } from "../typings/TabulatorDatagridProps";

export type Platform = "web" | "desktop";
export type Properties = PropertyGroup[];

type PropertyGroup = {
    caption: string;
    propertyGroups?: PropertyGroup[];
    properties?: Property[];
};

type Property = {
    key: string;
    caption: string;
    description?: string;
    objectHeaders?: string[];
    objects?: ObjectProperties[];
    properties?: Properties[];
};

type ObjectProperties = {
    properties: PropertyGroup[];
    captions?: string[];
};

export type Problem = {
    property?: string;
    severity?: "error" | "warning" | "deprecation";
    message: string;
    studioMessage?: string;
    url?: string;
    studioUrl?: string;
};

type BaseProps = {
    type: "Image" | "Container" | "RowLayout" | "Text" | "DropZone" | "Selectable" | "Datasource";
    grow?: number;
};

type TextProps = BaseProps & {
    type: "Text";
    content: string;
    fontSize?: number;
    fontColor?: string;
    bold?: boolean;
    italic?: boolean;
};

type ContainerProps = BaseProps & {
    type: "Container" | "RowLayout";
    children: PreviewProps[];
    borders?: boolean;
    borderRadius?: number;
    backgroundColor?: string;
    borderWidth?: number;
    padding?: number;
};

type DropZoneProps = BaseProps & {
    type: "DropZone";
    property: object;
    placeholder?: string;
};

type DatasourceProps = BaseProps & {
    type: "Datasource";
    property: object | null;
    child?: PreviewProps;
};

export type PreviewProps = TextProps | ContainerProps | DropZoneProps | DatasourceProps;

export function getProperties(
    values: TabulatorDatagridPreviewProps,
    defaultProperties: Properties
): Properties {
    updateColumnsProperties(defaultProperties, values);
    return defaultProperties;
}

function updateColumnsProperties(groups: Properties, values: TabulatorDatagridPreviewProps): void {
    for (const group of groups) {
        if (group.propertyGroups) {
            updateColumnsProperties(group.propertyGroups, values);
        }
        if (!group.properties) continue;
        for (const prop of group.properties) {
            if (prop.key !== "columns") continue;

            prop.objectHeaders = ["Header", "Content", "Width", "Formatter"];

            if (!prop.objects) continue;
            prop.objects.forEach((obj, idx) => {
                const col = values.columns[idx];
                if (!col) return;

                const isAttr    = col.showContentAs === "attribute"    || !col.showContentAs;
                const isDynamic = col.showContentAs === "dynamicText";
                const isCustom  = col.showContentAs === "customContent";

                hidePropertiesIn(obj.properties, isAttr    ? [] : ["attribute"]);
                hidePropertiesIn(obj.properties, isDynamic ? [] : ["dynamicText"]);
                hidePropertiesIn(obj.properties, isCustom  ? [] : ["content"]);

                if (!isAttr) {
                    hidePropertiesIn(obj.properties, [
                        "sortable", "headerFilter", "groupBy",
                        "formatter", "decimalPlaces", "currencySymbol", "dateFormat",
                        "xpathName", "aggregateFunction"
                    ]);
                }

                if (isAttr && col.attribute) {
                    const attrName = col.attribute.split("/").pop() ?? "";
                    if (attrName) {
                        updatePropertyDescription(obj.properties, "header",
                            `Attribute name: "${attrName}"`
                        );
                        updatePropertyDescription(obj.properties, "xpathName",
                            `Attribute name: "${attrName}" — enter this value for XPath filtering.`
                        );
                    }
                }

                const contentLabel = isAttr
                    ? (col.attribute || "[No attribute]")
                    : isDynamic
                        ? (col.dynamicText || "Dynamic text")
                        : "Custom content";
                const widthLabel = col.width != null ? `${col.width}px` : "150px";
                const formatterDisplayMap: Record<string, string> = {
                    value: "Value", progressBar: "Progress bar", star: "Star",
                    tickCross: "Tick/Cross", money: "Money", html: "HTML",
                    color: "Color", link: "Link", toggle: "Toggle",
                    textarea: "Textarea", image: "Image", datetimediff: "DateTimeDiff",
                    traffic: "Traffic", buttonTick: "Btn ✓", buttonCross: "Btn ✗"
                };
                const formatterLabel = isAttr && col.formatter
                    ? (formatterDisplayMap[col.formatter] ?? col.formatter)
                    : "—";

                obj.captions = [
                    col.header || "[No header]",
                    contentLabel,
                    widthLabel,
                    formatterLabel
                ];
            });
        }
    }
}

function hidePropertiesIn(groups: Properties | undefined, keys: string[]): void {
    if (!groups || keys.length === 0) return;
    for (const group of groups) {
        if (group.properties) {
            group.properties = group.properties.filter(p => !keys.includes(p.key));
        }
        if (group.propertyGroups) {
            hidePropertiesIn(group.propertyGroups, keys);
        }
    }
}

function updatePropertyDescription(groups: Properties | undefined, key: string, description: string): void {
    if (!groups) return;
    for (const group of groups) {
        if (group.properties) {
            for (const prop of group.properties) {
                if (prop.key === key) prop.description = description;
            }
        }
        if (group.propertyGroups) {
            updatePropertyDescription(group.propertyGroups, key, description);
        }
    }
}

export function check(values: TabulatorDatagridPreviewProps): Problem[] {
    const errors: Problem[] = [];

    if (!values.enableSpreadsheet || values.spreadsheetSource === "datasource") {
        const mode = values.enableSpreadsheet ? "spreadsheet Data source mode" : "grid mode";
        if (!values.datasource) {
            errors.push({
                property: "datasource",
                severity: "error",
                message: `Data source is required in ${mode}.`
            });
        }
        if (values.columns.length === 0) {
            errors.push({
                property: "columns",
                severity: "error",
                message: `At least one column must be configured in ${mode}.`
            });
        }
    }

    values.columns.forEach((col, idx) => {
        if (!col.header || col.header.trim() === "") {
            errors.push({
                property: `columns/${idx}/header`,
                severity: "warning",
                message: `Column ${idx + 1} has no header text.`
            });
        }
        if (col.width != null && col.width < 10) {
            errors.push({
                property: `columns/${idx}/width`,
                severity: "warning",
                message: `Column ${idx + 1}: width should be at least 10 px.`
            });
        }
    });

    if (values.rowHeight != null && values.rowHeight < 20) {
        errors.push({
            property: "rowHeight",
            severity: "warning",
            message: "Row height should be at least 20 px."
        });
    }

    if (values.filterXpathAttribute) {
        values.columns.forEach((col, idx) => {
            if (col.showContentAs === "attribute" && col.attribute && !col.xpathName?.trim()) {
                // Auto-detection from attribute id covers simple (non-association) attributes.
                // Warn (not error) so users know to set it manually for association paths.
                errors.push({
                    property: `columns/${idx}/xpathName`,
                    severity: "warning",
                    message: `Column "${col.header || idx + 1}": XPath attribute name is empty — auto-detection will be used. Set it explicitly if this column uses an association path.`
                });
            }
        });
    }

    return errors;
}

export function getPreview(values: TabulatorDatagridPreviewProps): PreviewProps {
    if (values.enableSpreadsheet) {
        const rows = values.spreadsheetRows ?? 50;
        const cols = values.spreadsheetColumns ?? 26;
        const sheets = values.spreadsheetSheets ?? [];
        const sheetLabel = sheets.length > 0
            ? sheets.map(s => s.sheetTitle || "Sheet").join("  |  ")
            : "";
        return {
            type: "Container",
            borders: true,
            borderWidth: 1,
            children: [
                {
                    type: "RowLayout",
                    children: [
                        { type: "Text", content: `Spreadsheet  ${rows} rows × ${cols} columns`, bold: true, fontColor: "#264ae5" },
                        ...(values.spreadsheetDataAttribute
                            ? [{ type: "Text" as const, content: "  💾 data attribute linked", fontColor: "#666666" }]
                            : [{ type: "Text" as const, content: "  (no data attribute)", fontColor: "#999999" }])
                    ]
                },
                ...(sheetLabel ? [{ type: "Text" as const, content: `Sheets: ${sheetLabel}`, fontColor: "#264ae5" }] : [])
            ]
        };
    }
    const headers: PreviewProps[] = values.columns.map(col => ({
        type: "Container" as const,
        children: [
            {
                type: "Text" as const,
                content: col.header || "(no header)",
                bold: true,
                fontColor: "#ffffff"
            }
        ],
        backgroundColor: "#264ae5",
        padding: 6,
        grow: 1,
        borders: false
    }));

    const customContentDropZones: PreviewProps[] = values.columns
        .filter(col => col.showContentAs === "customContent" && col.content)
        .map(col => ({
            type: "DropZone" as const,
            property: col.content,
            placeholder: `Custom content: ${col.header || "(no header)"}`
        } as PreviewProps));

    const headerRow: PreviewProps = {
        type: "RowLayout",
        children: headers.length > 0 ? headers : [{ type: "Text", content: "No columns configured" }],
        borders: true,
        borderWidth: 1,
        backgroundColor: "#264ae5"
    };

    const toolbarChildren: PreviewProps[] = [];
    if (values.toolbarWidgets) {
        toolbarChildren.push({
            type: "DropZone" as const,
            property: values.toolbarWidgets,
            placeholder: "Toolbar widgets"
        });
    }
    if (values.enableCsvExport) {
        toolbarChildren.push({
            type: "Container" as const,
            children: [{ type: "Text" as const, content: "⬇ CSV", fontColor: "#264ae5" }],
            borders: true, borderWidth: 1, borderRadius: 4, padding: 4
        });
    }
    if (values.enableExcelExport) {
        toolbarChildren.push({
            type: "Container" as const,
            children: [{ type: "Text" as const, content: "⬇ Excel", fontColor: "#264ae5" }],
            borders: true, borderWidth: 1, borderRadius: 4, padding: 4
        });
    }

    const children: PreviewProps[] = [];
    if (toolbarChildren.length > 0) {
        children.push({ type: "RowLayout", children: toolbarChildren, padding: 4 } as PreviewProps);
    }

    children.push({
        type: "Datasource",
        property: values.datasource ?? null,
        child: {
            type: "Container",
            borders: true,
            borderWidth: 1,
            children: [
                headerRow,
                ...customContentDropZones,
                ...(values.enableMasterDetail && values.detailContent
                    ? [{
                        type: "DropZone" as const,
                        property: values.detailContent,
                        placeholder: "Detail content"
                    } as PreviewProps]
                    : [])
            ]
        }
    });

    return { type: "Container", children, borders: false };
}

export function getCustomCaption(values: TabulatorDatagridPreviewProps): string {
    if (values.enableSpreadsheet) {
        const sheets = values.spreadsheetSheets?.length ?? 0;
        return sheets > 0
            ? `Tabulator Spreadsheet (${sheets} sheet${sheets !== 1 ? "s" : ""})`
            : `Tabulator Spreadsheet (${values.spreadsheetRows ?? 50}r × ${values.spreadsheetColumns ?? 26}c)`;
    }
    const count = values.columns.length;
    return `Tabulator Data Grid (${count} column${count !== 1 ? "s" : ""})`;
}
