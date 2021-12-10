
var singleton;


function Frontend(mapContainer, chartContainer) {
	this.mapcontainer = mapContainer;
	this.chartcontainer = chartContainer;
	this.progressRunning = null;
	this.user = userid;
	this.pass = userkey;
	
	singleton = this;
	// init source and layer collections
	
	this.layers = new Object();
}

Frontend.prototype.init = function() {
	
	
	this.chart = initChart('details-chart');
  
	// by default chart is closed
	singleton.closeChart();

	this.chart.updateOptions({
		highlightCallback: function(event, time, points, index, seriesName) {
      		var point = points[0];
			selectHistoryAtTime(singleton.map, point['xval'] / 1000 ); //id, time
      		var sensor = $("#sensors-selector").val();
			$("#details-legend").html(new Date(point['xval']).toLocaleString() + ' <b>' + point['yval'].toFixed(2) + getUnit(sensor) + '</b>');
		},
    	unhighlightCallback: function(event) {
			$("#details-legend").html('');
		}
	});

	

	
	// ---- POPULATE CONTROLS ---- //
	var sensors = {"Temperatura":"temperature", "Presiunea":"pressure", "Umiditatea":"humidity", "Compuși Volatili":"voc", "Zgomot":"noise", "Formaldehida":"ch2o", 
	"Dioxid de Carbon":"co2", "PM1.0":"pm1","PM2.5":"pm25", "PM10":"pm10", "Radiație":"cpm", "AQI":"aqi"};
	


	$.each(sensors, function(key, value) {
		$('#sensors-selector').append($("<option />").val(value).text(key));
	});
	$('#sensors-selector').find('option').each(function(i,e){
    	if($(e).val() == opensensor){
        		$('#sensors-selector').prop('selectedIndex',i);
    	}
	});	
	// setup date range picker, and set it for today
    $(function() { 
    	$("#datepicker").daterangepicker({
			presetRanges: [{
				text: 'Astăzi',
				dateStart: function() { return moment() },
				dateEnd: function() { return moment() }
			}, {
				text: 'Ieri',
				dateStart: function() { return moment().subtract('days', 1) },
				dateEnd: function() { return moment().subtract('days', 1) }
			}, {
				text: 'Ultima săptămână',
				dateStart: function() { return moment().subtract('days', 6) },
				dateEnd: function() { return moment() }
			}, {
				text: 'Ultima lună',
				dateStart: function() { return moment().subtract('months', 1).startOf('month') },
				dateEnd: function() { return moment().subtract('months', 1).endOf('month') }
			}],
			applyOnMenuSelect: true,
			initialText : 'Selectați intervalul...',
			icon: 'ui-icon-triangle-1-s',
			dateFormat:'d M yy',
			altFormat:'dd-mm-yy',
			datepickerOptions: {
				numberOfMonths : 2,
				minDate: null,
				maxDate: 0
			},
			change: function(event, data) { 
				// act on interval change only if we have an open unit
				singleton.openChart(singleton.openFeatureId);
			}
		});
    });
    $(function() {
 		$("#datepicker").daterangepicker("setRange", {start: moment().startOf('day').toDate()});
	});

	$(function() {
		$('#units-container').on('click', '.list-group-item', function(e) {
  			flyToId(singleton.map, this.id, 500, 19);
  			singleton.openChart(this.id);
		});
	});

	$("#sensors-selector").change(function() {
		singleton.notifyMap();
    });

	// init map
	if (openlat && openlong)
		this.map = initMap(this.mapcontainer, [openlat,openlong, openzoom]);
	else
		this.map = initMap(this.mapcontainer, [47.156754,27.585437,13]);
	
	this.setMapCallbacks();

	// start download
	this.refreshMapData(); // download -> notify/event -> populate
}


