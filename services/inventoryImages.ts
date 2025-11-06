import { supabase } from '../supabaseClient';

const BUCKET_NAME = 'inventory-images';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export interface AddInventoryImageResult {
    publicUrl: string;
    imageUrls: string[];
}

export async function addInventoryImage(inventoryId: string, file: File): Promise<AddInventoryImageResult> {
    const numericId = Number(inventoryId);
    if (!Number.isFinite(numericId)) {
        throw new Error('A valid numeric inventory id is required to upload images.');
    }

    const sanitized = sanitizeFileName(file.name);
    const objectPath = `${numericId}/${Date.now()}-${sanitized}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(objectPath, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (uploadError) {
        throw uploadError;
    }

    const { data: publicData, error: publicError } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(objectPath);

    if (publicError || !publicData?.publicUrl) {
        throw publicError ?? new Error('Unable to generate a public URL for the uploaded image.');
    }

    const publicUrl = publicData.publicUrl;

    const { data: existingRow, error: fetchError } = await supabase
        .from('Inventory')
        .select('image_urls')
        .eq('id', numericId)
        .maybeSingle();

    if (fetchError) {
        throw fetchError;
    }

    const updatedUrls = Array.isArray(existingRow?.image_urls)
        ? [...existingRow.image_urls, publicUrl]
        : [publicUrl];

    const { error: updateError } = await supabase
        .from('Inventory')
        .update({ image_urls: updatedUrls })
        .eq('id', numericId);

    if (updateError) {
        throw updateError;
    }

    return { publicUrl, imageUrls: updatedUrls };
}
