'use strict';

let paper = require('js/index/paper-core.min'),
    IconBase = require('js/index/IconBase'),
    Icon = require('js/index/Icon'),
    ColorPicker = require('js/index/ColorPicker'),
    paperScope = require('js/index/PaperScopeManager'),
    JSZip = require('js/index/jszip.min');


// Default android icon size (48 DIP)
const CANVAS_SIZE = 48;


/**
 * Handles adding icon + base.
 */
class IconManager {

    /**
     * @param canvas - jquery canvas object
     * @param inputManager - jquery input object
     * @param containerEdit - jquery edit objects (can be multiple)
     * @param btnDownload - jquery download button
     * @param iconColorPicker - jquery icon color picker object
     * @param baseColorPicker - jquery base color picker object
     * @param sliderIconSize - jquery slider object for changing icon size
     * @param sliderShadowLength - jquery slider object for changing shadow length
     * @param sliderShadowIntensity - jquery slider object for changing shadow intensity
     * @param sliderShadowFading - jquery slider object for changing shadow fading
     * @param checkBoxCenterIcon - jquery check box object for centering the icon
     */
    constructor(canvas, inputManager, containerEdit,
                btnDownload, iconColorPicker, baseColorPicker,
                sliderIconSize, sliderShadowLength, sliderShadowIntensity,
                sliderShadowFading, checkBoxCenterIcon) {

        this.canvas = canvas;
        this.inputManager = inputManager;
        this.containerEdit = containerEdit;
        this.iconColorPicker = iconColorPicker;
        this.baseColorPicker = baseColorPicker;
        this.sliderIconSize = sliderIconSize;
        this.sliderShadowLength = sliderShadowLength;
        this.sliderShadowIntensity = sliderShadowIntensity;
        this.sliderShadowFading = sliderShadowFading;

        // place icon in center on canvas
        this.canvasSize = CANVAS_SIZE;
        paperScope.draw().view.center = new paper.Point(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        paperScope.draw().view.zoom = canvas.height() / CANVAS_SIZE;
        this.center = new paper.Point(this.canvasSize / 2, this.canvasSize / 2);

        inputManager.setSvgLoadedCallback(function(svgData) {
            this.onSvgFileLoaded(svgData);
        }.bind(this));

        // setup download
        btnDownload.click(function() {
            this.exportAsSvgFile();
        }.bind(this));

        // setup center icon
        this.checkBoxCenterIcon = checkBoxCenterIcon;
        this.checkBoxCenterIcon.change(function() {
            let checked = this.checkBoxCenterIcon.prop('checked');
            if (checked) this.icon.center();
        }.bind(this));
    }


    /**
     * Handles the svg file loaded callback.
     * @param svgData either raw svg data or a URL pointing to a svg file.
     */
    onSvgFileLoaded(svgData) {
        // remove any previous icons
        if (this.icon) this.icon.remove();

        paperScope.draw().project.importSVG(svgData, {
            applyMatrix: true,
            expandShapes: true,
            onLoad: function (importedItem) {
                // check svg paths
                let importedPath = this.getPathFromImport(importedItem);
                if (!importedPath) {
                    window.alert('Sorry, no path found in SVG file :(');
                    return;
                }
                importedPath.strokeWidth = 0;

                // one time base setup
                this.setupBase();

                // create icon and shadow
                this.setupIcon(importedPath);
            }.bind(this)
        });
    }


    setupBase() {
        let defaultBaseColor = '#512DA8';
        this.baseRadius = this.canvasSize / 2 * 0.9;
        this.iconBase = new IconBase(this.center, this.baseRadius);
        this.iconBase.setColor(defaultBaseColor);

        new ColorPicker(this.baseColorPicker, defaultBaseColor, function(newColor) {
            this.iconBase.setColor(newColor);
        }.bind(this));
    }


    setupIcon(importedPath) {
        // create icon + shadow
        let defaultIconColor = '#ffffff';
        this.icon = new Icon(this.center, 'white', importedPath, this.iconBase, function() {
            let checked = this.checkBoxCenterIcon.prop('checked');
            if (checked) this.checkBoxCenterIcon.prop('checked', false).change();

        }.bind(this));
        this.icon.setSize(this.baseRadius * 2 * 0.60);

        // setup icon color picker
        new ColorPicker(this.iconColorPicker, defaultIconColor, function(newColor) {
            this.icon.setColor(newColor);
        }.bind(this));

        // setup shadow length slider
        let setShadowLengthFunction = function () {
            this.icon.getIconShadow().setLength(this.sliderShadowLengthData.getValue());
        }.bind(this);
        this.sliderShadowLengthData = this.sliderShadowLength.slider()
            .on('slide', function () {
                setShadowLengthFunction()
            }.bind(this))
            .data('slider');
        setShadowLengthFunction();

        // setup shadow intensity slider
        let setShadowIntensityFunction = function () {
            this.icon.getIconShadow().setIntensity(this.sliderShadowIntensityData.getValue());
        }.bind(this);
        this.sliderShadowIntensityData  = this.sliderShadowIntensity.slider()
            .on('slide', function () {
                setShadowIntensityFunction();
            }.bind(this))
            .data('slider');
        setShadowIntensityFunction();

        // setup shadow fading slider
        let setShadowFadingFunction = function () {
            this.icon.getIconShadow().setFading(this.sliderShadowFadingData.getValue());
        }.bind(this);
        this.sliderShadowFadingData = this.sliderShadowFading.slider()
            .on('slide', function () {
                setShadowFadingFunction();
            }.bind(this))
            .data('slider');
        setShadowFadingFunction();

        // setup icon size picker
        let setSizeFunction = function () {
            let size = this.sliderIconSizeData.getValue();
            let scale = 0.0954548 * Math.exp(0.465169 * size);
            this.icon.setScale(scale);
        }.bind(this);
        this.sliderIconSizeData = this.sliderIconSize.slider()
            .on('slide', function () {
                setSizeFunction();
            }.bind(this))
            .data('slider');
        this.icon.getIconShadow().applyShadow();


        // show canvas + remove loading msg
        this.inputManager.hide();
        this.containerEdit.show();
    }



    /**
     * Exports the whole project as one svg file.
     */
    exportAsSvgFile() {
        let zip = new JSZip();
        let rootFolder = zip.folder('icons');

        paperScope.activateExpo();
        let drawProject = paperScope.draw().project;
        let exportProject = paperScope.expo().project;

        // copy draw layer over to export canvas
        exportProject.clear();
        let layer = new paper.Layer();
        for (let i = 0; i < drawProject.layers[0].children.length; ++i) {
            layer.addChild(drawProject.layers[0].children[i].clone(false));
        }
        paperScope.expo().view.draw();

        // copy png
        let pngData = paperScope.expoCanvas()[0].toDataURL('image/png').split(',')[1];
        let pngFileName = 'icon.png';
        console.log(pngData);
        rootFolder.file(pngFileName, pngData, { base64: true });

        // generate final svg
        let svg = exportProject.exportSVG({ asString: true });
		let svgData = btoa(svg);
        // let svgData = 'data:image/svg+xml;base64,' + btoa(svg);
		let svgFileName = 'icon.svg';
        rootFolder.file(svgFileName, svgData, { base64: true });

        // create download link
        if (JSZip.support.blob) {
            window.location = "data:application/zip;base64," + zip.generate({type:"base64"});
        } else {
            console.log('blob not supported');
            // TODO
        }

        // reactivate draw scope
        paperScope.activateDraw();
    }


    getPathFromImport(importedItem) {
        // recursive search for paths in group
        if (importedItem instanceof paper.Group) {
            let possiblePaths = [];
            for (let i = 0; i < importedItem.children.length; ++i) {
                let path = this.getPathFromImport(importedItem.children[i]);
                if (path) possiblePaths.push(path);
            }

            // if only one path, return that one
            if (possiblePaths.length == 0) return null;
            if (possiblePaths.length == 1) return possiblePaths[0];

            // if multiple paths, select all with fill color
            // (helps importing Google material icons, which always have a second 'invisible' path)
            let filledPaths = [];
            for (let i = 0; i < possiblePaths.length; ++i) {
                let path = possiblePaths[i];
                if (path.fillColor) filledPaths.push(possiblePaths[i]);
                path.remove();
            }

            // create new CompoundPath from single paths
            let simplePaths = [];
            for (let i = 0; i < filledPaths.length; ++i) {
                let path = filledPaths[i];
                if (path instanceof paper.Path) {
                    simplePaths.push(path);
                } else if (path instanceof paper.CompoundPath) {
                    for (let j = 0; j < path.children.length; ++j) {
                        simplePaths.push(path.children[j]);
                    }
                }
                simplePaths[simplePaths.length - 1].fillColor = new paper.Color(0, 0, 0, 0);
            }
            // sorting paths by area seems to be necessary to properly determine inside / outside of paths
            // (yes, it shouldn't, but ic_child_care_* seems to do just this)
            simplePaths.sort(function(a , b) {
                return a.area - b.area;
            });
            return new paper.CompoundPath({ children: simplePaths });
        }

        if (importedItem instanceof paper.PathItem) {
            return importedItem;
        }

        return null;
    }

}

module.exports = IconManager;
