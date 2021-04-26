// let testData = require('./ETHUSDT-1d.json')
const HeikinAshi = require("heikinashi");
const {ma} = require('moving-averages');
const axios = require('axios');

const binanceSpotAjax = axios.create({
    baseURL: 'https://api.binance.com/',
    responseType: 'json',
    withCredentials: false,
});

(async () => {
    const data = await binanceSpotAjax.get(`api/v3/klines?symbol=BTCBUSD&interval=4h&limit=1000`)
    let testData = data.data.map(e => {
        return {
            openTime: e[0],
            open: e[1],
            high: e[2],
            low: e[3],
            close: e[4],
            volume: e[5],
            closeTime: e[6],
            quoteAssetVolume: e[7],
            numberOfTrades: e[8],
        }
    })

    testData.forEach(e => {
        e.open = parseFloat(e.open)
        e.close = parseFloat(e.close)
        e.high = parseFloat(e.high)
        e.low = parseFloat(e.low)
        e.volume = parseFloat(e.volume)
    })

    const heikinAshiData = HeikinAshi(testData,
        {
            overWrite: false,  //overwrites the original data or create a new array
            formatNumbers: false, //formats the numbers and reduces their significant digits based on the values
            decimals: 2,  //number of significant digitse => e.time = e.openTime
            forceExactDecimals: false //force the number of significant digits or reduce them if the number is high
        })


    const maVolumeData = ma(testData.map(e => parseFloat(e.volume)), 20)


    let entryPoint = null
    let orderRunningPoint = null
    let trailingStopPoint = null
    let tradeResult = []

    testData.forEach((element, index) => {
        const heikinAshiElement = heikinAshiData[index]
        const maVolumeElement = maVolumeData[index]
        if(!orderRunningPoint && heikinAshiElement.open === heikinAshiElement.low) {
            entryPoint = element.close * 0.995
        } else if(entryPoint) {
            if(element.high > entryPoint && element.low < entryPoint && maVolumeElement && maVolumeElement < element.volume) {
                orderRunningPoint = entryPoint
                trailingStopPoint = entryPoint*0.97
            }
            entryPoint = null
        } else if(orderRunningPoint && heikinAshiElement.open === heikinAshiElement.high) {
            tradeResult.push((element.close - orderRunningPoint)/orderRunningPoint*100)
            orderRunningPoint = null
        } else if(trailingStopPoint) {

        } else {
            entryPoint = null
        }
    })

    if(tradeResult.length) {
        console.log("result: ", JSON.stringify(tradeResult, null, 2));

        console.log(tradeResult.reduce((r,e) => r + e),0);
        console.log(tradeResult.length);
    }

})()
