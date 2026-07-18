import { PrismaClient, type LoadStatus } from '@prisma/client';

const prisma = new PrismaClient();

type City = {
  city: string;
  state: string;
  lat: number;
  lng: number;
};

type DemoLoad = {
  code: string;
  clientMc: string;
  driverId: string;
  truckId: string;
  pickup: City;
  delivery: City;
  status: LoadStatus;
  invoiceStatus: 'PENDING' | 'UNPAID' | 'PAID';
  paymentStatus: 'PENDING' | 'RECEIVED' | 'OVERDUE';
  monthOffset: number;
  day: number;
  rate: number;
  miles: number;
  commodity: string;
  weight: number;
  brokerContact: string;
  brokerEmail: string;
  brokerPhone: string;
};

const clients = [
  {
    companyName: 'Blue Ridge Carriers LLC',
    mc: 'CRM900101',
    dot: 'DOT900101',
    dispatchFeePercent: 10,
    address: '812 Trade Street',
    city: 'Charlotte',
    state: 'NC',
    zip: '28202',
    notes: 'Regional dry van carrier focused on Southeast and Texas lanes.',
    contact: {
      name: 'Mason Reed',
      email: 'mason.reed@blueridge-demo.test',
      phone: '+1-704-555-0188',
      telegram: '@mason_brc_demo',
      role: 'Owner',
    },
  },
  {
    companyName: 'Lone Star Reefer Group',
    mc: 'CRM900102',
    dot: 'DOT900102',
    dispatchFeePercent: 9.5,
    address: '1900 Commerce Avenue',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    notes: 'Temperature-controlled fleet running produce and grocery freight.',
    contact: {
      name: 'Ava Collins',
      email: 'ava.collins@lonestar-demo.test',
      phone: '+1-214-555-0142',
      telegram: '@ava_lsr_demo',
      role: 'Operations',
    },
  },
  {
    companyName: 'Great Lakes Freight Co.',
    mc: 'CRM900103',
    dot: 'DOT900103',
    dispatchFeePercent: 11,
    address: '404 Lake Shore Drive',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    notes: 'Midwest carrier handling flatbed and industrial freight.',
    contact: {
      name: 'Ethan Brooks',
      email: 'ethan.brooks@greatlakes-demo.test',
      phone: '+1-312-555-0199',
      telegram: '@ethan_glf_demo',
      role: 'Fleet Manager',
    },
  },
];

const trucks = [
  {
    id: 'demo-truck-br-2401',
    clientMc: 'CRM900101',
    truckNumber: 'BR-2401',
    vin: 'DEMOCRMVIN2401',
    plate: 'NC2401',
    plateState: 'NC',
    trailerType: 'DRY_VAN' as const,
    year: 2022,
    make: 'Freightliner',
    model: 'Cascadia',
  },
  {
    id: 'demo-truck-ls-7812',
    clientMc: 'CRM900102',
    truckNumber: 'LS-7812',
    vin: 'DEMOCRMVIN7812',
    plate: 'TX7812',
    plateState: 'TX',
    trailerType: 'REEFER' as const,
    year: 2021,
    make: 'Kenworth',
    model: 'T680',
  },
  {
    id: 'demo-truck-gl-5150',
    clientMc: 'CRM900103',
    truckNumber: 'GL-5150',
    vin: 'DEMOCRMVIN5150',
    plate: 'IL5150',
    plateState: 'IL',
    trailerType: 'FLATBED' as const,
    year: 2020,
    make: 'Peterbilt',
    model: '579',
  },
  {
    id: 'demo-truck-br-2402',
    clientMc: 'CRM900101',
    truckNumber: 'BR-2402',
    vin: 'DEMOCRMVIN2402',
    plate: 'NC2402',
    plateState: 'NC',
    trailerType: 'DRY_VAN' as const,
    year: 2023,
    make: 'Volvo',
    model: 'VNL',
  },
];

const drivers = [
  {
    id: 'demo-driver-caleb',
    clientMc: 'CRM900101',
    truckId: 'demo-truck-br-2401',
    fullName: 'Caleb Anderson',
    phone: '+1-704-555-0101',
    email: 'caleb.anderson@driver-demo.test',
    telegram: '@caleb_anderson_demo',
    cdlNumber: 'NC-DEMO-2401',
    cdlState: 'NC',
    homeBase: 'Charlotte, NC',
    preferredLanes: ['NC-TX', 'NC-TN', 'NC-FL'],
    score: 97,
  },
  {
    id: 'demo-driver-diego',
    clientMc: 'CRM900102',
    truckId: 'demo-truck-ls-7812',
    fullName: 'Diego Ramirez',
    phone: '+1-214-555-0102',
    email: 'diego.ramirez@driver-demo.test',
    telegram: '@diego_ramirez_demo',
    cdlNumber: 'TX-DEMO-7812',
    cdlState: 'TX',
    homeBase: 'Dallas, TX',
    preferredLanes: ['TX-AZ', 'TX-CO', 'TX-NM'],
    score: 94,
  },
  {
    id: 'demo-driver-marcus',
    clientMc: 'CRM900103',
    truckId: 'demo-truck-gl-5150',
    fullName: 'Marcus Lee',
    phone: '+1-312-555-0103',
    email: 'marcus.lee@driver-demo.test',
    telegram: '@marcus_lee_demo',
    cdlNumber: 'IL-DEMO-5150',
    cdlState: 'IL',
    homeBase: 'Chicago, IL',
    preferredLanes: ['IL-GA', 'MI-TN', 'IL-OH'],
    score: 91,
  },
  {
    id: 'demo-driver-owen',
    clientMc: 'CRM900101',
    truckId: 'demo-truck-br-2402',
    fullName: 'Owen Parker',
    phone: '+1-704-555-0104',
    email: 'owen.parker@driver-demo.test',
    telegram: '@owen_parker_demo',
    cdlNumber: 'NC-DEMO-2402',
    cdlState: 'NC',
    homeBase: 'Raleigh, NC',
    preferredLanes: ['NC-FL', 'NC-GA', 'NC-VA'],
    score: 89,
  },
];

