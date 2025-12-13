// Dynamic import of pdf-lib to avoid bundling issues during build
// pdf-lib is imported inside generateContractPacket function

export interface ContractPacketData {
    firstName: string;
    lastName: string;
    phone: string;
    dob: string;
    dlNumber: string;
    ssn?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    county: string;
    vin: string;
    vinLast4: string;
    stockNumber: string;
    bodyStyle: string;
    color: string;
    gps: string;
    miles: string;
    warrantyMonths: string;
    warrantyMiles: string;
    // Vehicle fields (from selectedVehicle)
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    price?: number;
    downPayment?: number;
}

/**
 * Converts camelCase to Title Case
 * Example: "firstName" -> "First Name", "vinLast4" -> "Vin Last 4"
 */
const camelCaseToTitleCase = (str: string): string => {
    return str
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
};

/**
 * Field name mapping: HTML field names -> PDF field names
 * This handles cases where the naming doesn't match exactly
 */
const fieldNameMap: Record<string, string> = {
    // Customer Info
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    dob: 'DOB',
    dlNumber: 'DL Number',
    ssn: 'SSN',
    address: 'Address',
    city: 'City',
    state: 'State',
    zip: 'Zip',
    county: 'County',
    
    // Vehicle Info
    vin: 'VIN',
    vinLast4: 'VIN Last 4',
    stockNumber: 'Stock Number',
    bodyStyle: 'Body Style',
    color: 'Color',
    gps: 'GPS',
    miles: 'Miles',
    year: 'Year',
    make: 'Make',
    model: 'Model',
    trim: 'Trim',
    price: 'Price',
    downPayment: 'Down Payment',
    
    // Warranty
    warrantyMonths: 'Warranty Months',
    warrantyMiles: 'Warranty Miles',
};

/**
 * Gets the PDF field name for a given HTML field name
 * First checks the mapping, then tries camelCase conversion, then returns original
 */
const getPdfFieldName = (htmlFieldName: string): string => {
    // Check explicit mapping first
    if (fieldNameMap[htmlFieldName]) {
        return fieldNameMap[htmlFieldName];
    }
    
    // Try camelCase to Title Case conversion
    const titleCase = camelCaseToTitleCase(htmlFieldName);
    
    // Return the converted name or original if conversion didn't change it
    return titleCase !== htmlFieldName ? titleCase : htmlFieldName;
};

/**
 * Gets the current date in Central Standard Time (CST) formatted as MM/DD/YYYY
 */
const getCurrentDateCST = (): string => {
    const now = new Date();
    // Convert to CST (America/Chicago timezone)
    const cstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    
    const month = String(cstDate.getMonth() + 1).padStart(2, '0');
    const day = String(cstDate.getDate()).padStart(2, '0');
    const year = cstDate.getFullYear();
    
    return `${month}/${day}/${year}`;
};

/**
 * Checks if a field name matches date-related patterns
 */
const isDateField = (fieldName: string): boolean => {
    const lowerName = fieldName.toLowerCase();
    const datePatterns = [
        'date',
        'today',
        'current date',
        'todays date',
        'today\'s date',
        'date today',
        'currentdate',
        'todaysdate'
    ];
    
    return datePatterns.some(pattern => lowerName.includes(pattern));
};

/**
 * Checks if a field name matches name-related patterns (but not first/last name)
 * Excludes special fields like "Name Or Buyer Representative"
 */
const isNameField = (fieldName: string): boolean => {
    const lowerName = fieldName.toLowerCase();
    
    // Exclude special fields that should be handled separately
    if (lowerName.includes('buyer') || lowerName.includes('representative')) {
        return false;
    }
    
    // Match "name" but exclude "first name", "last name", etc.
    // Check if it's exactly "name" or contains "name" as a whole word
    // but not "first name", "last name", "full name", etc.
    if (lowerName === 'name') {
        return true;
    }
    
    // Check if it contains "name" but not "first" or "last" before it
    if (lowerName.includes('name') && 
        !lowerName.includes('first') && 
        !lowerName.includes('last') &&
        !lowerName.includes('full')) {
        // Make sure it's not part of another word
        const nameRegex = /\bname\b/;
        return nameRegex.test(lowerName);
    }
    
    return false;
};

/**
 * Generates a filled contract packet PDF from form data
 */
