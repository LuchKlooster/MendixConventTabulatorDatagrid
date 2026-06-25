# TabulatorDatagrid

Mendix pluggable widget that wraps [Tabulator](https://tabulator.info/) and provides a feature-rich data grid for Mendix applications. Supports sorting, filtering, grouping, master/detail, inline editing, cell formatting, pagination, export and more. The widget can also run in **spreadsheet mode**: a freely editable Excel-like sheet with multiple sheets, range clipboard and JSON persistence.

**Author:** Luch Klooster — Convent Systems  
**Version:** 1.0.0  
**Platform:** Mendix Web (pluggable widget, offline-capable)  
**Category:** Data containers

---

## Features

| Category | Capabilities |
| --- | --- |
| **Display** | Attribute, dynamic text, or custom content per column |
| **Sorting** | Single and multi-column sorting; sort arrows optional |
| **Filtering** | Header filter per column (text, enum richselect, boolean richselect); filter bar with column + operator + value selector; XPath constraint output via attribute |
| **Editing** | Inline cell editing; `On cell edited` action per column; `XPath attribute name` required for reliable write-back |
| **Formatters** | Value, Progress bar, Star rating, Tick/Cross, Money, HTML, Color swatch, Link, Toggle, Textarea, Image, Date/time diff, Traffic light, Button tick, Button cross |
| **Cell styling** | Per-row CSS class expression per column; built-in classes: `tab-danger`, `tab-warning`, `tab-success`, `tab-info`, `tab-muted` |
| **Selection** | None / Single / Multi; optional checkbox column; auto-select row on startup; `On row selected` / `On row deselected` actions |
| **Row actions** | `On row click`, `On row double-click` per row in context |
| **Aggregates** | Count (`#`), Sum (`∑`), Average (`⌀`), Max, Min in summary row (top or bottom) per column |
| **Grouping** | Group-by panel; multiple columns create nested groups; toggle grouping per column |
| **Master / Detail** | Expand toggle per row reveals a configurable detail panel with any widgets |
| **Row reorder** | Drag-and-drop handle column; `On row reordered` action + `Reorder target row ID` attribute for sort-order update |
| **Column management** | Resize, column chooser (show/hide), column reorder by drag, freeze column left, responsive hide |
| **Pagination** | Client-side pagination; page size configurable; optional page-size selector |
| **Export** | CSV, Excel (`.xlsx`), JSON, PDF/Print, Clipboard copy |
| **Personalization** | Sort, filter and column order saved to a Mendix attribute as JSON |
| **Toolbar** | Custom widgets slot in the toolbar |
| **Spreadsheet mode** | Excel-like editable sheet with row numbers; single or multiple sheets with tabs; data from a JSON attribute or from the data source + columns; Ctrl+C / Ctrl+V range clipboard for cells, rows and columns |
| **Theming** | Theme per widget via the Studio Pro **Styling** tab: Mendix (default), Tabulator default, Simple, Midnight (dark), Modern, Site, Site dark |

---

## Installation

1. Copy `conventsystems.TabulatorDatagrid.mpk` to the `widgets/` folder of your Mendix project.
2. Synchronize the project in Mendix Studio Pro (**F4** / **App > Synchronize App Directory**).
3. The widget appears under **Toolbox > Data containers > Tabulator Data Grid**.
4. Drag the **Tabulator Data Grid** widget onto a page.

---

## Properties

### General

| Property | Type | Description |
| --- | --- | --- |
| **Enable spreadsheet mode** | Boolean | Switch the widget from data grid to spreadsheet. See [Spreadsheet](#spreadsheet). |
| **Data source** | ListValue | The list entity that supplies the rows. Required in grid mode and in spreadsheet Data source mode; unused in spreadsheet JSON attribute mode. |

---

### Columns

Each column is configured separately via **Edit columns**.

#### Column

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Show** | Enum | `Attribute` | `Attribute` – value from entity; `Dynamic text` – text expression per row; `Custom content` – widget(s) per row. |
| **Attribute** | ListAttributeValue | | Entity attribute (String, Integer, Long, Decimal, Boolean, DateTime, Enum, AutoNumber). |
| **Dynamic text** | TextTemplate | | Text expression per row (active when Show = Dynamic text). |
| **Custom content** | Widgets | | Widget(s) per row, e.g. buttons (active when Show = Custom content). |
| **Width (px)** | Integer | `150` | Column width in pixels; `0` = automatic. |
| **Min width (px)** | Integer | `50` | Minimum column width in pixels. |
| **Header** | TextTemplate | | Column header text. Leave empty = no header shown. |

#### Edit, Filter, Sort

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Sortable** | Boolean | `true` | Allow sorting by clicking the column header. |
| **Header filter** | Boolean | `false` | Show a filter input below the column header. Requires **Enable header filters**. Enum and Boolean columns get a richselect dropdown automatically. |
| **Editable** | Boolean | `false` | Allow inline cell editing. The Mendix attribute must be writable. |
| **On cell edited** | ListActionValue | | Action in the context of the row after a cell value is saved. |

#### Layout

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Resizable** | Boolean | `true` | Allow the user to drag the column border to resize. |
| **Freeze column** | Enum | `No` | Pin the column: `No`, `Left`. |
| **Alignment** | Enum | `Auto` | `Auto` = right for numbers/dates, center for boolean, left otherwise. `Left`, `Center`, `Right`. |

#### Formatting

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Cell CSS class** | Expression | | Expression returning a CSS class per row (e.g. `if $currentObject/Priority = 'High' then 'tab-danger' else ''`). |
| **Formatter** | Enum | `Value` | See [Formatters](#formatters) below. |
| **Decimal places** | Integer | `-1` | Fixed decimal places for numeric values; `-1` = Mendix default. |
| **Currency symbol** | String | | Prefix symbol, e.g. `€`, `$`, `£`. Applied when Decimal places ≥ 0 or Formatter = Money. |
| **Date format** | String | | Pattern, e.g. `dd-MM-yyyy` or `dd-MM-yyyy HH:mm`. Empty = Mendix default. |
| **Aggregate** | Enum | `None` | Summary row value: `None`, `Sum (∑)`, `Count (#)`, `Average (⌀)`, `Max`, `Min`. Requires **Summary position** ≠ None. Sum/Average/Max/Min require a numeric attribute. |

#### Advanced

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Group by** | Boolean | `false` | Include this column in the Group-by panel. Multiple columns create nested groups. |
| **XPath attribute name** | String | | The Mendix attribute name, e.g. `Amount` or `Description`. Required for: (1) XPath filter output via **Filter XPath constraint attribute**; (2) reliable inline cell editing — the widget uses this name to write the new value to the Mendix object so the nanoflow/microflow receives the updated value. |
| **Show tooltip** | Boolean | `false` | Show the cell value as a tooltip on hover. |

---

### Formatters

| Value | Description |
| --- | --- |
| `Value` | Plain text (default). |
| `Progress bar` | Horizontal bar for values 0–100. |
| `Star rating` | Star icons for values 0–5. |
| `Tick / Cross` | Green tick for `true`/truthy, red cross for `false`/falsy. |
| `Money` | Number with currency symbol and decimal places. |
| `HTML` | Renders raw HTML from the cell value. |
| `Color swatch` | Colored block using the cell value as a CSS color. |
| `Link` | Clickable hyperlink using the cell value as the URL. |
| `Toggle` | On/off toggle. |
| `Textarea` | Multi-line text. |
| `Image` | `<img>` tag using the cell value as the `src`. |
| `Date/time diff` | Time-ago relative label (e.g. "3 days ago"). |
| `Traffic light` | Red / amber / green indicator. |
| `Button tick` | Clickable tick button. |
| `Button cross` | Clickable cross button. |

---

### Row Selection

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Selection** | SelectionValue | `None` | `None` = no selection. `Single` = one row at a time. `Multi` = multiple rows. |
| **Show selection column** | Boolean | `true` | Show a checkbox column (visible for Single and Multi). |
| **Auto-select row on startup** | Integer | `0` | Automatically select this row (1-based) on load. `0` = none. Fires **On row selected** if configured. |
| **On row selected** | ListActionValue | | Fires in the context of the row when it is added to the selection. |
| **On row deselected** | ListActionValue | | Fires in the context of the row when it is removed from the selection. |

---

### Export

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Enable CSV export** | Boolean | `false` | Show an **Export CSV** button in the toolbar. |
| **Enable Excel export** | Boolean | `false` | Show an **Export Excel** button (downloads `.xlsx`). |
| **Enable JSON export** | Boolean | `false` | Show an **Export JSON** button. |
| **Enable PDF export** | Boolean | `false` | Show a **Print / PDF** button (uses the browser print dialog). |
| **Enable clipboard copy** | Boolean | `false` | Show a **Copy** button that copies the selected (or all) rows to the clipboard. |
| **Export filename** | String | `export` | Filename for downloaded files (without extension). |

---

### Toolbar

| Property | Type | Description |
| --- | --- | --- |
| **Toolbar widgets** | Widgets | Custom widgets shown in the toolbar alongside the built-in buttons. |

---

### Behavior

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **On row click** | ListActionValue | | Action executed when the user clicks a row. |
| **On row double-click** | ListActionValue | | Action executed when the user double-clicks a row. |
| **Empty placeholder** | String | `No data` | Text shown when the data source returns no rows. |
| **Enable row reorder** | Boolean | `false` | Show a drag handle column so the user can reorder rows. |
| **On row reordered** | ListActionValue | | Action in the context of the moved row after it is dropped. |
| **Reorder target row ID** | Attribute (String) | | String attribute that receives the Mendix ID of the row now *below* the moved row. Empty when dragged to the last position. Use this as the `SuccessorId` in a reorder Java action. |

---

### Master / Detail

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Enable master / detail** | Boolean | `false` | Show an expand toggle on each row to reveal a detail panel. |
| **Detail content** | Widgets | | Widgets rendered in the collapsible panel below the row. |
| **Detail panel height (px)** | Integer | `200` | Height of the expanded detail panel in pixels. |

---

### Personalization

| Property | Type | Description |
| --- | --- | --- |
| **Configuration attribute** | Attribute (unlimited String) | Mendix attribute in which sort state, active filters and column order are stored as JSON. Wrap the widget in a Data view to select an attribute. |
| **On configuration change** | ActionValue | Action after the configuration is updated (e.g. to commit the object). |
| **Filter XPath constraint attribute** | Attribute (String) | String attribute where the widget writes the active header filters as an XPath constraint. Requires **XPath attribute name** per column. Use the attribute value directly in a datasource XPath or microflow. |

#### Configuration JSON format

The widget stores the full grid state as JSON in the **Configuration attribute**. Keys in `filters`, `sorters`, `colLayout` and `columnMeta` use the raw Mendix runtime attribute ID (e.g. `attr_aad_6`) — these are stable per Studio Pro session.

```json
{
  "sorters":    [{ "field": "attr_aad_6", "dir": "asc" }],
  "filters":    [{ "field": "attr_aad_6", "type": "<", "value": 100 }],
  "colLayout":  [{ "field": "attr_aad_6", "title": "ID", "width": 150, "visible": true }],
  "columnMeta": {
    "attr_aad_6":  { "xpathName": "ID_1",   "type": "Integer" },
    "attr_aad_7":  { "xpathName": "Task",    "type": "String"  },
    "attr_aad_16": { "xpathName": "Budget",  "type": "Decimal" }
  }
}
```

`columnMeta` is written automatically for every attribute column that has **XPath attribute name** set. The companion actions read this block to translate filter fields to XPath attribute names — no separate column mapping is needed.

#### Tabulator filter types

| `type` | Meaning | XPath produced |
| --- | --- | --- |
| `=` | Equals | `Attr = value` |
| `!=` | Not equal | `Attr != value` |
| `<` | Less than | `Attr < value` |
| `<=` | Less than or equal | `Attr <= value` |
| `>` | Greater than | `Attr > value` |
| `>=` | Greater than or equal | `Attr >= value` |
| `like` | Contains | `contains(Attr, 'value')` |
| `starts` | Starts with | `starts-with(Attr, 'value')` |
| `ends` | Ends with | `contains(Attr, 'value')` |
| `keywords` | All words present | `contains(...) and contains(...)` |

---

### Filtering

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Enable header filters** | Boolean | `false` | Activates header filter inputs. Must also enable **Header filter** per column. |
| **Enable filter bar** | Boolean | `false` | Show a filter bar above the grid with column, operator and value selectors. |

---

### Summary row

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Summary position** | Enum | `None` | `None` = no summary. `Top` = summary row above the data. `Bottom` = summary row below the data. Aggregate values are configured per column. |

---

### Appearance

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Enable group by** | Boolean | `false` | Show a Group-by panel. Columns with **Group by** enabled can be toggled as grouping levels. |
| **Enable column chooser** | Boolean | `false` | Show a **Columns** button for hiding/showing individual columns. |
| **Enable column reordering** | Boolean | `false` | Allow users to drag column headers to reorder columns. |
| **Row striping** | Boolean | `false` | Alternate row background color for even rows. |
| **Row height (px)** | Integer | `35` | Height of each data row in pixels. |
| **Grid height (px)** | Integer | `400` | Total height of the grid in pixels. |
| **Column layout** | Enum | `Fit data` | `Fit data` = each column at its configured width; `Fit columns` = stretch to fill grid width; `Fit data fill` = like Fit data but fills remaining space; `Fit data stretch` = like Fit data but last column stretches. |
| **Enable responsive layout** | Boolean | `false` | Automatically hide columns right-to-left when the grid is too narrow. |

---

### Pagination

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Enable pagination** | Boolean | `false` | Split data into pages with navigation controls. |
| **Page size** | Integer | `20` | Default number of rows per page. |
| **Position** | Enum | `Bottom` | Show pagination controls `Top` or `Bottom`. |
| **Show page-size selector** | Boolean | `false` | Allow users to change the number of rows per page. |

---

### Spreadsheet

Active when **Enable spreadsheet mode** (General tab) is `Yes`. The widget then shows an Excel-like sheet with lettered columns (A, B, C, …), a frozen row-number column, range selection and an internal horizontal/vertical scrollbar. Grid properties (columns rendering, selection, export, pagination, …) do not apply in this mode.

Editing: **single click** selects a cell (range selection), **double click** opens the cell editor.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| **Sheet data source** | Enum | `JSON attribute` | `JSON attribute` = load and save sheet data as JSON in the Data attribute. `Data source` = fill the sheet from the Data source + Columns (General tab). |
| **Include header row** | Boolean | `true` | Data source mode: put the column headers in the first sheet row. |
| **Rows** | Integer | `50` | Number of rows in the sheet (grows automatically when the data is larger). |
| **Columns** | Integer | `26` | Number of columns in the sheet (grows automatically when the data is wider). |
| **Data attribute** | Attribute (unlimited String) | | Attribute holding the sheet data as JSON. Wrap the widget in a Data view to select an attribute. |
| **On data change** | ActionValue | | Action after each cell edit (debounced), e.g. to commit the object. |
| **Show sheet tabs** | Boolean | `false` | Show tabs at the bottom to switch between sheets (requires Sheets). |
| **Sheets** | Object list | | Define multiple sheets: Title, Key (used in the stored JSON), Rows and Columns (0 = global setting). Empty = one single sheet. |
| **Enable range clipboard** | Boolean | `true` | Ctrl+C / Ctrl+V for cell ranges, whole rows (click the row number) and whole columns (click the column letter). Uses the `navigator.clipboard` API; values are exchanged as tab-separated text, so copy/paste to and from Excel works. |

#### Stored JSON format

Single sheet — a 2D array:

```json
[["A1", "B1", "C1"], ["A2", "B2", "C2"]]
```

Multiple sheets — an object keyed by sheet key:

```json
{ "sheet1": [["A1", "B1"]], "sheet2": [["A1", "B1"]] }
```

#### Data source mode

- Each datasource row becomes a sheet row; attribute columns use the formatted display value, dynamic text columns are evaluated per row. Custom content columns are skipped (widgets cannot render in a sheet cell).
- The datasource is leading: when it refreshes, the sheet is refilled and manual edits are overwritten.
- Edits are **not** written back to the Mendix objects. When a **Data attribute** is also configured, the current sheet content is saved there as JSON after each edit (one way: datasource in, JSON out) — process it in a microflow via **On data change**.
- Data source mode always uses a single sheet; the Sheets configuration is ignored.

---

### Styling (theme)

The theme is selected per widget on the Studio Pro **Properties > Styling** tab (design property **Theme**), provided the **ConventCommons** module is in the project — the design property definition ships in `themesource/conventcommons/web/design-properties.json`. Without that module, set the class manually in the **Class** field.

| Theme | Class | Description |
| --- | --- | --- |
| Mendix (default) | `wtd-theme-mendix` | Blue header, Atlas-like styling. Applied when no other theme is selected. |
| Tabulator default | `wtd-theme-plain` | The unmodified standard Tabulator theme. |
| Simple | `wtd-theme-simple` | Minimal light theme. |
| Midnight (dark) | `wtd-theme-midnight` | Dark theme. |
| Modern | `wtd-theme-modern` | Modern light theme with blue accent headers on white background, matching [tabulator.info](https://tabulator.info/examples/6.x/#theming). |
| Site | `wtd-theme-site` | The tabulator.info site theme. |
| Site dark | `wtd-theme-siteDark` | Dark variant of the site theme. |

Themes work for both grid and spreadsheet mode, per widget instance — a Midnight spreadsheet and a Mendix grid can share a page. The scoped theme CSS is generated from the official Tabulator themes by `scripts/generate-themes.js`; re-run it after upgrading the `tabulator-tables` dependency. Note: dropdown popups (enum editors) are attached to `document.body` outside the widget and keep the default styling.

---

## Usage: XPath filtering via datasource

The widget can write the active header filters as an XPath constraint to a String attribute in real time. This allows a datasource microflow or XPath datasource to re-query the data server-side.

### Requirements (XPath filtering)

1. Set **XPath attribute name** on each filterable column (e.g. `Amount`, `Name`).
2. Enable **Enable header filters** and set **Header filter = true** on each column.
3. Add a String attribute to a helper entity (e.g. the page context entity), e.g. `FilterConstraint`.
4. Wrap the widget in a Data view and link **Filter XPath constraint attribute** to `FilterConstraint`.
5. Set **On configuration change** to a nanoflow/microflow that refreshes the datasource.

The widget writes constraints like `[Amount >= 100][contains(lower-case(Name), 'smith')]` into `FilterConstraint` after each filter change.

---

## Usage: row reordering

The widget supports drag-and-drop reordering via a drag handle column.

### Requirements (row reordering)

1. Add an Integer or Long attribute to the entity, e.g. `SortOrder`.
2. Ensure the datasource sorts by `SortOrder` ascending.
3. Add a String attribute (without maximum length) to a helper entity, e.g. `ReorderTargetId`.

### Configuration in Studio Pro

| Widget property | Value |
| --- | --- |
| **Enable row reorder** | `true` |
| **Reorder target row ID** | Link to `ReorderTargetId` |
| **On row reordered** | Microflow `ACT_ReorderRow` (see below) |

### Microflow ACT_ReorderRow

The microflow receives `$currentObject` (the moved row) and reads `ReorderTargetId` from the context:

1. Call a reorder Java action with:
   - `ObjectType` = `"MyModule.MyEntity"`
   - `SortAttribute` = `"SortOrder"`
   - `MovedObject` = `$currentObject`
   - `SuccessorId` = value of `ReorderTargetId` (empty = moved to the end)
2. Refresh the datasource.

---

## Server-side filtering

The [ConventCommons module](https://marketplace.mendix.com/link/component/253866) ships JS and Java actions that translate the grid's saved configuration into server-side queries. All column-to-attribute mappings are read from the `columnMeta` block embedded in the config JSON — no separate mapping is needed.

> All JSAs are **nanoflow-safe** — no direct server calls are made inside the JSA.

### JS_TAB_BuildXPath / JA_TAB_BuildXPath

Builds an XPath string from the active filters in the grid configuration.

| Parameter | Type | Description |
| --- | --- | --- |
| `entityName` | String | Full entity name, e.g. `MyModule.MyEntity` |
| `gridConfigJSON` | String | Value of the **Configuration attribute** |
| `returnFullXPath` | Boolean | `true` → `//MyModule.MyEntity[constraints]`; `false` → `[constraints]` only |

| `returnFullXPath` | Active filters | Result |
| --- | --- | --- |
| `true` | yes | `//MyModule.MyEntity[ID_1 < 100 and contains(Task, 'abc')]` |
| `true` | no | `//MyModule.MyEntity` |
| `false` | yes | `[ID_1 < 100 and contains(Task, 'abc')]` |
| `false` | no | `""` |

Use `returnFullXPath = false` when passing the result to the **XPath Marketplace module** (`Retrieve by XPath`), which expects only the constraint part.

### JS_TAB_BuildSortJSON / JA_TAB_BuildSortJSON

Builds a sort array from the active sorters in the grid configuration.

| Parameter | Type | Description |
| --- | --- | --- |
| `gridConfigJSON` | String | Value of the **Configuration attribute** |

Returns a JSON string such as `[["Amount","asc"],["Name","desc"]]`. Returns `[]` when no sort is active.

### JS_TAB_GetObjectsFromGridConfig / JA_TAB_GetObjectsFromGridConfig

Retrieves objects directly, applying both filter constraints and sort order from the grid configuration in one call.

| Parameter | Type | Description |
| --- | --- | --- |
| `returnObjectType` | String | Full entity name, e.g. `MyModule.MyEntity` |
| `gridConfigJSON` | String | Value of the **Configuration attribute** |

Returns `List<MxObject>`. The JS variant requires **Strict mode = No** in App Security.

### JS_TAB_GetFilteredObjects / JA_TAB_GetFilteredObjects

Retrieves objects using either an XPath constraint string or a full grid config JSON.

| Parameter | Type | Description |
| --- | --- | --- |
| `returnObjectType` | String | Full entity name, e.g. `MyModule.MyEntity` |
| `xPathConstraint` | String | XPath constraint (e.g. output of `JS_TAB_BuildXPath`) **or** the full grid config JSON from the **Configuration attribute** |

When `xPathConstraint` starts with `{`, it is treated as a full TAB grid config JSON and the XPath predicate is built automatically from the `filters` array and `columnMeta`. Otherwise it is used as a plain XPath constraint. Returning an empty string returns all objects of the entity. The JS variant requires **Strict mode = No** in App Security.

---

## License

Apache V2 – ConventSystems B.V.
