/**
 * This is an advanced demo of setting up Highcharts with the flags feature
 * borrowed from Highcharts Stock. It also shows custom graphics drawn in the
 * chart area on chart load.
 */

/**
 * Fires on chart load, called from the chart.events.load option.
 */
function onChartLoad() {
    const centerX = 140,
        centerY = 110,
        path = [],
        badgeColor = Highcharts.color(Highcharts.getOptions().colors[0])
            .brighten(-0.2)
            .get();

    let spike,
        angle,
        radius,
        left,
        right;

    if (this.chartWidth < 530) {
        return;
    }

    // Draw the spiked disc
    for (angle = 0; angle < 2 * Math.PI; angle += Math.PI / 24) {
        radius = spike ? 80 : 70;
        path.push(
            'L',
            centerX + radius * Math.cos(angle),
            centerY + radius * Math.sin(angle)
        );
        spike = !spike;
    }
    path[0] = 'M';
    path.push('z');
    this.renderer
        .path(path)
        .attr({
            fill: badgeColor,
            zIndex: 6
        })
        .add();

    // Employee image overlay
    const empImage = this.renderer
        .path(path)
        .attr({
            zIndex: 7,
            opacity: 0,
            stroke: badgeColor,
            'stroke-width': 1
        })
        .add();

    // Find timedifference in  year
    let diff = (new Date().getTime() - new Date(2009, 10, 27).getTime()) / 1000;
    diff /= 60 * 60 * 24;
    const yearsSince = Math.abs(Math.round(diff / 365.25));

    // Big 5
    const big5 = this.renderer
        .text(yearsSince)
        .attr({
            zIndex: 6
        })
        .css({
            color: 'white',
            fontSize: '100px',
            fontStyle: 'italic',
            fontFamily: '"Brush Script MT", sans-serif'
        })
        .add();
    big5.attr({
        x: centerX - big5.getBBox().width / 2,
        y: centerY + 14
    });

    // Draw the label
    const label = this.renderer
        .text('years and counting')
        .attr({
            zIndex: 6
        })
        .css({
            color: '#FFFFFF',
            fontSize: '12px'
        })
        .add();

    left = centerX - label.getBBox().width / 2;
    right = centerX + label.getBBox().width / 2;

    label.attr({
        x: left,
        y: centerY + 44
    });

    // The band
    left = centerX - 90;
    right = centerX + 90;
    this.renderer
        .path([
            'M',
            left,
            centerY + 30,
            'L',
            right,
            centerY + 30,
            right,
            centerY + 50,
            left,
            centerY + 50,
            'z',
            'M',
            left,
            centerY + 40,
            'L',
            left - 20,
            centerY + 40,
            left - 10,
            centerY + 50,
            left - 20,
            centerY + 60,
            left + 10,
            centerY + 60,
            left,
            centerY + 50,
            left + 10,
            centerY + 60,
            left + 10,
            centerY + 50,
            left,
            centerY + 50,
            'z',
            'M',
            right,
            centerY + 40,
            'L',
            right + 20,
            centerY + 40,
            right + 10,
            centerY + 50,
            right + 20,
            centerY + 60,
            right - 10,
            centerY + 60,
            right,
            centerY + 50,
            right - 10,
            centerY + 60,
            right - 10,
            centerY + 50,
            right,
            centerY + 50,
            'z'
        ])
        .attr({
            fill: badgeColor,
            stroke: '#FFFFFF',
            'stroke-width': 1,
            zIndex: 5
        })
        .add();

    // 2009-2014
    const years = this.renderer
        .text('2009-' + new Date().getFullYear())
        .attr({
            zIndex: 6
        })
        .css({
            color: '#FFFFFF',
            fontStyle: 'italic',
            fontSize: '10px'
        })
        .add();
    years.attr({
        x: centerX - years.getBBox().width / 2,
        y: centerY + 62
    });

    // Prepare mouseover
    const renderer = this.renderer;
    if (renderer.defs) {
        // is SVG
        this.get('employees').points.forEach(point => {
            let pattern;
            if (point.image) {
                pattern = renderer
                    .createElement('pattern')
                    .attr({
                        id: 'pattern-' + point.image,
                        patternUnits: 'userSpaceOnUse',
                        width: 400,
                        height: 400
                    })
                    .add(renderer.defs);
                renderer
                    .image(
                        'https://www.highcharts.com/images/employees2014/' +
                            point.image +
                            '.jpg',
                        centerX - 80,
                        centerY - 80,
                        160,
                        213
                    )
                    .add(pattern);

                Highcharts.addEvent(point, 'mouseOver', function () {
                    empImage
                        .attr({
                            fill: 'url(#pattern-' + point.image + ')'
                        })
                        .animate({ opacity: 1 }, { duration: 500 });
                });
                Highcharts.addEvent(point, 'mouseOut', function () {
                    empImage.animate({ opacity: 0 }, { duration: 500 });
                });
            }
        });
    }
}

