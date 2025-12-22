import { useEffect, useState } from 'react';
import type { Sale } from '../types';
import { supabase } from '../supabaseClient';
import { fromSupabaseArray, SALE_FIELD_MAP } from '../supabaseMapping';

interface UseSupabaseSalesResult {
    data: Sale[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useSupabaseSales = (): UseSupabaseSalesResult => {
    const [data, setData] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSales = async () => {
        setLoading(true);
        setError(null);
        try {
            const { count: totalCount, error: countError } = await supabase
                .from('Sales')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                console.error('Error retrieving sales count from Supabase:', countError);
            }


            const pageSize = 1000;
            const allRows: any[] = [];
            let page = 0;
            let hasMore = true;

            while (hasMore) {
                const from = page * pageSize;
                const to = from + pageSize - 1;

                const { data: pageData, error: pageError } = await supabase
                    .from('Sales')
                    .select('*')
                    .order('"Sale Date"', { ascending: false })
                    .range(from, to);

                if (pageError) {
                    console.error(`Error loading sales page starting at row ${from}:`, pageError);
                    setError('Failed to load sales data from Supabase.');
                    return;
                }

                if (!pageData || pageData.length === 0) {
                    hasMore = false;
                } else {
                    allRows.push(...pageData);
                    hasMore = pageData.length === pageSize;
                    if (typeof totalCount === 'number' && allRows.length >= totalCount) {
                        hasMore = false;
                    }
                    page += 1;
                }
            }

            if (allRows.length > 0) {
                console.debug(`[useSupabaseSales] fetched ${allRows.length} sales rows${typeof totalCount === 'number' ? ` (Supabase count: ${totalCount})` : ''}.`);
                const mappedSales = fromSupabaseArray(allRows, SALE_FIELD_MAP);
                console.debug('[useSupabaseSales] mapped sales sample:', mappedSales.slice(0, 5));
                setData(mappedSales);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error('Unexpected Supabase sales load error:', err);
            setError('An unexpected error occurred while loading sales data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSales();
    }, []);

    return {
        data,
        loading,
        error,
        refresh: loadSales,
    };
};
