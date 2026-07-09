function formatNoneZero(data, symbol = null) {
    if (symbol != null) {
        return data != 0 ? `${parseFloat(data).toLocaleString("en-US")} ${symbol}` : '-';
    } else {        
        return (data != 0 && data != null) ? parseFloat(data).toLocaleString("en-US") : '-';
    }

}

export default formatNoneZero;
