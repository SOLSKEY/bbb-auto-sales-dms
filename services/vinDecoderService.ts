import type { Vehicle } from '../types';

interface NhtsaVariable {
    Value: string | null;
    ValueId: string;
    Variable: string;
    VariableId: number;
}

const VARIABLE_MAP: Record<string, keyof Vehicle> = {
    'Model Year': 'year',
    'Make': 'make',
    'Model': 'model',
    'Trim': 'trim',
    'Body Class': 'bodyStyle',
    'Drive Type': 'driveTrain',
    'Engine Number of Cylinders': 'engine',
    'Fuel Type - Primary': 'fuelType',
    'Transmission Style': 'transmission',
};

export const decodeVin = async (vin: string): Promise<Partial<Vehicle>> => {
    if (vin.length !== 17) {
        throw new Error('VIN must be 17 characters long.');
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch VIN data from NHTSA.');
        }
        const data = await response.json();

        // The API response for errors contains a result item with Variable: "Error Code" and a non-zero Value.
        const errorCodeItem = data.Results.find((item: NhtsaVariable) => item.Variable === 'Error Code');
        
        // A successful response has an "Error Code" of "0".
        if (errorCodeItem && errorCodeItem.Value && errorCodeItem.Value !== '0') {
            const errorTextItem = data.Results.find((item: NhtsaVariable) => item.Variable === 'Error Text');
            const errorMessage = errorTextItem?.Value || 'Invalid VIN or no data found.';
            
            // The API sometimes "corrects" a VIN but the original is valid. We can ignore this error.
            if (errorMessage.includes('VIN corrected')) {
                // Proceed, as this is often a false positive.
            } else {
                throw new Error(errorMessage);
            }
        }

        const vehicleData: Partial<Vehicle> = {};
        data.Results.forEach((item: NhtsaVariable) => {
            const vehicleKey = VARIABLE_MAP[item.Variable];
             // Ensure we have a valid key, a non-null value, and the value isn't 'Not Applicable'
            if (vehicleKey && item.Value && item.Value !== 'Not Applicable') {
                if (vehicleKey === 'year') {
                    (vehicleData[vehicleKey] as any) = parseInt(item.Value, 10);
                } else {
                    (vehicleData[vehicleKey] as any) = item.Value;
                }
            }
        });

        return vehicleData;

    } catch (error) {
        console.error("VIN Decoder Error:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during VIN decoding.');
    }
};
