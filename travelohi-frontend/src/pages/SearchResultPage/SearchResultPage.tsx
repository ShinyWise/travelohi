import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterSidebar from './components/FilterSidebar';
import FlightCard from '../../components/FlightCard';
import HotelCard from '../../components/HotelCard';
import PaginationControls from '../../components/PaginationControls';
import { FlightServiceClient } from '../../proto/travelohi/v1/flight/flight.client';
import { HotelServiceClient } from '../../proto/travelohi/v1/hotel/hotel.client';
import { transport } from '../../utils/grpcClient';
import { Plane, Hotel, Search } from 'lucide-react';
import { getDisplayAirportName, getCodeFromCityName } from '../../utils/airportMapper';
import { useAppContext } from '../../context/ThemeContext';
import { translations } from '../../utils/translations';
import styles from './SearchResultPage.module.scss';
const flightClient = new FlightServiceClient(transport);
const hotelClient = new HotelServiceClient(transport);
const SearchResultsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const searchType = (searchParams.get('type') as 'all' | 'flight' | 'hotel') || 'all';
    const [results, setResults] = useState<any[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const { language } = useAppContext();
    const t = translations[language];

    const handleTypeSwitch = (type: 'all' | 'flight' | 'hotel') => {
        const newParams = new URLSearchParams();
        newParams.set('q', query);
        newParams.set('type', type);
        setSearchParams(newParams);
    };
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const limit = parseInt(searchParams.get('limit') || '20', 10);
            const offset = (parseInt(searchParams.get('page') || '1', 10) - 1) * limit;
            const sortParam = searchParams.get('sort_by') || '';
            let sortByField = '';
            let sortOrder = 'asc';
            if (sortParam) {
                const parts = sortParam.split('_');
                sortOrder = parts.pop() || 'asc';
                sortByField = parts.join('_');
            }
            const minRating = parseFloat(searchParams.get('min_rating') || '0');
            const facilities = searchParams.getAll('facility');
            const minPrice = BigInt(searchParams.get('min_price') || '0');
            const maxPrice = BigInt(searchParams.get('max_price') || '0');
            const transitParam = searchParams.get('transit') || '';
            const transitFilter = transitParam === '1_transit' ? 'transit' : (transitParam === 'direct' ? 'direct' : '');
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            const flightQuery = getCodeFromCityName(query);

            try {
                if (searchType === 'all') {
                    const fetchFlights = async () => {
                        try {
                            return await flightClient.searchFlights({
                                originAirport: '',
                                destinationAirport: flightQuery,
                                departureDate: today,
                                limit: Math.ceil(limit / 2),
                                offset: Math.ceil(offset / 2),
                                minPrice,
                                maxPrice,
                                transitFilter: '',
                                sortBy: '',
                                sortOrder: 'asc'
                            });
                        } catch {
                            return { response: { flights: [], totalResults: 0 } };
                        }
                    };

                    const fetchHotels = async () => {
                        try {
                            return await hotelClient.searchHotels({
                                query,
                                checkInDate: today,
                                checkOutDate: tomorrow,
                                limit: Math.floor(limit / 2),
                                offset: Math.floor(offset / 2),
                                minPrice,
                                maxPrice,
                                minRating: 0,
                                facilities: [],
                                sortBy: '',
                                sortOrder: 'asc'
                            });
                        } catch {
                            return { response: { hotels: [], totalResults: 0 } };
                        }
                    };

                    const [flightRes, hotelRes] = await Promise.all([fetchFlights(), fetchHotels()]);

                    const flights = (flightRes.response?.flights || []).map(f => ({ ...f, _type: 'flight' }));
                    const hotels = (hotelRes.response?.hotels || []).map(h => ({ ...h, _type: 'hotel' }));

                    // Group all flights first, then all hotels
                    const combined = [...flights, ...hotels];

                    setResults(combined);
                    setTotalResults((flightRes.response?.totalResults || 0) + (hotelRes.response?.totalResults || 0));
                } else if (searchType === 'flight') {
                    const { response } = await flightClient.searchFlights({
                        originAirport: '',
                        destinationAirport: flightQuery,
                        departureDate: today,
                        transitFilter,
                        sortBy: sortByField,
                        sortOrder: sortOrder,
                        limit,
                        offset,
                        minPrice,
                        maxPrice,
                    });
                    setResults(response.flights || []);
                    setTotalResults(response.totalResults || 0);
                } else {
                    const { response } = await hotelClient.searchHotels({
                        query,
                        checkInDate: today,
                        checkOutDate: tomorrow,
                        minPrice,
                        maxPrice,
                        minRating: minRating * 2,
                        facilities,
                        sortBy: sortByField,
                        sortOrder: sortOrder,
                        limit,
                        offset,
                    });
                    setResults(response.hotels || []);
                    setTotalResults(response.totalResults || 0);
                }
            } catch (error) {
                console.error(`Error fetching ${searchType}s:`, error);
                setResults([]);
                setTotalResults(0);
            } finally {
                setIsLoading(false);
            }
        };
        const timer = setTimeout(() => fetchData(), 100);
        return () => clearTimeout(timer);
    }, [searchParams, searchType, query]);
    return (
        <div className={styles.pageContainer}>
            <div className={styles.searchHeader}>
                <h2>
                    {query ? (
                        <>{t.search_results_title} <span>{getDisplayAirportName(query)}</span></>
                    ) : (
                        <>{t.search_results_empty_title}</>
                    )}
                </h2>
                <div className={styles.typeTabs}>
                    <button
                        className={searchType === 'all' ? styles.activeTab : ''}
                        onClick={() => handleTypeSwitch('all')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Search size={18} />
                        <span>{t.search_tab_all}</span>
                    </button>
                    <button
                        className={searchType === 'flight' ? styles.activeTab : ''}
                        onClick={() => handleTypeSwitch('flight')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plane size={18} />
                        <span>{t.search_tab_flights}</span>
                    </button>
                    <button
                        className={searchType === 'hotel' ? styles.activeTab : ''}
                        onClick={() => handleTypeSwitch('hotel')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Hotel size={18} />
                        <span>{t.search_tab_hotels}</span>
                    </button>
                </div>
            </div>
            <div className={styles.layout}>
                <FilterSidebar searchType={searchType} />
                <main className={styles.resultsMain}>
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={styles.skeletonCard}></div>
                        ))
                    ) : results.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon} style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
                                <Search size={48} />
                            </span>
                            <h3>{t.search_no_results_title}</h3>
                            <p>{t.search_no_results_desc}</p>
                        </div>
                    ) : (
                        <>
                            {results.map((item, idx) => (
                                item._type === 'flight' || (!item._type && searchType === 'flight')
                                    ? <FlightCard key={`flight-${item.id || idx}`} flight={item} />
                                    : <HotelCard key={`hotel-${item.id || idx}`} hotel={item} />
                            ))}
                            <PaginationControls totalResults={totalResults} />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};
export default SearchResultsPage;