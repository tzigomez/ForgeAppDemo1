// Dashboard panel base
class DashboardPanel {
    load(parentDivId, divId, viewer) {
        this.divId = divId;
        this.viewer = viewer;
        if($("#"+parentDivId) != null){
            $("body").append('<div id="' + parentDivId + '" ></div>');
        }
        $('#' + parentDivId).append('<div id="' + divId + '" class="dashboardPanel"></div>');
    }
}

// Dashboard panels for charts
class DashboardPanelChart extends DashboardPanel {
    load(parentDivId, divId, viewer, modelData) {
        if (!modelData.hasProperty(this.propertyToUse)) {
            //alert('This model does not contain a ' + this.propertyToUse + ' property for the ' + this.constructor.name);
            console.log('These are the properties available on this model: ');
            console.log(Object.keys(modelData._modelData));
            this.propertyToUse = Object.keys(modelData._modelData).sort()[0];
        }
        divId = this.propertyToUse.replace(/[^A-Za-z0-9]/gi, '') + divId; // div name = property + chart type
        super.load(parentDivId, divId, viewer);
        this.canvasId = divId + 'Canvas';
        this.selectId = divId + 'Select';
        $('#' + divId).append('<div class="dashboardTitle">Select: <select id="' + this.selectId + '" class="select-css"></select> <a href="#" class="btn btn-xs" title="Show all elements" id="' + divId + 'showAll">Reset</a></div>');
        $('#' + divId).append('<canvas id="' + this.canvasId + '" style="width:574px, height:200px, display:block" class="chartjs-render-monitor" disable></canvas>');
        this.modelData = modelData;
        this.listProperties(this.propertyToUse);
        $('#' + divId + 'showAll').click(() => { this.viewer.isolate(0) })
        return true;
    }

    listProperties(toSelect) {
        var _this = this
        var select = $('#' + this.selectId);
        Object.keys(this.modelData._modelData).sort().forEach(function (propName) {
            var propOption = new Option(propName, propName);
            $(propOption).html(propName);
            select.append(propOption);
        })
        select.val(toSelect);
        select.on('change', function () {
            _this.propertyToUse = this.value;
            _this.drawChart();
        });
    }

    generateColors(count) {
        var background = []; var borders = [];
        for (var i = 0; i < count; i++) {
            var r = Math.round(Math.random() * 255); var g = Math.round(Math.random() * 255); var b = Math.round(Math.random() * 255);
            background.push('rgba(' + r + ', ' + g + ', ' + b + ', 0.2)');
            borders.push('rgba(' + r + ', ' + g + ', ' + b + ', 0.2)');
        }
        return { background: background, borders: borders };
    }
}

//Model data in format for charts
class ModelData {
    constructor(viewer) {
        this._modelData = {};
    }

    init(callback) {
        var _this = this;

        _this._modelData["Family Name"] = {};

        var tree = _this.getAllLeafComponents(function (dbIds) {
            var count = dbIds.length;
            dbIds.forEach(function (dbId) {
                viewer.getProperties(dbId, function (props) {
                    props.properties.forEach(function (prop) {
                        if (!isNaN(prop.displayValue)) return; // let's not categorize properties that store numbers

                        // some adjustments for revit:
                        prop.displayValue = prop.displayValue.replace('Revit ', ''); // remove this Revit prefix
                        if (prop.displayValue.indexOf('<') === 0) return; // skip categories that start with <
                        if (prop.displayName === 'viewable_in') return;

                        // ok, now let's organize the data into this hash table
                        if (_this._modelData[prop.displayName] == null) _this._modelData[prop.displayName] = {};
                        if (_this._modelData[prop.displayName][prop.displayValue] == null) _this._modelData[prop.displayName][prop.displayValue] = [];
                        _this._modelData[prop.displayName][prop.displayValue].push(dbId);
                    })

                    viewer.getObjectTree(function (tree) {
                        // for revit models
                        var typeId = tree.getNodeParentId(props.dbId);
                        var familyId = tree.getNodeParentId(typeId);

                        var typeName = tree.getNodeName(typeId);
                        var familyName = tree.getNodeName(familyId);

                        if (_this._modelData["Family Name"][familyName] == null) _this._modelData["Family Name"][familyName] = [];
                        _this._modelData["Family Name"][familyName].push(props.dbId);
                    });

                    if ((--count) == 0) callback();
                });
            })
        })
    }

    getAllLeafComponents(callback) {
        // from https://learnforge.autodesk.io/#/viewer/extensions/panel?id=enumerate-leaf-nodes
        viewer.getObjectTree(function (tree) {
            var leaves = [];
            tree.enumNodeChildren(tree.getRootId(), function (dbId) {
                if (tree.getChildCount(dbId) === 0) {
                    leaves.push(dbId);
                }
            }, true);
            callback(leaves);
        });
    }

    hasProperty(propertyName) {
        return (this._modelData[propertyName] !== undefined);
    }

    getLabels(propertyName) {
        return Object.keys(this._modelData[propertyName]);
    }

    getCountInstances(propertyName) {
        return Object.keys(this._modelData[propertyName]).map(key => this._modelData[propertyName][key].length);
    }

    getIds(propertyName, propertyValue) {
        return this._modelData[propertyName][propertyValue];
    }
}