const employees = [
    { x: '2009-11-01', y: 1 },
    { x: '2010-11-20', y: 2 },
    { x: '2011-04-01', y: 3 },
    { x: '2011-08-01', y: 4 },
    { x: '2011-08-05', y: 5 },
    { x: '2012-06-01', y: 6 },
    { x: '2012-09-10', y: 5 },
    { x: '2012-09-15', y: 6 },
    { x: '2013-08-01', y: 7 },
    { x: '2013-08-20', y: 8 },
    { x: '2013-10-01', y: 9 },
    { x: '2014-08-08', y: 10 },
    { x: '2014-11-01', y: 11 },
    { x: '2015-02-01', y: 12 },
    { x: '2015-05-01', y: 13 },
    { x: '2015-08-01', y: 15 },
    { x: '2016-01-01', y: 16 },
    { x: '2016-02-01', y: 18 },
    { x: '2016-05-01', y: 17 },
    { x: '2016-07-01', y: 16 },
    { x: '2016-08-01', y: 19 },
    { x: '2016-09-01', y: 20 },
    { x: '2017-01-01', y: 21 },
    { x: '2017-03-01', y: 20 },
    { x: '2017-08-01', y: 19 },
    { x: '2017-09-01', y: 21 },
    { x: '2017-11-01', y: 20 },
    { x: '2018-01-01', y: 23 },
    { x: '2018-08-01', y: 26 },
    { x: '2019-02-01', y: 27 },
    { x: '2019-03-01', y: 28 },
    { x: '2019-06-01', y: 29 },
    { x: '2019-08-01', y: 31 },
    { x: '2020-01-01', y: 29 },
    { x: '2020-02-01', y: 28 },
    { x: '2020-06-01', y: 27 },
    { x: '2020-07-01', y: 26 },
    { x: '2020-09-01', y: 28 },
    { x: '2020-10-01', y: 29 },
    { x: '2020-11-01', y: 30 },
    { x: '2021-01-01', y: 31 },
    { x: '2021-02-01', y: 32 },
    { x: '2021-03-01', y: 33 },
    { x: '2021-04-01', y: 34 },
    { x: '2021-06-01', y: 33 },
    { x: '2021-07-01', y: 34 },
    { x: '2021-09-01', y: 33 },
    { x: '2021-10-01', y: 32 },
    { x: '2021-11-01', y: 33 },
    { x: '2021-12-01', y: 34 },
    { x: '2022-02-01', y: 35 },
    { x: '2022-03-01', y: 34 },
    { x: '2022-05-01', y: 36 },
    { x: '2022-06-01', y: 37 },
    { x: '2022-07-01', y: 36 },
    { x: '2022-08-01', y: 39 },
    { x: '2022-09-01', y: 38 },
    { x: '2022-11-01', y: 39 },
    { x: '2022-12-01', y: 39 },
    { x: '2023-01-01', y: 39 },
    { x: '2023-02-01', y: 39 },
    { x: '2023-03-01', y: 40 },
    { x: '2023-04-01', y: 41 },
    { x: '2023-05-01', y: 41 },
    { x: '2023-06-01', y: 40 },
    { x: '2023-07-01', y: 38 }
];

