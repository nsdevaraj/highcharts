Style by CSS
===

Highcharts optionally features _styled mode_, where the graphic design is clearly separated from the chart functionality.

When the [chart.styledMode](https://api.highcharts.com/highcharts/chart.styledMode) option is `true`, no presentational attributes (like `fill`, `stroke`, font styles etc.) are applied to the chart SVG. Instead, the design is applied purely by CSS.

Highcharts comes with a default CSS file, [css/highcharts.css](https://code.highcharts.com/css/highcharts.css).

To customize your styles, you can create your own themes, or just add your own individual CSS variables or rules. See the [Custom themes article](https://www.highcharts.com/docs/chart-design-and-style/custom-themes-in-styled-mode) for details.

Highcharts since v11 honors the [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) CSS media feature. If you end user prefers dark mode, the Highcharts CSS will pick this up and set the CSS color variables accordingly. To avoid this, you can set either the `.highcharts-light` or `.highcharts-dark` class name on the chart container. See a [live demo for switching between modes](https://www.highcharts.com/samples/highcharts/css/prefers-color-scheme).

## Loading the CSS

### Loading from the CDN

You can include the `highcharts.css` file directly from the Highcharts CDN at [code.highcharts.com](https://code.highcharts.com/css/highcharts.css). Simply add a `<link>` tag in your HTML:

```html
<link rel="stylesheet" href="https://code.highcharts.com/css/highcharts.css" />
```

Alternatively, it can be imported in CSS:

```html
<style>
@import url('https://code.highcharts.com/css/highcharts.css');
</style>
```

It is recommended to use a version-specific URL in production, for example `https://code.highcharts.com/11.4.8/css/highcharts.css`.


### Loading from node_modules

When using Highcharts with NPM, you can load the CSS from the `node_modules` directory. If the `node_modules` directory is available from the server, it would look like:

```html
<link rel="stylesheet" href="./node_modules/highcharts/css/highcharts.css" />
```

or in CSS:

```html
<style>
@import url('./node_modules/highcharts/css/highcharts.css');
</style>
```

If the `node_modules` directory is not served, the file should be copied to a public location and the link should be adjusted.

Some build tools, such as [Vite](https://vitejs.dev/), also support CSS imports using the package name: `@import url('highcharts/css/highcharts.css')`


What can be styled?
-------------------
Typography, colors and visual properties like stroke width and style can be set by CSS.

However, layout and positioning of elements like the title or legend cannot be controlled by CSS. This is a limitation of CSS for SVG, that does not (yet - [SVG 2 Geometric Style Properties](https://github.com/w3c/svgwg/wiki/SVG-2-new-features#geometric-attributes-that-can-now-be-specified-as-style-properties)) allow geometric attributes like `x`, `y`, `width` or `height`. And even if those were settable, we would still need to compute the layout flow in JavaScript. Instead, positioning is subject to Highcharts JavaScript options like `align`, `verticalAlign` etc.


What css rules apply
--------------------

Depending on how you prefer to work, you can use the browser's developer console to select SVG elements in the chart and see what CSS rules apply to it.

In addition to these, most elements, especially those where you can add multiple items, like axes, series, points etc, have a _className_ option. Use this to apply specific styling. See this [example of axis styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/axis/).

The following is an overview of what CSS rules are internally set on the Highcharts SVG elements and how to use them.

### CSS rules

#### General styling
```
.highcharts-root
```

Matches the root _svg_ element of the chart. Use this to set styles that should be inherited by all elements, like _font-family_ or other text styles. 

[Demo of styling the root element](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/chart/).

```
.highcharts-series
```

General styling for all series. To apply styling to only a specific series type, you can define CSS rules for `.highcharts-{type}-series`, for example `.highcharts-area-series` or `.highcharts-bar-series`. To make specific styling for one single series, you can define CSS rules for `.highcharts-series-{n}` where `n` is the index, or give the series a `className` option.

See [cursor demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/series-cursor/), [dashstyle demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/series-dashstyle/), [pie series demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/pie-point/), [polygon series demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/polygon/), [waterfall series demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/waterfall/).

```
.highcharts-graph
```

The graph of a line or line-like series. Use the parent item, `.highcharts-series` including series type, index or individual class name, to identify specific series. Replaces [plotOptions.series.color](https://api.highcharts.com/highcharts/plotOptions.series.color), [plotOptions.series.lineWidth](https://api.highcharts.com/highcharts/plotOptions.series.lineWidth), [plotOptions.series.dashStyle](https://api.highcharts.com/highcharts/plotOptions.series.dashStyle).

```
.highcharts-background
```

A rectangle for the chart background. Use it to set background fills or strokes. Replaces [chart.backgroundColor](https://api.highcharts.com/highcharts/chart.backgroundColor), [chart.borderColor](https://api.highcharts.com/highcharts/chart.borderColor) and [chart.borderWidth](https://api.highcharts.com/highcharts/chart.borderWidth) options. Backgrounds can also be set on the container div, but in that they will not be part of the exported chart.

[Chart background demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/chart-border-background/).

```
.highcharts-axis
```

The top group for axis. In addition to this class name, the group will have _.highcharts-xaxis_, _.highcharts-yaxis_ or _.highcharts-coloraxis_ class names. A custom class name can be set by the _className_ option. For individually styling other axis elements, use the top group to differentiate.

[Demo of axis styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/axis/).

```
.highcharts-plot-border
```

A rectangle for setting a stroke on the plot area. Unlike _.highcharts-plot-background_, this element is drawn in front of the grid. Replaces [chart.plotBorderColor](https://api.highcharts.com/highcharts/chart.plotBorderColor) and [chart.plotBorderWidth](https://api.highcharts.com/highcharts/chart.plotBorderWidth).

[Demo of styling the plot area](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/chart-plotarea/).

```
.highcharts-plot-background
```

A rectangle for setting fills on the plot area. Unlike _.highcharts-plot-border_, this element is drawn behind the grid, so it shouldn't be used to give the plot area a stroke.  Replaces [chart.plotBackgroundColor](https://api.highcharts.com/highcharts/chart.plotBackgroundColor).

[Demo of styling the plot area](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/chart-plotarea/).

```
.highcharts-plot-line
```

Style the plot lines. Use the _className_ option on each line to distinguish them. Replaces color, dashStyle and width options for the plot line.

```
.highcharts-plot-line-label
```

Style the plot line labels. Use the _className_ option on each line to distinguish them. Replaces the [plotLines.label.style](https://api.highcharts.com/highcharts/xAxis.plotLines.label.style) option.

```
.highcharts-selection-marker
```

The rectangle that appears when mouse-dragging for zooming. Replaces [chart.selectionMarkerFill](https://api.highcharts.com/highcharts/chart.selectionMarkerFill).

```
.highcharts-color-{n}
```

Colors used for series, or individual points when [colorByPoint](https://api.highcharts.com/highcharts/plotOptions.column.colorByPoint) is set, typically for pie charts etc. Each such color rule sets the fill and stroke to a default color in _highcharts.css_, then these properties may be overridden by more specific rules, for example for a common stroke on pies. The best place to set your own custom colors is by overriding the `--highcharts-color-{n}` variables in `highcharts.css`, otherwise the strokes and fills must be set more specifically. Replaces [colors](https://api.highcharts.com/highcharts/colors).

[Demo of styling series and point colors](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/colors/).

Note that by default, only color indices 0-9 are defined. For color indices above 9, you need to define the corresponding CSS variables and classes:

If you want to use additional `colorIndex` values (e.g. 10, 11, ...), you need to:

1. **Define additional CSS variables**:

```css
:root {
  --highcharts-color-10: #ff9933;
  --highcharts-color-11: #00B050;
  /* Add more as needed */
}
```

2. **Create corresponding CSS classes**:

```css
.highcharts-color-10 {
  stroke: var(--highcharts-color-10);
  fill: var(--highcharts-color-10);
}
.highcharts-color-11 {
  stroke: var(--highcharts-color-11);
  fill: var(--highcharts-color-11);
}
```

3. **Adjust `chart.colorCount`** in the chart configuration:

```js
chart: {
  colorCount: 12 // Extend to match number of defined colors
}
```

See a live example of how to [define and use additional `colorIndex` values](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/color-count/).

**Note:** If you manually assign a `colorIndex` to a series or point in JavaScript, Highcharts will not apply automatic color assignment based on `chart.colorCount`. In that case, you must define the corresponding CSS class and variable yourself.

```
.highcharts-crosshair
```

Styles for the crosshair extending from the axis to the currently highlighted point. Styling can also be differentiated by _.highcharts-crosshair-category_ or _.highcharts-crosshair-thin_.

[Demo of crosshair styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/crosshairs/).

```
.highcharts-stack-label
```

Text styles for stack labels. Replaces [yAxis.stackLabels.style](https://api.highcharts.com/highcharts/yAxis.stackLabels.style).

```
.highcharts-tick
```

Styles for the tick marks along the axis. Replaces [axis.tickColor](https://api.highcharts.com/highcharts/xAxis.tickColor) and [axis.tickWidth](https://api.highcharts.com/highcharts/xAxis.tickWidth). Use _.highcharts-xaxis_ / _.highcharts-yaxis_ parent items or className options to distinguish axes.

[Demo of axis styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/axis-grid/).

```
.highcharts-negative
```

A class given to negative parts of the graph, area and individual points if the [negativeColor](https://api.highcharts.com/highcharts/plotOptions.series.negativeColor) option is set to true. 

[Demo of styling negative values](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/series-negative-color/).


#### Titles and labels

```
.highcharts-title
```

Text styles for the title. Replaces [title.style](https://api.highcharts.com/highcharts/title.style).

[Demo of styling titles](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/titles/).


```
.highcharts-subtitle
```

Text styles for the subtitle. Replaces [subtitle.style](https://api.highcharts.com/highcharts/subtitle.style).

[Demo of styling titles](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/titles/).

```
.highcharts-axis-labels
```

Replaces [axis.labels.style](https://api.highcharts.com/highcharts/xAxis.labels.style). Use _.highcharts-xaxis_ / _.highcharts-yaxis_ parent items or className options to distinguish axes.

```
.highcharts-axis-title
```

Text styles for the axis title. Replaces [axis.title.style](https://api.highcharts.com/highcharts/xAxis.title.style).

[Demo of axis styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/axis/).

```
.highcharts-no-data
```

Styles for the label shown when no data is present in the chart (requires the _no-data-to-display_ module). Replaces [noData.style](https://api.highcharts.com/highcharts/noData.style).

```
.highcharts-crosshair-label
```

The label next to the crosshair in Highcharts Stock. 

[Demo of styling the crosshair label](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/crosshair-label/).

```
.highcharts-data-label
```

The data label. Use _.highcharts-data-label-box_ to style the border or background, and _.highcharts-data-label text_ for text styling. Use the _dataLabels.className_ option to set specific class names for individual items. Replaces background, border, color and style options for [series.dataLabels](https://api.highcharts.com/highcharts/plotOptions.series.dataLabels).

[Demo of styling data labels](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/series-datalabels/).

```
.highcharts-credits
```

The credits label, normally found in the lower right corner of the chart. Replaces [credits.style](https://api.highcharts.com/highcharts/credits.style) and more.

[Demo of credits styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/credits/). 


#### Series specifics

```
.highcharts-boxplot-series
.highcharts-boxplot-box
.highcharts-boxplot-median
.highcharts-boxplot-stem
.highcharts-boxplot-whisker
```

The various graphic items for box plot series. The box, median, stem and whisker are nested inside the series group. Replaces colors, stroke widths and dash style options for box plots.

[Boxplot demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/boxplot/).

```
.highcharts-candlestick-series .highcharts-point-up
.highcharts-candlestick-series .highcharts-point-down
```

Rules to differentiate between up or down points in Highcharts Stock candlesticks.

[Candlestick demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/candlestick/).

```
.highcharts-hollowcandlestick-series .highcharts-point-down
.highcharts-hollowcandlestick-series .highcharts-point-down-bearish-up
.highcharts-hollowcandlestick-series .highcharts-point-up
```

Rules to differentiate between up or down points in Highcharts Stock hollow candlesticks.

[Hollow candlestick demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/hollow-candlestick/).

```
.highcharts-gauge-series .highcharts-dial
.highcharts-gauge-series .highcharts-pivot
```

Styles for the dial and pivot of gauge series. Replaces border and background options for [plotOptions.gauge.dial](https://api.highcharts.com/highcharts/plotOptions.gauge.dial) and [plotOptions.gauge.pivot](https://api.highcharts.com/highcharts/plotOptions.gauge.pivot).

[Gauge series demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/gauge/).

```
.highcharts-null-point
```

Styles for null points in maps or heat maps. Replaces [plotOptions.map.nullColor](https://api.highcharts.com/highmaps/plotOptions.map.nullColor).

```
.highcharts-ohlc-series .highcharts-point-up
.highcharts-ohlc-series .highcharts-point-down
```

Rules to differentiate between up or down points in Highcharts Stock OHLC series.

[OHLC demo](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/ohlc/).

```
.highcharts-pane
```

For pane backgrounds in radial charts. Replaces backgrounds and borders under the [pane.background](https://api.highcharts.com/highcharts/pane.background) option set.

[Demo of styling panes](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/pane/).

```
.highcharts-area
```

The area under an area series. Use the parent item, ._highcharts-series_ including series type, index or individual class name, to identify specific series. Replaces [plotOptions.area.fillColor](https://api.highcharts.com/highcharts/plotOptions.area.fillColor) and [plotOptions.area.fillOpacity](https://api.highcharts.com/highcharts/plotOptions.area.fillOpacity).

```
.highcharts-zone-{n}
```

When [zones](https://api.highcharts.com/highcharts/plotOptions.series.zones) are applied, each zone is given a class name with its index. A custom _className_ option can also be set in the zone options. Replaces the color, dashStyle and fillColor options for zones.

[Demo of styling zones](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/color-zones/).


#### Buttons and menus

```
.highcharts-button
```

Used for the wrapping group of the exporting button, range selector buttons in Highcharts Stock etc.

```
.highcharts-button-symbol
```

The symbol for the exporting button, can be used to set stroke and fill etc. 

[Demo of export menu styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/exporting-style/).

```
.highcharts-menu
```

The container of the context menu. Replaces [navigation.menuStyle](https://api.highcharts.com/highcharts/navigation.menuStyle).

[Demo of export menu styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/exporting-style/).

```
.highcharts-menu-item
```

The list items in the context menu. Replaces [navigation.menuItemStyle](https://api.highcharts.com/highcharts/navigation.menuItemStyle). Use the _`:hover`_ pseudo-class to replace [navigation.menuItemHoverStyle](https://api.highcharts.com/highcharts/navigation.menuItemHoverStyle).

[Demo of export menu styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/exporting-style/).

```
.highcharts-contextbutton
```

The context button with a burger menu for the exporting module. Replaces visual options for [exporting.buttons.contextButton](https://api.highcharts.com/highcharts/exporting.buttons.contextButton) and [navigation.buttonOptions.theme](https://api.highcharts.com/highcharts/navigation.buttonOptions.theme).

[Demo of export menu styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/exporting-style/).


#### Drilldown
```
.highcharts-drilldown-axis-label
```
Styles for a drillable category axis label. Replaces [drilldown.activeAxisLabelStyle](https://api.highcharts.com/highcharts/drilldown.activeAxisLabelStyle).

```
.highcharts-drilldown-data-label text
```

Styles for a drillable data label. Replaces [drilldown.activeDataLabelStyle](https://api.highcharts.com/highcharts/drilldown.activeDataLabelStyle).

```
.highcharts-drillup-button
```

Styles for the drill-up button. Replaces [drilldown.drillUpButton.theme](https://api.highcharts.com/highcharts/drilldown.drillUpButton.theme).


#### Lines and bands

```
.highcharts-grid-line
```

Styling for grid lines. Replaces [gridLineWidth](https://api.highcharts.com/highcharts/xAxis.gridLineWidth) and [gridLineColor](https://api.highcharts.com/highcharts/xAxis.gridLineColor).

[Demo of styling axis grid lines](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/axis-grid/).

```
.highcharts-minor-grid-line
```

Replaces [axis.minorGridLineColor](https://api.highcharts.com/highcharts/xAxis.minorGridLineColor) and [axis.minorGridLineWidth](https://api.highcharts.com/highcharts/xAxis.minorGridLineWidth).

[Demo of styling axis grid lines](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/axis-grid/).

```
.highcharts-alternate-grid
```

Alternate grid bands on an axis. To activate alternate grid bands in styled mode, set [xAxis.alternateGridColor](https://api.highcharts.com/highcharts/xAxis.alternateGridColor) to `true` in the settings, then
apply a `fill` in CSS.

```
.highcharts-plot-band
```

Style the plot bands. Use the _className_ option on each band to distinguish them. Replaces color and border options for the plot band.

```
.highcharts-plot-band-label
```

Style the plot band labels. Use the className option on each band to distinguish them. Replaces the [plotBands.label.style](https://api.highcharts.com/highcharts/xAxis.plotBands.label.style) option.


#### Legend

```
.highcharts-legend-box
```

The box and border for the legend. Replaces [legend.backgroundColor](https://api.highcharts.com/highcharts/legend.backgroundColor), [legend.borderColor](https://api.highcharts.com/highcharts/legend.borderColor) and [legend.borderWidth](https://api.highcharts.com/highcharts/legend.borderWidth).

[Demo of legend styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/legend/).

```
.highcharts-legend-item
```

Styles for each individual legend item. Replaces [legend.itemStyle](https://api.highcharts.com/highcharts/legend.itemStyle), and [legend.itemHoverStyle](https://api.highcharts.com/highcharts/legend.itemHoverStyle) when the _:hover_ pseudo-class is added.

[Demo of legend styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/legend/).

```
.highcharts-legend-item-hidden
```

A legend item for a hidden series or point. Replaces [legend.itemHiddenStyle](https://api.highcharts.com/highcharts/legend.itemHiddenStyle).

[Demo of legend styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/legend/).

```
.highcharts-legend-navigation
```

Styles for the navigation part of the legend, the arrow up and down and the text _x/n_. Use this to set text styles. Replaces [legend.navigation.style](https://api.highcharts.com/highcharts/legend.navigation.style).

```
.highcharts-legend-nav-active
```

The active arrow of the legend navigation. Replaces [legend.navigation.activeColor](https://api.highcharts.com/highcharts/legend.navigation.activeColor).

[Demo of legend styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/legend/).

```
.highcharts-legend-nav-inactive
```

The inactive arrow of the legend navigation. Replaces [legend.navigation.inactiveColor](https://api.highcharts.com/highcharts/legend.navigation.inactiveColor).

[Demo of legend styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/legend/).

```
.highcharts-legend-title
```

The legend title. Use this CSS rule for text styling. Replaces [legend.title.style](https://api.highcharts.com/highcharts/legend.title.style).

[Demo of legend styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/legend/).


#### Loading
```
.highcharts-loading
```

The loading overlay. Replaces [loading.style](https://api.highcharts.com/highcharts/loading.style) as well of the show and hide duration.

[Demo of loading message styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/loading/).

```
.highcharts-loading-inner
```

The inner div of the loading label. Replaces [loading.labelStyle](https://api.highcharts.com/highcharts/loading.labelStyle).

[Demo of loading message styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/loading/).

#### Navigator

```
.highcharts-navigator-handle
.highcharts-navigator-handle-left
.highcharts-navigator-handle-left
```

Fills and strokes for the navigator handles in Highcharts Stock. Replaces [navigator.handles.backgroundColor](https://api.highcharts.com/highstock/navigator.handles.backgroundColor) and [navigator.handles.borderColor](https://api.highcharts.com/highstock/navigator.handles.borderColor).

[Demo of styling the navigator](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/stock-navigator/).

```
.highcharts-navigator-mask-outside
.highcharts-navigator-mask-inside
```

Styles for the navigator mask in Highcharts Stock, the shaded element that shows the selected area. Replaces [navigator.maskFill](https://api.highcharts.com/highstock/navigator.maskFill).

[Demo of styling the navigator](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/stock-navigator/).

```
.highcharts-navigator-outline
```

Styles for the Highcharts Stock navigator outline, a path element that highlights the zoomed area. Replaces [navigator.outlineColor](https://api.highcharts.com/highstock/navigator.outlineColor) and [navigator.outlineWidth](https://api.highcharts.com/highstock/navigator.outlineWidth).

[Demo of styling the navigator](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/stock-navigator/).

```
.highcharts-navigator-series
```

Styles for the navigator series in Highcharts Stock. Replaces options like lineWidth, fillOpacity and color for the navigator series.

#### Points

```
.highcharts-point
.highcharts-point-hover
.highcharts-point-select
```

Styles for each point. Use the parent item, ._highcharts-series_ including series type, index or individual class name, to identify specific series. Use an individual _className_ option for each point to style single points.

[Demo of styling point markers](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/series-marker/).

```
.highcharts-halo
```

The halo appearing around the hovered point.


#### Range selector

```
.highcharts-range-input text
```

Text styling for the range selector input boxes in Highcharts Stock. Use _input.highcharts-range-selector_ for the HTML input (when the boxes are active). Replaces [rangeSelector.inputStyle](https://api.highcharts.com/highstock/rangeSelector.inputStyle).

[Demo of styling the range selector](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/stock-navigator/).

```
.highcharts-range-label
```

Styles for the Highcharts Stock range selector labels saying "Zoom", "From" and "To". Replaces [rangeSelector.labelStyle](https://api.highcharts.com/highstock/rangeSelector.labelStyle).

[Demo of styling the range selector](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/stock-navigator/).

```
.highcharts-range-selector-buttons
```

Top level group for the Highcharts Stock range selector buttons. Replaces [rangeSelector.buttonTheme](https://api.highcharts.com/highstock/rangeSelector.buttonTheme).

[Demo of styling the range selector](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/stock-navigator/).


#### Scrollbar

```
.highcharts-scrollbar
.highcharts-scrollbar-arrow
.highcharts-scrollbar-button
.highcharts-scrollbar-rifles
.highcharts-scrollbar-thumb
.highcharts-scrollbar-track
```

Styles for the Highcharts Stock scrollbar. The thumb is the actual bar. The buttons are in each end, and each has an arrow inside it. The rifles are the small strokes on the center of the bar.


#### Tooltip
```
.highcharts-tooltip
.highcharts-tooltip-box
.highcharts-tooltip text
.highcharts-tooltip-header
```

Styles for the tooltip. The tooltip box is the shape or path where the background and border can be set. Text styles should be applied to the text element.

[Demo of tooltip styling](https://jsfiddle.net/gh/get/library/pure/highcharts/highcharts/tree/master/samples/highcharts/css/tooltip-border-background/).


## Compatibility note

Prior to Highcharts v7, styled mode was served as a separate set of files. Instead of an option `chart.styledMode`, styled mode was enabled by loading files from the `/js/` folder on `code.highcharts.com`, in the zip file and in the npm package. These files are no longer maintained.
