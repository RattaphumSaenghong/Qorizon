export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export const AIRPORTS: Airport[] = [
  // Southeast Asia
  { iata: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
  { iata: 'DMK', name: 'Don Mueang International Airport', city: 'Bangkok', country: 'Thailand' },
  { iata: 'CNX', name: 'Chiang Mai International Airport', city: 'Chiang Mai', country: 'Thailand' },
  { iata: 'HKT', name: 'Phuket International Airport', city: 'Phuket', country: 'Thailand' },
  { iata: 'USM', name: 'Samui Airport', city: 'Ko Samui', country: 'Thailand' },
  { iata: 'KBV', name: 'Krabi International Airport', city: 'Krabi', country: 'Thailand' },
  { iata: 'CEI', name: 'Chiang Rai International Airport', city: 'Chiang Rai', country: 'Thailand' },
  { iata: 'SGN', name: 'Tan Son Nhat International Airport', city: 'Ho Chi Minh City', country: 'Vietnam' },
  { iata: 'HAN', name: 'Noi Bai International Airport', city: 'Hanoi', country: 'Vietnam' },
  { iata: 'DAD', name: 'Da Nang International Airport', city: 'Da Nang', country: 'Vietnam' },
  { iata: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
  { iata: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia' },
  { iata: 'PEN', name: 'Penang International Airport', city: 'Penang', country: 'Malaysia' },
  { iata: 'BKI', name: 'Kota Kinabalu International Airport', city: 'Kota Kinabalu', country: 'Malaysia' },
  { iata: 'CGK', name: 'Soekarno–Hatta International Airport', city: 'Jakarta', country: 'Indonesia' },
  { iata: 'DPS', name: 'Ngurah Rai International Airport', city: 'Bali', country: 'Indonesia' },
  { iata: 'SUB', name: 'Juanda International Airport', city: 'Surabaya', country: 'Indonesia' },
  { iata: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines' },
  { iata: 'CEB', name: 'Mactan–Cebu International Airport', city: 'Cebu', country: 'Philippines' },
  { iata: 'RGN', name: 'Yangon International Airport', city: 'Yangon', country: 'Myanmar' },
  { iata: 'PNH', name: 'Phnom Penh International Airport', city: 'Phnom Penh', country: 'Cambodia' },
  { iata: 'REP', name: 'Siem Reap International Airport', city: 'Siem Reap', country: 'Cambodia' },
  { iata: 'VTE', name: 'Wattay International Airport', city: 'Vientiane', country: 'Laos' },
  { iata: 'BWN', name: 'Brunei International Airport', city: 'Bandar Seri Begawan', country: 'Brunei' },
  // East Asia
  { iata: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
  { iata: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
  { iata: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'Japan' },
  { iata: 'ITM', name: 'Osaka Itami Airport', city: 'Osaka', country: 'Japan' },
  { iata: 'NGO', name: 'Chubu Centrair International Airport', city: 'Nagoya', country: 'Japan' },
  { iata: 'CTS', name: 'New Chitose Airport', city: 'Sapporo', country: 'Japan' },
  { iata: 'FUK', name: 'Fukuoka Airport', city: 'Fukuoka', country: 'Japan' },
  { iata: 'OKA', name: 'Naha Airport', city: 'Okinawa', country: 'Japan' },
  { iata: 'HIJ', name: 'Hiroshima Airport', city: 'Hiroshima', country: 'Japan' },
  { iata: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
  { iata: 'GMP', name: 'Gimpo International Airport', city: 'Seoul', country: 'South Korea' },
  { iata: 'PUS', name: 'Gimhae International Airport', city: 'Busan', country: 'South Korea' },
  { iata: 'CJU', name: 'Jeju International Airport', city: 'Jeju', country: 'South Korea' },
  { iata: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China' },
  { iata: 'PKX', name: 'Beijing Daxing International Airport', city: 'Beijing', country: 'China' },
  { iata: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China' },
  { iata: 'SHA', name: 'Shanghai Hongqiao International Airport', city: 'Shanghai', country: 'China' },
  { iata: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China' },
  { iata: 'SZX', name: 'Shenzhen Bao\'an International Airport', city: 'Shenzhen', country: 'China' },
  { iata: 'CTU', name: 'Chengdu Tianfu International Airport', city: 'Chengdu', country: 'China' },
  { iata: 'KMG', name: 'Kunming Changshui International Airport', city: 'Kunming', country: 'China' },
  { iata: 'XIY', name: "Xi'an Xianyang International Airport", city: "Xi'an", country: 'China' },
  { iata: 'HGH', name: 'Hangzhou Xiaoshan International Airport', city: 'Hangzhou', country: 'China' },
  { iata: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
  { iata: 'MFM', name: 'Macau International Airport', city: 'Macau', country: 'Macau' },
  { iata: 'TPE', name: 'Taiwan Taoyuan International Airport', city: 'Taipei', country: 'Taiwan' },
  { iata: 'TSA', name: 'Taipei Songshan Airport', city: 'Taipei', country: 'Taiwan' },
  { iata: 'KHH', name: 'Kaohsiung International Airport', city: 'Kaohsiung', country: 'Taiwan' },
  { iata: 'ULN', name: 'Chinggis Khaan International Airport', city: 'Ulaanbaatar', country: 'Mongolia' },
  // South Asia
  { iata: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India' },
  { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India' },
  { iata: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore', country: 'India' },
  { iata: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India' },
  { iata: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata', country: 'India' },
  { iata: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India' },
  { iata: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', country: 'India' },
  { iata: 'COK', name: 'Cochin International Airport', city: 'Kochi', country: 'India' },
  { iata: 'CMB', name: 'Bandaranaike International Airport', city: 'Colombo', country: 'Sri Lanka' },
  { iata: 'DAC', name: 'Hazrat Shahjalal International Airport', city: 'Dhaka', country: 'Bangladesh' },
  { iata: 'KTM', name: 'Tribhuvan International Airport', city: 'Kathmandu', country: 'Nepal' },
  { iata: 'ISB', name: 'Islamabad International Airport', city: 'Islamabad', country: 'Pakistan' },
  { iata: 'KHI', name: 'Jinnah International Airport', city: 'Karachi', country: 'Pakistan' },
  { iata: 'LHE', name: 'Allama Iqbal International Airport', city: 'Lahore', country: 'Pakistan' },
  // Middle East
  { iata: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
  { iata: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'UAE' },
  { iata: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar' },
  { iata: 'BAH', name: 'Bahrain International Airport', city: 'Manama', country: 'Bahrain' },
  { iata: 'KWI', name: 'Kuwait International Airport', city: 'Kuwait City', country: 'Kuwait' },
  { iata: 'MCT', name: 'Muscat International Airport', city: 'Muscat', country: 'Oman' },
  { iata: 'RUH', name: 'King Khalid International Airport', city: 'Riyadh', country: 'Saudi Arabia' },
  { iata: 'JED', name: 'King Abdulaziz International Airport', city: 'Jeddah', country: 'Saudi Arabia' },
  { iata: 'TLV', name: 'Ben Gurion International Airport', city: 'Tel Aviv', country: 'Israel' },
  { iata: 'AMM', name: 'Queen Alia International Airport', city: 'Amman', country: 'Jordan' },
  { iata: 'BGW', name: 'Baghdad International Airport', city: 'Baghdad', country: 'Iraq' },
  { iata: 'IKA', name: 'Imam Khomeini International Airport', city: 'Tehran', country: 'Iran' },
  // Europe
  { iata: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
  { iata: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'United Kingdom' },
  { iata: 'STN', name: 'Stansted Airport', city: 'London', country: 'United Kingdom' },
  { iata: 'LCY', name: 'London City Airport', city: 'London', country: 'United Kingdom' },
  { iata: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'United Kingdom' },
  { iata: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'United Kingdom' },
  { iata: 'BHX', name: 'Birmingham Airport', city: 'Birmingham', country: 'United Kingdom' },
  { iata: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
  { iata: 'ORY', name: 'Orly Airport', city: 'Paris', country: 'France' },
  { iata: 'NCE', name: 'Nice Côte d\'Azur Airport', city: 'Nice', country: 'France' },
  { iata: 'LYS', name: 'Lyon–Saint-Exupéry Airport', city: 'Lyon', country: 'France' },
  { iata: 'MRS', name: 'Marseille Provence Airport', city: 'Marseille', country: 'France' },
  { iata: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
  { iata: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany' },
  { iata: 'BER', name: 'Berlin Brandenburg Airport', city: 'Berlin', country: 'Germany' },
  { iata: 'HAM', name: 'Hamburg Airport', city: 'Hamburg', country: 'Germany' },
  { iata: 'DUS', name: 'Düsseldorf Airport', city: 'Düsseldorf', country: 'Germany' },
  { iata: 'CGN', name: 'Cologne Bonn Airport', city: 'Cologne', country: 'Germany' },
  { iata: 'STR', name: 'Stuttgart Airport', city: 'Stuttgart', country: 'Germany' },
  { iata: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
  { iata: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain' },
  { iata: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain' },
  { iata: 'AGP', name: 'Málaga–Costa del Sol Airport', city: 'Málaga', country: 'Spain' },
  { iata: 'PMI', name: 'Palma de Mallorca Airport', city: 'Palma', country: 'Spain' },
  { iata: 'FCO', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'Italy' },
  { iata: 'MXP', name: 'Milan Malpensa Airport', city: 'Milan', country: 'Italy' },
  { iata: 'LIN', name: 'Milan Linate Airport', city: 'Milan', country: 'Italy' },
  { iata: 'VCE', name: 'Venice Marco Polo Airport', city: 'Venice', country: 'Italy' },
  { iata: 'NAP', name: 'Naples International Airport', city: 'Naples', country: 'Italy' },
  { iata: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland' },
  { iata: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'Switzerland' },
  { iata: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria' },
  { iata: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium' },
  { iata: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'Portugal' },
  { iata: 'OPO', name: 'Francisco de Sá Carneiro Airport', city: 'Porto', country: 'Portugal' },
  { iata: 'ATH', name: 'Athens International Airport', city: 'Athens', country: 'Greece' },
  { iata: 'SKG', name: 'Thessaloniki Macedonia International Airport', city: 'Thessaloniki', country: 'Greece' },
  { iata: 'HER', name: 'Heraklion International Airport', city: 'Heraklion', country: 'Greece' },
  { iata: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark' },
  { iata: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden' },
  { iata: 'OSL', name: 'Oslo Gardermoen Airport', city: 'Oslo', country: 'Norway' },
  { iata: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland' },
  { iata: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland' },
  { iata: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czech Republic' },
  { iata: 'BUD', name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary' },
  { iata: 'OTP', name: 'Henri Coandă International Airport', city: 'Bucharest', country: 'Romania' },
  { iata: 'SOF', name: 'Sofia Airport', city: 'Sofia', country: 'Bulgaria' },
  { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
  { iata: 'SAW', name: 'Istanbul Sabiha Gökçen Airport', city: 'Istanbul', country: 'Turkey' },
  { iata: 'AYT', name: 'Antalya Airport', city: 'Antalya', country: 'Turkey' },
  { iata: 'ADB', name: 'Adnan Menderes Airport', city: 'Izmir', country: 'Turkey' },
  { iata: 'SVO', name: 'Sheremetyevo International Airport', city: 'Moscow', country: 'Russia' },
  { iata: 'DME', name: 'Domodedovo International Airport', city: 'Moscow', country: 'Russia' },
  { iata: 'LED', name: 'Pulkovo Airport', city: 'Saint Petersburg', country: 'Russia' },
  { iata: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland' },
  { iata: 'KEF', name: 'Keflavik International Airport', city: 'Reykjavik', country: 'Iceland' },
  // North America
  { iata: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
  { iata: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'United States' },
  { iata: 'EWR', name: 'Newark Liberty International Airport', city: 'New York', country: 'United States' },
  { iata: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
  { iata: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States' },
  { iata: 'MDW', name: 'Chicago Midway International Airport', city: 'Chicago', country: 'United States' },
  { iata: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'United States' },
  { iata: 'ATL', name: 'Hartsfield–Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States' },
  { iata: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States' },
  { iata: 'SEA', name: 'Seattle–Tacoma International Airport', city: 'Seattle', country: 'United States' },
  { iata: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States' },
  { iata: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'United States' },
  { iata: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States' },
  { iata: 'LAS', name: 'Harry Reid International Airport', city: 'Las Vegas', country: 'United States' },
  { iata: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'United States' },
  { iata: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'United States' },
  { iata: 'MSP', name: 'Minneapolis–Saint Paul International Airport', city: 'Minneapolis', country: 'United States' },
  { iata: 'DTW', name: 'Detroit Metropolitan Wayne County Airport', city: 'Detroit', country: 'United States' },
  { iata: 'PHL', name: 'Philadelphia International Airport', city: 'Philadelphia', country: 'United States' },
  { iata: 'CLT', name: 'Charlotte Douglas International Airport', city: 'Charlotte', country: 'United States' },
  { iata: 'MCO', name: 'Orlando International Airport', city: 'Orlando', country: 'United States' },
  { iata: 'SAN', name: 'San Diego International Airport', city: 'San Diego', country: 'United States' },
  { iata: 'PDX', name: 'Portland International Airport', city: 'Portland', country: 'United States' },
  { iata: 'HNL', name: 'Daniel K. Inouye International Airport', city: 'Honolulu', country: 'United States' },
  { iata: 'ANC', name: 'Ted Stevens Anchorage International Airport', city: 'Anchorage', country: 'United States' },
  { iata: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada' },
  { iata: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada' },
  { iata: 'YUL', name: 'Montréal–Trudeau International Airport', city: 'Montreal', country: 'Canada' },
  { iata: 'YYC', name: 'Calgary International Airport', city: 'Calgary', country: 'Canada' },
  { iata: 'YEG', name: 'Edmonton International Airport', city: 'Edmonton', country: 'Canada' },
  { iata: 'MEX', name: 'Benito Juárez International Airport', city: 'Mexico City', country: 'Mexico' },
  { iata: 'GDL', name: 'Miguel Hidalgo y Costilla International Airport', city: 'Guadalajara', country: 'Mexico' },
  { iata: 'MTY', name: 'General Mariano Escobedo International Airport', city: 'Monterrey', country: 'Mexico' },
  { iata: 'CUN', name: 'Cancún International Airport', city: 'Cancun', country: 'Mexico' },
  // Latin America
  { iata: 'GRU', name: 'São Paulo–Guarulhos International Airport', city: 'São Paulo', country: 'Brazil' },
  { iata: 'GIG', name: 'Rio de Janeiro–Galeão International Airport', city: 'Rio de Janeiro', country: 'Brazil' },
  { iata: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina' },
  { iata: 'SCL', name: 'Arturo Merino Benítez International Airport', city: 'Santiago', country: 'Chile' },
  { iata: 'BOG', name: 'El Dorado International Airport', city: 'Bogotá', country: 'Colombia' },
  { iata: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru' },
  { iata: 'UIO', name: 'Mariscal Sucre International Airport', city: 'Quito', country: 'Ecuador' },
  { iata: 'PTY', name: 'Tocumen International Airport', city: 'Panama City', country: 'Panama' },
  // Africa
  { iata: 'JNB', name: 'O. R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa' },
  { iata: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa' },
  { iata: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya' },
  { iata: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt' },
  { iata: 'CMN', name: 'Mohammed V International Airport', city: 'Casablanca', country: 'Morocco' },
  { iata: 'RAK', name: 'Marrakesh Menara Airport', city: 'Marrakesh', country: 'Morocco' },
  { iata: 'TUN', name: 'Tunis-Carthage International Airport', city: 'Tunis', country: 'Tunisia' },
  { iata: 'ALG', name: 'Houari Boumediene Airport', city: 'Algiers', country: 'Algeria' },
  { iata: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria' },
  { iata: 'ACC', name: 'Kotoka International Airport', city: 'Accra', country: 'Ghana' },
  { iata: 'ADD', name: 'Addis Ababa Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia' },
  { iata: 'DAR', name: 'Julius Nyerere International Airport', city: 'Dar es Salaam', country: 'Tanzania' },
  // Oceania
  { iata: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
  { iata: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia' },
  { iata: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia' },
  { iata: 'PER', name: 'Perth Airport', city: 'Perth', country: 'Australia' },
  { iata: 'ADL', name: 'Adelaide Airport', city: 'Adelaide', country: 'Australia' },
  { iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand' },
  { iata: 'CHC', name: 'Christchurch Airport', city: 'Christchurch', country: 'New Zealand' },
  { iata: 'WLG', name: 'Wellington Airport', city: 'Wellington', country: 'New Zealand' },
  { iata: 'NAN', name: 'Nadi International Airport', city: 'Nadi', country: 'Fiji' },
];

export function searchAirports(query: string, limit = 50): Airport[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  // Rank: exact IATA > IATA prefix > city starts-with > anywhere
  const scored = AIRPORTS.map((a) => {
    const iata = a.iata.toUpperCase();
    const city = a.city.toUpperCase();
    let score = -1;
    if (iata === q) score = 0;
    else if (iata.startsWith(q)) score = 1;
    else if (city.startsWith(q)) score = 2;
    else if (city.includes(q)) score = 3;
    else if (a.name.toUpperCase().includes(q)) score = 4;
    else if (a.country.toUpperCase().includes(q)) score = 5;
    return { a, score };
  }).filter((s) => s.score >= 0);
  scored.sort((x, y) => x.score - y.score || x.a.city.localeCompare(y.a.city));
  return scored.slice(0, limit).map((s) => s.a);
}

/** A handful of common hubs to show before the user types. */
export const POPULAR_IATA = ['BKK', 'HND', 'KIX', 'ICN', 'SIN', 'HKG', 'TPE', 'LHR', 'CDG', 'DXB', 'LAX', 'JFK'];

export function popularAirports(): Airport[] {
  return POPULAR_IATA.map((code) => AIRPORTS.find((a) => a.iata === code)).filter(
    (a): a is Airport => a != null,
  );
}

export function findAirport(iata: string): Airport | undefined {
  const q = iata.trim().toUpperCase();
  return AIRPORTS.find((a) => a.iata === q);
}
