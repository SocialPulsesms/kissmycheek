// Comprehensive Global & Pan-Nigerian Locations Dataset for Kiss My Cheek

export interface CountryLocation {
  country: string;
  code: string;
  flag: string;
  region: 'Nigeria' | 'Africa' | 'Europe' | 'Americas' | 'Middle East' | 'Asia & Pacific';
  cities: string[];
}

export interface NigerianState {
  state: string;
  zone: 'South West' | 'South South' | 'South East' | 'North Central' | 'North West' | 'North East' | 'FCT';
  cities: string[];
}

export const NIGERIAN_STATES: NigerianState[] = [
  // FCT Abuja
  {
    state: 'FCT Abuja',
    zone: 'FCT',
    cities: [
      'Abuja (Maitama)',
      'Abuja (Asokoro)',
      'Abuja (Wuse II)',
      'Abuja (Guzape / Katampe)',
      'Abuja (Jabi / Utako)',
      'Abuja (Gwarinpa)',
      'Abuja (Apo / Garki)',
      'Abuja (Central Business District)',
      'Abuja (Lugbe / Airport Road)',
      'Abuja (Kubwa / Bwari)',
      'Abuja (Kuje / Karu)'
    ]
  },

  // South West
  {
    state: 'Lagos',
    zone: 'South West',
    cities: [
      'Lagos (Victoria Island)',
      'Lagos (Ikoyi / Banana Island)',
      'Lagos (Lekki Phase 1 / Phase 2)',
      'Lagos (Chevron / Ajah / Sangotedo)',
      'Lagos (Ikeja GRA / Maryland)',
      'Lagos (Surulere / Yaba)',
      'Lagos (Magodo GRA / Alausa)',
      'Lagos (Gbagada / Ogudu)',
      'Lagos (Ikorodu)',
      'Lagos (Epe / Lekki Free Trade Zone)',
      'Lagos (Festac Town / Amuwo)',
      'Lagos (Badagry)'
    ]
  },
  {
    state: 'Oyo',
    zone: 'South West',
    cities: [
      'Ibadan (Bodija / Jericho GRA)',
      'Ibadan (Oluyole / Ring Road)',
      'Ibadan (Samonda / UI Hub)',
      'Ibadan (Iyaganku GRA / Agodi)',
      'Ogbomoso (LAUTECH Hub)',
      'Oyo Town',
      'Iseyin',
      'Saki'
    ]
  },
  {
    state: 'Ogun',
    zone: 'South West',
    cities: [
      'Abeokuta (Ibara GRA)',
      'Ijebu-Ode (GRA)',
      'Sagamu (Industrial Hub)',
      'Ota (Industrial Hub)',
      'Ilaro',
      'Mowe / Ibafo',
      'Ogijo / Sagamu Interchange'
    ]
  },
  {
    state: 'Ondo',
    zone: 'South West',
    cities: [
      'Akure (Alagbaka GRA)',
      'Ondo Town',
      'Owo',
      'Ikare-Akoko',
      'Ore',
      'Okitipupa'
    ]
  },
  {
    state: 'Osun',
    zone: 'South West',
    cities: [
      'Osogbo (GRA / Ogo-Oluwa)',
      'Ile-Ife (OAU Hub)',
      'Ilesa',
      'Ede (Federal Poly Hub)',
      'Ikirun',
      'Ila Orangun'
    ]
  },
  {
    state: 'Ekiti',
    zone: 'South West',
    cities: [
      'Ado-Ekiti (GRA)',
      'Ikere-Ekiti',
      'Ijero-Ekiti',
      'Oye-Ekiti (FUOYE Hub)',
      'Ikole-Ekiti',
      'Efon-Alaaye'
    ]
  },

  // South South
  {
    state: 'Rivers',
    zone: 'South South',
    cities: [
      'Port Harcourt (GRA Phase 2 & 3)',
      'Port Harcourt (Old GRA)',
      'Port Harcourt (Peter Odili / Trans Amadi)',
      'Port Harcourt (Ada George / Woji)',
      'Bonny Island (NLNG Hub)',
      'Eleme / Onne (Port Hub)',
      'Obio-Akpor',
      'Okrika',
      'Ahoada',
      'Oyigbo'
    ]
  },
  {
    state: 'Delta',
    zone: 'South South',
    cities: [
      'Asaba (GRA / Summit / Cable Point)',
      'Warri (GRA / Effurun)',
      'Sapele',
      'Ughelli',
      'Agbor',
      'Abraka (Delta State University Hub)',
      'Ozoro',
      'Kwale',
      'Oghara'
    ]
  },
  {
    state: 'Edo',
    zone: 'South South',
    cities: [
      'Benin City (GRA / Boundary Road)',
      'Benin City (Airport Road / Ugbowo)',
      'Ekpoma (Ambrose Alli University Hub)',
      'Auchi (Federal Poly Hub)',
      'Uromi',
      'Igarra',
      'Irrua'
    ]
  },
  {
    state: 'Akwa Ibom',
    zone: 'South South',
    cities: [
      'Uyo (Ewet Housing / Shelter Afrique)',
      'Uyo (Osongama / Ring Road)',
      'Eket (Mobil Oil Hub / GRA)',
      'Ikot Ekpene (Raffia City)',
      'Oron',
      'Ikot Abasi',
      'Etinan',
      'Abak'
    ]
  },
  {
    state: 'Cross River',
    zone: 'South South',
    cities: [
      'Calabar (State Housing / Marina Resort)',
      'Calabar (Federal Housing / Etta Agbor)',
      'Ikom',
      'Ogoja',
      'Ugep',
      'Obudu (Mountain Resort / Ranch)',
      'Akamkpa'
    ]
  },
  {
    state: 'Bayelsa',
    zone: 'South South',
    cities: [
      'Yenagoa (GRA / Swali)',
      'Brass',
      'Ogbia',
      'Sagbama',
      'Nembe',
      'Amassoma (NDU Hub)',
      'Kaiama'
    ]
  },

  // South East
  {
    state: 'Enugu',
    zone: 'South East',
    cities: [
      'Enugu (Independence Layout)',
      'Enugu (GRA / New Haven)',
      'Enugu (Trans-Ekulu / Golf Estate)',
      'Enugu (Abakpa / Coal Camp)',
      'Nsukka (UNN University Hub)',
      'Udi',
      'Oji River',
      'Agbani (ESUT Hub)',
      'Awgu'
    ]
  },
  {
    state: 'Imo',
    zone: 'South East',
    cities: [
      'Owerri (New Owerri / World Bank)',
      'Owerri (Ikenegbu / Aladinma GRA)',
      'Owerri (Works Layout / Orji)',
      'Orlu (GRA)',
      'Okigwe',
      'Mbaise',
      'Oguta (Lake Resort Hub)',
      'Mbano',
      'Nkwerre'
    ]
  },
  {
    state: 'Anambra',
    zone: 'South East',
    cities: [
      'Awka (Agu-Awka GRA / Ifite)',
      'Onitsha (Commercial City / GRA)',
      'Nnewi (Industrial & Automotive Hub)',
      'Ekwulobia',
      'Ihiala',
      'Ogidi',
      'Agulu',
      'Obosi'
    ]
  },
  {
    state: 'Abia',
    zone: 'South East',
    cities: [
      'Aba (Commercial City / GRA)',
      'Umuahia (Capital / GRA)',
      'Ohafia',
      'Arochukwu',
      'Osisioma',
      'Bende',
      'Isiala Ngwa',
      'Abiriba'
    ]
  },
  {
    state: 'Ebonyi',
    zone: 'South East',
    cities: [
      'Abakaliki (GRA / Presco)',
      'Afikpo',
      'Onueke',
      'Edda',
      'Ishielu',
      'Uburu'
    ]
  },

  // North Central
  {
    state: 'Plateau',
    zone: 'North Central',
    cities: [
      'Jos (Rayfield / Millionaires Quarters / GRA)',
      'Jos (Bukuru)',
      'Pankshin',
      'Shendam',
      'Barkin Ladi',
      'Mangu'
    ]
  },
  {
    state: 'Kwara',
    zone: 'North Central',
    cities: [
      'Ilorin (GRA / Fate / Basin)',
      'Ilorin (Tanke / Unilorin Road)',
      'Offa',
      'Omu-Aran',
      'Jebba',
      'Lafiagi'
    ]
  },
  {
    state: 'Benue',
    zone: 'North Central',
    cities: [
      'Makurdi (High Level / GRA)',
      'Gboko',
      'Otukpo',
      'Katsina-Ala',
      'Vandeikya',
      'Zaki Biam'
    ]
  },
  {
    state: 'Niger',
    zone: 'North Central',
    cities: [
      'Minna (GRA / Bosso)',
      'Suleja (Abuja Corridor)',
      'Bida',
      'Kontagora',
      'Mokwa',
      'New Bussa'
    ]
  },
  {
    state: 'Kogi',
    zone: 'North Central',
    cities: [
      'Lokoja (GRA / Ganaja)',
      'Okene',
      'Kabba',
      'Anyigba (Kogi State University Hub)',
      'Idah',
      'Ankpa',
      'Ajaokuta'
    ]
  },
  {
    state: 'Nasarawa',
    zone: 'North Central',
    cities: [
      'Lafia (GRA)',
      'Keffi (Federal University Hub)',
      'Karu / Mararaba (Abuja Gateway)',
      'Akwanga',
      'Nasarawa'
    ]
  },

  // North West
  {
    state: 'Kano',
    zone: 'North West',
    cities: [
      'Kano (Nasarawa GRA / Bompai)',
      'Kano (Sabon Gari / Fagge)',
      'Kano (Dala / Gwale)',
      'Wudil',
      'Rano',
      'Gwarzo'
    ]
  },
  {
    state: 'Kaduna',
    zone: 'North West',
    cities: [
      'Kaduna (GRA / Barnawa / Malali)',
      'Kaduna (Millennium City)',
      'Zaria (ABU Samaru / GRA)',
      'Kafanchan',
      'Kagoro'
    ]
  },
  {
    state: 'Katsina',
    zone: 'North West',
    cities: [
      'Katsina (GRA)',
      'Daura',
      'Funtua',
      'Malumfashi',
      'Kankia',
      'Dutsin-Ma'
    ]
  },
  {
    state: 'Sokoto',
    zone: 'North West',
    cities: [
      'Sokoto (GRA / Runjin Sambo)',
      'Tambuwal',
      'Wamakko',
      'Bodinga',
      'Gwadabawa'
    ]
  },
  {
    state: 'Jigawa',
    zone: 'North West',
    cities: [
      'Dutse (GRA)',
      'Hadejia',
      'Gumel',
      'Birnin Kudu',
      'Kazaure',
      'Ringim'
    ]
  },
  {
    state: 'Kebbi',
    zone: 'North West',
    cities: [
      'Birnin Kebbi (GRA)',
      'Zuru',
      'Yauri',
      'Argungu (International Fishing Hub)',
      'Jega'
    ]
  },
  {
    state: 'Zamfara',
    zone: 'North West',
    cities: [
      'Gusau (GRA)',
      'Kaura Namoda',
      'Talata Mafara',
      'Anka',
      'Maru'
    ]
  },

  // North East
  {
    state: 'Borno',
    zone: 'North East',
    cities: [
      'Maiduguri (GRA / Old GRA)',
      'Biu',
      'Bama',
      'Damboa',
      'Monguno'
    ]
  },
  {
    state: 'Bauchi',
    zone: 'North East',
    cities: [
      'Bauchi (GRA / Fadama)',
      'Azare',
      'Misau',
      'Jama\'are',
      'Ningi',
      'Dass'
    ]
  },
  {
    state: 'Gombe',
    zone: 'North East',
    cities: [
      'Gombe (GRA / Federal Lowcost)',
      'Kaltungo',
      'Billiri',
      'Bajoga',
      'Dukku'
    ]
  },
  {
    state: 'Adamawa',
    zone: 'North East',
    cities: [
      'Yola (Jimeta GRA / Capital)',
      'Mubi',
      'Numan',
      'Michika',
      'Ganye',
      'Mayo-Belwa'
    ]
  },
  {
    state: 'Taraba',
    zone: 'North East',
    cities: [
      'Jalingo (GRA)',
      'Wukari',
      'Bali',
      'Takum',
      'Gembu (Mambilla Plateau Highlands)'
    ]
  },
  {
    state: 'Yobe',
    zone: 'North East',
    cities: [
      'Damaturu (GRA)',
      'Potiskum',
      'Gashua',
      'Nguru',
      'Geidam'
    ]
  }
];

