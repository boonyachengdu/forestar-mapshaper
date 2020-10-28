(function () {

    // 全局变量
    var api = window.mapshaper;
    var utils = api.utils;
    var internal = api.internal;
    var stop = internal.stop;
    // 前端交互
     var fileObject = null;
     var queuedFiles = [];
     var cachedFiles={};
     var model = new Catalog();
     var importCount = 0;
     window.model = model;

    /**
     * FORESTAR: 文件选择控件变化时触发文件读取和解析
     */
    function fileSelectedChanged(e){
        var files = e.target.files;
        if (files) {
            receiveFiles(files);
        }else{
            clearQueuedFiles();
        }
    }

    /**
     * FORESTAR: 加载当前导入控件
     * @param handler
     */
    function onload(handler) {
        if (document.readyState == 'complete') {
            handler();
        } else {
            window.addEventListener('load', handler);
        }
    }

    /**
     * FORESTAR: 初始化加载控件
     */
    onload(function(){
        fileObject = document.getElementById("shpFiles")
            ||  document.getElementsByClassName("shpFiles")
            || document.getElementsByName("shpFiles");
        fileObject.onchange= fileSelectedChanged;
        console.info("forestar-shpfile-reader.js onload()!");
    });

    /**
     * FORESTAR: 接收上传文件
     */
    function receiveFiles(files) {
        files = handleZipFiles(utils.toArray(files));
        addFilesToQueue(files);
        if (queuedFiles.length === 0) return;
        procNextQueuedFile();
    }

    /**
     * FORESTAR: addDataset（添加数据集dataset）
     */
    function addDataset(dataset) {
        if (!datasetIsEmpty(dataset)) {
            model.addDataset(dataset);
            importCount++;
        }
        procNextQueuedFile();
    }

    /**
     * FORESTAR: datasetIsEmpty（dataset为空判断）
     */
    function datasetIsEmpty(dataset) {
        return dataset.layers.every(function (lyr) {
            return internal.getFeatureCount(lyr) === 0;
        });
    }

    /**
     * FORESTAR: 处理下一个队列文件
     */
    function procNextQueuedFile() {
        if (queuedFiles.length > 0) {
            queuedFiles = sortQueue(queuedFiles);
            readFile(queuedFiles.shift());
        }else {
            renderMap();
        }
    }

    /**
     * FORESTAR: 渲染地图数据
     */
    function renderMap(){
        var datasets = model.getDatasets();
        if(datasets && datasets.length>0){
            // 设置数据到地图
            mapTools.loadDataToVectorLayer(model.getDatasets());
        }
    }

    /**
     * FORESTAR: 处理压缩文件
     * @param files
     * @returns {*}
     */
    function handleZipFiles(files) {
        return files.filter(function (file) {
            var isZip = internal.isZipFile(file.name);
            if (isZip) {
                importZipFile(file);
            }
            return !isZip;
        });
    }

    /**
     * FORESTAR: 导入压缩文件
     * @param file
     * @returns {*}
     */
    function importZipFile(file) {
        // gui.showProgressMessage('Importing');
        setTimeout(function () {
            readZipFile(file, function (err, files) {
                if (err) {
                    console.error("读取zip文件错误!");
                } else {
                    // don't try to import .txt files from zip files
                    // (these would be parsed as dsv and throw errows)
                    files = files.filter(function (f) {
                        return !/\.txt$/i.test(f.name);
                    });
                    receiveFiles(files);
                }
            });
        }, 35);
    }

    /**
     * FORESTAR: 读取压缩文件
     * @param file
     * @param cb
     */
     function readZipFile(file, cb) {
        var zip = window.zip; // Assume zip.js is loaded and zip is defined globally
        var _files = [];
        zip.createReader(new zip.BlobReader(file), importZipContent, onError);

        function onError(err) {
            cb(err);
        }

        function onDone() {
            cb(null, _files);
        }

        function importZipContent(reader) {
            var _entries;
            reader.getEntries(readEntries);

            function readEntries(entries) {
                _entries = entries || [];
                readNext();
            }

            function readNext() {
                if (_entries.length > 0) {
                    readEntry(_entries.pop());
                } else {
                    reader.close();
                    onDone();
                }
            }

            function readEntry(entry) {
                var filename = entry.filename,
                    isValid = !entry.directory && GUI.isReadableFileType(filename) &&
                        !/^__MACOSX/.test(filename); // ignore "resource-force" files
                if (isValid) {
                    entry.getData(new zip.BlobWriter(), function (file) {
                        file.name = filename; // Give the Blob a name, like a File object
                        _files.push(file);
                        readNext();
                    });
                } else {
                    readNext();
                }
            }
        }
    }

    /**
     * FORESTAR: 上传文件入队列
     * @param files
     */
    function addFilesToQueue(files) {
        var index = {};
        queuedFiles = queuedFiles.concat(files).reduce(function (memo, f) {
            // filter out unreadable types and dupes
            if (isReadableFileType(f.name) && f.name in index === false) {
                index[f.name] = true;
                memo.push(f);
            }
            return memo;
        }, []);
    }

    /**
     * FORESTAR: 是否可读文件类型
     * @param filename
     * @returns {boolean|*}
     */
    // tests if filename is a type that can be used
    function isReadableFileType(filename) {
        var ext = internal.getFileExtension(filename).toLowerCase();
        return !!internal.guessInputFileType(filename) || internal.couldBeDsvFile(filename) ||
            internal.isZipFile(filename);
    }

    /**
     * FORESTAR: 清除队列文件
     */
    function clearQueuedFiles() {
        queuedFiles = [];
    }

    /**
     * FORESTAR: 队列文件排序
     * @param queue
     * @returns {*}
     */
    function sortQueue(queue) {
        var nextFile = queue[0];
        var basename, parts;
        if (!isShapefilePart(nextFile.name)) {
            return queue;
        }
        basename = internal.getFileBase(nextFile.name).toLowerCase();
        parts = [];
        queue = queue.filter(function (file) {
            if (internal.getFileBase(file.name).toLowerCase() == basename) {
                parts.push(file);
                return false;
            }
            return true;
        });
        parts.sort(function (a, b) {
            // Sorting on LC filename so Shapefiles with mixed-case
            // extensions are sorted correctly
            return a.name.toLowerCase() < b.name.toLowerCase() ? 1 : -1;
        });
        return parts.concat(queue);
    }

    /**
     * FORESTAR: 是否含有shapfile的相关文件组成部分
     * @param name
     * @returns {boolean}
     */
    // TODO: support .cpg
    function isShapefilePart(name) {
        return /\.(shp|shx|dbf|prj)$/i.test(name);
    }

    /**
     * FORESTAR: 读取文件
     * @param file
     */
    function readFile(file) {
        var name = file.name,
            // 扩展文件读取插件lib.dom.d.ts
            reader = new FileReader(),
            useBinary = internal.isSupportedBinaryInputType(name) ||
                internal.isZipFile(name) ||
                internal.guessInputFileType(name) == 'json' ||
                internal.guessInputFileType(name) == 'text';

        reader.addEventListener('loadend', function (e) {
            if (!reader.result) {
                handleImportError("浏览器不能导入文件!", name);
            } else {
                importFileContent(name, reader.result);
            }
        });
        if (useBinary) {
            reader.readAsArrayBuffer(file);
        } else {
            // TODO: consider using "encoding" option, to support CSV files in other encodings than utf8
            reader.readAsText(file, 'UTF-8');
        }
    }

    /**
     * FORESTAR: 读取导入文件配置
     * @returns {{}}
     */
    function readImportOpts() {
        var opts={};
        opts.no_repair = true;
        opts.snap = false;
        return opts;
    }

    /**
     * FORESTAR: 找到匹配的Shp文件
     * @param filename
     * @returns {*[]}
     */
    function findMatchingShp(filename) {
        // use case-insensitive matching
        var base = internal.getPathBase(filename).toLowerCase();
        return model.getDatasets().filter(function (d) {
            var fname = d.info.input_files && d.info.input_files[0] || "";
            var ext = internal.getFileExtension(fname).toLowerCase();
            var base2 = internal.getPathBase(fname).toLowerCase();
            return base == base2 && ext == 'shp';
        });
    }

    /**
     * FORESTAR: importFileContent（导入文件内容）
     * @param fileName
     * @param content
     */
    function importFileContent(fileName, content) {
        var fileType = internal.guessInputType(fileName, content),
            importOpts = readImportOpts(),
            matches = findMatchingShp(fileName),
            dataset, lyr;

        // Add dbf data to a previously imported .shp file with a matching name
        // (.shp should have been queued before .dbf)
        if (fileType == 'dbf' && matches.length > 0) {
            // find an imported .shp layer that is missing attribute data
            // (if multiple matches, try to use the most recently imported one)
            dataset = matches.reduce(function (memo, d) {
                if (!d.layers[0].data) {
                    memo = d;
                }
                return memo;
            }, null);
            if (dataset) {
                lyr = dataset.layers[0];
                lyr.data = new internal.ShapefileTable(content, importOpts.encoding);
                if (lyr.shapes && lyr.data.size() != lyr.shapes.length) {
                    stop("Different number of records in .shp and .dbf files");
                }
                if (!lyr.geometry_type) {
                    // kludge: trigger display of table cells if .shp has null geometry
                    // TODO: test case if lyr is not the current active layer
                    model.updated({});
                }
                procNextQueuedFile();
                return;
            }
        }

        if (fileType == 'shx') {
            // save .shx for use when importing .shp
            // (queue should be sorted so that .shx is processed before .shp)
            cachedFiles[fileName.toLowerCase()] = {filename: fileName, content: content};
            procNextQueuedFile();
            return;
        }

        // Add .prj file to previously imported .shp file
        if (fileType == 'prj') {
            matches.forEach(function (d) {
                if (!d.info.prj) {
                    d.info.prj = content;
                }
            });
            procNextQueuedFile();
            return;
        }

        importNewDataset(fileType, fileName, content, importOpts);
    }

    /**
     * FORESTAR: importNewDataset （根据文件类型和配置导入数据集dataset ）
     * @param fileType
     * @param fileName
     * @param content
     * @param importOpts
     */
    function importNewDataset(fileType, fileName, content, importOpts) {
        var size = content.byteLength || content.length, // ArrayBuffer or string
            delay = 0;

        // show importing message if file is large
        if (size > 4e7) {
            //gui.showProgressMessage('Importing');
            delay = 35;
        }
        setTimeout(function () {
            var dataset;
            var input = {};
            try {
                input[fileType] = {filename: fileName, content: content};
                if (fileType == 'shp') {
                    // shx file should already be cached, if it was added together with the shp
                    input.shx = cachedFiles[fileName.replace(/shp$/i, 'shx').toLowerCase()] || null;
                }
                dataset = internal.importContent(input, importOpts);
                // save import options for use by repair control, etc.
                dataset.info.import_options = importOpts;
                //gui.session.fileImported(fileName, readImportOptsAsString());
                addDataset(dataset);
            } catch (e) {
                handleImportError(e, fileName);
            }
        }, delay);
    }

    /**
     *  FORESTAR: 导入文件错误处理
     * @param e
     * @param fileName
     */
    function handleImportError(e, fileName) {
        var msg = utils.isString(e) ? e : e.message;
        if (fileName) {
            msg = "导入错误: <i>" + fileName + "</i><br>" + msg;
        }
        clearQueuedFiles();
        alert(msg);
        console.error(e);
    }

    /**
     * FORESTAR: 数据封装对象
     */
    // Catalog contains zero or more multi-layer datasets
    // One layer is always "active", corresponding to the currently selected
    //   layer in the GUI or the current target in the CLI
    function Catalog() {
        var datasets = [],
            defaultTargets = [];// saved default command targets [{layers:[], dataset}, ...]

        this.forEachLayer = function(cb) {
            var i = 0;
            datasets.forEach(function(dataset) {
                dataset.layers.forEach(function(lyr) {
                    cb(lyr, dataset, i++);
                });
            });
        };

        // remove a layer from a dataset
        this.deleteLayer = function(lyr, dataset) {
            // if deleting first target layer (selected in gui) -- switch to some other layer
            if (this.getActiveLayer().layer == lyr) {
                defaultTargets = [];
            }

            // remove layer from its dataset
            dataset.layers.splice(dataset.layers.indexOf(lyr), 1);
            if (dataset.layers.length === 0) {
                this.removeDataset(dataset);
            }

            // remove layer from defaultTargets
            defaultTargets = defaultTargets.filter(function(targ) {
                var i = targ.layers.indexOf(lyr);
                if (i == -1) return true;
                targ.layers.splice(i, 1);
                return targ.layers.length > 0;
            });
        };

        // @arg: a layer object or a test function
        this.findLayer = function(arg) {
            var test = typeof arg == 'function' ? arg : null;
            var found = null;
            this.forEachLayer(function(lyr, dataset) {
                if (test ? test(lyr, dataset) : lyr == arg) {
                    found = layerObject(lyr, dataset);
                }
            });
            return found;
        };

        this.findCommandTargets = function(pattern, type) {
            if (!pattern) return this.getDefaultTargets() || [];
            return findCommandTargets(this.getLayers(), pattern, type);
        };

        this.findSingleLayer = function(pattern) {
            var matches = findMatchingLayers(this.getLayers(), pattern);
            if (matches.length > 1) {
                stop('Ambiguous pattern (multiple layers were matched):', pattern);
            }
            return matches[0] || null;
        };

        this.removeDataset = function(dataset) {
            defaultTargets = defaultTargets.filter(function(targ) {
                return targ.dataset != dataset;
            });
            datasets = datasets.filter(function(d) {
                return d != dataset;
            });
        };

        this.getDatasets = function() {
            return datasets;
        };

        this.getLayers = function() {
            var layers = [];
            this.forEachLayer(function(lyr, dataset) {
                layers.push(layerObject(lyr, dataset));
            });
            return layers;
        };

        /**
         * FORESTAR: addDataset （加入数据集）
         */
        this.addDataset = function(dataset) {
            this.setDefaultTarget(dataset.layers, dataset);
            return this;
        };

        this.findNextLayer = function(lyr) {
            var layers = this.getLayers(),
                idx = indexOfLayer(lyr, layers);
            return idx > -1 ? layers[(idx + 1) % layers.length] : null;
        };

        this.findPrevLayer = function(lyr) {
            var layers = this.getLayers(),
                idx = indexOfLayer(lyr, layers);
            return idx > -1 ? layers[(idx - 1 + layers.length) % layers.length] : null;
        };

        this.isEmpty = function() {
            return datasets.length === 0;
        };

        this.getDefaultTargets = function() {
            if (defaultTargets.length === 0 && !this.isEmpty()) {
                defaultTargets = [{dataset: datasets[0], layers: datasets[0].layers.slice(0, 1)}];
            }
            return defaultTargets;
        };

        /**
         * FORESTAR: setDefaultTarget （设置数据集和图层对象）
         */
        this.setDefaultTarget = function(layers, dataset) {
            if (datasets.indexOf(dataset) == -1) {
                datasets.push(dataset);
            }
            defaultTargets = [{
                // Copy layers array, in case layers is a reference to dataset.layers.
                // This prevents layers that are added to the dataset inside a command from
                //  being added to the next command's target, e.g. debugging layers added
                //  by '-join unmatched unjoined'.
                layers: layers.concat(),
                dataset: dataset
            }];
        };

        this.setDefaultTargets = function(arr) {
            defaultTargets = arr;
        };

        // should be in gui-model.js, moved here for testing
        this.getActiveLayer = function() {
            var targ = (this.getDefaultTargets() || [])[0];
            return targ ? {layer: targ.layers[0], dataset: targ.dataset} : null;
        };

        function layerObject(lyr, dataset) {
            return {
                layer: lyr,
                dataset: dataset
            };
        }

        function indexOfLayer(lyr, layers) {
            var idx = -1;
            layers.forEach(function(o, i) {
                if (o.layer == lyr) idx = i;
            });
            return idx;
        }
    }

    function findCommandTargets(layers,pattern, type){
        console.error("Not implements ..findCommandTargets().")
    }

    function findMatchingLayers(layers,pattern){
        console.error("Not implements ..findMatchingLayers().")
    }

}());