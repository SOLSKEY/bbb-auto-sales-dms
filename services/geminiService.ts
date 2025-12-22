import { GoogleGenAI } from "@google/genai";
import { COLLECTIONS_DATA } from '../constants';
import type { Vehicle, Sale } from '../types';

// Note: API_KEY is handled by the execution environment.
// Do not add it here.
let ai: GoogleGenAI | null = null;
try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
} catch (error) {
    console.error("Failed to initialize GoogleGenAI. Is API_KEY set?", error);
}

const getAppContext = (inventoryData: Vehicle[], salesData: Sale[]): string => {
    const availableInventory = inventoryData.filter(v => v.status === 'Available' || v.status === 'Avail. - No Title');
    const totalInventoryValue = availableInventory.reduce((sum, v) => sum + v.price, 0);

    const context = `
        Current Date: ${new Date().toLocaleDateString()}
        Dealership Name: BBB Auto Sales of Smyrna

        INVENTORY SUMMARY:
        - Total vehicles in stock: ${inventoryData.length}
        - Total vehicles available for sale: ${availableInventory.length}
        - Total value of available inventory: $${totalInventoryValue.toLocaleString()}

        SALES SUMMARY:
        - Total sales recorded: ${salesData.length}
        - Total sales revenue: $${salesData.reduce((sum, s) => sum + s.salePrice, 0).toLocaleString()}

        COLLECTIONS SUMMARY:
        - Total accounts managed: ${COLLECTIONS_DATA.length}
        - Overdue accounts: ${COLLECTIONS_DATA.filter(c => c.status === 'Overdue').length}

        You can provide answers based on this summary or by analyzing the detailed data below if needed.
        INVENTORY_DATA: ${JSON.stringify(inventoryData.slice(0, 3))}...
        SALES_DATA: ${JSON.stringify(salesData.slice(0, 3))}...
    `;
    return context;
}

export const queryAI = async (question: string, inventoryData: Vehicle[], salesData: Sale[]): Promise<string> => {
    if (!ai) {
        return "AI service is not configured. Please check the API key.";
    }

    try {
        const dataContext = getAppContext(inventoryData, salesData);
        const fullPrompt = `You are an AI assistant for a car dealership's internal management system. Your name is "DealerAI". Answer questions concisely based on the provided data context.
        
        ---
        DATA CONTEXT:
        ${dataContext}
        ---

        QUESTION:
        ${question}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });

        return response.text;

    } catch (error) {
        console.error("Error querying Gemini API:", error);
        return "Sorry, I encountered an error while processing your request.";
    }
};