Frontend.prototype.getWarning = function(sensor, value) {
	var msg = '';
    var sensorname = $("#sensors-selector option:selected").text();
    console.log("sensor:"+sensorname + " scurt:"+sensor);
    if (value != null) {	
		var percentage = getPercent(value, sensor);	
		if (sensor == "aqi") {
			percentage = 1+ (Math.round(value)-1) * 25;
			value = value / 1.25; //scale down to 1..4
		}
		var index = 3;
		console.log(getLimits(sensor));
		for (var i = 0; i < 3; i++)  
			if (value < getLimits(sensor)[i]) { index = i; break;}
		console.log(sensor + " " + value + "indeX:"+index);
		msg += getLimitsFormAdviseRO(sensor, index);
		console.log("maf:"+msg);
		
	} else
		msg = '<div class="aqi-invalid">' + sensorname + ' nu este oferit de această unitate.</div>';
	
	return msg;
}
	
Frontend.prototype.checkExtent = function() {
	var sensor = $("#sensors-selector").val();
	var extent = this.map.getView().calculateExtent(this.map.getSize());
	var features = getFeaturesInExtent(this.map, extent);
	
	if (!features || features.length == 0) {
			$("#sensors-note").html('Nu există stații de măsurare cu acest parametru în această zonă.<!-- <a href="https://www.uradmonitor.com/products">get one</a> to expand monitoring in this area.-->');
			$("#details-container").css('display', 'none');
			$("#sensors-aqi").html('');
	} else {
		var list = '<ul class="list-group pre-scrollable">';
		var sum = 0, count = 0;
		features.forEach(function(feature, i) { 
			if (feature.get('value') != null) {
				sum += feature.get('value');
				var back  = (i % 2)? "background-color:white;":"background-color:WhiteSmoke";
				if (feature.get('picture')) back = "background-image:url('"+feature.get('picture')+"');";
				list += '<li class="list-group-item" style="'+back+'" id="'+feature.get('id')+'">' +
					'<span class="badge badge-primary" style="float: left;color:white;"><font size="+1">'+(feature.get('mobile')?'&#9651;':'')+ feature.get('id')+'</font></span>'+
					'<span class="badge badge-secondary badge-pill" style="background-color: ' +getColorPercent(1, feature.get('percentage')) +';color:black;">' + 
					((sensor == "aqi")?getAQILabel(feature.get('value')): feature.get('value')+getUnit(sensor))+
					'</span>'+
					(feature.get('mobile')?'<span class="badge badge-info badge-pill" style="color:black;">'+feature.get('speed')+'km/h</b></span>':'')+
					'<br><br>'+
					'<span class="badge badge-secondary " style="float:left;background-color:lightgray; color:black;">' + feature.get('note').substr(0,60)+'</span><br></li>';
				count ++;
				}
		});
		var avg =  0;
		if (count > 0) avg = sum / count;
		
		var sensor = $("#sensors-selector").val();
		var sensorname = $("#sensors-selector option:selected").text();	

		list += '</ul>';
		// warning doar daca sunt mai multe aparate<li
		if (count > 0) {
			$("#sensors-aqi").html(singleton.getWarning(sensor, avg));
			$("#sensors-note").html(sensorname+' ' + count+' stații active cu media '+avg.toFixed(0)+ getUnit(sensor));
			$("#units-container").html(list);
		}
		else
			$("#units-container").html(list);
	}
}

Frontend.prototype.setMapCallbacks = function() {
	this.map.on('click', function(evt) {
		var sensor = $("#sensors-selector").val();
		
		var object = evt.map.forEachFeatureAtPixel(evt.pixel, function(feature) { return feature; });
		// click pe poligon sau pe feature
		if (object && object.get('id')) {
			// click on feature HANDLE UNIT
			if (object.get('type') == "point") {
				flyToId(singleton.map, object.get('id'), 500, 19);
				singleton.openChart(object.get('id'));
				//$('#'+object.get('id')).tab('show');
			}
			else {
				flyToId(singleton.map, object.get('id'), 400, 13);
				progress(0);
				singleton.closeChart();
				$("#details-container").css('display', 'none');
				$("#units-container").css('display', 'block');
			}
		} else {
			progress(0);
			$("#details-container").css('display', 'none');
			$("#units-container").css('display', 'block');
		}
	});

	// change mouse cursor when over marker
	this.map.on('pointermove', function(evt) {
	  	var pixel = evt.map.getEventPixel(evt.originalEvent);
		var hit = evt.map.hasFeatureAtPixel(pixel);
		var target = evt.map.getTarget();
		var jTarget = typeof target === "string" ? $("#" + target) : $(target);
		// change mouse cursor when over marker
		jTarget.css("cursor", hit ? "pointer" : "");
	});

	this.map.on('moveend', function (evt) {
		singleton.checkExtent();
	});
}



