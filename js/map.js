var valueStyles = [];
var invalidStyle, pathStyle;
var featureSize = 10;
var windy;


/* define the OSD map controls */
function initControls() {
	var controls = [
	    new ol.control.Attribution(),                       /* bottom Info button */
	    new ol.control.MousePosition({                      /* top-right cursor coordinates */
	        undefinedHTML: '',
	        projection: 'EPSG:4326',
	        coordinateFormagetFeaturesInExtentt: function(coordinate) {	/* show it as latitude, longitude */
	            return ol.coordinate.format(coordinate, '{y}, {x}', 4);
	        }
	    }),
	    new ol.control.OverviewMap({                        /* bottom-left minimap closed by default */
	        collapsed: true
	    }),
	    new ol.control.ScaleLine(),                         /* bottom-left scale indicator */
	    new ol.control.Zoom(),              

	    new ol.control.FullScreen()                         /* top-right full-screen button */
	];
	return controls;
}

/* define the way the user can interact with the map, using mouse and keyboard */
function initInteractions() {
	var interactions = [        
	    // iterate only the interactions that we need        
	    new ol.interaction.DoubleClickZoom({                /* zoom on double click */
	        duration: 400
	    }),
	    new ol.interaction.DragPan({                        /* drag map */
	        kinetic: new ol.Kinetic(-0.01, 0.1, 200)
	    }),
	    new ol.interaction.DragZoom(),                     	/* shift-click to select zoom area */
	    new ol.interaction.MouseWheelZoom(),
	    new ol.interaction.Select()
	   
	];
	return interactions;
}


/* open street map layer, will be interchanged with the Sat layer based on resolution treshold */
function createLayerOSM() {
	return new ol.layer.Tile({
		name: 'osm',
		preload: 4,
		source: new ol.source.OSM()
	});
}	 


function getDynamicStyle(shape, radius, value, color, percentage, selected) {
	var image;
	switch (shape) {
		case 'circle': image = new ol.style.Circle({
			radius: radius,
			fill: new ol.style.Fill({color: color?color:getColorPercent(0.75, percentage) }),
			stroke: new ol.style.Stroke({color: 'rgba(0,0,0,0.3)', width: 2}) 
		}); 
		break;
		case 'diamond': image = new ol.style.RegularShape({
			points: 6,
			radius: radius,
			angle: Math.PI / 2,
			fill: new ol.style.Fill({color: color?color:getColorPercent(0.75, percentage) }),
			stroke: new ol.style.Stroke({color: 'rgba(0,0,0,0.3)', width: 2}) 
		});
		break;
		case 'triangle': image = new ol.style.RegularShape({
			points: 3,
			radius: radius,
			fill: new ol.style.Fill({color: color?color:getColorPercent(0.75, percentage) }),
			stroke: new ol.style.Stroke({color: 'rgba(0,0,0,0.3)', width: 2}) 
		});
		break;
	}	
	
	return new ol.style.Style({
		image: image,
		stroke: new ol.style.Stroke({
            color: 'rgba(0,0,0,0.5)',
            width: 6
        }),
		text: value?new ol.style.Text({
			font: '8px Helvetica Neue',
			fontstretch: 'condensed',
			text: value,
			fill: new ol.style.Fill({color: '#FFFFFF'}),
			stroke: new ol.style.Stroke({color: 'rgba(50,50,50,0.3)',width: 5})
		}):null
	});
}

function createLayerDevices(ftrsDevices, showParameter) {
	
	console.log("createLayerDevices");
	return new ol.layer.Vector({
			name: 'devices',
	        source: ftrsDevices,
	        zIndex:3,
	    	style: function (feature) {
	    		if (feature.get('value')!=null) {
	    			return [getDynamicStyle((feature.get('mobile') == 1)?'triangle':'diamond', featureSize, '' + feature.get('value'), null, feature.get('percentage'), 1)];
		    	} else {
		    		return [invalidStyle];
		    	}
	    	}
		});
   

}

