import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon, CheckIcon, MagnifyingGlassIcon, XCircleIcon } from '@heroicons/react/24/solid';
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
        'overdueAccounts', 'openAccounts', 'overdueRate', 'collectionsBonus'];

    if (numericColumns.includes(columnKey) && (value === '' || value === null || value === undefined)) {
        return null;
    }
    // Convert to number for numeric columns
    if (numericColumns.includes(columnKey) && value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        return Number.isFinite(numValue) ? numValue : null;
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
    const [searchTerm, setSearchTerm] = useState<string>('');
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

            // Special handling for commission_report_collections_bonus (needs upsert)
            if (tableName === 'commission_report_collections_bonus') {
                // For collections bonus, we need to upsert and set locked=true
                const upsertPayload: Record<string, any> = {
                    ...updatePayload,
                    locked: true,
                    updated_at: new Date().toISOString(),
                };
                upsertPayload[unquotedPrimaryKey] = primaryKeyValue;
                
                // If collections_bonus is null/empty, delete instead
                if (updatePayload.collections_bonus === null || updatePayload.collections_bonus === undefined || updatePayload.collections_bonus < 0) {
                    const { error } = await supabase
                        .from(tableName)
                        .delete()
                        .eq(unquotedPrimaryKey, primaryKeyValue);
                    
                    if (error) {
                        console.error('Error deleting collections bonus:', error);
                        setSaveStatus('error');
                        setData(data); // Revert on error
                    } else {
                        setSaveStatus('success');
                        setEditingCell(null);
                    }
                } else {
                    const { error } = await supabase
                        .from(tableName)
                        .upsert(upsertPayload, {
                            onConflict: unquotedPrimaryKey,
                        });

                    if (error) {
                        console.error('Error upserting collections bonus:', error);
                        setSaveStatus('error');
                        setData(data); // Revert on error
                    } else {
                        setSaveStatus('success');
                        setEditingCell(null);
                    }
                }
            } else {
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

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) {
            return data;
        }

        const searchLower = searchTerm.toLowerCase().trim();
        return data.filter((row) => {
            // Search across all column values
            return columns.some((col) => {
                const value = row[col.key];
                if (value === null || value === undefined) return false;
                // Convert to string and search (case-insensitive)
                const valueStr = String(value).toLowerCase();
                return valueStr.includes(searchLower);
            });
        });
    }, [data, searchTerm, columns]);

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
            {/* Search Bar */}
            <div className="p-4 border-b border-border-low bg-glass-panel">
                <div className="flex items-center gap-3 bg-[rgba(35,35,40,0.9)] border border-border-low rounded-md px-3 py-2 focus-within:border-lava-core transition-colors">
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Search across all columns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent text-primary focus:outline-none placeholder:text-[#D5D5D5]"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="p-1 text-muted hover:text-primary transition-colors flex-shrink-0"
                            title="Clear search"
                        >
                            <XCircleIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {searchTerm && (
                    <p className="text-xs text-muted mt-2">
                        Showing {filteredData.length} of {data.length} results
                    </p>
                )}
            </div>
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
                        {filteredData.map((row, rowIndex) => {
                            // Find the original index in the unfiltered data for editing
                            const originalIndex = data.findIndex((r) => {
                                // Try to match by id or primary key if available
                                if (row.id && r.id === row.id) return true;
                                // Fallback to comparing all column values
                                return columns.every((col) => row[col.key] === r[col.key]);
                            });
                            const actualRowIndex = originalIndex >= 0 ? originalIndex : rowIndex;
                            
                            return (
                            <tr key={row.id || rowIndex} className="hover:bg-glass-panel transition-colors">
                                {columns.map((col) => {
                                    const isEditing = editable && editingCell?.row === actualRowIndex && editingCell?.col === col.key;
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
                                                                handleSaveCell(actualRowIndex, col.key);
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
                                                                    handleSaveCell(actualRowIndex, col.key);
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
                                                            handleSaveCell(actualRowIndex, col.key);
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
                                                    onDoubleClick={() => handleStartEdit(actualRowIndex, col.key)}
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
                            );
                        })}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + (onDeleteRow || onEditRow ? 1 : 0)} className="p-8 text-center text-muted">
                                    {searchTerm ? `No results found for "${searchTerm}"` : 'No data available'}
                                </td>
                            </tr>
                        )}
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
