/**
 * OPENLAYERS地图工具类
 *
 * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 * 1、地图绘制geometry图形:支持点、线、面
 * 2、数据来源：objects & arcs
 * 3、图形解析polygon中可能包含点和线
 * >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 * @author PJL
 * @date 2020/11/4
 * @constructor
 */
function MapTools() {
    var that = this;
    that.osmLayer = new ol.layer.Tile({
        id: "osm",
        name: "OpenStreetMap",
        zIndex: 1,
        source: new ol.source.OSM()
    })
    that.colors = ['black',"black","black"];
    that.map = new ol.Map({
        //layers: [that.osmLayer],
        target: 'map',
        controls: ol.control.defaults({
            attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
                collapsible: false
            })
        }),
        view: new ol.View({
            center: [110, 30],
            zoom: 2
        })
    });
    that.layer  = that.createLayer();
    that.manageMapEventListeners(true);
    that.map.defaultStyle = that.getStyle();
    that.map.activeStyle = that.activeStyle();
    that.map.lastFeatures = [];
    that.map.datasets = [];
    // 重置要素样式
    that.map.resetFeaturesStyle=function(){
        if(this.lastFeatures && this.lastFeatures.length>0){
            for (var i = 0, j =  this.lastFeatures.length; i < j; i++) {
                this.lastFeatures[i].setStyle(this.defaultStyle);
            }
            this.lastFeatures = [];
            console.info("==resetFeaturesStyle==");
        }
    }
    that.map.mapElement = document.getElementById("map");
    that.map.mapFeatureInfoElement = document.getElementById("feature-attribute-info");
    // 打开要素信息描述窗口(选择要素和属性回调函数)
    that.map.showFeatureInfo = function (index) {
        var that = this;
        //var shape = that.datasets[0].shapeObjects[index];
        var dbfData = that.datasets[0];
        var fields = dbfData.fields;
        var shapeAttribute = dbfData.attributeRows[index];
        //var records = dbfData.attributeRows;
        //console.info("shape: " + JSON.stringify(shape));
        console.info("fields: " + JSON.stringify(fields));
        //console.info("shapeAttribute: " + JSON.stringify(shapeAttribute));
        //console.info( "records: "+JSON.stringify(records));
        var html = "";
        for (var i = 0 , j = fields.length; i < j; i++) {
            html+="<p>"+fields[i]+" : "+shapeAttribute[fields[i]]+"</p>";
        }

        that.mapFeatureInfoElement.style.display = "block";
        that.mapFeatureInfoElement.innerHTML = html;

    }
    // 打开要素信息描述窗口
    that.map.hideFeatureInfo = function () {
        var that = this;
        that.mapFeatureInfoElement.style.display = "none";
        that.mapFeatureInfoElement.innerHTML = "";
    }
}

/**
 * 添加地图绑定事件
 *
 *
 "mouseover",        //鼠标位于对象或区域上
 "mouseout",         //鼠标移出
 "mousedown",        //鼠标按下
 "mouseup",          //鼠标抬起
 "mousemove",        //鼠标移动
 "click",            //鼠标单击
 "dblclick",         //鼠标双击
 "rightclick",       //鼠标右击
 "dblrightclick",    //鼠标右键双击
 "resize",           //调整大小
 "focus",            //获得焦点
 "blur"              //
 */
MapTools.prototype.manageMapEventListeners = function (isAdd) {
    var that = this;
    if(isAdd){
      /*  that.map.addEventListener('mouseover',that.mouseoverFunc);
        that.map.addEventListener('mouseout',that.mouseoutFunc);
        that.map.addEventListener('focus',that.focusFunc);
        that.map.addEventListener('blur',that.blurFunc);*/
        that.map.addEventListener('click',that.clickFunc);
    }else{
       /* that.map.removeEventListener('mouseover',that.mouseoverFunc);
        that.map.removeEventListener('mouseout',that.mouseoutFunc);
        that.map.removeEventListener('focus',that.focusFunc);
        that.map.removeEventListener('blur',that.blurFunc);*/
        that.map.removeEventListener('click',that.clickFunc);
    }
}
/**
 * 地图点击事件
 */
MapTools.prototype.clickFunc = function (e) {
    console.info("===clickFunc===");
    var index = -1;
    e.map.resetFeaturesStyle();
    e.map.forEachFeatureAtPixel(e.pixel, function (feature) {
        e.map.lastFeatures.push(feature);
        var id = feature.getId();
        index = id;
        console.info("id = "+id);
        feature.setStyle(e.map.activeStyle);
    });
    if(index> -1){
        e.map.showFeatureInfo(index);
    }else{
        e.map.hideFeatureInfo();
    }
}
/**
 * 鼠标悬停事件
 */
