export const formatCurrency = (price: number | string | bigint, currency: 'IDR' | 'USD'): string => {
    const num = Number(price);
    if (isNaN(num)) return '';

    if (currency === 'USD') {
        const usdPrice = num / 16000;
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
        }).format(usdPrice);
    }

    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(num);
};