function createLayerVoronoi(ftrsDevices) {
	var voronoi = d3.geom.voronoi()
		.x(function(feature) { 
			var coord = feature.getGeometry().getCoordinates();
			coord = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
			return coord[0]; 
		})
		.y(function(feature) { 
			var coord = feature.getGeometry().getCoordinates();
			coord = ol.proj.transform(coord, 'EPSG:3857', 'EPSG:4326');
			return coord[1]; 
		})
		.clipExtent([[-180, -85], [180, 85]]); 
	var voronoiPolygons = voronoi(ftrsDevices.getFeatures());

	// prepare the arrays to hold the voronoi polygons
	var ftrsVoronoi = new ol.source.Vector({});
	voronoiPolygons.forEach(function(polygon, i) { 
		var feature = ftrsDevices.getFeatures()[i];		
		var featureVoronoi = new ol.Feature({
			geometry: new ol.geom.Polygon([polygon]),
			id: feature.get('id'),
			type: 'polygon',
			percentage: feature.get('percentage')
		});
		featureVoronoi.getGeometry().transform('EPSG:4326', 'EPSG:3857');		
		ftrsVoronoi.addFeature(featureVoronoi);
	});
	return new ol.layer.Vector({
		name: 'voronoi',
		source: ftrsVoronoi,
		style: function (polygon) {
			
			return [
				new ol.style.Style({
        			fill: new ol.style.Fill({ color: getColorPercent(0.3, polygon.get('percentage')), weight: 1 }),
        			stroke: new ol.style.Stroke({ color: [0,0,0,0.05], width: 1 })
    			})
			];
    	}
	});
}

// second layer (z1), the path layer for mobile units, interlinking features with measurements
function createLayerPath(source, style) {
	return  new ol.layer.Vector({
		name: 'path',
	    source: source,
	    zIndex:1,
	    style: style
	});
}

// third layer (z2), showing history for mobile units
// we'll used cached styles here
function createLayerHistory(source) {
	return new ol.layer.Vector({
		name: 'history',
        source: source,
        zIndex:2,
    	style: function (feature) {
    		if (feature.get('value')) {

				var i = Math.floor(feature.get('percentage') / 10); 
	    		// max out check, as some values can go outside the (min,max) percentage definition
	    		if (i >= valueStyles.length) i = valueStyles.length - 1; 
	    		return [valueStyles[ i ]];
	    	} else {
	    		return [invalidStyle];
	    	}
    	}
	});
}

function getFeaturesInExtent(map, extent) {
	if (!extent || !map || !map.getLayers()) return null;

	var source = null;
	map.getLayers().forEach(function (lyr) {
		var name = lyr.get('name');
		
		if (name == "devices" ) 
			source = lyr.getSource();
		
		if (name == "cluster") 
			source = lyr.getSource().getSource();
	});
	if (!source) return null;

	//var features =source.getFeatures();
	var count = 0;
	var features = [];
	source.forEachFeatureInExtent(extent, function (feature) {
		features.push(feature);
	});
	return features;
	
}



function getPercent(value, sensor) {
	var interval = getValueInterval(sensor);
	
	if (value > interval[1]) value = interval[1];
	if (value < interval[0]) value = interval[0];

	return Math.abs(Math.floor( 100 * interval[3] -  (value * interval[2] - interval[0]) * 100 / (interval[1] - interval[0]) ));
}

function flyToId(map, id, duration, zoom) {
	
	if (!map || !map.getLayers()) return null;
	var source = null;
	map.getLayers().forEach(function (lyr) {
		var name = lyr.get('name');
		if (name == "devices" ) 
			{ source = lyr.getSource();}
		if (name == "cluster") 
			{ source = lyr.getSource().getSource(); }
	});
	if (!source) return null;

	var features =source.getFeatures();
	for (var i=0;i<features.length; i++) 
		if (features[i].get('id') == id) {
			var feature = features[i];
			if (zoom > 0)
				map.getView().animate( {center: feature.getGeometry().getCoordinates()}, {zoom: zoom},  {duration: duration});
			else 
				map.getView().animate( {center: feature.getGeometry().getCoordinates()},  {duration: duration});
			return;
		}
}
function flyToFeature(map, feature, duration, zoom) {
	if (!feature) return;
	if (!zoom || map.getView().getZoom() < 5)
		map.getView().animate( {center: feature.getGeometry().getCoordinates()}, {zoom: zoom},  {duration: duration});
	else 
		map.getView().animate( {center: feature.getGeometry().getCoordinates()}, {duration: duration});
}

function selectHistoryAtTime(map, time) {
	map.getLayers().forEach(function (lyr) {
		if (lyr.get('name') == 'history') {
			lyr.getSource().getFeatures().forEach(function (feature) {
				if (feature.get('time') == time) {
					selectFeature(map, feature);
				}
			});
		}
	});
}