const cities = {
  charlotte: { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  dallas: { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  phoenix: { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  chicago: { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  atlanta: { city: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  raleigh: { city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 },
  jacksonville: { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557 },
  houston: { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  denver: { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  detroit: { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  nashville: { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  memphis: { city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.049 },
  albuquerque: { city: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
};

const demoLoads: DemoLoad[] = [
  {
    code: 'DEMO-260601',
    clientMc: 'CRM900101',
    driverId: 'demo-driver-caleb',
    truckId: 'demo-truck-br-2401',
    pickup: cities.charlotte,
    delivery: cities.dallas,
    status: 'PAID',
    invoiceStatus: 'PAID',
    paymentStatus: 'RECEIVED',
    monthOffset: -1,
    day: 3,
    rate: 3450,
    miles: 1040,
    commodity: 'Retail fixtures',
    weight: 21000,
    brokerContact: 'PrimeRoute Brokerage',
    brokerEmail: 'ops@primeroute-demo.test',
    brokerPhone: '+1-800-555-1001',
  },
  {
    code: 'DEMO-260607',
    clientMc: 'CRM900102',
    driverId: 'demo-driver-diego',
    truckId: 'demo-truck-ls-7812',
    pickup: cities.dallas,
    delivery: cities.phoenix,
    status: 'PAID',
    invoiceStatus: 'PAID',
    paymentStatus: 'RECEIVED',
    monthOffset: -1,
    day: 7,
    rate: 2850,
    miles: 1065,
    commodity: 'Frozen grocery',
    weight: 36000,
    brokerContact: 'ColdChain Direct',
    brokerEmail: 'loads@coldchain-demo.test',
    brokerPhone: '+1-800-555-1002',
  },
  {
    code: 'DEMO-260618',
    clientMc: 'CRM900103',
    driverId: 'demo-driver-marcus',
    truckId: 'demo-truck-gl-5150',
    pickup: cities.chicago,
    delivery: cities.atlanta,
    status: 'CLOSED',
    invoiceStatus: 'PAID',
    paymentStatus: 'RECEIVED',
    monthOffset: -1,
    day: 18,
    rate: 3100,
    miles: 720,
    commodity: 'Steel coils',
    weight: 42000,
    brokerContact: 'Industrial Lane Partners',
    brokerEmail: 'dispatch@industriallane-demo.test',
    brokerPhone: '+1-800-555-1003',
  },
  {
    code: 'DEMO-260702',
    clientMc: 'CRM900101',
    driverId: 'demo-driver-owen',
    truckId: 'demo-truck-br-2402',
    pickup: cities.raleigh,
    delivery: cities.jacksonville,
    status: 'PAID',
    invoiceStatus: 'PAID',
    paymentStatus: 'RECEIVED',
    monthOffset: 0,
    day: 2,
    rate: 1950,
    miles: 455,
    commodity: 'Packaged foods',
    weight: 18000,
    brokerContact: 'Atlantic Freight Desk',
    brokerEmail: 'team@atlanticfreight-demo.test',
    brokerPhone: '+1-800-555-1004',
  },
  {
    code: 'DEMO-260705',
    clientMc: 'CRM900102',
    driverId: 'demo-driver-diego',
    truckId: 'demo-truck-ls-7812',
    pickup: cities.houston,
    delivery: cities.denver,
    status: 'INVOICED',
    invoiceStatus: 'UNPAID',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 5,
    rate: 2650,
    miles: 1025,
    commodity: 'Fresh produce',
    weight: 39000,
    brokerContact: 'Mountain West Logistics',
    brokerEmail: 'ap@mountainwest-demo.test',
    brokerPhone: '+1-800-555-1005',
  },
  {
    code: 'DEMO-260708',
    clientMc: 'CRM900103',
    driverId: 'demo-driver-marcus',
    truckId: 'demo-truck-gl-5150',
    pickup: cities.detroit,
    delivery: cities.nashville,
    status: 'DELIVERED',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 8,
    rate: 2200,
    miles: 535,
    commodity: 'Machinery parts',
    weight: 27500,
    brokerContact: 'MidSouth Freight Co.',
    brokerEmail: 'billing@midsouth-demo.test',
    brokerPhone: '+1-800-555-1006',
  },
  {
    code: 'DEMO-260709',
    clientMc: 'CRM900101',
    driverId: 'demo-driver-caleb',
    truckId: 'demo-truck-br-2401',
    pickup: cities.charlotte,
    delivery: cities.memphis,
    status: 'IN_TRANSIT',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 9,
    rate: 1750,
    miles: 620,
    commodity: 'Consumer goods',
    weight: 24000,
    brokerContact: 'River City Freight',
    brokerEmail: 'ops@rivercity-demo.test',
    brokerPhone: '+1-800-555-1007',
  },
  {
    code: 'DEMO-260710',
    clientMc: 'CRM900102',
    driverId: 'demo-driver-diego',
    truckId: 'demo-truck-ls-7812',
    pickup: cities.dallas,
    delivery: cities.albuquerque,
    status: 'ASSIGNED',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1600,
    miles: 650,
    commodity: 'Medical supplies',
    weight: 15500,
    brokerContact: 'Desert Line Brokerage',
    brokerEmail: 'loads@desertline-demo.test',
    brokerPhone: '+1-800-555-1008',
  },
];

const extraActiveRoutes: DemoLoad[] = [
  {
    code: 'DEMO-260711',
    clientMc: 'CRM900101',
    driverId: 'demo-driver-mia',
    truckId: 'demo-truck-br-2403',
    pickup: { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
    delivery: { city: 'Boise', state: 'ID', lat: 43.615, lng: -116.2023 },
    status: 'IN_TRANSIT',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1850,
    miles: 505,
    commodity: 'Electronics',
    weight: 18000,
    brokerContact: 'Northwest Freight Desk',
    brokerEmail: 'ops@northwestfreight-demo.test',
    brokerPhone: '+1-800-555-1011',
  },
  {
    code: 'DEMO-260712',
    clientMc: 'CRM900102',
    driverId: 'demo-driver-noah',
    truckId: 'demo-truck-ls-7813',
    pickup: { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
    delivery: { city: 'Las Vegas', state: 'NV', lat: 36.1716, lng: -115.1391 },
    status: 'LOADED',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1350,
    miles: 270,
    commodity: 'Retail displays',
    weight: 16500,
    brokerContact: 'Pacific Lane Brokerage',
    brokerEmail: 'loads@pacificlane-demo.test',
    brokerPhone: '+1-800-555-1012',
  },
  {
    code: 'DEMO-260713',
    clientMc: 'CRM900103',
    driverId: 'demo-driver-ethan',
    truckId: 'demo-truck-gl-5151',
    pickup: { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.265 },
    delivery: { city: 'Omaha', state: 'NE', lat: 41.2565, lng: -95.9345 },
    status: 'EN_ROUTE_TO_PICKUP',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1750,
    miles: 380,
    commodity: 'Paper goods',
    weight: 22500,
    brokerContact: 'Prairie Freight Network',
    brokerEmail: 'dispatch@prairiefreight-demo.test',
    brokerPhone: '+1-800-555-1013',
  },
  {
    code: 'DEMO-260714',
    clientMc: 'CRM900101',
    driverId: 'demo-driver-lucas',
    truckId: 'demo-truck-br-2404',
    pickup: { city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
    delivery: { city: 'St. Louis', state: 'MO', lat: 38.627, lng: -90.1994 },
    status: 'AT_PICKUP',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 950,
    miles: 250,
    commodity: 'Packaging materials',
    weight: 21000,
    brokerContact: 'Show-Me Logistics',
    brokerEmail: 'ops@showme-demo.test',
    brokerPhone: '+1-800-555-1014',
  },
  {
    code: 'DEMO-260715',
    clientMc: 'CRM900102',
    driverId: 'demo-driver-sofia',
    truckId: 'demo-truck-ls-7814',
    pickup: { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
    delivery: { city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 },
    status: 'IN_TRANSIT',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 2100,
    miles: 545,
    commodity: 'Beverages',
    weight: 35000,
    brokerContact: 'Gulf Route Freight',
    brokerEmail: 'loads@gulfroute-demo.test',
    brokerPhone: '+1-800-555-1015',
  },
  {
    code: 'DEMO-260716',
    clientMc: 'CRM900103',
    driverId: 'demo-driver-amelia',
    truckId: 'demo-truck-gl-5152',
    pickup: { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
    delivery: { city: 'Pittsburgh', state: 'PA', lat: 40.4406, lng: -79.9959 },
    status: 'ASSIGNED',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1100,
    miles: 185,
    commodity: 'Auto parts',
    weight: 26000,
    brokerContact: 'Rust Belt Freight',
    brokerEmail: 'ops@rustbelt-demo.test',
    brokerPhone: '+1-800-555-1016',
  },
  {
    code: 'DEMO-260717',
    clientMc: 'CRM900101',
    driverId: 'demo-driver-liam',
    truckId: 'demo-truck-br-2405',
    pickup: { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
    delivery: { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
    status: 'IN_TRANSIT',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1450,
    miles: 305,
    commodity: 'Pharmaceutical supplies',
    weight: 12500,
    brokerContact: 'Northeast Express Desk',
    brokerEmail: 'loads@northeastexpress-demo.test',
    brokerPhone: '+1-800-555-1017',
  },
  {
    code: 'DEMO-260718',
    clientMc: 'CRM900102',
    driverId: 'demo-driver-ava',
    truckId: 'demo-truck-ls-7815',
    pickup: { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
    delivery: { city: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4572 },
    status: 'AT_DELIVERY',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 900,
    miles: 280,
    commodity: 'Produce',
    weight: 32000,
    brokerContact: 'Florida Fresh Freight',
    brokerEmail: 'ops@floridafresh-demo.test',
    brokerPhone: '+1-800-555-1018',
  },
  {
    code: 'DEMO-260719',
    clientMc: 'CRM900103',
    driverId: 'demo-driver-ben',
    truckId: 'demo-truck-gl-5153',
    pickup: { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.891 },
    delivery: { city: 'Reno', state: 'NV', lat: 39.5296, lng: -119.8138 },
    status: 'IN_TRANSIT',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1900,
    miles: 520,
    commodity: 'Construction materials',
    weight: 41000,
    brokerContact: 'High Desert Logistics',
    brokerEmail: 'dispatch@highdesert-demo.test',
    brokerPhone: '+1-800-555-1019',
  },
  {
    code: 'DEMO-260720',
    clientMc: 'CRM900101',
    driverId: 'demo-driver-harper',
    truckId: 'demo-truck-br-2406',
    pickup: { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
    delivery: { city: 'Spokane', state: 'WA', lat: 47.6588, lng: -117.426 },
    status: 'LOADED',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1650,
    miles: 350,
    commodity: 'Home goods',
    weight: 19500,
    brokerContact: 'Cascade Freight Board',
    brokerEmail: 'loads@cascade-demo.test',
    brokerPhone: '+1-800-555-1020',
  },
  {
    code: 'DEMO-260721',
    clientMc: 'CRM900102',
    driverId: 'demo-driver-jackson',
    truckId: 'demo-truck-ls-7816',
    pickup: { city: 'Oklahoma City', state: 'OK', lat: 35.4676, lng: -97.5164 },
    delivery: { city: 'Little Rock', state: 'AR', lat: 34.7465, lng: -92.2896 },
    status: 'IN_TRANSIT',
    invoiceStatus: 'PENDING',
    paymentStatus: 'PENDING',
    monthOffset: 0,
    day: 10,
    rate: 1250,
    miles: 340,
    commodity: 'Consumer packaged goods',
    weight: 26000,
    brokerContact: 'Central Plains Freight',
    brokerEmail: 'ops@centralplains-demo.test',
    brokerPhone: '+1-800-555-1021',
  },
];

trucks.push(
  {
    id: 'demo-truck-br-2403',
    clientMc: 'CRM900101',
    truckNumber: 'BR-2403',
    vin: 'DEMOCRMVIN2403',
    plate: 'NC2403',
    plateState: 'NC',
    trailerType: 'DRY_VAN' as const,
    year: 2023,
    make: 'Freightliner',
    model: 'Cascadia',
  },
  {
    id: 'demo-truck-ls-7813',
    clientMc: 'CRM900102',
    truckNumber: 'LS-7813',
    vin: 'DEMOCRMVIN7813',
    plate: 'TX7813',
    plateState: 'TX',
    trailerType: 'REEFER' as const,
    year: 2022,
    make: 'Kenworth',
    model: 'T680',
  },
  {
    id: 'demo-truck-gl-5151',
    clientMc: 'CRM900103',
    truckNumber: 'GL-5151',
    vin: 'DEMOCRMVIN5151',
    plate: 'IL5151',
    plateState: 'IL',
    trailerType: 'DRY_VAN' as const,
    year: 2021,
    make: 'Volvo',
    model: 'VNL',
  },
  {
    id: 'demo-truck-br-2404',
    clientMc: 'CRM900101',
    truckNumber: 'BR-2404',
    vin: 'DEMOCRMVIN2404',
    plate: 'NC2404',
    plateState: 'NC',
    trailerType: 'DRY_VAN' as const,
    year: 2020,
    make: 'Peterbilt',
    model: '579',
  },
  {
    id: 'demo-truck-ls-7814',
    clientMc: 'CRM900102',
    truckNumber: 'LS-7814',
    vin: 'DEMOCRMVIN7814',
    plate: 'TX7814',
    plateState: 'TX',
    trailerType: 'REEFER' as const,
    year: 2024,
    make: 'Freightliner',
    model: 'Cascadia',
  },
  {
    id: 'demo-truck-gl-5152',
    clientMc: 'CRM900103',
    truckNumber: 'GL-5152',
    vin: 'DEMOCRMVIN5152',
    plate: 'IL5152',
    plateState: 'IL',
    trailerType: 'FLATBED' as const,
    year: 2022,
    make: 'Mack',
    model: 'Anthem',
  },
  {
    id: 'demo-truck-br-2405',
    clientMc: 'CRM900101',
    truckNumber: 'BR-2405',
    vin: 'DEMOCRMVIN2405',
    plate: 'NC2405',
    plateState: 'NC',
    trailerType: 'DRY_VAN' as const,
    year: 2021,
    make: 'International',
    model: 'LT',
  },
  {
    id: 'demo-truck-ls-7815',
    clientMc: 'CRM900102',
    truckNumber: 'LS-7815',
    vin: 'DEMOCRMVIN7815',
    plate: 'TX7815',
    plateState: 'TX',
    trailerType: 'REEFER' as const,
    year: 2023,
    make: 'Volvo',
    model: 'VNL',
  },
  {
    id: 'demo-truck-gl-5153',
    clientMc: 'CRM900103',
    truckNumber: 'GL-5153',
    vin: 'DEMOCRMVIN5153',
    plate: 'IL5153',
    plateState: 'IL',
    trailerType: 'FLATBED' as const,
    year: 2020,
    make: 'Kenworth',
    model: 'T880',
  },
  {
    id: 'demo-truck-br-2406',
    clientMc: 'CRM900101',
    truckNumber: 'BR-2406',
    vin: 'DEMOCRMVIN2406',
    plate: 'NC2406',
    plateState: 'NC',
    trailerType: 'DRY_VAN' as const,
    year: 2024,
    make: 'Freightliner',
    model: 'Cascadia',
  },
  {
    id: 'demo-truck-ls-7816',
    clientMc: 'CRM900102',
    truckNumber: 'LS-7816',
    vin: 'DEMOCRMVIN7816',
    plate: 'TX7816',
    plateState: 'TX',
    trailerType: 'DRY_VAN' as const,
    year: 2022,
    make: 'Peterbilt',
    model: '579',
  },
);

drivers.push(
  {
    id: 'demo-driver-mia',
    clientMc: 'CRM900101',
    truckId: 'demo-truck-br-2403',
    fullName: 'Mia Thompson',
    phone: '+1-704-555-0111',
    email: 'mia.thompson@driver-demo.test',
    telegram: '@mia_thompson_demo',
    cdlNumber: 'NC-DEMO-2403',
    cdlState: 'NC',
    homeBase: 'Charlotte, NC',
    preferredLanes: ['WA-ID', 'OR-WA', 'NC-TN'],
    score: 92,
  },
  {
    id: 'demo-driver-noah',
    clientMc: 'CRM900102',
    truckId: 'demo-truck-ls-7813',
    fullName: 'Noah Bennett',
    phone: '+1-214-555-0112',
    email: 'noah.bennett@driver-demo.test',
    telegram: '@noah_bennett_demo',
    cdlNumber: 'TX-DEMO-7813',
    cdlState: 'TX',
    homeBase: 'Dallas, TX',
    preferredLanes: ['CA-NV', 'TX-AZ', 'TX-NM'],
    score: 90,
  },
  {
    id: 'demo-driver-ethan',
    clientMc: 'CRM900103',
    truckId: 'demo-truck-gl-5151',
    fullName: 'Ethan Wright',
    phone: '+1-312-555-0113',
    email: 'ethan.wright@driver-demo.test',
    telegram: '@ethan_wright_demo',
    cdlNumber: 'IL-DEMO-5151',
    cdlState: 'IL',
    homeBase: 'Chicago, IL',
    preferredLanes: ['MN-NE', 'IL-MO', 'WI-IA'],
    score: 88,
  },
  {
    id: 'demo-driver-lucas',
    clientMc: 'CRM900101',
    truckId: 'demo-truck-br-2404',
    fullName: 'Lucas Carter',
    phone: '+1-704-555-0114',
    email: 'lucas.carter@driver-demo.test',
    telegram: '@lucas_carter_demo',
    cdlNumber: 'NC-DEMO-2404',
    cdlState: 'NC',
    homeBase: 'Raleigh, NC',
    preferredLanes: ['MO-MO', 'NC-VA', 'NC-GA'],
    score: 86,
  },
  {
    id: 'demo-driver-sofia',
    clientMc: 'CRM900102',
    truckId: 'demo-truck-ls-7814',
    fullName: 'Sofia Martinez',
    phone: '+1-214-555-0115',
    email: 'sofia.martinez@driver-demo.test',
    telegram: '@sofia_martinez_demo',
    cdlNumber: 'TX-DEMO-7814',
    cdlState: 'TX',
    homeBase: 'San Antonio, TX',
    preferredLanes: ['TX-LA', 'TX-FL', 'TX-OK'],
    score: 95,
  },
  {
    id: 'demo-driver-amelia',
    clientMc: 'CRM900103',
    truckId: 'demo-truck-gl-5152',
    fullName: 'Amelia Brooks',
    phone: '+1-312-555-0116',
    email: 'amelia.brooks@driver-demo.test',
    telegram: '@amelia_brooks_demo',
    cdlNumber: 'IL-DEMO-5152',
    cdlState: 'IL',
    homeBase: 'Columbus, OH',
    preferredLanes: ['OH-PA', 'MI-OH', 'IL-IN'],
    score: 89,
  },
  {
    id: 'demo-driver-liam',
    clientMc: 'CRM900101',
    truckId: 'demo-truck-br-2405',
    fullName: 'Liam Foster',
    phone: '+1-704-555-0117',
    email: 'liam.foster@driver-demo.test',
    telegram: '@liam_foster_demo',
    cdlNumber: 'NC-DEMO-2405',
    cdlState: 'NC',
    homeBase: 'Philadelphia, PA',
    preferredLanes: ['PA-MA', 'NY-PA', 'NJ-MD'],
    score: 91,
  },
  {
    id: 'demo-driver-ava',
    clientMc: 'CRM900102',
    truckId: 'demo-truck-ls-7815',
    fullName: 'Ava Robinson',
    phone: '+1-214-555-0118',
    email: 'ava.robinson@driver-demo.test',
    telegram: '@ava_robinson_demo',
    cdlNumber: 'TX-DEMO-7815',
    cdlState: 'TX',
    homeBase: 'Miami, FL',
    preferredLanes: ['FL-FL', 'FL-GA', 'FL-SC'],
    score: 93,
  },
  {
    id: 'demo-driver-ben',
    clientMc: 'CRM900103',
    truckId: 'demo-truck-gl-5153',
    fullName: 'Ben Harris',
    phone: '+1-312-555-0119',
    email: 'ben.harris@driver-demo.test',
    telegram: '@ben_harris_demo',
    cdlNumber: 'IL-DEMO-5153',
    cdlState: 'IL',
    homeBase: 'Salt Lake City, UT',
    preferredLanes: ['UT-NV', 'CO-UT', 'NV-CA'],
    score: 87,
  },
  {
    id: 'demo-driver-harper',
    clientMc: 'CRM900101',
    truckId: 'demo-truck-br-2406',
    fullName: 'Harper Wilson',
    phone: '+1-704-555-0120',
    email: 'harper.wilson@driver-demo.test',
    telegram: '@harper_wilson_demo',
    cdlNumber: 'NC-DEMO-2406',
    cdlState: 'NC',
    homeBase: 'Portland, OR',
    preferredLanes: ['OR-WA', 'WA-ID', 'OR-CA'],
    score: 90,
  },
  {
    id: 'demo-driver-jackson',
    clientMc: 'CRM900102',
    truckId: 'demo-truck-ls-7816',
    fullName: 'Jackson Miller',
    phone: '+1-214-555-0121',
    email: 'jackson.miller@driver-demo.test',
    telegram: '@jackson_miller_demo',
    cdlNumber: 'TX-DEMO-7816',
    cdlState: 'TX',
    homeBase: 'Oklahoma City, OK',
    preferredLanes: ['OK-AR', 'OK-TX', 'OK-MO'],
    score: 88,
  },
);

demoLoads.push(...extraActiveRoutes);

function monthDate(monthOffset: number, day: number, hour = 12) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function capAtNow(date: Date) {
  const now = new Date();
  return date > now ? now : date;
}

function capCompletedAt(date: Date) {
  const now = new Date();
  if (date <= now) return date;

  const capped = new Date(now);
  capped.setDate(now.getDate() - 1);
  capped.setHours(17, 0, 0, 0);
  return capped;
}

function interpolate(start: City, end: City, progress: number) {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  };
}

function avatarFor(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1e40af,047857,be123c,7c3aed,c2410c`;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
  });
  const dispatcher = users.find((user) => !user.clerkId.startsWith('seed-')) ?? users[0];

  if (!dispatcher) {
    throw new Error('No active user found. Sign in once, then rerun this demo seed.');
  }

  const existingSettings = await prisma.companySettings.findFirst();
  if (existingSettings) {
    await prisma.companySettings.update({
      where: { id: existingSettings.id },
      data: {
        companyName: 'Dispatch CRM Demo Co.',
        companyPercentage: 10,
        seniorCommissionRate: 1.5,
        targetRpm: 2.75,
        fixedExpenses: 4200,
        timezone: 'America/Chicago',
      },
    });
  } else {
    await prisma.companySettings.create({
      data: {
        companyName: 'Dispatch CRM Demo Co.',
        companyPercentage: 10,
        seniorCommissionRate: 1.5,
        targetRpm: 2.75,
        fixedExpenses: 4200,
        timezone: 'America/Chicago',
      },
    });
  }

  const clientByMc = new Map<string, { id: string; dispatchFeePercent: number }>();
  for (const client of clients) {
    const saved = await prisma.client.upsert({
      where: { mc: client.mc },
      update: {
        companyName: client.companyName,
        dot: client.dot,
        status: 'ACTIVE',
        deletedAt: null,
        dispatchFeePercent: client.dispatchFeePercent,
        dispatcherId: dispatcher.id,
        address: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip,
        notes: client.notes,
      },
      create: {
        companyName: client.companyName,
        mc: client.mc,
        dot: client.dot,
        status: 'ACTIVE',
        dispatchFeePercent: client.dispatchFeePercent,
        dispatcherId: dispatcher.id,
        address: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip,
        notes: client.notes,
      },
      select: { id: true, dispatchFeePercent: true },
    });

    await prisma.clientContact.deleteMany({ where: { clientId: saved.id, isPrimary: true } });
    await prisma.clientContact.create({
      data: {
        clientId: saved.id,
        ...client.contact,
        isPrimary: true,
      },
    });

    clientByMc.set(client.mc, saved);
  }

  const truckIds = trucks.map((truck) => truck.id);
  await prisma.driver.updateMany({
    where: { currentTruckId: { in: truckIds } },
    data: { currentTruckId: null },
  });

  for (const truck of trucks) {
    const client = clientByMc.get(truck.clientMc);
    if (!client) continue;

    await prisma.truck.upsert({
      where: { id: truck.id },
      update: {
        clientId: client.id,
        truckNumber: truck.truckNumber,
        vin: truck.vin,
        plate: truck.plate,
        plateState: truck.plateState,
        trailerType: truck.trailerType,
        maintenanceStatus: 'OK',
        deletedAt: null,
        insuranceExp: monthDate(7, 15),
        registrationExp: monthDate(9, 1),
        iftaExp: monthDate(5, 30),
        year: truck.year,
        make: truck.make,
        model: truck.model,
        notes: 'Demo fleet unit for dashboard and map previews.',
      },
      create: {
        id: truck.id,
        clientId: client.id,
        truckNumber: truck.truckNumber,
        vin: truck.vin,
        plate: truck.plate,
        plateState: truck.plateState,
        trailerType: truck.trailerType,
        maintenanceStatus: 'OK',
        insuranceExp: monthDate(7, 15),
        registrationExp: monthDate(9, 1),
        iftaExp: monthDate(5, 30),
        year: truck.year,
        make: truck.make,
        model: truck.model,
        notes: 'Demo fleet unit for dashboard and map previews.',
      },
    });
  }

  for (const driver of drivers) {
    const client = clientByMc.get(driver.clientMc);
    if (!client) continue;

    await prisma.driver.upsert({
      where: { id: driver.id },
      update: {
        clientId: client.id,
        fullName: driver.fullName,
        phone: driver.phone,
        email: driver.email,
        avatarUrl: avatarFor(driver.fullName),
        telegram: driver.telegram,
        cdlNumber: driver.cdlNumber,
        cdlState: driver.cdlState,
        cdlExpiry: monthDate(18, 1),
        status: 'AVAILABLE',
        homeBase: driver.homeBase,
        preferredLanes: driver.preferredLanes,
        currentTruckId: driver.truckId,
        currentLoadId: null,
        dispatcherId: dispatcher.id,
        updaterId: dispatcher.id,
        score: driver.score,
        hosAvailableUntil: addDays(new Date(), 1),
        deletedAt: null,
        notes: 'Demo driver with active history, finance, and map records.',
      },
      create: {
        id: driver.id,
        clientId: client.id,
        fullName: driver.fullName,
        phone: driver.phone,
        email: driver.email,
        avatarUrl: avatarFor(driver.fullName),
        telegram: driver.telegram,
        cdlNumber: driver.cdlNumber,
        cdlState: driver.cdlState,
        cdlExpiry: monthDate(18, 1),
        status: 'AVAILABLE',
        homeBase: driver.homeBase,
        preferredLanes: driver.preferredLanes,
        currentTruckId: driver.truckId,
        dispatcherId: dispatcher.id,
        updaterId: dispatcher.id,
        score: driver.score,
        hosAvailableUntil: addDays(new Date(), 1),
        notes: 'Demo driver with active history, finance, and map records.',
      },
    });
  }

  const broker = await prisma.broker.upsert({
    where: { mc: 'CRM-BROKER-100' },
    update: {
      name: 'Demo National Brokerage',
      email: 'ops@demo-national-brokerage.test',
      phone: '+1-800-555-1100',
      rating: 4.6,
      notes: 'Demo broker used by seeded loads.',
    },
    create: {
      name: 'Demo National Brokerage',
      mc: 'CRM-BROKER-100',
      email: 'ops@demo-national-brokerage.test',
      phone: '+1-800-555-1100',
      rating: 4.6,
      notes: 'Demo broker used by seeded loads.',
    },
  });

  const activeLoadIdsByDriver = new Map<string, string>();
  const activeLoadIdsByTruck = new Map<string, string>();

  for (const demoLoad of demoLoads) {
    const client = clientByMc.get(demoLoad.clientMc);
    if (!client) continue;

    const pickupAt = monthDate(demoLoad.monthOffset, demoLoad.day, 8);
    const deliveryAt = monthDate(demoLoad.monthOffset, demoLoad.day + 2, 15);
    const isActive = ['ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY'].includes(demoLoad.status);
    const completedAt = isActive ? deliveryAt : capCompletedAt(monthDate(demoLoad.monthOffset, demoLoad.day + 2, 17));
    const rpm = Number((demoLoad.rate / demoLoad.miles).toFixed(2));

    const load = await prisma.load.upsert({
      where: { loadCode: demoLoad.code },
      update: {
        clientId: client.id,
        brokerId: broker.id,
        brokerContact: demoLoad.brokerContact,
        brokerEmail: demoLoad.brokerEmail,
        brokerPhone: demoLoad.brokerPhone,
        dispatcherId: dispatcher.id,
        updaterId: dispatcher.id,
        driverId: demoLoad.driverId,
        truckId: demoLoad.truckId,
        pickupAddress: `Demo dock - ${demoLoad.pickup.city}`,
        pickupCity: demoLoad.pickup.city,
        pickupState: demoLoad.pickup.state,
        pickupLat: demoLoad.pickup.lat,
        pickupLng: demoLoad.pickup.lng,
        pickupAt,
        deliveryAddress: `Demo receiver - ${demoLoad.delivery.city}`,
        deliveryCity: demoLoad.delivery.city,
        deliveryState: demoLoad.delivery.state,
        deliveryLat: demoLoad.delivery.lat,
        deliveryLng: demoLoad.delivery.lng,
        deliveryAt,
        rate: demoLoad.rate,
        loadedMiles: demoLoad.miles,
        emptyMiles: Math.round(demoLoad.miles * 0.08),
        totalMiles: demoLoad.miles,
        rpm,
        commodity: demoLoad.commodity,
        weight: demoLoad.weight,
        equipmentType: trucks.find((truck) => truck.id === demoLoad.truckId)?.trailerType ?? 'DRY_VAN',
        status: demoLoad.status,
        invoiceStatus: demoLoad.invoiceStatus,
        paymentStatus: demoLoad.paymentStatus,
        notes: isActive ? 'Demo active load for fleet map tracking.' : 'Demo completed delivery for finance charts.',
        referenceNumber: `REF-${demoLoad.code}`,
        poNumber: `PO-${demoLoad.code}`,
        updatedAt: isActive ? new Date() : completedAt,
      },
      create: {
        loadCode: demoLoad.code,
        clientId: client.id,
        brokerId: broker.id,
        brokerContact: demoLoad.brokerContact,
        brokerEmail: demoLoad.brokerEmail,
        brokerPhone: demoLoad.brokerPhone,
        dispatcherId: dispatcher.id,
        updaterId: dispatcher.id,
        driverId: demoLoad.driverId,
        truckId: demoLoad.truckId,
        pickupAddress: `Demo dock - ${demoLoad.pickup.city}`,
        pickupCity: demoLoad.pickup.city,
        pickupState: demoLoad.pickup.state,
        pickupLat: demoLoad.pickup.lat,
        pickupLng: demoLoad.pickup.lng,
        pickupAt,
        deliveryAddress: `Demo receiver - ${demoLoad.delivery.city}`,
        deliveryCity: demoLoad.delivery.city,
        deliveryState: demoLoad.delivery.state,
        deliveryLat: demoLoad.delivery.lat,
        deliveryLng: demoLoad.delivery.lng,
        deliveryAt,
        rate: demoLoad.rate,
        loadedMiles: demoLoad.miles,
        emptyMiles: Math.round(demoLoad.miles * 0.08),
        totalMiles: demoLoad.miles,
        rpm,
        commodity: demoLoad.commodity,
        weight: demoLoad.weight,
        equipmentType: trucks.find((truck) => truck.id === demoLoad.truckId)?.trailerType ?? 'DRY_VAN',
        status: demoLoad.status,
        invoiceStatus: demoLoad.invoiceStatus,
        paymentStatus: demoLoad.paymentStatus,
        notes: isActive ? 'Demo active load for fleet map tracking.' : 'Demo completed delivery for finance charts.',
        referenceNumber: `REF-${demoLoad.code}`,
        poNumber: `PO-${demoLoad.code}`,
        createdAt: pickupAt,
        updatedAt: isActive ? new Date() : completedAt,
      },
      select: { id: true, loadCode: true, rate: true, updatedAt: true },
    });

    await prisma.loadStatusHistory.deleteMany({ where: { loadId: load.id } });
    await prisma.loadStatusHistory.createMany({
      data: [
        {
          loadId: load.id,
          toStatus: 'BOOKED',
          changedById: dispatcher.id,
          source: 'CRM',
          notes: 'Demo load booked.',
          at: pickupAt,
        },
        {
          loadId: load.id,
          fromStatus: 'BOOKED',
          toStatus: demoLoad.status,
          changedById: dispatcher.id,
          source: 'CRM',
          notes: isActive ? 'Demo load is active.' : 'Demo delivery completed.',
          at: isActive ? new Date() : completedAt,
        },
      ],
    });

    await prisma.invoice.deleteMany({ where: { number: `INV-${demoLoad.code}` } });
    if (!isActive) {
      const paid = demoLoad.invoiceStatus === 'PAID';
      const paidAt = paid ? capAtNow(addDays(completedAt, 2)) : null;
      await prisma.invoice.create({
        data: {
          loadId: load.id,
          clientId: client.id,
          number: `INV-${demoLoad.code}`,
          amount: demoLoad.rate,
          issuedAt: addDays(completedAt, 1),
          dueAt: addDays(completedAt, 15),
          paidAmount: paid ? demoLoad.rate : 0,
          paidAt,
          status: demoLoad.invoiceStatus,
          agingDays: paid ? 0 : Math.max(0, Math.round((Date.now() - completedAt.getTime()) / 86400000)),
          notes: 'Demo invoice generated from completed delivery.',
        },
      });
    }

    await prisma.financeEntry.deleteMany({
      where: { notes: `Demo finance for ${demoLoad.code}` },
    });
    if (!isActive) {
      await prisma.financeEntry.create({
        data: {
          period: `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}`,
          type: 'DISPATCH_FEE',
          clientId: client.id,
          dispatcherId: dispatcher.id,
          gross: demoLoad.rate,
          amount: Number((demoLoad.rate * (client.dispatchFeePercent / 100)).toFixed(2)),
          formulaSnapshot: {
            loadCode: demoLoad.code,
            rate: demoLoad.rate,
            dispatchFeePercent: client.dispatchFeePercent,
          } as any,
          notes: `Demo finance for ${demoLoad.code}`,
        },
      });
    }

    if (isActive) {
      activeLoadIdsByDriver.set(demoLoad.driverId, load.id);
      activeLoadIdsByTruck.set(demoLoad.truckId, load.id);
      await prisma.locationUpdate.deleteMany({ where: { loadId: load.id } });
      const progress = demoLoad.status === 'ASSIGNED' ? 0.08 : 0.58;
      const point = interpolate(demoLoad.pickup, demoLoad.delivery, progress);
      await prisma.locationUpdate.create({
        data: {
          driverId: demoLoad.driverId,
          loadId: load.id,
          lat: point.lat,
          lng: point.lng,
          label: `${demoLoad.pickup.city}, ${demoLoad.pickup.state} to ${demoLoad.delivery.city}, ${demoLoad.delivery.state}`,
          speed: demoLoad.status === 'ASSIGNED' ? 0 : 62,
          heading: demoLoad.status === 'ASSIGNED' ? 0 : 245,
          source: 'GPS',
          eta: deliveryAt,
          etaLabel: demoLoad.status === 'ASSIGNED' ? 'Pickup scheduled' : 'On track',
          updatedById: dispatcher.id,
          at: new Date(),
        },
      });
    }
  }

  for (const driver of drivers) {
    const currentLoadId = activeLoadIdsByDriver.get(driver.id) ?? null;
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        status: currentLoadId ? 'ON_LOAD' : 'AVAILABLE',
        currentLoadId,
      },
    });
  }

  for (const truck of trucks) {
    await prisma.truck.update({
      where: { id: truck.id },
      data: {
        currentDriverId: drivers.find((driver) => driver.truckId === truck.id)?.id ?? null,
        currentLoadId: activeLoadIdsByTruck.get(truck.id) ?? null,
      },
    });
  }

  const activityTitles = [
    'Demo clients, drivers, trucks, and loads added',
    'Demo paid deliveries posted to finance',
    'Demo active trucks placed on the fleet map',
  ];
  await prisma.activityLog.deleteMany({ where: { title: { in: activityTitles } } });
  await prisma.activityLog.createMany({
    data: [
      {
        actorId: dispatcher.id,
        entityType: 'Client',
        action: 'created',
        title: activityTitles[0],
        description: 'Seeded 3 clients, 4 drivers, 4 trucks, and 8 demo loads.',
        metadata: { clientCount: 3, driverCount: 4, truckCount: 4, loadCount: 8 },
        createdAt: new Date(),
      },
      {
        actorId: dispatcher.id,
        entityType: 'Invoice',
        action: 'payment_received',
        title: activityTitles[1],
        description: 'Completed deliveries from last month and this month now feed finance charts.',
        metadata: { completedLoads: 6 },
        createdAt: new Date(),
      },
      {
        actorId: dispatcher.id,
        entityType: 'LocationUpdate',
        action: 'updated',
        title: activityTitles[2],
        description: 'Two active demo trucks now have GPS points for the USA fleet map.',
        metadata: { activeTrucks: 2 },
        createdAt: new Date(),
      },
    ],
  });

  console.log('Demo operations data seeded');
  console.log(`Dispatcher: ${dispatcher.fullName} <${dispatcher.email}>`);
  console.log('Clients: 3, drivers: 4, trucks: 4, loads: 8, completed deliveries: 6');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
