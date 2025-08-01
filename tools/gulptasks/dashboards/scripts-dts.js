/*
 * Copyright (C) Highsoft AS
 */


const fs = require('fs');
const fsLib = require('../../libs/fs');
const gulp = require('gulp');
const path = require('path');


/* *
 *
 *  Constants
 *
 * */


const DTS_FILES = [
    'Core/Color/ColorString.d.ts',
    'Core/Color/ColorType.d.ts',
    'Core/Color/GradientColor.d.ts',
    'Core/Renderer/AlignObject.d.ts',
    'Core/Renderer/CSSObject.d.ts',
    'Core/Renderer/DashStyleValue.d.ts',
    'Core/Renderer/DOMElementType.d.ts',
    'Core/Renderer/HTML/HTMLAttributes.d.ts',
    'Core/Renderer/SVG/SVGAttributes.d.ts',
    'Core/Renderer/SVG/SVGPath.d.ts',
    'Shared/LangOptionsCore.d.ts'
].map(fsLib.path);


const DTS_FOLDERS = [
    'Dashboards/',
    'Data/',
    'Grid/'
].map(fsLib.path);


/* *
 *
 *  Tasks
 *
 * */


/**
 * Copies additional DTS files, that were not created by TypeScript itself.
 *
 * @return {Promise<void>}
 * Promise to keep.
 */
async function scriptsDTS() {
    const logLib = require('../../libs/log');

    const {
        bundleTargetFolder,
        bundleTargetFolderDataGrid,
        esModulesFolder,
        esModulesFolderDataGrid
    } = require('./_config.json');

    for (const dtsFile of DTS_FILES) {
        fsLib.copyFile(
            path.join('ts', dtsFile),
            path.join(esModulesFolder, dtsFile)
        );

        fsLib.copyFile(
            path.join('ts', dtsFile),
            path.join(esModulesFolderDataGrid, dtsFile)
        );
    }

    for (const dtsFolder of DTS_FOLDERS) {
        fsLib.copyAllFiles(
            path.join('ts', dtsFolder),
            path.join(esModulesFolder, dtsFolder),
            true,
            sourcePath => sourcePath.endsWith('.d.ts')
        );

        fsLib.copyAllFiles(
            path.join('ts', dtsFolder),
            path.join(esModulesFolderDataGrid, dtsFolder),
            true,
            sourcePath => sourcePath.endsWith('.d.ts')
        );
    }

    logLib.success('Copied stand-alone DTS');

    const bundleDtsFolder = path.join(__dirname, 'scripts-dts/');

    // Dashboards
    fsLib.copyAllFiles(bundleDtsFolder, bundleTargetFolder, true);
    fsLib.deleteFile(path.join(bundleTargetFolder, 'datagrid.src.d.ts'));

    // DataGrid
    fsLib.copyAllFiles(bundleDtsFolder, bundleTargetFolderDataGrid, true);
    fsLib.deleteFile(path.join(bundleTargetFolderDataGrid, 'dashboards.src.d.ts'));

    const bundleDtsFiles = fsLib.getFilePaths(bundleDtsFolder, true);

    for (const bundleDtsFile of bundleDtsFiles) {
        fs.writeFileSync(
            path.join(
                bundleDtsFile.includes('datagrid') ? bundleTargetFolderDataGrid : bundleTargetFolder,
                path
                    .relative(bundleDtsFolder, bundleDtsFile)
                    .replace(/\.src\.d\.ts$/u, '.d.ts')
            ),
            fs.readFileSync(bundleDtsFile, 'utf8').replace(/\.src"/gu, '"')
        );
    }

    logLib.success('Created bundle DTS');

}


gulp.task('dashboards/scripts-dts', scriptsDTS);
