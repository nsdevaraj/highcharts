---
tags: ["grid-pro"]
sidebar_label: "Grid Key"
---

# Grid Key

**Highcharts Grid Pro** is a commercial product. In the browser, the library checks for a valid **Grid Key** on hosts where a license applies.

Grid Lite does not use a Grid Key. If you only use [Grid Lite](https://www.highcharts.com/docs/grid/general), you can skip this page.

## When you need a Grid Key

The **Grid Key** is required whenever **Grid Pro** loads: staging and production, all need `gridKey` so the deployment matches your license.
On **`localhost`** that check is skipped, so you can run Grid Pro locally without configuring a key.

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

Purchase or manage Grid Pro licensing through the [Highsoft shop](https://shop.highcharts.com). There you will find editions, pricing, and license terms. Your Grid Key is tied to the license term; if the key expires, replace it in your configuration with a current one from your license details.

## If the key is missing or invalid

When Grid Pro cannot validate the key (missing, invalid, or expired) on a host where the check runs, it logs a **warning in the browser console** and points to this article. The message is emitted once per page load when validation runs.