Frontend.prototype.refreshMapData = function() {
	singleton.downloadMap();
  	setTimeout(singleton.refreshMapData, 10000);
}

function progress( state) {
	var width = 0;
	if (!state) {
		$( "#myBar" ).css( "width", "0" );
        clearInterval(this.progressRunning);
		this.progressRunning = null;
	} else {
        clearInterval(this.progressRunning);
		this.progressRunning = setInterval(frame, 10);
		function frame() {
			if (width >= 100) {
	      		width = 0;
			} else {
				width++;
				$( "#myBar" ).css( "width", width + "%" );
  			}
		}
	}
}

Frontend.prototype.downloadMap = function() {
	//if (chartDownload) return; 
		progress(1);

	$.ajax({
    	type: 'GET',
    	url: 'https://data.primariatm.ro/api/3/action/datastore_search_sql?sql=SELECT * from "d680ddb5-45be-4842-95b6-afdef322991a" ORDER BY "time" DESC LIMIT 100' ,
    	dataType: 'jsonp',
    	headers: { 'Content-Type' : 'text/plain' },
    	success: function(data) { 
    		progress(0);
    		singleton.devices = data;
    		singleton.notifyMap();
    		//notifyMap();
    		//source.set('loadend', Date.now());
    	},
    	async: true
	});
}

Frontend.prototype.downloadChart = function(id, sensor, start, stop, factor) {
	this.chartDownload = 1;
	progress(1);
	// download
	$.ajax({
    	type: 'GET',
    	url: "//data.uradmonitor.com/api/v1/devices/" + id + "/" + sensor + "/" + start + "/" + stop,
    	dataType: 'json',
    	headers: { 'Content-Type' : 'text/plain',
			'X-User-id':singleton.user,
			'X-User-hash':singleton.pass },
    	success: function(data) { 
    		//status("Ready", 0);
    		progress(0);
			
    		chartDownload = null;
    		
    		if (sensor == "cpm")
				for (var i = 0; i < data.length; i++)  data[i][sensor]  *= factor;
			
    		singleton.notifyChart(id, data, sensor);
    	},
    	async: true
	});
}




// delete all 4 map layers
Frontend.prototype.clearMap = function(map) {
	map.getLayers().forEach(function (lyr) {
		var name = lyr.get('name');
		if (name=="devices" || name=="voronoi") {
			lyr.getSource().clear();
		}
		
	});
}

Frontend.prototype.notifyMap = function() {
	
	this.clearMap(this.map);

	// get user settings
	var sensor = $("#sensors-selector").val();	
	var sensorname = $("#sensors-selector option:selected").text();
	$(document).prop('title', 'Harta ' + sensorname);
	
	
	var sourceDevices = createSourceDevices(this.devices, sensor);
	this.layers.devices = createLayerDevices(sourceDevices);
	//this.layers.voronoi = createLayerVoronoi(sourceDevices);

	//this.map.addLayer(this.layers.voronoi);
	this.map.addLayer(this.layers.devices);
	

	this.checkExtent();
	
	//this.map.addLayer(createLayerCountries(srcCountries));
	//map.addLayer(createLayerVoronoi(srcDevices));//srcCountries.get('polygons'))
	//this.showLayer('voronoi', true);
	// open chart if there is ID selected
	if (this.openFeatureId) {
		this.openChart(this.openFeatureId);
	}
	// show legend in bottom right corner
	$("#map-legend").show();
	var html = 'Legendă: ' + (getValueInterval(sensor)[3]?getValueInterval(sensor)[1]:getValueInterval(sensor)[0]) + ' ';
	var legendColors = getColors();
	for (var i = 0; i<legendColors.length; i++)
		html += '<div class="map-legend-element" style="background-color:' + legendColors[i]+';"></div>';
	html += ' ' + (getValueInterval(sensor)[3]?getValueInterval(sensor)[0]:getValueInterval(sensor)[1]) + " " + getUnit(sensor);
	$("#map-legend").html(html);
}