export const ALL_COUNTRIES: CountryLocation[] = [
  // ================= NIGERIA =================
  {
    country: 'Nigeria',
    code: 'NG',
    flag: '🇳🇬',
    region: 'Nigeria',
    cities: NIGERIAN_STATES.flatMap(s => s.cities)
  },

  // ================= AFRICA =================
  {
    country: 'Ghana',
    code: 'GH',
    flag: '🇬🇭',
    region: 'Africa',
    cities: [
      'Accra (Cantonments & Airport Res.)',
      'Accra (East Legon)',
      'Kumasi',
      'Takoradi'
    ]
  },
  {
    country: 'Kenya',
    code: 'KE',
    flag: '🇰🇪',
    region: 'Africa',
    cities: [
      'Nairobi (Westlands & Karen)',
      'Nairobi (Muthaiga)',
      'Mombasa (Nyali)',
      'Diani Beach'
    ]
  },
  {
    country: 'South Africa',
    code: 'ZA',
    flag: '🇿🇦',
    region: 'Africa',
    cities: [
      'Johannesburg (Sandton / Rosebank)',
      'Cape Town (Camps Bay & Clifton)',
      'Cape Town (V&A Waterfront)',
      'Durban (Umhlanga)',
      'Pretoria'
    ]
  },
  {
    country: 'Egypt',
    code: 'EG',
    flag: '🇪🇬',
    region: 'Africa',
    cities: [
      'Cairo (Zamalek / New Cairo)',
      'Alexandria',
      'Sharm El Sheikh',
      'El Gouna'
    ]
  },
  {
    country: 'Rwanda',
    code: 'RW',
    flag: '🇷🇼',
    region: 'Africa',
    cities: [
      'Kigali (Nyarutarama / Kiyovu)'
    ]
  },
  {
    country: 'Ivory Coast',
    code: 'CI',
    flag: '🇨🇮',
    region: 'Africa',
    cities: [
      'Abidjan (Cocody / Plateau)',
      'Grand-Bassam'
    ]
  },
  {
    country: 'Senegal',
    code: 'SN',
    flag: '🇸🇳',
    region: 'Africa',
    cities: [
      'Dakar (Almadies / Fann)'
    ]
  },
  {
    country: 'Morocco',
    code: 'MA',
    flag: '🇲🇦',
    region: 'Africa',
    cities: [
      'Marrakech (Hivernage / Palmeraie)',
      'Casablanca (Anfa)',
      'Rabat',
      'Tangier'
    ]
  },
  {
    country: 'Tanzania',
    code: 'TZ',
    flag: '🇹🇿',
    region: 'Africa',
    cities: [
      'Zanzibar (Nungwi & Stone Town)',
      'Dar es Salaam (Oysterbay)'
    ]
  },
  {
    country: 'Uganda',
    code: 'UG',
    flag: '🇺🇬',
    region: 'Africa',
    cities: [
      'Kampala (Kololo / Nakasero)'
    ]
  },
  {
    country: 'Ethiopia',
    code: 'ET',
    flag: '🇪🇹',
    region: 'Africa',
    cities: [
      'Addis Ababa (Bole)'
    ]
  },

  // ================= EUROPE =================
  {
    country: 'United Kingdom',
    code: 'GB',
    flag: '🇬🇧',
    region: 'Europe',
    cities: [
      'London (Mayfair & Kensington)',
      'London (Knightsbridge & Chelsea)',
      'London (Canary Wharf & Soho)',
      'Manchester',
      'Edinburgh',
      'Birmingham',
      'Oxford'
    ]
  },
  {
    country: 'France',
    code: 'FR',
    flag: '🇫🇷',
    region: 'Europe',
    cities: [
      'Paris (8th Arr. / Champs-Élysées)',
      'Paris (Le Marais / 1st Arr.)',
      'Cannes',
      'Nice & French Riviera',
      'Monaco (Monte Carlo)'
    ]
  },
  {
    country: 'Italy',
    code: 'IT',
    flag: '🇮🇹',
    region: 'Europe',
    cities: [
      'Milan (Brera / Quadrilatero)',
      'Rome',
      'Florence',
      'Venice',
      'Amalfi Coast',
      'Lake Como'
    ]
  },
  {
    country: 'Switzerland',
    code: 'CH',
    flag: '🇨🇭',
    region: 'Europe',
    cities: [
      'Geneva',
      'Zurich',
      'St. Moritz',
      'Basel'
    ]
  },
  {
    country: 'Spain',
    code: 'ES',
    flag: '🇪🇸',
    region: 'Europe',
    cities: [
      'Madrid (Salamanca)',
      'Barcelona',
      'Marbella',
      'Ibiza'
    ]
  },
  {
    country: 'Germany',
    code: 'DE',
    flag: '🇩🇪',
    region: 'Europe',
    cities: [
      'Berlin (Mitte)',
      'Munich (Bogenhausen)',
      'Frankfurt'
    ]
  },
  {
    country: 'Netherlands',
    code: 'NL',
    flag: '🇳🇱',
    region: 'Europe',
    cities: [
      'Amsterdam (Zuid / Canal Ring)',
      'Rotterdam'
    ]
  },
  {
    country: 'Greece',
    code: 'GR',
    flag: '🇬🇷',
    region: 'Europe',
    cities: [
      'Mykonos',
      'Santorini',
      'Athens (Glyfada)'
    ]
  },
  {
    country: 'Portugal',
    code: 'PT',
    flag: '🇵🇹',
    region: 'Europe',
    cities: [
      'Lisbon (Cascais / Chiado)',
      'Porto',
      'Algarve'
    ]
  },

  // ================= AMERICAS =================
  {
    country: 'United States',
    code: 'US',
    flag: '🇺🇸',
    region: 'Americas',
    cities: [
      'New York (Manhattan)',
      'Miami (South Beach / Brickell)',
      'Los Angeles (Beverly Hills / Malibu)',
      'Atlanta (Buckhead)',
      'Houston',
      'Dallas',
      'Chicago',
      'San Francisco',
      'Washington D.C.',
      'Las Vegas'
    ]
  },
  {
    country: 'Canada',
    code: 'CA',
    flag: '🇨🇦',
    region: 'Americas',
    cities: [
      'Toronto (Yorkville / Downtown)',
      'Vancouver',
      'Montreal'
    ]
  },
  {
    country: 'Brazil',
    code: 'BR',
    flag: '🇧🇷',
    region: 'Americas',
    cities: [
      'Rio de Janeiro (Ipanema / Leblon)',
      'São Paulo (Jardins)'
    ]
  },
  {
    country: 'Mexico',
    code: 'MX',
    flag: '🇲🇽',
    region: 'Americas',
    cities: [
      'Mexico City (Polanco)',
      'Tulum',
      'Cabo San Lucas',
      'Cancun'
    ]
  },
  {
    country: 'Colombia',
    code: 'CO',
    flag: '🇨🇴',
    region: 'Americas',
    cities: [
      'Medellín (El Poblado)',
      'Cartagena (Old Town)',
      'Bogotá'
    ]
  },

  // ================= MIDDLE EAST =================
  {
    country: 'United Arab Emirates',
    code: 'AE',
    flag: '🇦🇪',
    region: 'Middle East',
    cities: [
      'Dubai (Downtown & Marina)',
      'Dubai (Palm Jumeirah)',
      'Dubai (DIFC)',
      'Abu Dhabi (Saadiyat Island)'
    ]
  },
  {
    country: 'Saudi Arabia',
    code: 'SA',
    flag: '🇸🇦',
    region: 'Middle East',
    cities: [
      'Riyadh (Al Olaya)',
      'Jeddah (Corniche)'
    ]
  },
  {
    country: 'Qatar',
    code: 'QA',
    flag: '🇶🇦',
    region: 'Middle East',
    cities: [
      'Doha (The Pearl / West Bay)'
    ]
  },
  {
    country: 'Bahrain',
    code: 'BH',
    flag: '🇧🇭',
    region: 'Middle East',
    cities: [
      'Manama (Seef)'
    ]
  },
  {
    country: 'Kuwait',
    code: 'KW',
    flag: '🇰🇼',
    region: 'Middle East',
    cities: [
      'Kuwait City'
    ]
  },

  // ================= ASIA & PACIFIC =================
  {
    country: 'Singapore',
    code: 'SG',
    flag: '🇸🇬',
    region: 'Asia & Pacific',
    cities: [
      'Singapore (Marina Bay & Orchard)'
    ]
  },
  {
    country: 'Japan',
    code: 'JP',
    flag: '🇯🇵',
    region: 'Asia & Pacific',
    cities: [
      'Tokyo (Ginza & Roppongi)',
      'Kyoto',
      'Osaka'
    ]
  },
  {
    country: 'South Korea',
    code: 'KR',
    flag: '🇰🇷',
    region: 'Asia & Pacific',
    cities: [
      'Seoul (Gangnam & Hannam-dong)'
    ]
  },
  {
    country: 'Hong Kong',
    code: 'HK',
    flag: '🇭🇰',
    region: 'Asia & Pacific',
    cities: [
      'Hong Kong (Central & Mid-Levels)'
    ]
  },
  {
    country: 'Thailand',
    code: 'TH',
    flag: '🇹🇭',
    region: 'Asia & Pacific',
    cities: [
      'Bangkok (Sukhumvit)',
      'Phuket',
      'Koh Samui'
    ]
  },
  {
    country: 'Indonesia',
    code: 'ID',
    flag: '🇮🇩',
    region: 'Asia & Pacific',
    cities: [
      'Bali (Seminyak & Canggu)',
      'Jakarta'
    ]
  },
  {
    country: 'Australia',
    code: 'AU',
    flag: '🇦🇺',
    region: 'Asia & Pacific',
    cities: [
      'Sydney (Bondi & Harbour)',
      'Melbourne',
      'Gold Coast'
    ]
  }
];

