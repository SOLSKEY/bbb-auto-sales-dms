import React, { useState } from 'react';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { supabase } from '../supabaseClient';
import { toSupabase, quoteSupabaseColumn } from '../supabaseMapping';
import { GlassButton } from '@/components/ui/glass-button';

interface Column {
    key: string;
    name: string;
}

interface DataGridProps {
    columns: Column[];
    data: any[];
    setData: React.Dispatch<React.SetStateAction<any[]>>;
    editable: boolean;
    onDeleteRow?: (rowToDelete: any) => void;
    deleteButtonText?: string;
    deleteButtonTitle?: string;
    onEditRow?: (rowToEdit: any) => void;
    editButtonText?: string;
    editButtonTitle?: string;
    tableName?: string; // Supabase table name for syncing
    primaryKey?: string; // Primary key field for updates
    fieldMap?: Record<string, string>; // Optional app->Supabase column mapping
}

// Helper to convert empty strings to null for numeric fields
const prepareValueForDb = (value: any, columnKey: string) => {
    // List of numeric columns that should be NULL if empty
    const numericColumns = ['year', 'mileage', 'price', 'downPayment', 'salePrice', 'saleDownPayment',
                           'payments', 'lateFees', 'total', 'boaZelle', 'totalAmount', 'amountPaid',
                           'overdueAccounts', 'openAccounts', 'overdueRate'];

    if (numericColumns.includes(columnKey) && (value === '' || value === null || value === undefined)) {
        return null;
    }
    return value;
};

const DataGrid: React.FC<DataGridProps> = ({
    columns,
    data,
    setData,
    editable,
    onDeleteRow,
    deleteButtonText = 'Revert',
    deleteButtonTitle = 'Revert Sale',
    onEditRow,
    editButtonText = 'Edit',
    editButtonTitle = 'Edit Row',
    tableName,
    primaryKey,
    fieldMap,
}) => {
    const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);

    const handleCellChange = async (e: React.ChangeEvent<HTMLInputElement>, rowIndex: number, columnKey: string) => {
        const newValue = e.target.value;
        const newData = [...data];
        const updatedRow = { ...newData[rowIndex], [columnKey]: newValue };
        newData[rowIndex] = updatedRow;
        setData(newData);

        // Sync to Supabase if table info is provided
        if (tableName && primaryKey && updatedRow[primaryKey]) {
            try {
                const valueForDb = prepareValueForDb(newValue, columnKey);
                const supabaseColumnRaw = fieldMap?.[columnKey] ?? columnKey;
                const supabasePrimaryKeyRaw = fieldMap?.[primaryKey] ?? primaryKey;
                const supabaseColumn = quoteSupabaseColumn(supabaseColumnRaw);
                const supabasePrimaryKey = quoteSupabaseColumn(supabasePrimaryKeyRaw);
                const { error } = await supabase
                    .from(tableName)
                    .update({ [supabaseColumn]: valueForDb })
                    .eq(supabasePrimaryKey, updatedRow[primaryKey]);

                if (error) {
                    console.error('Error updating cell:', error);
                }
            } catch (error) {
                console.error('Error syncing cell change:', error);
            }
        }
    };

    const handleAddRow = async () => {
        if (!columns || columns.length === 0) return;

        const newRow = columns.reduce((acc, col) => {
            acc[col.key] = '';
            return acc;
        }, {} as any);
        newRow.id = Date.now(); // Simple unique ID

        // Sync to Supabase if table info is provided
        if (tableName) {
            try {
                // Prepare row for database (convert empty numeric fields to null)
                const rowForDb = { ...newRow };
                Object.keys(rowForDb).forEach(key => {
                    rowForDb[key] = prepareValueForDb(rowForDb[key], key);
                });

                const payload = fieldMap ? toSupabase(rowForDb, fieldMap) : rowForDb;

                const { error } = await supabase
                    .from(tableName)
                    .insert([payload]);

                if (error) {
                    console.error('Error adding row:', error);
                    alert('Failed to add row. Please try again.');
                    return;
                }
            } catch (error) {
                console.error('Error syncing new row:', error);
                alert('Failed to add row. Please try again.');
                return;
            }
        }

        setData(prevData => [...prevData, newRow]);
    };

    return (
        <div className="h-full flex flex-col glass-card overflow-hidden">
            <div className="overflow-auto flex-grow">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-glass-panel border-b border-border-low z-10 backdrop-blur-glass">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className="p-3 text-left font-semibold text-secondary tracking-wider">
                                    {col.name}
                                </th>
                            ))}
                            {(onDeleteRow || onEditRow) && (
                                <th className="p-3 text-left font-semibold text-secondary tracking-wider">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-low">
                        {data.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="hover:bg-glass-panel transition-colors">
                                {columns.map((col) => (
                                    <td key={col.key} className="p-0 whitespace-nowrap">
                                        {editable && editingCell?.row === rowIndex && editingCell?.col === col.key ? (
                                            <input
                                                type="text"
                                                value={row[col.key]}
                                                onChange={(e) => handleCellChange(e, rowIndex, col.key)}
                                                onBlur={() => setEditingCell(null)}
                                                autoFocus
                                                className="w-full h-full p-3 bg-glass-panel border-2 border-lava-core text-primary outline-none"
                                            />
                                        ) : (
                                            <div
                                                className="p-3 h-full text-secondary"
                                                onClick={() => editable && setEditingCell({ row: rowIndex, col: col.key })}
                                            >
                                                {row[col.key]}
                                            </div>
                                        )}
                                    </td>
                                ))}
                                {(onDeleteRow || onEditRow) && (
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {onEditRow && (
                                                <GlassButton
                                                    size="sm"
                                                    onClick={() => onEditRow(row)}
                                                    className="flex items-center gap-1 text-lava-warm hover:text-lava-core text-xs font-semibold"
                                                    title={editButtonTitle}
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                    {editButtonText}
                                                </GlassButton>
                                            )}
                                            {onDeleteRow && (
                                                <GlassButton
                                                    size="sm"
                                                    onClick={() => onDeleteRow(row)}
                                                    className="flex items-center gap-1 text-red-500 hover:text-red-400 text-xs font-semibold"
                                                    title={deleteButtonTitle}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                    {deleteButtonText}
                                                </GlassButton>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editable && (
                <div className="p-2 border-t border-border-low">
                    <GlassButton
                        size="sm"
                        onClick={handleAddRow}
                        className="flex items-center gap-2 text-sm text-lava-warm hover:text-lava-core font-semibold py-2 px-4 rounded-lg hover:bg-glass-panel transition-colors"
                    >
                        <PlusCircleIcon className="h-5 w-5" />
                        Add Row
                    </GlassButton>
                </div>
            )}
        </div>
    );
};

export default DataGrid;
