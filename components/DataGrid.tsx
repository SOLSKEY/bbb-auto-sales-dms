import React, { useState, useRef, useEffect } from 'react';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/solid';
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

// Helper to format VIN last 4 with zero-padding
const formatVinLast4 = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value);
    // If it's numeric or can be converted to numeric, pad it
    if (/^\d+$/.test(str)) {
        return str.padStart(4, '0').slice(-4);
    }
    // If it already has 4+ characters, take last 4 and pad if needed
    if (str.length >= 4) {
        return str.slice(-4).padStart(4, '0');
    }
    return str.padStart(4, '0');
};

// Helper to check if a column is a VIN last 4 column
const isVinLast4Column = (columnKey: string): boolean => {
    const normalized = columnKey.toLowerCase().replace(/[\s_-]/g, '');
    return normalized === 'vinlast4' || normalized === 'vinlastfour' || normalized.includes('vinlast4');
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
    const [editingValue, setEditingValue] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const inputRef = useRef<HTMLInputElement>(null);
    const saveButtonRef = useRef<HTMLButtonElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset save status after showing success/error
    useEffect(() => {
        if (saveStatus === 'success' || saveStatus === 'error') {
            const timer = setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    const handleStartEdit = (rowIndex: number, columnKey: string) => {
        if (!editable) return;
        const currentValue = data[rowIndex]?.[columnKey] ?? '';
        // Use formatted value for VIN last 4 columns to preserve leading zeros
        const valueToEdit = isVinLast4Column(columnKey) ? formatVinLast4(currentValue) : String(currentValue);
        setEditingCell({ row: rowIndex, col: columnKey });
        setEditingValue(valueToEdit);
        setSaveStatus('idle');
    };

    const handleSaveCell = async (rowIndex: number, columnKey: string) => {
        if (!tableName || !primaryKey || !data[rowIndex]?.[primaryKey]) {
            setEditingCell(null);
            return;
        }

        setIsSaving(true);
        setSaveStatus('saving');

        try {
            let valueToSave = editingValue;
            
            // Apply VIN last 4 formatting if applicable
            if (isVinLast4Column(columnKey)) {
                valueToSave = formatVinLast4(editingValue);
            }

            const valueForDb = prepareValueForDb(valueToSave, columnKey);
            const supabaseColumnRaw = fieldMap?.[columnKey] ?? columnKey;
            const supabasePrimaryKeyRaw = fieldMap?.[primaryKey] ?? primaryKey;
            // Use unquoted column names for update object keys (Supabase handles column names with spaces)
            const supabaseColumn = supabaseColumnRaw;
            const supabasePrimaryKey = supabasePrimaryKeyRaw;

            // Update local state
            const newData = [...data];
            const updatedRow = { ...newData[rowIndex], [columnKey]: valueToSave };
            newData[rowIndex] = updatedRow;
            setData(newData);

            // Sync to Supabase
            // For update payload, use unquoted column names directly (Supabase client handles spaces)
            // The issue is that quoteSupabaseColumn is meant for SQL queries, not object keys
            const updatePayload: Record<string, any> = {};
            // Strip any quotes that might have been added
            const unquotedColumn = supabaseColumn.startsWith('"') && supabaseColumn.endsWith('"')
                ? supabaseColumn.slice(1, -1).replace(/""/g, '"')
                : supabaseColumn;
            updatePayload[unquotedColumn] = valueForDb;
            
            // For .eq() filter, we need to use the actual column name (Supabase handles it)
            const unquotedPrimaryKey = supabasePrimaryKey.startsWith('"') && supabasePrimaryKey.endsWith('"')
                ? supabasePrimaryKey.slice(1, -1).replace(/""/g, '"')
                : supabasePrimaryKey;
            const primaryKeyValue = updatedRow[primaryKey];

            const { error } = await supabase
                .from(tableName)
                .update(updatePayload)
                .eq(unquotedPrimaryKey, primaryKeyValue);

            if (error) {
                console.error('Error updating cell:', error);
                setSaveStatus('error');
                // Revert local state on error
                setData(data);
            } else {
                setSaveStatus('success');
                setEditingCell(null);
            }
        } catch (error) {
            console.error('Error syncing cell change:', error);
            setSaveStatus('error');
            setData(data); // Revert on error
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingCell(null);
        setEditingValue('');
        setSaveStatus('idle');
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
        <div className="h-full flex flex-col glass-card-outline overflow-hidden">
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
                                {columns.map((col) => {
                                    const isEditing = editable && editingCell?.row === rowIndex && editingCell?.col === col.key;
                                    const displayValue = isVinLast4Column(col.key) && !isEditing 
                                        ? formatVinLast4(row[col.key])
                                        : (row[col.key] ?? '');
                                    
                                    return (
                                        <td key={col.key} className="p-0 whitespace-nowrap relative">
                                            {isEditing ? (
                                                <div className="flex items-center">
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={editingValue}
                                                        onChange={(e) => setEditingValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleSaveCell(rowIndex, col.key);
                                                            } else if (e.key === 'Escape') {
                                                                e.preventDefault();
                                                                handleCancelEdit();
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            // Check if focus is moving to the save button
                                                            const relatedTarget = e.relatedTarget as HTMLElement;
                                                            if (relatedTarget && saveButtonRef.current?.contains(relatedTarget)) {
                                                                return; // Don't save on blur if clicking save button
                                                            }
                                                            // Small delay to allow save button click
                                                            if (saveTimeoutRef.current) {
                                                                clearTimeout(saveTimeoutRef.current);
                                                            }
                                                            saveTimeoutRef.current = setTimeout(() => {
                                                                if (saveStatus !== 'saving' && !saveButtonRef.current?.matches(':hover')) {
                                                                    handleSaveCell(rowIndex, col.key);
                                                                }
                                                            }, 150);
                                                        }}
                                                        autoFocus
                                                        className="flex-1 p-3 bg-glass-panel border-2 border-lava-core text-primary outline-none"
                                                        disabled={isSaving}
                                                    />
                                                    <button
                                                        ref={saveButtonRef}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (saveTimeoutRef.current) {
                                                                clearTimeout(saveTimeoutRef.current);
                                                            }
                                                            handleSaveCell(rowIndex, col.key);
                                                        }}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault(); // Prevent input blur
                                                        }}
                                                        disabled={isSaving}
                                                        className={`p-2 mx-1 rounded transition-colors ${
                                                            saveStatus === 'success'
                                                                ? 'bg-green-500 text-white'
                                                                : saveStatus === 'error'
                                                                ? 'bg-red-500 text-white'
                                                                : isSaving
                                                                ? 'bg-gray-500 text-white cursor-not-allowed'
                                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                                        }`}
                                                        title="Save changes"
                                                    >
                                                        <CheckIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="p-3 h-full text-secondary cursor-pointer hover:bg-glass-panel/50"
                                                    onDoubleClick={() => handleStartEdit(rowIndex, col.key)}
                                                >
                                                    {displayValue}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
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
