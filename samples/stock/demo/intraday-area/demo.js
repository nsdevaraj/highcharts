(async () => {

    // Load the dataset
    const data = await fetch(
        'https://www.highcharts.com/samples/data/new-intraday.json'
    ).then(response => response.json());

    // create the chart
    Highcharts.stockChart('container', {

        title: {
            text: 'AAPL stock price by minute'
        },

        subtitle: {
            text: 'Using ordinal X axis'
        },

        xAxis: {
            gapGridLineWidth: 0
        },

        rangeSelector: {
            buttons: [{
                type: 'hour',
                count: 1,
                text: '1h'
            }, {
                type: 'day',
                count: 1,
                text: '1D'
            }, {
                type: 'all',
                count: 1,
                text: 'All'
            }],
            selected: 1,
            inputEnabled: false
        },

        series: [{
            name: 'AAPL',
            type: 'area',
            data: data,
            gapSize: 5,
            tooltip: {
                valueDecimals: 2
            },
            fillColor: {
                linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                },
                stops: [
                    [0, 'var(--highcharts-color-0, #2caffe)'],
                    [
                        1,
                        `color-mix(
                            in srgb,
                            var(--highcharts-color-0, #2caffe) 25%,
                            transparent
                        )`
                    ]
                ]
            },
            threshold: null
        }]
    });
})();
