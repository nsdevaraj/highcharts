/* *
 *
 *  Local Data Provider class
 *
 *  (c) 2020-2025 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 *  Authors:
 *  - Dawid Dragula
 *
 * */

'use strict';


/* *
 *
 *  Imports
 *
 * */

import type { DataProviderOptions, RowId } from './DataProvider';
import { DataTableValue } from '../../../Data/DataTableOptions';
import type { ColumnDataType } from '../Table/Column';
import type {
    RowObject as RowObjectType,
    CellType as DataTableCellType
} from '../../../Data/DataTable';
import type { DataEvent } from '../../../Data/DataEvent';
import type DataConnectorType from '../../../Data/Connectors/DataConnectorType';
import type {
    DataConnectorTypeOptions
} from '../../../Data/Connectors/DataConnectorType';
import type { MakeOptional, TypedArray } from '../../../Shared/Types';

import { DataProvider } from './DataProvider.js';
import DataTable from '../../../Data/DataTable.js';
import ChainModifier from '../../../Data/Modifiers/ChainModifier.js';
import DataConnector from '../../../Data/Connectors/DataConnector.js';
import DataProviderRegistry from './DataProviderRegistry.js';
import {
    getGridRowPinningOptions
} from '../RowPinning/RowPinningController.js';
import { uniqueKey } from '../../../Core/Utilities.js';
import {
    defined,
    isArray,
    isNumber,
    isString
} from '../../../Shared/Utilities.js';


/* *
 *
 *  Class
 *
 * */

/**
 * Local data provider for the Grid.
 *
 * Uses a DataTable instances to serve data to the grid, applying query
 * modifiers and persisting edits locally.
 */
export class LocalDataProvider extends DataProvider {

    public static readonly tableChangeEventNames = [
        'afterDeleteColumns',
        'afterDeleteRows',
        'afterSetCell',
        'afterSetColumns',
        'afterSetRows'
    ] as const;

    /* *
     *
     *  Properties
     *
     * */

    /**
     * The provider options.
     */
    public readonly options!: LocalDataProviderOptions;

    /**
     * The original table. Mutations (e.g. setValue) are applied here.
     */
    private dataTable?: DataTable;

    /**
     * The connector instance used to populate the table.
     */
    private connector?: DataConnectorType;

    /**
     * The presentation table after applying query modifiers.
     */
    private presentationTable?: DataTable;

    /**
     * The row count before pagination is applied.
     */
    private prePaginationRowCount?: number;

    /**
     * Pre-computed snapshot of the presentation table rows, built once per
     * query cycle for O(1) reads. See {@link MaterializedRows}.
     */
    private materializedRows: MaterializedRows = {
        rowIds: [],
        rowObjects: [],
        rowIdToIndex: new Map()
    };

    /**
     * Maps row ID to original row index in raw scope.
     */
    private rowIdToOriginalIndex: Map<RowId, number> = new Map();

    /**
     * Unbind callbacks for DataTable events.
     */
    private dataTableEventDestructors: Function[] = [];

    /**
     * Unbind callbacks for connector events.
     */
    private connectorEventDestructors: Function[] = [];

    /**
     * Map of row IDs (from `idColumn`) to original data table row indexes.
     * Set only when `options.idColumn` is configured.
     */
    private originalRowIndexesMap?: Map<RowId, number>;


    /* *
     *
     *  Methods
     *
     * */

    /**
     * Initializes the local data provider and its backing table.
     */
    public override async init(): Promise<void> {
        if (this.dataTable) {
            return;
        }

        await this.initDataTable();
    }

    private async initDataTable(): Promise<void> {
        this.querying.shouldBeUpdated = true;
        this.clearDataTableEvents();
        this.clearConnector();

        if (this.options.connector) {
            await this.initConnector(this.options.connector);
            return;
        }

        let dataTable = this.options.dataTable;
        if (!dataTable) {
            dataTable = new DataTable({
                columns: this.options.columns ?? {}
            });
        }

        this.setDataTable(dataTable);
    }

