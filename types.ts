
export type Role = 'admin' | 'worker' | 'driver' | null;

export type Language = 'fr' | 'ar';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  roles: ('admin' | 'worker' | 'driver' | null)[];
}

export interface ElementPosition {
  x: number;
  y: number;
}

export interface CustomText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  isBold: boolean;
}

export interface InvoiceDesign {
  logoPosition: ElementPosition;
  titlePosition: ElementPosition;
  clientInfoPosition: ElementPosition;
  carInfoPosition: ElementPosition;
  financialsPosition: ElementPosition;
  extraTexts: CustomText[];
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontSizeBase: number;
  headerPadding: number;
  showChecklist: boolean;
  labels: {
    title: string;
    total: string;
    date: string;
    ref: string;
    safetyTitle: string;
    equipmentTitle: string;
    comfortTitle: string;
    partnerLabel: string;
    carLabel: string;
  };
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  type: string;
  design: InvoiceDesign;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  photo_url?: string;
  dob?: string;
  pob?: string;
  address?: string;
  mobile: string;
  phone2?: string;
  nif?: string;
  rc?: string;
  nis?: string;
  art?: string;
  idDocType?: string;
  idDocNumber?: string;
  id_doc_image_urls?: string[];
  purchaseHistory?: {
    id: string;
    date: string;
    item: string;
    amount: number;
  }[];
  created_at?: string;
  created_by?: string;
}

export interface SaleRecord {
  id?: string;
  car_id: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender?: string;
  pob?: string;
  address?: string;
  profession?: string;
  mobile1: string;
  mobile2?: string;
  nif?: string;
  rc?: string;
  nis?: string;
  art?: string;
  doc_type?: string;
  doc_number: string;
  issue_date?: string;
  expiry_date?: string;
  photo_url?: string;
  scan_url?: string;
  signature_url?: string;
  total_price: number;
  amount_paid: number;
  balance: number;
  status: 'completed' | 'debt';
  created_at?: string;
  created_by?: string;
  car?: PurchaseRecord;
}

export interface PurchaseRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  make: string;
  model: string;
  plate: string;
  year: string;
  color: string;
  vin: string;
  fuel: 'essence' | 'diesel';
  transmission: 'manuelle' | 'auto';
  seats: number;
  doors: number;
  mileage: number;
  insuranceExpiry: string;
  techControlDate: string;
  insuranceCompany: string;
  photo_urls: string[];
  totalCost: number;
  sellingPrice: number;
  dateAdded: string;
  purchaseDateTime?: string;
  created_at?: string;
  is_sold?: boolean;
  created_by?: string;
}

export interface InspectionRecord {
  id: string;
  type: 'checkin' | 'checkout';
  car_id: string;
  carName: string;
  vin: string;
  date: string;
  mileage: number;
  safety: any;
  equipment: any;
  comfort: any;
  note?: string;
  exterior_photo_urls: string[];
  interior_photo_urls: string[];
  partner_name: string;
  created_by?: string;
}

export interface Worker {
  id: string;
  fullname: string;
  birthday?: string;
  telephone: string;
  email?: string;
  address?: string;
  id_card?: string;
  type: string;
  role?: 'admin' | 'worker' | 'driver';
  payment_type: 'month' | 'day';
  amount: number;
  photo_url?: string;
  username?: string;
  password?: string;
  created_at?: string;
  created_by?: string;
}

export interface Expense {
  id: string;
  name: string;
  cost: number;
  date: string;
  created_by?: string;
}

export interface VehicleExpense {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  vehicle_make: string;
  vehicle_model: string;
  name: string;
  cost: number;
  date: string;
  note?: string;
  created_at?: string;
  created_by?: string;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: 'vidange' | 'assurance' | 'controle' | 'other';
  name: string;
  cost: number;
  date: string;
  expiryDate?: string;
  note?: string;
  created_by?: string;
}

export interface BillingRecord {
  id: string;
  type: 'sale' | 'purchase' | 'checkin' | 'checkout';
  ref: string;
  date: string;
  partner: string;
  amount?: number;
  car: string;
}

export interface ShowroomConfig {
  id: number;
  name: string;
  slogan: string;
  address: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
  logo_url?: string;
  updated_at?: string;
}
