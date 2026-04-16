---
sidebar_label: "Grid Key (Grid Pro)"
---

# Grid Key (Grid Pro)

**Highcharts Grid Pro** is a commercial product. In production use, the library expects a valid **Grid Key** so that your deployment is covered by an active license.

Grid Lite does not use a Grid Key. If you only use [Grid Lite](https://www.highcharts.com/docs/grid/general), you can skip this page.

## When you need a Grid Key

Add `gridKey` to your configuration before you ship or share a build that loads Grid Pro.

Licensing terms, permitted deployments, and how your key maps to products and domains are described on the product and checkout pages in the [Highsoft shop](https://shop.highcharts.com). Refer to that site as the source of truth for commercial details that go beyond this technical overview.

## How to set the Grid Key

You can define the key once for the whole page, or pass it only for specific grid instances.

**Globally**:

```js
Grid.setOptions({
    gridKey: 'YOUR-GRID-KEY-HERE'
});
```

**Per instance**:

```js
Grid.grid('container', {
    gridKey: 'YOUR-GRID-KEY-HERE',
    data: {
        columns: {
            product: ['Apple', 'Pear'],
            price: [1.5, 2.53]
        }
    }
});
```

Use the same pattern after following the [Installation](https://www.highcharts.com/docs/grid/installation) guide for your bundler or CDN setup.

## Obtaining and renewing a key

Purchase or manage Grid Pro licensing through the [Highsoft shop](https://shop.highcharts.com). The shop lists editions, pricing, and the full licensing context for Grid Pro—use it when you need more than the setup notes on this page. Your Grid Key is tied to the license term; if the key expires, replace it in your configuration with a current one from your license details.

## If the key is missing or invalid

When Grid Pro cannot validate the key (missing, invalid, or expired), it logs a **warning in the browser console** and points to this article. The message is emitted once per page load when validation runs, so you can spot configuration issues early in development.