    private setDataTable(table: DataTable): void {
        this.dataTable = table;
        this.presentationTable = table.getModified();
        this.prePaginationRowCount = this.presentationTable?.rowCount ?? 0;
        this.materializedRows = {
            rowIds: [],
            rowObjects: [],
            rowIdToIndex: new Map()
        };
        this.rowIdToOriginalIndex.clear();

        for (const eventName of LocalDataProvider.tableChangeEventNames) {
            const fn = table.on(eventName, (e: DataEvent): void => {
                void this.handleTableChange(e);
            });
            this.dataTableEventDestructors.push(fn);
        }

        this.originalRowIndexesMap = this.createOriginalRowIndexesMap(table);
    }

    private async handleTableChange(e: DataEvent): Promise<void> {
        this.querying.shouldBeUpdated = true;

        const grid = this.querying.grid;
        if (!grid?.viewport) {
            return;
        }

        if (e.type === 'afterSetCell' && e.detail?.fromGrid) {
            return;
        }

        if (this.options.updateOnChange) {
            await grid.viewport.updateRows();
        }

        // TODO: Handle this when Polling emits proper events.
        // grid.dirtyFlags.add((
        //     eventName === 'afterDeleteColumns' ||
        //     eventName === 'afterSetColumns'
        // ) ? 'grid' : 'rows');

        // await grid.redraw();
    }

    private clearDataTableEvents(): void {
        this.dataTableEventDestructors.forEach((fn): void => fn());
        this.dataTableEventDestructors.length = 0;
    }

    private clearConnector(): void {
        this.connectorEventDestructors.forEach((fn): void => fn());
        this.connectorEventDestructors.length = 0;
        this.connector?.stopPolling();
        this.connector = void 0;
    }

    private async initConnector(
        connectorInput: GridDataConnectorTypeOptions | DataConnectorType
    ): Promise<void> {
        let connector: DataConnectorType;

        if (LocalDataProvider.isConnectorInstance(connectorInput)) {
            connector = connectorInput;
        } else {
            const ConnectorClass =
                DataConnector.types[connectorInput.type] as
                Class<DataConnectorType> | undefined;

            if (!ConnectorClass) {
                throw new Error(
                    `Connector type not found. (${connectorInput.type})`
                );
            }

            if (!connectorInput.id) {
                connectorInput.id = 'connector-' + uniqueKey();
            }

            connector = new ConnectorClass(connectorInput);
        }

        this.connector = connector;

        this.connectorEventDestructors.push(
            connector.on('afterLoad', (): void => {
                this.querying.shouldBeUpdated = true;
            })
        );

        this.setDataTable(connector.getTable());

        if (
            'enablePolling' in connector.options &&
            connector.options.enablePolling &&
            !connector.polling &&
            'dataRefreshRate' in connector.options
        ) {
            connector.startPolling(
                Math.max(connector.options.dataRefreshRate || 0, 1) * 1000
            );
        }

        if (!connector.loaded) {
            try {
                await connector.load();
            } catch {
                return;
            }
        }
    }

    /**
     * Returns the IDs of the columns in the current presentation table.
     *
     * @return
     * Column IDs in presentation order.
     */
    public override getColumnIds(): Promise<string[]> {
        return Promise.resolve(this.presentationTable?.getColumnIds() ?? []);
    }

    /**
     * Returns the row ID for a given local row index. If not found, returns
     * `undefined`.
     *
     * If a configured ID column is available, the row ID is the value from
     * that column in the current row. Otherwise, the row ID is the original
     * row index.
     *
     * @param rowIndex
     * The local (presentation table) row index to get the row ID for.
     *
     * @return
     * The row ID for the requested row.
     */
    public override async getRowId(
        rowIndex: number
    ): Promise<RowId | undefined> {
        const cachedRowId = this.materializedRows.rowIds[rowIndex];
        if (defined(cachedRowId)) {
            return cachedRowId;
        }

        const originalRowIndex =
            await this.getOriginalRowIndexFromLocal(rowIndex);
        if (!defined(originalRowIndex) || !this.dataTable) {
            return;
        }

        const idColId = this.getConfiguredIdColumn();
        if (!idColId) {
            return originalRowIndex;
        }

        const rawId = this.dataTable.getCell(idColId, originalRowIndex);
        if (isString(rawId) || isNumber(rawId)) {
            return rawId;
        }
    }

