export const AIRPORT_CITY_MAP: Record<string, string> = {
    'CGK': 'Jakarta',
    'DPS': 'Bali',
    'BDO': 'Bandung',
    'SUB': 'Surabaya',
    'YIA': 'Yogyakarta',
    'KNO': 'Medan',
    'LOP': 'Lombok',
    'UPG': 'Makassar',
    'PLM': 'Palembang'
};

export const getCityNameFromAirportCode = (code: string): string => {
    return AIRPORT_CITY_MAP[code.toUpperCase()] || code;
};

export const getDisplayAirportName = (code: string): string => {
    return getCityNameFromAirportCode(code);
};

export const getCodeFromCityName = (cityName: string): string => {
    const lowerCity = cityName.toLowerCase();
    const entry = Object.entries(AIRPORT_CITY_MAP).find(
        ([_, city]) => city.toLowerCase() === lowerCity
    );
    return entry ? entry[0] : cityName;
};
