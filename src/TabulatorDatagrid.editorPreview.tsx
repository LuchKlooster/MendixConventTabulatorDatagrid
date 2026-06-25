import { ReactElement } from "react";
import { TabulatorDatagridPreviewProps } from "../typings/TabulatorDatagridProps";

export function preview(props: TabulatorDatagridPreviewProps): ReactElement {
    const columns = props.columns ?? [];

    return (
        <div style={{ border: "1px solid #d7d7d7", overflow: "hidden", borderRadius: 3, fontSize: 13 }}>
            {/* Toolbar placeholder */}
            {(props.enableCsvExport || props.enableExcelExport || props.enableFilters) && (
                <div style={{ display: "flex", gap: 6, padding: "4px 8px", backgroundColor: "#f5f5f5", borderBottom: "1px solid #d7d7d7" }}>
                    {props.enableFilters && (
                        <span style={{ padding: "2px 8px", border: "1px solid #bbb", borderRadius: 3, fontSize: 12, color: "#555" }}>⚡ Filters</span>
                    )}
                    {props.enableCsvExport && (
                        <span style={{ padding: "2px 8px", border: "1px solid #264ae5", borderRadius: 3, fontSize: 12, color: "#264ae5" }}>⬇ CSV</span>
                    )}
                    {props.enableExcelExport && (
                        <span style={{ padding: "2px 8px", border: "1px solid #264ae5", borderRadius: 3, fontSize: 12, color: "#264ae5" }}>⬇ Excel</span>
                    )}
                    {props.enableJsonExport && (
                        <span style={{ padding: "2px 8px", border: "1px solid #264ae5", borderRadius: 3, fontSize: 12, color: "#264ae5" }}>⬇ JSON</span>
                    )}
                    {props.enableColumnChooser && (
                        <span style={{ padding: "2px 8px", border: "1px solid #bbb", borderRadius: 3, fontSize: 12, color: "#555" }}>☰ Columns</span>
                    )}
                    {props.enableGroupBy && (
                        <span style={{ padding: "2px 8px", border: "1px solid #bbb", borderRadius: 3, fontSize: 12, color: "#555" }}>⊞ Group by</span>
                    )}
                </div>
            )}

            {/* Header row */}
            <div style={{ display: "flex", backgroundColor: "#264ae5" }}>
                {props.enableMasterDetail && (
                    <div style={{ flex: "0 0 35px", padding: "6px 8px", color: "#fff", fontSize: 11 }}>▶</div>
                )}
                {props.enableRowReorder && (
                    <div style={{ flex: "0 0 30px", padding: "6px 4px", color: "#fff", fontSize: 11 }}>⋮</div>
                )}
                {columns.length > 0 ? (
                    columns.map((col, idx) => (
                        <div
                            key={idx}
                            style={{
                                flex: `0 0 ${col.width ?? 150}px`,
                                padding: "6px 8px",
                                fontWeight: 600,
                                color: "#fff",
                                borderRight: "1px solid rgba(255,255,255,0.2)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {col.header || "(no header)"}
                            {col.sortable !== false && " ↕"}
                        </div>
                    ))
                ) : (
                    <div style={{ padding: "6px 8px", color: "#fff" }}>No columns configured</div>
                )}
            </div>

            {/* Placeholder rows */}
            {[1, 2, 3].map(rowIdx => (
                <div
                    key={rowIdx}
                    style={{
                        display: "flex",
                        backgroundColor: rowIdx % 2 === 0 && props.rowStriping ? "#f8f8f8" : "#ffffff",
                        borderTop: "1px solid #e8e8e8"
                    }}
                >
                    {props.enableMasterDetail && (
                        <div style={{ flex: "0 0 35px", padding: "5px 8px", color: "#bbb", fontSize: 11 }}>▶</div>
                    )}
                    {props.enableRowReorder && (
                        <div style={{ flex: "0 0 30px", padding: "5px 4px", color: "#bbb", fontSize: 11 }}>⋮</div>
                    )}
                    {columns.map((col, idx) => (
                        <div
                            key={idx}
                            style={{
                                flex: `0 0 ${col.width ?? 150}px`,
                                padding: "5px 8px",
                                borderRight: "1px solid #e8e8e8",
                                color: "#999",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {col.attribute ?? "—"}
                        </div>
                    ))}
                </div>
            ))}

            {/* Pagination placeholder */}
            {props.enablePagination && (
                <div style={{ display: "flex", gap: 4, padding: "4px 8px", backgroundColor: "#f5f5f5", borderTop: "1px solid #d7d7d7", fontSize: 12, color: "#555" }}>
                    <span style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 3 }}>◄◄</span>
                    <span style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 3 }}>◄</span>
                    <span style={{ padding: "2px 8px" }}>1 – {props.pageSize ?? 20} / …</span>
                    <span style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 3 }}>►</span>
                    <span style={{ padding: "2px 6px", border: "1px solid #ccc", borderRadius: 3 }}>►►</span>
                </div>
            )}
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/TabulatorDatagrid.css");
}