    /**
     * Returns the local (presentation table) row index for a given row ID. If
     * not found, returns `undefined`.
     *
     * The lookup is resolved against the current materialized presentation
     * rows, with fallback to original row index mapping when needed.
     *
     * @param rowId
     * The row ID to get the row index for.
     *
     * @return
     * The local row index for the requested row.
     */
    public override async getRowIndex(
        rowId: RowId
    ): Promise<number | undefined> {
        const cachedRowIndex = this.materializedRows.rowIdToIndex.get(rowId);
        if (defined(cachedRowIndex)) {
            return cachedRowIndex;
        }

        if (!this.originalRowIndexesMap && isNumber(rowId)) {
            return this.getLocalRowIndexFromOriginal(rowId);
        }

        const originalRowIndex = this.originalRowIndexesMap?.get(rowId);
        if (!defined(originalRowIndex)) {
            return;
        }

        return this.getLocalRowIndexFromOriginal(originalRowIndex);
    }

    /**
     * Returns the original row index for a given local row index.
     *
     * @param localRowIndex
     * The local row index to get the original row index for.
     *
     * @return
     * The original row index.
     */
    public getOriginalRowIndexFromLocal(
        localRowIndex: number
    ): Promise<number | undefined> {
        return Promise.resolve(
            this.presentationTable?.getOriginalRowIndex(localRowIndex)
        );
    }

    /**
     * Returns the local row index for a given original row index.
     *
     * @param originalRowIndex
     * The original row index to get the local row index for.
     *
     * @return
     * The local row index.
     */
    public getLocalRowIndexFromOriginal(
        originalRowIndex: number
    ): Promise<number | undefined> {
        return Promise.resolve(
            this.presentationTable?.getLocalRowIndex(originalRowIndex)
        );
    }

    /**
     * Returns the row object for a given local row index.
     *
     * @param rowIndex
     * The local row index to get the row object for.
     *
     * @return
     * The row object in presentation scope.
     */
    public override getRowObject(
        rowIndex: number
    ): Promise<RowObjectType | undefined> {
        return Promise.resolve(this.materializedRows.rowObjects[rowIndex]);
    }

    /**
     * Returns the original row object for a given row ID.
     *
     * @param rowId
     * The row ID to get the original row object for.
     *
     * @return
     * The original row object in raw data scope.
     */
    public override getOriginalRowObjectByRowId(
        rowId: RowId
    ): Promise<RowObjectType | undefined> {
        const originalIndex = this.resolveOriginalRowIndex(rowId);

        if (originalIndex === void 0) {
            return Promise.resolve(void 0);
        }

        return Promise.resolve(this.dataTable?.getRowObject(originalIndex));
    }

    /**
     * Returns the number of rows before pagination is applied.
     *
     * @return
     * The row count before pagination.
     */
    public override getPrePaginationRowCount(): Promise<number> {
        return Promise.resolve(this.prePaginationRowCount ?? 0);
    }

    /**
     * Returns the number of rows in the current presentation table.
     *
     * @return
     * The presentation row count.
     */
    public override getRowCount(): Promise<number> {
        return Promise.resolve(this.materializedRows.rowIds.length);
    }

    /**
     * Returns the value of a cell in the current presentation table.
     *
     * @param columnId
     * The column ID.
     *
     * @param rowIndex
     * The local row index.
     *
     * @return
     * The cell value.
     */
    public override getValue(
        columnId: string,
        rowIndex: number
    ): Promise<DataTableCellType> {
        return Promise.resolve(
            this.materializedRows.rowObjects[rowIndex]?.[columnId] as
                DataTableCellType
        );
    }