export const ALL_NIGERIAN_STATES_LIST: string[] = NIGERIAN_STATES.map(s => s.state);

export const ALL_NIGERIAN_CITIES_FLAT: string[] = NIGERIAN_STATES.flatMap(s => s.cities);

export const NIGERIA_GEOPOLITICAL_ZONES = {
  'South East': ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
  'South South': ['Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'],
  'South West': ['Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'],
  'North Central': ['Benue', 'FCT Abuja', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau'],
  'North West': ['Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
  'North East': ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe']
};

export function getCitiesForState(stateName: string): string[] {
  const found = NIGERIAN_STATES.find(
    s => s.state.toLowerCase() === stateName.toLowerCase() ||
         s.state.toLowerCase().includes(stateName.toLowerCase())
  );
  return found ? found.cities : [];
}

export function getStateForCity(cityName: string): string | undefined {
  const cleanCity = cityName.toLowerCase();
  for (const s of NIGERIAN_STATES) {
    if (s.cities.some(c => c.toLowerCase().includes(cleanCity) || cleanCity.includes(c.toLowerCase()))) {
      return s.state;
    }
  }
  return undefined;
}

export function searchNigerianLocations(query: string): string[] {
  if (!query || query.trim() === '') return ALL_NIGERIAN_CITIES_FLAT.slice(0, 30);
  const q = query.toLowerCase().trim();
  return ALL_NIGERIAN_CITIES_FLAT.filter(city => city.toLowerCase().includes(q));
}

export const POPULAR_FILTER_CITIES = [
  'All Cities',
  // Nigeria — Major Hubs & Capitals
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Enugu',
  'Owerri',
  'Ibadan',
  'Asaba',
  'Warri',
  'Awka',
  'Onitsha',
  'Aba',
  'Umuahia',
  'Uyo',
  'Calabar',
  'Benin City',
  'Kano',
  'Kaduna',
  'Jos',
  'Ilorin',
  'Abeokuta',
  'Akure',
  'Osogbo',
  'Ado-Ekiti',
  'Yenagoa',
  'Abakaliki',
  'Makurdi',
  'Minna',
  'Lokoja',
  'Lafia',
  'Maiduguri',
  'Bauchi',
  'Gombe',
  'Yola',
  'Sokoto',
  'Katsina',
  'Dutse',
  'Birnin Kebbi',
  'Gusau',
  'Jalingo',
  'Damaturu',
  // Africa
  'Accra',
  'Nairobi',
  'Johannesburg',
  'Cape Town',
  'Cairo',
  'Kigali',
  'Dakar',
  'Abidjan',
  'Marrakech',
  // Europe
  'London',
  'Paris',
  'Milan',
  'Geneva',
  'Monaco',
  'Madrid',
  'Barcelona',
  'Berlin',
  'Amsterdam',
  'Rome',
  // Americas
  'New York',
  'Miami',
  'Los Angeles',
  'Atlanta',
  'Houston',
  'Toronto',
  'Rio de Janeiro',
  // Middle East
  'Dubai',
  'Abu Dhabi',
  'Doha',
  'Riyadh',
  // Asia
  'Singapore',
  'Tokyo',
  'Hong Kong',
  'Seoul',
  'Bangkok',
  'Bali',
  'Sydney'
];
