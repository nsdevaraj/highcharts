Highcharts.chart('container', {
    title: {
        text: 'Sample of a repeated break'
    },
    subtitle: {
        text: 'Line should be interrupted between 5 and 10, 15 and 20, 25 ' +
            'and 30, ...'
    },
    xAxis: {
        tickInterval: 1,
        breaks: [{
            from: 5,
            to: 10,
            breakSize: 1,
            repeat: 10
        }]
    },
    series: [{
        gapSize: 1,
        data: (function () {
            const data = [];
            for (let i = 0; i <= 30; i++) {
                data.push(i);
            }
            return data;
        }())
    }]
});