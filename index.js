const axios = require('axios');
const moment = require('moment');
const TrustList = require('./trust-list.json');

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
        binanceSpotAjax.get('api/v3/exchangeInfo'),
        binanceFutureAjax.get('fapi/v1/exchangeInfo')
    ])
    const spotTokenUSDT = spotInfo.data.symbols.filter(e => e.quoteAsset === 'USDT' && e.permissions.includes('MARGIN')).map(e => e.baseAsset)
    const futureTokenUSDT = futureInfo.data.symbols.filter(e => e.quoteAsset === 'USDT').map(e => e.baseAsset)

    // const futureTokenUSDTChecker = futureTokenUSDT.reduce((r, e) => {
    //     r[e] = true
    //     return r
    // }, {})

    // Get Token in spot not in future by point
    // const spotTokenNotInFuture = spotTokenUSDT.filter(
    //     e => !futureTokenUSDTChecker[e]
    //         && (e.length >=5 ? !(e.substr(e.length - 2, e.length) === 'UP' || e.substr(e.length - 4, e.length) === 'DOWN'): true)
    // )
    //
    // const spotTokenNotInFuturePoint = spotTokenNotInFuture.reduce((r,e) => {
    //     const point = TrustList[e] || 0
    //     if(r[point]){
    //         r[point].push(e)
    //     } else {
    //         r[point] = [e]
    //     }
    //     return r
    // },{})
    //
    // console.log(spotTokenNotInFuturePoint)

    // Geting best buy
    let analystData = []
    for (const asset of spotTokenUSDT) {
        try {
            const [kline, avgPrice] = await Promise.all([
                binanceSpotAjax.get(`api/v3/klines?symbol=${asset + 'USDT'}&interval=1w&limit=10`),
                binanceSpotAjax.get(`api/v3/avgPrice?symbol=${asset + 'USDT'}`),
            ])

            const klineDetails = kline.data.map(e => {
                return {
                    open: parseFloat(e[1]),
                    high: parseFloat(e[2]),
                    low: parseFloat(e[3]),
                    close: parseFloat(e[4]),
                    openTime: e[0],
                    closeTime: e[6],
                }
            })

            const lastData = klineDetails[klineDetails.length - 1]

            const analystDetails = klineDetails.map((e) => {
                return {
                    openDate: moment(e.openTime).calendar(),
                    changeOpen: Math.round(100 * (avgPrice.data.price - e.open) / e.open * 100) / 100,
                    closeDate: moment(e.closeTime).calendar(),
                    changeClose: Math.round(100 * (avgPrice.data.price - e.close) / e.close * 100) / 100,
                }
            })
            analystData.push({
                data: analystDetails,
                asset: asset
            })
        } catch (e) {
            console.error('getting error of token: ' + asset + '. Reason: ', e.message)
        }
    }
    const analystResult = analystData.sort((a,b) => a.data[0].changeOpen - b.data[0].changeOpen).reduce((r, e) => {
        const point = TrustList[e.asset] || 0
        if (r[point]) {
            r[point].push(e)
        } else {
            r[point] = [e]
        }
        return r
    }, {})

    console.log('analystResult: ',
        Object.keys(analystResult).sort((a,b) => b - a).map(index => {
                return `${index}: ${analystResult[index].map(asset => {
                    return `${asset.asset} : ${asset.data.map(e => `${e.openDate} - ${e.changeOpen}%`).join(', ')}`
                }).join('\n')}`
            }).join('\n\n')
        )
})()