function selectFeature(map, feature) {
	var select = null;
	if (!map) return;
	map.getInteractions().forEach(function (interaction) {
			if(interaction instanceof ol.interaction.Select) select = interaction;
	});
	if (!select) return;
	// deselect any prev selections
	select.getFeatures().clear();	
	if (feature)
		select.getFeatures().push(feature);
}
function getFeatureById(map, id) {
	if (!id || !map || !map.getLayers()) return null;

	var source = null;
	map.getLayers().forEach(function (lyr) {
		var name = lyr.get('name');
		if (name == "devices")
			source = lyr.getSource();
	});
	if (!source) return null;

	var features =source.getFeatures();
	for (var i=0;i<features.length; i++) 
		if (features[i].get('id') == id) 
			return features[i];

	return null;	
}



function createSourceDevices(data, sensor) {
	console.log("source:"+sensor);
	console.log(data);
	var source = new ol.source.Vector({ /*loader: function(extent, resolution, projection) {}*/ });
	data = data.result.records;
	console.log(data);
	for(var index in data) {
		if(!data.hasOwnProperty(index)) continue;
		// get all unit parameters	
		var row = data[index];
		
		// remove duplicates from returned result
		var features =source.getFeatures(),
			duplicate = 0;
		for (var i=0;i<features.length; i++) 
			if (features[i].get('id') == row["id device"]) duplicate = 1;
		
		// ignore devices without coordinates or with zeros, these also include those in shipping
		if (duplicate || !row.latitude || !row.longitude || row.latitude < -90 || row.latitude > 90 || row.longitude < -180 || row.longitude > 180) continue;

		var x = parseFloat(row.longitude)  , 
			y = parseFloat(row.latitude) ,
			factor = 0.01,
			avg = null,
			percentage = null;
		if (row[sensor] == null) {			 // pm1, pm25, pm10, pressure, etc
			avg = null;
			percentage = 0;
		} else {
			avg = parseFloat(row[sensor]);
			if (sensor == "cpm") avg *= factor;
			avg = parseFloat(avg.toFixed(2));
			percentage = getPercent(avg, sensor);			
		}
		if (sensor == "aqi") {
			if (row.ica == null) {
				avg = null;
				percentage = null;
			}
			else {
				avg = parseInt(row.ica);
				percentage = 1+ (avg-1) * 25;
			}
		}
		
		
		// no indoor or offline units
		if (percentage > 0)  {
			source.addFeature(new ol.Feature({
			geometry: new ol.geom.Point(ol.proj.transform([x,y], 'EPSG:4326',   'EPSG:3857')),
			time: row.time,
			id: row["id device"],
			value: avg,
			status: 1,
			mobile: row.mobile,
			factor: factor,
			percentage: percentage,
			note: row.note,
			picture: row.picture,
			placement: 1,
			type:'point'
		}));
		}
	//	else
	//		console.log(row.id + " status:" + row.status + );
	}
	console.log(source.getFeatures());
	return source;
}

function populateHistory(map, dataHistory, sensor, factor, id) {
	clearLayerHistory(map);

	var srcFeatures = new ol.source.Vector({});
	var path = [];
	for(var k in dataHistory) {
		var row = dataHistory[k];
		// ignore devices without coordinates, these also include those in shipping
		if (!row.latitude || !row.longitude) continue;

		var x = parseFloat(row.longitude), 
			y = parseFloat(row.latitude),
			value = parseFloat(row[sensor]),
			percentage = null;
			
	
		//if (sensor == 'cpm')
		//	value *= parseFloat(factor);
		value = value.toFixed(2);
		percentage = getPercent(value, sensor);
		
		
		var feature = new ol.Feature({
			geometry: new ol.geom.Point(ol.proj.transform([x,y], 'EPSG:4326',   'EPSG:3857')),
			time: row.time,
			altitude: row.altitude,
			speed: row.speed,
			value: value,
			percentage: percentage
		});
		srcFeatures.addFeature(feature);
		
		// build path
		path.push(ol.proj.transform([x,y], 'EPSG:4326',   'EPSG:3857'));
		
	}
	var srcPath = new ol.source.Vector({
        features: [ new ol.Feature({ geometry: new ol.geom.LineString(path, 'XY'), name: 'Line' }) ]
    });
    map.addLayer(createLayerPath(srcPath, pathStyle));
	// add layer to map
	map.addLayer(createLayerHistory(srcFeatures));
}