export const generateContractPacket = async (data: ContractPacketData): Promise<void> => {
    try {
        // Dynamically import pdf-lib to avoid bundling issues during build
        const { PDFDocument, TextAlignment } = await import('pdf-lib');
        
        // Load the PDF template from public directory
        const templateUrl = '/templates/contract_packet.pdf';
        const response = await fetch(templateUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to load PDF template: ${response.statusText}`);
        }
        
        const templateBytes = await response.arrayBuffer();
        
        // Load the PDF document
        const pdfDoc = await PDFDocument.load(templateBytes);
        const form = pdfDoc.getForm();
        
        // Get all form fields
        const fields = form.getFields();
        const fieldNames = fields.map(field => field.getName());
        
        // Helper function to safely set a field value
        const setFieldValue = (htmlFieldName: string, value: string | number | undefined) => {
            if (value === undefined || value === null || value === '') {
                return; // Skip empty values
            }
            
            const pdfFieldName = getPdfFieldName(htmlFieldName);
            const stringValue = String(value);
            
            // Try to find the field by exact name first, then case-insensitive
            const matchingFieldName = fieldNames.find(
                name => name === pdfFieldName || name.toLowerCase() === pdfFieldName.toLowerCase()
            );
            
            if (!matchingFieldName) {
                // Field not found in PDF, skip it
                return;
            }
            
            try {
                // Try to get as text field first (most common)
                try {
                    const textField = form.getTextField(matchingFieldName);
                    textField.setText(stringValue);
                    // Set text alignment to center
                    textField.setAlignment(TextAlignment.Center);
                    return;
                } catch {
                    // Not a text field, try other types
                }
                
                // Try dropdown/choice field
                try {
                    const dropdownField = form.getDropdown(matchingFieldName);
                    // If the value matches an option, select it
                    const options = dropdownField.getOptions();
                    const matchingOption = options.find(opt => 
                        opt.toLowerCase() === stringValue.toLowerCase()
                    );
                    if (matchingOption) {
                        dropdownField.select(matchingOption);
                    }
                    return;
                } catch {
                    // Not a dropdown field
                }
                
                // Try checkbox field (for boolean values)
                try {
                    const checkboxField = form.getCheckBox(matchingFieldName);
                    // Only set if value is a boolean-like string
                    if (stringValue.toLowerCase() === 'true' || stringValue === '1') {
                        checkboxField.check();
                    } else if (stringValue.toLowerCase() === 'false' || stringValue === '0') {
                        checkboxField.uncheck();
                    }
                    return;
                } catch {
                    // Not a checkbox field
                }
                
                // Try radio button group
                try {
                    const radioField = form.getRadioGroup(matchingFieldName);
                    const options = radioField.getOptions();
                    const matchingOption = options.find(opt => 
                        opt.toLowerCase() === stringValue.toLowerCase()
                    );
                    if (matchingOption) {
                        radioField.select(matchingOption);
                    }
                    return;
                } catch {
                    // Not a radio field, skip it
                }
            } catch (error) {
                console.warn(`Failed to set field "${pdfFieldName}":`, error);
            }
        };
        
        // Fill all form fields
        setFieldValue('firstName', data.firstName);
        setFieldValue('lastName', data.lastName);
        setFieldValue('phone', data.phone);
        setFieldValue('dob', data.dob);
        setFieldValue('dlNumber', data.dlNumber);
        setFieldValue('ssn', data.ssn);
        setFieldValue('address', data.address);
        setFieldValue('city', data.city);
        setFieldValue('state', data.state);
        setFieldValue('zip', data.zip);
        setFieldValue('county', data.county);
        setFieldValue('vin', data.vin);
        setFieldValue('vinLast4', data.vinLast4);
        setFieldValue('stockNumber', data.stockNumber);
        setFieldValue('bodyStyle', data.bodyStyle);
        setFieldValue('color', data.color);
        setFieldValue('gps', data.gps);
        setFieldValue('miles', data.miles);
        setFieldValue('warrantyMonths', data.warrantyMonths);
        setFieldValue('warrantyMiles', data.warrantyMiles);
        
        // Vehicle fields (if available)
        if (data.year !== undefined) setFieldValue('year', String(data.year));
        if (data.make) setFieldValue('make', data.make);
        if (data.model) setFieldValue('model', data.model);
        if (data.trim) setFieldValue('trim', data.trim);
        if (data.price !== undefined) setFieldValue('price', String(data.price));
        if (data.downPayment !== undefined) setFieldValue('downPayment', String(data.downPayment));
        
        // Helper function to set a field by exact PDF field name
        const setFieldByExactName = (pdfFieldName: string, value: string) => {
            const matchingFieldName = fieldNames.find(
                name => name === pdfFieldName || name.toLowerCase() === pdfFieldName.toLowerCase()
            );
            
            if (!matchingFieldName) {
                return; // Field not found
            }
            
            try {
                const textField = form.getTextField(matchingFieldName);
                textField.setText(value);
                textField.setAlignment(TextAlignment.Center);
            } catch (error) {
                console.warn(`Could not set field "${pdfFieldName}":`, error);
            }
        };
        
        // Auto-fill date fields with current date in CST
        const currentDateCST = getCurrentDateCST();
        fieldNames.forEach((fieldName) => {
            if (isDateField(fieldName)) {
                try {
                    const textField = form.getTextField(fieldName);
                    textField.setText(currentDateCST);
                    textField.setAlignment(TextAlignment.Center);
                } catch (error) {
                    // Not a text field or field doesn't exist, skip it
                    console.warn(`Could not set date for field "${fieldName}":`, error);
                }
            }
        });
        
        // Auto-fill name fields with combined first and last name
        // (This runs before special fields to avoid conflicts)
        const fullName = `${data.firstName} ${data.lastName}`.trim();
        if (fullName) {
            fieldNames.forEach((fieldName) => {
                if (isNameField(fieldName)) {
                    try {
                        const textField = form.getTextField(fieldName);
                        textField.setText(fullName);
                        textField.setAlignment(TextAlignment.Center);
                    } catch (error) {
                        // Not a text field or field doesn't exist, skip it
                        console.warn(`Could not set name for field "${fieldName}":`, error);
                    }
                }
            });
        }
        
        // Special field: "Name Or Buyer Representative" (Page 12)
        // Format: "${first} ${last} Or Buyer Representative"
        // This must run AFTER the auto-fill name logic to ensure it doesn't get overwritten
        if (data.firstName && data.lastName) {
            const buyerRepresentative = `${data.firstName} ${data.lastName} Or Buyer Representative`;
            setFieldByExactName('Name Or Buyer Representative', buyerRepresentative);
        }
        
        // Special field: "Year Make Model" (Pages 14-15)
        // Format: Year + Make + Model
        if (data.year !== undefined && data.make && data.model) {
            const yearMakeModel = `${data.year} ${data.make} ${data.model}`;
            setFieldByExactName('Year Make Model', yearMakeModel);
        }
        
        // Special fields: "Warranty Miles" and "Warranty Months" (Pages 14-15)
        // These should use the warranty container values
        if (data.warrantyMiles) {
            setFieldByExactName('Warranty Miles', data.warrantyMiles);
        }
        if (data.warrantyMonths) {
            setFieldByExactName('Warranty Months', data.warrantyMonths);
        }
        
        // Special field: GPS (on new page at end of PDF)
        // Try multiple variations to ensure GPS field gets filled
        if (data.gps) {
            // First try the standard mapping (already done above, but try exact name as well)
            setFieldByExactName('GPS', data.gps);
            
            // Also try case-insensitive search for any field containing "gps"
            // This handles variations like "GPS Serial Number", "GPS Serial", etc.
            const gpsFieldName = fieldNames.find(name => {
                const lowerName = name.toLowerCase();
                return (lowerName.includes('gps') && 
                       !lowerName.includes('warranty') && 
                       !lowerName.includes('miles') &&
                       !lowerName.includes('months'));
            });
            
            if (gpsFieldName) {
                try {
                    const textField = form.getTextField(gpsFieldName);
                    textField.setText(data.gps);
                    textField.setAlignment(TextAlignment.Center);
                } catch (textFieldError) {
                    // Field might not be a text field, try other types
                    try {
                        const dropdownField = form.getDropdown(gpsFieldName);
                        const options = dropdownField.getOptions();
                        const matchingOption = options.find(opt => 
                            opt.toLowerCase() === data.gps.toLowerCase()
                        );
                        if (matchingOption) {
                            dropdownField.select(matchingOption);
                        }
                    } catch (dropdownError) {
                        console.warn(`Could not set GPS field "${gpsFieldName}":`, dropdownError);
                    }
                }
            }
        }
        
        // Set font size to 8 for text fields on pages 5-14 (0-indexed: pages 4-13)
        const pages = pdfDoc.getPages();
        const targetPageIndices = new Set([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]); // Pages 5-14 (0-indexed)
        
        // Get all text fields and check which page they're on
        fields.forEach((field) => {
            try {
                // Check if it's a text field
                const textField = form.getTextField(field.getName());
                
                // Get the field's widgets (each widget represents an appearance on a page)
                const widgets = textField.acroField.getWidgets();
                
                // Check each widget to see if it's on pages 5-14
                for (const widget of widgets) {
                    try {
                        // Get the page reference from the widget dictionary using 'P' key
                        const pageRef = widget.dict.lookup('P');
                        
                        if (pageRef) {
                            // Find which page index this widget belongs to
                            for (let i = 0; i < pages.length; i++) {
                                // Compare page references
                                if (pages[i].ref === pageRef || pages[i].ref.toString() === pageRef.toString()) {
                                    // If this field is on pages 5-14, set font size to 8
                                    if (targetPageIndices.has(i)) {
                                        try {
                                            textField.setFontSize(8);
                                        } catch (error) {
                                            // If setFontSize fails, the field might not support it
                                            console.warn(`Could not set font size for field "${field.getName()}" on page ${i + 1}:`, error);
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    } catch (error) {
                        // Could not determine page for this widget, skip it
                        continue;
                    }
                }
            } catch {
                // Not a text field, skip it
            }
        });
        
        // Flatten the form (make fields non-editable)
        form.flatten();
        
        // Generate PDF bytes
        const pdfBytes = await pdfDoc.save();
        
        // Create filename from first and last name
        // Sanitize names for filename (remove special characters, spaces, etc.)
        const sanitizeForFilename = (str: string): string => {
            return str
                .trim()
                .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
                .replace(/_+/g, '_') // Replace multiple underscores with single
                .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
        };
        
        const firstName = sanitizeForFilename(data.firstName || 'Client');
        const lastName = sanitizeForFilename(data.lastName || 'Packet');
        const filename = `${firstName}_${lastName}_Packet.pdf`;
        
        // Trigger browser download
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Error generating contract packet:', error);
        throw error;
    }
};

