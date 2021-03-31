const axios = require('axios');

const binanceSpotAjax = axios.create({
    baseURL: 'https://api.binance.com/',
    responseType: 'json',
    withCredentials: false,
});

const binanceFutureAjax = axios.create({
    baseURL: 'https://fapi.binance.com/',
    responseType: 'json',
    withCredentials: false,
});

(async () => {
    const [spotInfo, futureInfo] = await Promise.all([
        binanceSpotAjax.get('api/v3/exchangeInfo '),
        binanceFutureAjax.get('fapi/v1/exchangeInfo')
    ])
    const spotTokenUSDT = spotInfo.data.symbols.filter(e => e.quoteAsset === 'USDT').map(e => e.baseAsset)
    const futureTokenUSDT = futureInfo.data.symbols.filter(e => e.quoteAsset === 'USDT').map(e => e.baseAsset)

    const futureTokenUSDTChecker = futureTokenUSDT.reduce((r,e) => {
        r[e] = true
        return r
    },{})

    const spotTokenNotInFuture = spotTokenUSDT.filter(
        e => !futureTokenUSDTChecker[e]
            && (e.length >=5 ? !(e.substr(e.length - 2, e.length) === 'UP' || e.substr(e.length - 4, e.length) === 'DOWN'): true)
    )
    console.log('spotTokenNotInFuture: ', spotTokenNotInFuture.join(', '))
})()