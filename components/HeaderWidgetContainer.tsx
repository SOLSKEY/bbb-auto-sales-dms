import React from 'react';
import DealCalculatorWidget from './widgets/DealCalculatorWidget';
import InventoryTextOutWidget from './widgets/InventoryTextOutWidget';

/**
 * Container component that houses all widgets in the header.
 * Widgets are displayed as compact buttons/icons in the center of the header.
 */
const HeaderWidgetContainer: React.FC = () => {
    return (
        <div className="flex items-center justify-center gap-3 flex-1 px-4">
            <DealCalculatorWidget />
            <InventoryTextOutWidget />
            {/* Future widgets can be added here */}
        </div>
    );
};

export default HeaderWidgetContainer;