const options = {
    chart: {
        events: {
            load: onChartLoad
        },
        scrollablePlotArea: {
            minWidth: 700,
            scrollPositionX: 1
        }
    },
    xAxis: {
        type: 'datetime',
        minTickInterval: 365 * 24 * 36e5,
        labels: {
            align: 'left'
        },
        plotBands: [
            {
                from: '2009-11-27',
                to: '2010-12-01',
                color: '#00ffff22',
                label: {
                    text: '<em>Offices:</em><br>Torstein´s<br>basement',
                    style: {
                        color: '#999999',
                        width: 'auto'
                    },
                    y: 180
                }
            },
            {
                from: '2010-12-01',
                to: '2013-10-01',
                color: '#ffff0022',
                label: {
                    text: '<em>Offices:</em><br> Tomtebu',
                    style: {
                        color: '#999999'
                    },
                    y: 30
                }
            },
            {
                from: '2013-10-01',
                to: '2016-03-01',
                color: '#ff00ff22',
                label: {
                    text: '<em>Offices:</em><br> VikØrsta',
                    style: {
                        color: '#999999'
                    },
                    y: 30
                }
            },
            {
                from: '2016-03-10',
                to: '2022-12-30',
                color: '#00ffff22',
                label: {
                    text: '<em>Offices</em>:<br>Blix Hotel',
                    y: 20
                }
            }
        ]
    },
    title: {
        text: 'Highcharts and Highsoft timeline'
    },
    caption: {
        text: 'An advanced demo showing a combination of various Highcharts ' +
            'features, including flags and plot bands. The chart shows how ' +
            'Highcharts and Highsoft has evolved over time, with number of ' +
            'employees, revenue, search popularity, office locations, and ' +
            'various events of interest.'
    },
    credits: {
        enabled: false
    },
    tooltip: {
        style: {
            width: '250px'
        }
    },
    yAxis: [
        {
            max: 100,
            labels: {
                enabled: false
            },
            title: {
                text: ''
            },
            gridLineColor: 'rgba(0, 0, 0, 0.07)'
        },
        {
            allowDecimals: false,
            labels: {
                style: {
                    color: Highcharts.getOptions().colors[1]
                }
            },
            title: {
                text: 'Employees',
                style: {
                    color: Highcharts.getOptions().colors[1]
                }
            },
            opposite: true,
            gridLineWidth: 0
        }
    ],
    plotOptions: {
        series: {
            marker: {
                enabled: false,
                symbol: 'circle',
                radius: 2
            },
            fillOpacity: 0.5
        },
        flags: {
            tooltip: {
                xDateFormat: '%B %e, %Y'
            },
            accessibility: {
                point: {
                    valueDescriptionFormat:
                        '{xDescription}. {point.title}: {point.text}.'
                }
            },
            opacity: 0.8
        }
    },
    series: [
        {
            name: 'Revenue',
            id: 'revenue',
            type: 'area',
            data: [
                [1259622000000, 16],
                [1262300400000, 15],
                [1264978800000, 12],
                [1267398000000, 15],
                [1270072800000, 13],
                [1272664800000, 13],
                [1275343200000, 14],
                [1277935200000, 13],
                [1280613600000, 14],
                [1283292000000, 16],
                [1285884000000, 19],
                [1288566000000, 16],
                [1291158000000, 18],
                [1293836400000, 16],
                [1296514800000, 14],
                [1298934000000, 17],
                [1301608800000, 14],
                [1304200800000, 14],
                [1306879200000, 16],
                [1309471200000, 14],
                [1312149600000, 15],
                [1314828000000, 18],
                [1317420000000, 21],
                [1320102000000, 17],
                [1322694000000, 20],
                [1325372400000, 18],
                [1328050800000, 15],
                [1330556400000, 23],
                [1333231200000, 19],
                [1335823200000, 19],
                [1338501600000, 22],
                [1341093600000, 19],
                [1343772000000, 21],
                [1346450400000, 24],
                [1349042400000, 29],
                [1351724400000, 24],
                [1354316400000, 27],
                [1356994800000, 25],
                [1359673200000, 19],
                [1362092400000, 22],
                [1364767200000, 28],
                [1367359200000, 29],
                [1370037600000, 30],
                [1372629600000, 33],
                [1375308000000, 36],
                [1377986400000, 34],
                [1380578400000, 37],
                [1383260400000, 36],
                [1385852400000, 33],
                [1388530800000, 31],
                [1391209200000, 28],
                [1393628400000, 29],
                [1396303200000, 38],
                [1398895200000, 31],
                [1401573600000, 38],
                [1404165600000, 33],
                [1406844000000, 35],
                [1409522400000, 35],
                [1412114400000, 48],
                [1414796400000, 54],
                [1417388400000, 46],
                [1420066800000, 65],
                [1422745200000, 39],
                [1425164400000, 47],
                [1427839200000, 70],
                [1430431200000, 53],
                [1433109600000, 43],
                [1435701600000, 60],
                [1438380000000, 58],
                [1441058400000, 53],
                [1443650400000, 67],
                [1446332400000, 81],
                [1448924400000, 63],
                [1451602800000, 65],
                [1454281200000, 45],
                [1456786800000, 58],
                [1459461600000, 71],
                [1462053600000, 57],
                [1464732000000, 59],
                [1467324000000, 59],
                [1470002400000, 60],
                [1472680800000, 72],
                [1475272800000, 63],
                [1477954800000, 69],
                [1480546800000, 70],
                [1483225200000, 68],
                [1485903600000, 35],
                [1488322800000, 51],
                [1490997600000, 70],
                [1493589600000, 56],
                [1496268000000, 53],
                [1498860000000, 65],
                [1501538400000, 48],
                [1504216800000, 80],
                [1506808800000, 44],
                [1509490800000, 70],
                [1512082800000, 62],
                [1514761200000, 72],
                [1517439600000, 46],
                [1519858800000, 46],
                [1522533600000, 77],
                [1525125600000, 61],
                [1527804000000, 72],
                [1530396000000, 65],
                [1533074400000, 48],
                [1535752800000, 51],
                [1538344800000, 59],
                [1541026800000, 71],
                [1543618800000, 77],
                [1546297200000, 64],
                [1548975600000, 55],
                [1551394800000, 50],
                [1554069600000, 63],
                [1556661600000, 51],
                [1559340000000, 67],
                [1561932000000, 50],
                [1564610400000, 63],
                [1567288800000, 54],
                [1569880800000, 45],
                [1572480000000, 63],
                [1575072000000, 59],
                [1577750400000, 68],
                [1580428800000, 56],
                [1582848000000, 53],
                [1585612800000, 48],
                [1588204800000, 69],
                [1590883200000, 55],
                [1593475200000, 47],
                [1596153600000, 59],
                [1598832000000, 45],
                [1601424000000, 58],
                [1604102400000, 62],
                [1606694400000, 45],
                [1609372800000, 49],
                [1612051200000, 52],
                [1614470400000, 45],
                [1617148800000, 62],
                [1619740800000, 43],
                [1622419200000, 58],
                [1625011200000, 50],
                [1627689600000, 59],
                [1630368000000, 46],
                [1632960000000, 53],
                [1635638400000, 59],
                [1638230400000, 50],
                [1640908800000, 49],
                [1643587200000, 81],
                [1646006400000, 52],
                [1648684800000, 74],
                [1651276800000, 38],
                [1653955200000, 53],
                [1656547200000, 65],
                [1659225600000, 57],
                [1661904000000, 49],
                [1664496000000, 45],
                [1667174400000, 60],
                [1669766400000, 60],
                [1672444800000, 50],
                [1675141200000, 73],
                [1677560400000, 100],
                [1680235200000, 94],
                [1682827200000, 68],
                [1685505600000, 66],
                [1688097600000, 61],
                [1690776000000, 60],
                [1693454400000, null]
            ],
            tooltip: {
                xDateFormat: '%B %Y',
                valueSuffix: ' % of best month'
            }
        },
        {
            yAxis: 1,
            name: 'Highsoft employees',
            id: 'employees',
            type: 'area',
            step: 'left',
            tooltip: {
                headerFormat:
                    '<span style="font-size: 11px;color:#666">{point.x:%B %e,' +
                    ' %Y}</span><br>',
                pointFormat: '{point.name}<br><b>{point.y}</b>',
                valueSuffix: ' employees'
            },
            data: employees
        }
    ]
};