// delete path and history layers
function clearLayerHistory(map) {
	if (!map) return;
	map.getLayers().forEach(function (lyr) {
		var name = lyr.get('name');
		if ( name=="history" || name == "path") {
			lyr.getSource().clear();
		}
	});
}


function getColors() {
	var colors = [];
	for (var i = 0; i < 10; i++) 
		colors[i] = valueStyles[i].getImage().getFill().getColor();
	return colors;
}



// function applies greyscale to every pixel in canvas
function greyscale(context, hour) {
	var canvas = context.canvas;
	var width = canvas.width;
	var height = canvas.height;
	var inputData = context.getImageData(0, 0, width, height).data;
	var output = context.createImageData(width, height);
	var d = output.data;

	for (i = 0; i < inputData.length; i += 4) {
		var r = inputData[i];
		var g = inputData[i + 1];
		var b = inputData[i + 2];
		var v;
		if (hour > 7 && hour < 20) {
			// day time: CIE luminance for the RGB
			v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		} else {
			// if night time, use dark version		
			v = (1 - 0.05 * r + 0.5 * g + 0.45 * b)/2;
		}
			
		d[i + 0] = v; // Red
		d[i + 1] = v; // Green
		d[i + 2] = v; // Blue
		d[i + 3] = 255; // Alpha
	}
//	ctx.putImageData(myImageData, 0, 0);
	 context.putImageData(output, 0, 0);
}



/* targetName can be map-container */
function initMap(targetName, coordinates) {
	
	var da = new Date();
	var hour = da.getHours();
	hour = 11;

	var view = new ol.View({
		logo: false,
		center: ol.proj.fromLonLat( [coordinates[1], coordinates[0]]),//world[0], 
		zoom: coordinates[2],
		//minZoom: 10,
		maxZoom: 19
	});
	
	var layerOSM = createLayerOSM();
	layerOSM.on('postcompose', function(event) {
	   //greyscale(event.context);
	});
	layerOSM.on('postrender', function(event) {
		greyscale(event.context, hour);
	});
	
	// color gradient
	for (var i = 0; i < 10; i++) 
		valueStyles[i] = new ol.style.Style({
			image: 
				new ol.style.Circle({
					radius: featureSize / 2 ,
					fill: new ol.style.Fill({color: getColorPercent(0.75, i * 10) }),
					stroke: new ol.style.Stroke({color: 'rgba(0,0,0,0.2)', width: 0.5}) 
				})
			});
	invalidStyle = new ol.style.Style({
		image: 
			new ol.style.RegularShape({
				points: 4,
				radius: 10,
				angle: Math.PI / 4,
				fill: new ol.style.Fill({color: 'rgba(0, 0, 0, 0.15)' }),
				stroke: new ol.style.Stroke({color: 'rgba(134,14,5,0.1)', width: 2}) 
			})
		});
	pathStyle = new ol.style.Style({
	        	stroke: new ol.style.Stroke({
	                width: 1, 
	                color: 'rgba(0, 0, 0, 0.3)',
	                lineDash: [.5, 1]
	            }),
	            zIndex: 2
	        });

	// create map
	var map = new ol.Map({
		target: document.getElementById(targetName),		// The DOM element that will contain the map
		renderer: 'canvas', 								// Force the renderer to be used
		maxResolution: 'auto',
		layers: [	layerOSM ],
		loadTilesWhileAnimating: true,
		controls: initControls(),
		interactions: initInteractions(),
		fractionalZoom: true,
		view: view
	});

/*
var canvas = document.getElementById('windyMap');
function refreshWindy() {
  if(!windy) {
    return;
  }
  windy.stop();
  var mapSize = map.getSize();
  var extent = map.getView().calculateExtent(mapSize);
  extent = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

  canvas.width = mapSize[0];
  canvas.height = mapSize[1];

  windy.start(
    [[0,0], [canvas.width, canvas.height]],
    canvas.width,
    canvas.height,
    [[extent[0], extent[1]],[extent[2], extent[3]]]
  );
}

fetch('http://esri.github.io/wind-js/gfs.json').then(function(response) {
  return response.json();
}).then(function(json) {
  windy = new Windy({canvas: canvas, data: json });
  refreshWindy();
});

map.on('moveend', refreshWindy);*/
	

	return map;
}