    /**
     * Sets the value of a cell identified by row ID and column ID.
     *
     * After updating the raw data table, the current query pipeline is
     * reapplied so the presentation snapshot stays in sync.
     *
     * @param value
     * The new cell value.
     *
     * @param columnId
     * The column ID.
     *
     * @param rowId
     * The row ID.
     */
    public override async setValue(
        value: DataTableCellType,
        columnId: string,
        rowId: RowId
    ): Promise<void> {
        const originalIndex = this.resolveOriginalRowIndex(rowId);

        if (originalIndex === void 0) {
            throw new Error('LocalDataProvider: unable to resolve rowId.');
        }

        this.dataTable?.setCell(columnId, originalIndex, value, {
            fromGrid: true
        });

        await this.applyQuery();
        this.querying.shouldBeUpdated = false;
    }

    /**
     * Applies querying modifiers and updates the presentation table.
     */
    public override async applyQuery(): Promise<void> {
        const controller = this.querying;
        const originalDataTable = this.dataTable;
        if (!originalDataTable) {
            return;
        }

        const rawTable = originalDataTable.getModified();
        const groupedModifiers = controller.getGroupedModifiers();
        let groupedTable: DataTable;

        // Grouped modifiers
        if (groupedModifiers.length > 0) {
            const chainModifier = new ChainModifier({}, ...groupedModifiers);
            const dataTableCopy = originalDataTable.clone();
            await chainModifier.modify(dataTableCopy.getModified());
            groupedTable = dataTableCopy.getModified();
        } else {
            groupedTable = rawTable;
        }

        this.prePaginationRowCount = groupedTable.rowCount;
        this.originalRowIndexesMap = this.createOriginalRowIndexesMap(
            originalDataTable
        );

        let activeTable = groupedTable;

        // Pagination modifier
        const paginationModifier =
            controller.pagination.createModifier(groupedTable.rowCount);
        if (paginationModifier) {
            activeTable = groupedTable.clone();
            await paginationModifier.modify(activeTable);
            activeTable = activeTable.getModified();
        }

        this.materializedRows = this.createMaterializedRows(activeTable);

        this.rowIdToOriginalIndex = this.createRowIdToOriginalIndexMap(
            rawTable
        );

        this.presentationTable = activeTable;
    }

    private createMaterializedRows(table: DataTable): MaterializedRows {
        const rowIds: RowId[] = [];
        const rowObjects: RowObjectType[] = [];

        for (let i = 0, iEnd = table.getRowCount(); i < iEnd; ++i) {
            rowIds.push(this.getRowIdFromTable(table, i));
            rowObjects.push(table.getRowObject(i) || {});
        }

        return {
            rowIds,
            rowObjects,
            rowIdToIndex: createRowIdIndexMap(rowIds)
        };
    }

    private createRowIdToOriginalIndexMap(table: DataTable): Map<RowId, number> {
        const map = new Map<RowId, number>();
        for (let i = 0, iEnd = table.getRowCount(); i < iEnd; ++i) {
            map.set(this.getRowIdFromTable(table, i), i);
        }
        return map;
    }

    private createOriginalRowIndexesMap(
        table: DataTable
    ): Map<RowId, number> | undefined {
        const idColId = this.getConfiguredIdColumn();
        if (!idColId) {
            return;
        }

        const idColumn = table.getColumn(idColId, true);
        if (!idColumn) {
            throw new Error(`Column "${idColId}" not found in table.`);
        }

        const map = new Map<RowId, number>();
        for (let i = 0, len = idColumn.length; i < len; ++i) {
            const value = idColumn[i];
            if (!isString(value) && !isNumber(value)) {
                throw new Error(
                    'idColumn must contain only string or number values.'
                );
            }
            map.set(value, i);
        }

        if (map.size !== idColumn.length) {
            throw new Error('idColumn must contain unique values.');
        }

        return map;
    }

    private resolveOriginalRowIndex(rowId: RowId): number | undefined {
        return this.rowIdToOriginalIndex.get(rowId) ??
            this.originalRowIndexesMap?.get(rowId) ??
            (
                !this.getConfiguredIdColumn() && typeof rowId === 'number' ?
                    rowId :
                    void 0
            );
    }

    private getConfiguredIdColumn(): string | undefined {
        return this.options.idColumn ??
            getGridRowPinningOptions(this.querying.grid)?.idColumn;
    }