// a new dataset is retried, update chart and draw History on map for mobile units
Frontend.prototype.notifyChart = function (id, data, sensor) {

    var sensorname = $("#sensors-selector option:selected").text();
console.log("notify chart 0");
	var plot = [];
	// compute local average
	
	for(var index in data) {
		if(!data.hasOwnProperty(index)) continue;
		var unit = data[index];
		var value = parseFloat(unit[sensor]);
		plot[index] = [new Date(unit.time * 1000), value, 0];
	}
	console.log("notify chart");
	this.chart.updateOptions({ 
	    	colors: ['#0d0dff', '196900', '#ff6b0b'],
            labels: ['Time', (sensor == "cpm"? "dose" : sensor), 'Trend'],
	        'file': plot,
	        ylabel: getUnit(sensor),
  			underlayCallback: function(ctx, area, g) {
			      //marker(sensor, sensorname, ctx, area,g);
	      },
	    }
	);
	

	var feature = getFeatureById(this.map, id);
		
	// create history map layer
	//if ($("#cb-history").prop('checked') && (feature.get('mobile')==1)) 
	populateHistory(this.map, data, sensor, feature.get('factor'), id);
	
	
	selectFeature(this.map, feature);
	// keep selected mobile && Online units in view as they move
	console.log("resize chart");
	this.chart.resize();
}


Frontend.prototype.findLayerByName = function(name) {
	var ret;
	this.map.getLayers().forEach(function(layer, i) {
   		if (name == layer.get('name')) {
			ret = layer;
			return;
		}
	});
	return ret;
}

Frontend.prototype.getLayerByName = function(name) {
	switch (name) {
		case "voronoi": return this.layers.voronoi;
		default: 
		case "devices": return this.layers.devices;
	}
}

Frontend.prototype.showLayer = function(name, status) {
	status?this.map.addLayer(this.getLayerByName(name)) : this.map.removeLayer(this.getLayerByName(name));
}


Frontend.prototype.openChart = function(id) {
	
	var feature = getFeatureById(this.map, id);
    if (!feature) return;
    var sensor = $("#sensors-selector").val();
    if (sensor == "aqi") return;
    var sensorname = $("#sensors-selector option:selected").text();
	flyToId(this.map, id, 500, 0);
	//selectFeature(this.map, feature);

    this.openFeatureId = id;
	$("#details-container").css('display', 'block');
	$("#units-container").css('display', 'none');
	$(".comiseo-daterangepicker-triggerbutton").prop('disabled', false);

	// add time details
	
	var now = Math.round(moment() / 1000);
	var timefirst = new Date(feature.get('timefirst') * 1000);
	var timelast = new Date(feature.get('timelast') * 1000);
	var url = 'https://www.uradmonitor.com/?open=' + id + '&sensor=' + sensor;


	// select time interval only for online units, else we display last 2 weeks of data
	var start = null, stop = null;
	if (feature.get('status') == 1) {
		var timejson = jQuery.parseJSON($("#datepicker").val());
		start = now - Math.round(moment(timejson.start, "DD-MM-YYYY").startOf('day') / 1000);
		stop = now - Math.round(moment(timejson.end, "DD-MM-YYYY").endOf('day') / 1000);
	} else {
		start = now - feature.get('timelast') + 7*86400;
		stop = now - feature.get('timelast');
	}	
	if (feature.get('value') != null) {
		//$("#details-chart").css('display', 'block');
		this.downloadChart(feature.get('id'), sensor, start, stop, feature.get('factor'));
	} else {
		//$("#details-chart").css('display', 'none');
	}
}


Frontend.prototype.closeChart = function() {
	this.openFeatureId = null;
	selectFeature(this.map, null);
	
	clearLayerHistory(this.map); // mobile units
	$("#details-container").css('display', 'none');

	$(".comiseo-daterangepicker-triggerbutton").prop('disabled', true);
}

