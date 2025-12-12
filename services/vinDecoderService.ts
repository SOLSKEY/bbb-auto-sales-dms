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

        // Check if response is JSON before trying to parse
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.log('VIN Decoder: Received non-JSON response:', responseText.substring(0, 200));
            throw new Error('VIN decoder service returned an invalid response. Please try again later.');
        }

        const data = await response.json();

        // The API response for errors contains a result item with Variable: "Error Code" and a non-zero Value.
        const errorCodeItem = data.Results.find((item: NhtsaVariable) => item.Variable === 'Error Code');
        
        // A successful response has an "Error Code" of "0".
        if (errorCodeItem && errorCodeItem.Value && errorCodeItem.Value !== '0') {
            const errorTextItem = data.Results.find((item: NhtsaVariable) => item.Variable === 'Error Text');
            const errorMessage = errorTextItem?.Value || 'Invalid VIN or no data found.';
            throw new Error(errorMessage);
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