    private getRowIdFromTable(
        table: DataTable,
        rowIndex: number
    ): RowId {
        const row = table.getRowObject(rowIndex);
        const idColumn = this.getConfiguredIdColumn();

        if (row && idColumn && table.hasColumns([idColumn])) {
            const value = row[idColumn];
            if (isString(value) || isNumber(value)) {
                return value;
            }
        }

        const originalIndex = table.getOriginalRowIndex(rowIndex);
        if (isNumber(originalIndex)) {
            return originalIndex;
        }

        return rowIndex;
    }

    /**
     * Destroys the data provider and clears its cached state.
     */
    public override destroy(): void {
        this.clearDataTableEvents();
        this.clearConnector();
        this.materializedRows = {
            rowIds: [],
            rowObjects: [],
            rowIdToIndex: new Map()
        };
        this.rowIdToOriginalIndex.clear();
        this.originalRowIndexesMap = void 0;
    }

    /**
     * Returns the inferred data type for a given column.
     *
     * @param columnId
     * The column ID to inspect.
     *
     * @return
     * The inferred column data type.
     */
    public override getColumnDataType(
        columnId: string
    ): Promise<ColumnDataType> {
        const column = this.dataTable?.getColumn(columnId);
        if (!column) {
            return Promise.resolve('string');
        }

        if (!isArray(column)) {
            // Typed array
            return Promise.resolve('number');
        }

        return Promise.resolve(DataProvider.assumeColumnDataType(
            column.slice(0, 30),
            columnId
        ));
    }

    /**
     * Returns the current data table. When `presentation` is `true`, returns
     * the presentation table (after modifiers).
     *
     * @param presentation
     * Whether to return the presentation table (after modifiers).
     *
     * @return
     * The data table.
     */
    public getDataTable(presentation: boolean = false): DataTable | undefined {
        return presentation ? this.presentationTable : this.dataTable;
    }

    /**
     * Checks if the object is an instance of DataConnector.
     *
     * @param connector
     * The object to check.
     *
     * @returns `true` if the object is an instance of DataConnector, `false`
     * otherwise.
     */
    private static isConnectorInstance(
        connector: GridDataConnectorTypeOptions | DataConnectorType
    ): connector is DataConnectorType {
        return 'getTable' in connector;
    }
}

/**
 * Pre-computed snapshot of the presentation table rows (after sort, filter,
 * and paginate). Built once per query cycle so that all subsequent reads
 * (`getRowId`, `getRowObject`, `getValue`, etc.) are O(1) array/Map lookups
 * instead of hitting DataTable methods on every call.
 */
interface MaterializedRows {
    rowIds: RowId[];
    rowObjects: RowObjectType[];
    rowIdToIndex: Map<RowId, number>;
}

/**
 * Create fast lookup map for row IDs.
 *
 * @param rowIds
 * Row IDs to index.
 */
function createRowIdIndexMap(rowIds: RowId[]): Map<RowId, number> {
    const map = new Map<RowId, number>();
    for (let i = 0, iEnd = rowIds.length; i < iEnd; ++i) {
        map.set(rowIds[i], i);
    }
    return map;
}

export type GridDataConnectorTypeOptions =
    MakeOptional<DataConnectorTypeOptions, 'id'>;

export interface LocalDataProviderOptions extends DataProviderOptions {
    providerType?: 'local';

    /**
     * Data table as a source of data for the grid.
     */
    dataTable?: DataTable;

    /**
     * Connector instance or options used to populate the data table.
     */
    connector?: GridDataConnectorTypeOptions | DataConnectorType;

    /**
     * Columns data to initialize the Grid with.
     */
    columns?: Record<string, Array<DataTableValue> | TypedArray>;

    /**
     * Automatically update the grid when the data table changes. It is disabled
     * by default unles the pagination is enabled.
     *
     * Use this option if you want the polling to update the grid when the data
     * table changes.
     *
     * @default false
     */
    updateOnChange?: boolean;

    /**
     * The column ID that contains the stable, unique row IDs. If not
     * provided, the original row index is used as the row ID.
     */
    idColumn?: string;
}

declare module './DataProviderType' {
    interface DataProviderTypeRegistry {
        local: typeof LocalDataProvider;
    }
}

DataProviderRegistry.registerDataProvider('local', LocalDataProvider);