// Add flags for important milestones. This requires Highcharts Stock.
if (Highcharts.Series.types.flags) {
    options.series.push(
        {
            type: 'flags',
            name: 'Cloud',
            shape: 'squarepin',
            y: -80,
            data: [
                {
                    x: '2014-05-01',
                    text: 'Highcharts Cloud Beta',
                    title: 'Cloud',
                    shape: 'squarepin'
                }
            ],
            showInLegend: false
        },
        {
            type: 'flags',
            name: 'Highmaps',
            shape: 'squarepin',
            y: -55,
            data: [
                {
                    x: '2014-06-13',
                    text: 'Highmaps version 1.0 released',
                    title: 'Maps'
                }
            ],
            showInLegend: false
        },
        {
            type: 'flags',
            name: 'Gantt',
            shape: 'squarepin',
            y: -55,
            data: [
                {
                    x: '2018-10-17',
                    text: 'Highcharts Gantt version 1.0 released',
                    title: 'Gantt'
                }
            ],
            showInLegend: false
        },
        {
            type: 'flags',
            name: 'Highcharts GPT',
            shape: 'squarepin',
            y: -55,
            data: [
                {
                    x: '2023-05-05',
                    text: 'Highcharts GPT (powered by ChatGPT) released',
                    title: 'Highcharts GPT'
                }
            ],
            showInLegend: false
        },
        {
            type: 'flags',
            name: 'Highcharts',
            shape: 'circlepin',
            data: [
                {
                    x: '2009-11-27',
                    text: 'Highcharts version 1.0 released',
                    title: '1.0'
                },
                {
                    x: '2010-07-13',
                    text: 'Ported from canvas to SVG rendering',
                    title: '2.0'
                },
                {
                    x: '2010-11-23',
                    text: 'Dynamically resize and scale to text labels',
                    title: '2.1'
                },
                {
                    x: '2011-10-18',
                    text: 'Highcharts Stock version 1.0 released',
                    title: 'Stock',
                    shape: 'squarepin'
                },
                {
                    x: '2012-08-24',
                    text: 'Gauges, polar charts and range series',
                    title: '2.3'
                },
                {
                    x: '2013-03-22',
                    text: 'Multitouch support, more series types',
                    title: '3.0'
                },
                {
                    x: '2014-04-22',
                    text: '3D charts, heatmaps',
                    title: '4.0'
                },
                {
                    x: '2016-09-29',
                    text: 'Styled mode, responsive options, accessibility, ' +
                        'chart.update',
                    title: '5.0'
                },
                {
                    x: '2017-10-04',
                    text: 'Annotations, Boost, Series labels, new series types',
                    title: '6.0'
                },
                {
                    x: '2018-12-11',
                    text: 'Sonification, TypeScript (beta), new series types',
                    title: '7.0'
                },
                {
                    x: '2019-12-10',
                    text: 'Accessibility, data sorting, marker clusters',
                    title: '8.0'
                },
                {
                    x: '2021-02-02',
                    text: 'Improved security, accessibility options, zoom by ' +
                        'single touch',
                    title: '9.0'
                },
                {
                    x: '2022-03-07',
                    text: 'Bread crumbs, improved Boost pixel ratio, ' +
                        'threshold alignment in charts with multiple axes',
                    title: '10.0'
                },
                {
                    x: '2023-04-27',
                    text: 'Design upgrade, Faster codebase, Flow maps, ' +
                        'Pictorial charts, Treegraphs, Geographical heatmaps,' +
                        ' Audio charts',
                    title: '11.0'
                }
            ],
            showInLegend: false
        },
        {
            type: 'flags',
            name: 'Events',
            data: [
                {
                    x: '2012-11-01',
                    text: 'Highsoft won "Entrepeneur of the Year" in Sogn og ' +
                        'Fjordane, Norway',
                    title: 'Award'
                },
                {
                    x: '2012-12-25',
                    text: 'Packt Publishing published <em>Learning ' +
                        'Highcharts by Example</em>. Since then, many other ' +
                        'books are written about Highcharts.',
                    title: 'First book'
                },
                {
                    x: '2013-05-25',
                    text: 'Highsoft nominated Norway`s Startup of the Year',
                    title: 'Award'
                },
                {
                    x: '2014-05-25',
                    text: 'Highsoft nominated Best Startup in Nordic Startup ' +
                        'Awards',
                    title: 'Award'
                },
                {
                    x: '2018-12-13',
                    text: 'Highsoft nominated Best Startup in Nordic Startup ' +
                        'Awards',
                    title: 'Award'
                },
                {
                    x: '2017-10-20',
                    text: 'Highsoft nominated Best Startup in Nordic Startup ' +
                        'Awards',
                    title: 'Award'
                }
            ],
            onSeries: 'revenue',
            showInLegend: false
        }
    );
}

Highcharts.chart('container', options);
