// Mapping between app field names (camelCase) and Supabase column names (with spaces)

const SIMPLE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export const quoteSupabaseColumn = (column: string): string => {
  if (column.startsWith('"') && column.endsWith('"')) return column;
  if (SIMPLE_IDENTIFIER.test(column)) return column;
  const escaped = column.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const VEHICLE_FIELD_MAP = {
  // App field -> Supabase column
  id: 'id',
  status: 'Status',
  arrivalDate: 'Arrival Date',
  vinLast4: 'Vin Last 4',
  year: 'Year',
  make: 'Make',
  model: 'Model',
  trim: 'Trim',
  exterior: 'Exterior',
  interior: 'Interior',
  upholstery: 'Upholstery',
  bodyStyle: 'Body Style',
  driveTrain: 'Drive Train',
  mileage: 'Mileage',
  mileageUnit: 'Mileage Unit',
  transmission: 'Transmission',
  fuelType: 'Fuel Type',
  engine: 'Engine',
  price: 'Price',
  downPayment: 'Down Payment',
  vin: 'VIN',
  vehicleId: 'Vehicle ID',
  images: 'image_urls',
  binNumber: 'Bin Number',
  gps: 'GPS',
  isNameChange: 'Is Name Change',
};

export const SALE_FIELD_MAP = {
  id: 'id',
  saleDate: 'Sale Date',
  accountNumber: 'account_number',
  stockNumber: 'Stock #',
  saleType: 'Type',
  salesperson: 'Salesman',
  salespersonSplit: 'Salesperson Split',
  saleDownPayment: 'True Down Payment',
  vinLast4: 'Vin Last 4',
  year: 'Year',
  make: 'Make',
  model: 'Model',
  trim: 'Trim',
  exterior: 'Exterior',
  interior: 'Interior',
  upholstery: 'Upholstery',
  mileage: 'Mileage',
  mileageUnit: 'Mileage Unit',
  salePrice: 'Price',
  downPayment: 'Down Payment',
  vin: 'VIN',
  saleId: 'account_number', // Primary key
};

export const DELINQUENCY_FIELD_MAP = {
  date: 'Date',
  overdueAccounts: 'Overdue Accounts',
  openAccounts: 'Open Accounts',
};

export const PAYMENTS_FIELD_MAP = {
  date: 'Date',
  payments: 'Payments',
  lateFees: 'Late Fees',
  boaZelle: 'BOA',
};

export const USER_FIELD_MAP = {
  id: 'id',
  name: 'Name',
  username: 'Username',
  password: 'Password',
  phone: 'Phone',
};

// Convert app object to Supabase format
interface SupabaseMapOptions {
  quoteKeys?: boolean;
}

const stripQuotes = (value: string) => {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"');
  }
  return value;
};

export function toSupabase(
  appData: any,
  fieldMap: Record<string, string>,
  options: SupabaseMapOptions = {},
) {
  const supabaseData: any = {};
  const quoteKeys = options.quoteKeys ?? false;

  for (const [appField, supabaseColumn] of Object.entries(fieldMap)) {
    if (appField in appData) {
      const baseKey = stripQuotes(supabaseColumn);
      const key = quoteKeys ? quoteSupabaseColumn(baseKey) : baseKey;
      supabaseData[key] = appData[appField];
    }
  }
  return supabaseData;
}

// Convert Supabase object to app format
export function fromSupabase(supabaseData: any, fieldMap: Record<string, string>) {
  const appData: any = {};
  // Create reverse map
  const reverseMap: Record<string, string> = {};
  for (const [appField, supabaseColumn] of Object.entries(fieldMap)) {
    const base = stripQuotes(supabaseColumn);
    reverseMap[base] = appField;
    const quoted = quoteSupabaseColumn(base);
    reverseMap[quoted] = appField;
  }

  for (const [supabaseColumn, value] of Object.entries(supabaseData)) {
    const appField =
      reverseMap[supabaseColumn] ?? reverseMap[stripQuotes(supabaseColumn)] ?? reverseMap[quoteSupabaseColumn(supabaseColumn)];
    if (appField) {
      appData[appField] = value;
    }
  }
  return appData;
}

// Convert array of Supabase objects to app format
export function fromSupabaseArray(supabaseArray: any[], fieldMap: Record<string, string>) {
  return supabaseArray.map(item => fromSupabase(item, fieldMap));
}
