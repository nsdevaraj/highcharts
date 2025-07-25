Highcharts.chart('container', {
    chart: {
        zooming: {
            type: 'xy'
        }
    },
    title: {
        text: 'Karasjok weather, 2023',
        align: 'left'
    },
    credits: {
        text: 'Source: ' +
            '<a href="https://www.yr.no/nb/historikk/graf/5-97251/Norge/Finnmark/Karasjok/Karasjok?q=2023"' +
            'target="_blank">YR</a>'
    },
    xAxis: [{
        categories: [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ],
        crosshair: true
    }],
    yAxis: [{ // Primary yAxis
        labels: {
            format: '{value}°C'
        },
        title: {
            text: 'Temperature'
        },
        lineColor: Highcharts.getOptions().colors[1],
        lineWidth: 2
    }, { // Secondary yAxis
        title: {
            text: 'Precipitation'
        },
        labels: {
            format: '{value} mm'
        },
        lineColor: Highcharts.getOptions().colors[0],
        lineWidth: 2,
        opposite: true
    }],
    tooltip: {
        shared: true
    },
    legend: {
        align: 'left',
        verticalAlign: 'top'
    },
    series: [{
        name: 'Precipitation',
        type: 'column',
        yAxis: 1,
        data: [
            45.7, 37.0, 28.9, 17.1, 39.2, 18.9, 90.2, 78.5, 74.6,
            18.7, 17.1, 16.0
        ],
        tooltip: {
            valueSuffix: ' mm'
        }

    }, {
        name: 'Temperature',
        type: 'spline',
        data: [
            -11.4, -9.5, -14.2, 0.2, 7.0, 12.1, 13.5, 13.6, 8.2,
            -2.8, -12.0, -15.5
        ],
        tooltip: {
            valueSuffix: '°C'
        }
    }]
});