MapTools.prototype.mouseoverFunc = function (e) {
    console.info("===mouseoverFunc===");
    e.map.resetFeaturesStyle();
    e.map.forEachFeatureAtPixel(e.pixel, function (feature) {
        var id = feature.getId();
        console.info("id = "+id);
        feature.setStyle(e.map.activeStyle);
    });
}
/**
 * 鼠标移开事件
 */
MapTools.prototype.mouseoutFunc = function (e) {
    console.info("===mouseoutFunc===");
    e.map.resetFeaturesStyle();
}
/**
 * 获取焦点事件
 */
MapTools.prototype.focusFunc = function (e) {
    console.info("===focusFunc===");
    e.map.resetFeaturesStyle();
    e.map.forEachFeatureAtPixel(e.pixel, function (feature) {
        var id = feature.getId();
        console.info("id = "+id);
        feature.setStyle(e.map.activeStyle);
    });
}
/**
 * 失去焦点事件
 */
MapTools.prototype.blurFunc = function (e) {
    console.info("===blurFunc===");
    e.map.resetFeaturesStyle();
}
/**
 * 获取样式
 */
MapTools.prototype.getStyle = function () {
    var idx = Math.floor(Math.random() * (9 - 0) + 0);
    var color = this.colors[idx];
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            stroke: new ol.style.Stroke({
                color: color,
                width: 3
            }),
            fill: new ol.style.Fill({
                color: color,
                width: 3
            })
        }),
        stroke: new ol.style.Stroke({
            color: color,
            width: 2
        }),
        fill: new ol.style.Fill({
            color: '#2d2c2c80'
        })
    });
};
/**
 * 选择样式
 */
MapTools.prototype.activeStyle = function () {
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 5,
            stroke: new ol.style.Stroke({
                color:  '#EE0000',
                width: 3
            }),
            fill: new ol.style.Fill({
                color:  '#FFBBFF',
                width: 3
            })
        }),
        stroke: new ol.style.Stroke({
            color:  '#66ff66',
            width: 2
        }),
        fill: new ol.style.Fill({
            color: '#FFBBFF'
        })
    });
};
/**
 *创建矢量图层
 *
 * @param zIndex
 */
MapTools.prototype.createLayer = function (id) {
    if (!this.layer) {
        this.layer = new ol.layer.Vector({
            zIndex: 999999,
            source: new ol.source.Vector(),
            opacity: 1
        });
        if(!id){
            this.layer.id = "vector";
        }else{
            this.layer.id = id;
        }
        this.map.addLayer(this.layer);
    }
    return this.layer;
}

/**
 * 获取图层
 */
MapTools.prototype.getLayer = function (id) {
    var that = this;
    var layers = that.map.getLayers();
    for (var i = 0, j = layers.length; i < j; i++) {
        var layer = layers[i];
        if (layer.id == id) {
            return layer;
        }
    }
}
/**
 * 坐标投影转换
 *
 * @param x
 * @param y
 * @param srcProject
 * @param destProject
 */
MapTools.prototype.transform = function (x, y, srcProject, destProject) {
    if (typeof srcProject === "string") {
        srcProject = new ol.proj.Projection({code: srcProject})
    }
    if (typeof destProject === "string") {
        destProject = new ol.proj.Projection({code: destProject})
    }
    var position = ol.proj.transform([x, y], srcProject, destProject);
    console.log(JSON.stringify(position));
}
/**
 * 数组深度计算
 *
 * @param data
 * @param count
 * @returns {*}
 */
MapTools.prototype.deepCount = function (data, count) {
    if (!count) {
        count = 0;
    }
    if (Array.isArray(data)) {
        count += 1;
        var childData = data[0];
        return this.deepCount(childData, count);
    }
    return count;
}
/**
 * 获取结束点索引【分段获取数据】
 *
 * @param firstIndex
 * @param coordinates
 */
MapTools.prototype.getEndPointIndex = function (firstIndex,coordinates) {
    var index = -1;
    var count = 0;
    var times = coordinates.length;
    var firstPoint = coordinates[firstIndex];
    for (var i = firstIndex; i < times; i++) {
        if(firstPoint[0]== coordinates[i][0] && firstPoint[1] == coordinates[i][1]){
            count += 1;
        }
        if(count==2){
            index = i;
            break;
        }
    }
    return index;
}
/**
 * 修复性数据解析【此方法在闭合图形中适用，用于修复readPolygonData不能读取完整的情况】
 *
 * @param id
 * @param coordinates
 * @param partCount
 * @param arrays
 * @param firstIndex
 */
