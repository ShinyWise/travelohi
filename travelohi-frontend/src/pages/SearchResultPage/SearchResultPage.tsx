import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterSidebar from './components/FilterSidebar';
import FlightCard from '../../components/FlightCard';
import HotelCard from '../../components/HotelCard';
import PaginationControls from '../../components/PaginationControls';
import { FlightServiceClient } from '../../proto/travelohi/v1/flight/flight.client';
import { HotelServiceClient } from '../../proto/travelohi/v1/hotel/hotel.client';
import { transport } from '../../utils/grpcClient';
import styles from './SearchResultPage.module.scss';
const flightClient = new FlightServiceClient(transport);
const hotelClient = new HotelServiceClient(transport);
const SearchResultsPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const searchType = (searchParams.get('type') as 'flight' | 'hotel') || 'flight';
    const [results, setResults] = useState<any[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const handleTypeSwitch = (type: 'flight' | 'hotel') => {
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
            try {
                if (searchType === 'flight') {
                    const { response } = await flightClient.searchFlights({
                        originAirport: query,
                        destinationAirport: query,
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
                        minRating,
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
                <h2>Menampilkan hasil untuk: <span>"{query}"</span></h2>
                <div className={styles.typeTabs}>
                    <button
                        className={searchType === 'flight' ? styles.activeTab : ''}
                        onClick={() => handleTypeSwitch('flight')}
                    >
                        ✈️ Tiket Pesawat
                    </button>
                    <button
                        className={searchType === 'hotel' ? styles.activeTab : ''}
                        onClick={() => handleTypeSwitch('hotel')}
                    >
                        🏨 Hotel
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
                            <span className={styles.emptyIcon}>🔍</span>
                            <h3>Oops! Hasil tidak ditemukan.</h3>
                            <p>Coba gunakan kata kunci lain atau kurangi filter yang digunakan.</p>
                        </div>
                    ) : (
                        <>
                            {results.map((item, idx) => (
                                searchType === 'flight'
                                    ? <FlightCard key={item.id || idx} flight={item} />
                                    : <HotelCard key={item.id || idx} hotel={item} />
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