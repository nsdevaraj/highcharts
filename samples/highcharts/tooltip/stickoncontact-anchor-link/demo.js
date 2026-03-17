Highcharts.chart('container', {
    title: {
        text: 'Tooltip with clickable anchor links'
    },

    subtitle: {
        text: 'Use stickOnContact to keep the tooltip open while hovering links'
    },

    tooltip: {
        followTouchMove: false,
        stickOnContact: true,
        useHTML: true
    },

    xAxis: {
        categories: ['A', 'B', 'C']
    },

    series: [{
        tooltip: {
            headerFormat: '',
            hideDelay: 5000,
            pointFormat:
                '{point.y} <a href="{point.custom.url}" ' +
                'target="_blank" rel="noopener">Link</a>'
        },
        data: [{
            y: 1,
            custom: {
                url: 'https://www.highcharts.com/#1'
            }
        }, {
            y: 3,
            custom: {
                url: 'https://www.highcharts.com/#2'
            }
        }, {
            y: 2,
            custom: {
                url: 'https://www.highcharts.com/#3'
            }
        }]
    }]
});