MapTools.prototype.repairPolygonData = function (id,coordinates,arrays,firstIndex) {
    var endIndex = this.getEndPointIndex(firstIndex,coordinates);
    if(endIndex > -1){
        var arr = coordinates.slice(firstIndex,endIndex+1);
        arrays.push(arr);
        firstIndex = endIndex;
    }
    firstIndex++;
    if(firstIndex<coordinates.length){
        return this.repairPolygonData(id,coordinates,arrays,firstIndex);
    }
    console.info("Repaired GeomData = "+JSON.stringify(arrays));
    return arrays;
}
/**
 * 修复性数据解析【此方法有待完善:去掉闭合图形解析点、线】
 *
 * @param id
 * @param coordinates
 * @param partArrays
 */
MapTools.prototype.repairMultiPolygonData = function (id,coordinates,partArrays) {
    var that = this;
    var arrays = [];
   /* var count = coordinates.length;
    var targetPoint = false;
    var dataMap ={};
    for (var i = 0; i < count; i++) {
        var currentPoint = coordinates[i];
        targetPoint = that.targetNotInStartAndEnd(currentPoint,partArrays);
        if(targetPoint){
            var lonLatKey = currentPoint[0]+"_"+currentPoint[1];
            if(isNaN(dataMap[lonLatKey])){
                dataMap[lonLatKey]= 1;
            }else{
                dataMap[lonLatKey]+=1;
            }
        }
    }
    var newDataMap = {};
    for(var key in dataMap){
        if(dataMap[key]>1){
            newDataMap[key] = dataMap[key];
        }
    }*/
    console.info("MultiPolygon dataMap = "+JSON.stringify(newDataMap));
   return arrays;
}
/**
 * 当前点不在开始和结束点位置
 *
 * @param currentPoint
 * @param partArrays
 */
MapTools.prototype.targetNotInStartAndEnd = function (currentPoint,partArrays) {
    var t = partArrays.length;
    for (var i = 0; i < t; i++) {
        var point = partArrays[i][0];// start,end点相同
        if(point[0] == currentPoint[0] && point[1] == currentPoint[1]){
            return false;
        }
    }
    return true;
}
/**
 * 解析面数据【此方法在闭合图形中适用】
 *
 * @param id
 * @param coordinates
 * @param partCount
 * @returns {Array}
 */
MapTools.prototype.readPolygonData = function (id,coordinates) {
    var count = coordinates.length;
    var arrays = [];
    var firstIndex=0,endIndex=0;
    var firstPoint = null,endPoint = null;
    for (var i = 0; i < count; i++) {
        // first
        if(firstPoint == null){
            firstIndex = i;
            firstPoint = coordinates[firstIndex];
            continue;
        }
        // end
        endIndex = i;
        if(endPoint == null){
            endPoint = coordinates[endIndex];
            continue;
        }else{
            endPoint = coordinates[endIndex];
        }
        // find end point
        if(firstPoint[0]== endPoint[0] && firstPoint[1]== endPoint[1]){
            var arr= coordinates.slice(firstIndex,endIndex);
            arrays.push(arr);
            firstPoint = null;
            endPoint = null;
        }
    }
    return arrays;
}
/**
 * 解析面数据【此方法在闭合图形中适用】
 * @param id
 * @param coordinates
 * @param partCount
 * @param package
 * @returns {{data: Array, repaired: boolean}}
 */
MapTools.prototype.parsePolygonData = function (id,coordinates,partCount,package) {
    var that = this;
    var multiPolygonArrays= [];
    var arrays = that.readPolygonData(id,coordinates);
    var result = {};
    result.id = id;
    result.partCount = partCount;
    result.realCount = arrays.length;
    // 验证是否解析正确
    if(partCount!= arrays.length){
        result.coordinates= arrays;
        console.warn("Polygon part parse error："+JSON.stringify(result));
        arrays = that.repairPolygonData(id,coordinates,[],0);
        var count = arrays.length;
        for (var i =0; i < count; i++) {
            console.info("Repaired polygon part["+(i+1)+"] data："+JSON.stringify(arrays[i]));
        }
        // 从整个数据中找多边形闭合图形
        multiPolygonArrays = that.repairMultiPolygonData(id,coordinates,arrays);
    }else{
        console.info("Polygon part parse success："+JSON.stringify(result));
    }
    if(package){
        var data = [];
        data.push(arrays);
        var count = multiPolygonArrays.length;
        if(count>0){
            for (var i = 0; i < count ; i++) {
                data.push(multiPolygonArrays[i]);
            }
        }
        return data;
    }else{
        return arrays;
    }
}
/**
 * 根据数据部分类型判定Polygon|MultiPolygon geometry类型
 *
 * @param data
 * @param repair
 * @returns {*}
 */
