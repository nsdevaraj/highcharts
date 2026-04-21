QUnit.test('visibility', assert => {
    const {
        series: [series1, series2]
    } = Highcharts.chart('container', {
        yAxis: {
            min: 2,
            max: 5
        },
        series: [
            {
                data: [1, 2, 3, 4]
            },
            {
                data: [3, 2, 1, 4]
            }
        ],
        tooltip: {
            shared: true
        }
    });

    assert.strictEqual(
        series1.halo,
        undefined,
        'Should have no halo on Series 1 before hover'
    );
    assert.strictEqual(
        series2.halo,
        undefined,
        'Should have no halo on Series 2 before hover'
    );

    series1.points[2].onMouseOver();
    assert.ok(
        !!series1.halo,
        'Should have created a halo object on Series 1 after hover'
    );
    assert.strictEqual(
        series1.halo.visibility,
        'inherit',
        'Should have halo on Series 1 with visibility "inherit" after hover'
    );
    assert.strictEqual(
        series2.halo,
        undefined,
        'Should not create a halo object on Series 2 after hover'
    );
});

QUnit.test('Halo with boost module', assert => {
    const chart = Highcharts.chart('container', {
            xAxis: {
                min: -5,
                max: 5
            },
            plotOptions: {
                series: {
                    boostThreshold: 2,
                    marker: {
                        radius: 20
                    }
                }
            },
            series: [{
                data: [2, 3]
            }, {
                data: [3, 2]
            }]
        }),
        series = chart.series[0],
        controller = new TestController(chart);

    assert.strictEqual(
        series.markerGroup,
        chart.series[1].markerGroup,
        'Boosted series should share one marker group'
    );

    controller.mouseMove(
        series.points[0].plotX + chart.plotLeft,
        series.points[0].plotY + chart.plotTop
    );

    assert.ok(
        !!series.halo,
        'Should have created a halo object on Series after hover (#12870)'
    );

    assert.strictEqual(
        series.markerGroup.element.getAttribute('opacity'),
        '1',
        'Shared boost marker group should not be inactive on hover'
    );
});