MapTools.prototype.buildPolygonGeometry = function (data) {
    var id = data.id;
    var dataType = data.type;
    // 多个部分代表MultiPolygon
    var isMultiPolygon = data.partCount>1;
    var coordinates = JSON.parse(data.coordinates);
    //new ol.geom.MultiPolygon(feature.data)
    //var type = this.typeCount(coordinates, 0);
    var geometry = null,typeStr="";
    if(isMultiPolygon ){
        coordinates = this.parsePolygonData(id,coordinates,data.partCount,true);
        console.info("geom = MultiPolygon,id = " + id + ",type = " + dataType+" ,partCount = "+data.partCount);
        //console.info("geom = MultiPolygon,id = " + id + ",type = " + dataType+" ,partCount = "+data.partCount+" geoJSON = "+JSON.stringify(coordinates));
        geometry = new ol.geom.MultiPolygon(coordinates);
        typeStr = "MultiPolygon";
    }else{
        coordinates = this.parsePolygonData(id,coordinates,data.partCount,false);
        console.info("geom = Polygon,id = " + id + ",type = " + dataType+" ,partCount = "+data.partCount);
        //console.info("geom = Polygon,id = " + id + ",type = " + dataType+" ,partCount = "+data.partCount+" geoJSON = "+JSON.stringify(coordinates));
        geometry = new ol.geom.Polygon(coordinates);
        typeStr = "Polygon";
    }
    geometry.type = typeStr;
    return geometry;
}
/**
 * 添加单个要素信息
 *
 * @param feature
 * @param dataSource  'objects' | 'arcs'
 */
MapTools.prototype.addFeature = function (feature,dataSource) {
    var that = this;
    var addFeatureByChildren = function (feature) {
        for (var i = 0, j = feature.data.length; i < j; i++) {
            var data = feature.data[i];
            var geometry = that.buildPolygonGeometry(data);
            if (geometry) {
                var obj = new ol.Feature();
                obj.setId(i);// index
                obj.setGeometry(geometry);
                obj.setStyle(that.getStyle());
                that.layer.getSource().addFeature(obj);
            }
        }
    }
    //  name,data,shapes,geometry_type
    if (feature.geometry_type === "polygon") {
        addFeatureByChildren(feature);
        that.layer.getSource().refresh();
        that.layer.getSource().changed();
        var bounds = feature.arcs.getBounds();
        var extent = [bounds.xmin, bounds.ymin, bounds.xmax, bounds.ymax];
        //that.vectorLayer.setExtent(extent);
        //var center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
        that.map.getView().fit(extent);
    }else {
        console.error("Not support feature.geometry_type value type: "+feature.geometry_type);
    }
}
/**
 * 添加多个要素信息
 *
 * @param dataset
 * @param dataSource  'objects' | 'arcs'
 */
MapTools.prototype.addFeatures = function (dataset,dataSource) {
    var that = this;
    // "{"input_files":["cs1618_655.shp"],"input_formats":["shapefile"],"import_options":{"no_repair":false,"snap":false},"prj":"GEOGCS[\"GCS_China_Geodetic_Coordinate_System_2000\",DATUM[\"D_China_2000\",SPHEROID[\"CGCS2000\",6378137.0,298.257222101]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]]"}"
    var features = dataset.layers;
    for (var i = 0, j = features.length; i < j; i++) {
        var feature = features[i];
        feature.arcs = dataset.arcs;
        feature.data = dataset.objects;
        feature.displayArcs = dataset.displayArcs;
        feature.info = dataset.info;
        that.addFeature(feature,dataSource);
    }
}
/**
 *  加载空间数据到矢量图层
 *
 * @param dataSets
 * @param dataSource 'objects' | 'arcs'
 */
MapTools.prototype.loadDataToVectorLayer = function (dataSets,dataSource) {
    var that = this;
    that.map.datasets = dataSets;
    for (var i = 0, j = that.map.datasets.length; i < j; i++) {
        var dataset = that.map.datasets[i];
        dataset.fields = dataset.layers[0].data.getFields();
        dataset.attributeRows = dataset.layers[0].data.getRecords();
        that.map.datasets[i] = dataset;
        that.addFeatures(dataset,dataSource?dataSource:"objects");
    }
}

var mapTools = new MapTools();