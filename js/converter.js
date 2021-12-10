var maxRadiationDose = 0.30;

/* helper function to get equivalent dose rate aproximation out of CPM */
function getDoseRate(cpm, factor) {
	var dose = cpm * factor;
	return dose.toFixed(2);
}

function getDosePercent(cpm, factor) {
	return getDoseRate(cpm, factor) * 100 / maxRadiationDose;
}



function getValuePercent(value, maxValue) {
	return value * 100 / maxValue;
}

function average(data){
	var sum = data.reduce(function(sum, value){ return sum + parseFloat(value);}, 0);
	return sum / data.length;
}

function standardDeviation(values){
	var avg = average(values);
	var squareDiffs = values.map(function(value){
		var diff = value - avg;
		return diff * diff;
	});
	var avgSquareDiff = average(squareDiffs);
	return Math.sqrt(avgSquareDiff);
}

function convert(sensor, value, factor) {
	switch (sensor) {
		case "dose": return value * factor;
		default: return value;
	}
}

/*
model A1:   (time, latitude, longitude, altitutde, speed), temperature, cpm, voltage, duty
model A2:   (time, latitude, longitude, altitutde, speed), temperature, pressure, cpm, voltage, duty
model A3:   (time, latitude, longitude, altitutde, speed), temperature, pressure, humidity, voc, pm25, co2, ch2o, cpm, voltage, duty
model D:    (time, latitude, longitude, altitutde, speed), temperature, pressure, humidity, voc, pm25, cpm, voltage, duty
model KIT1: (time, latitude, longitude, altitutde, speed), cpm, voltage, duty

 */

function getAQILabel(value) {
	switch (value) {
		case 1: return "Foarte bun";
		case 2: return "Bun";
		case 3: return "Mediu";
		case 4: return "Rău";
		case 5: return "Foarte rău";
	}
}

/* return value in seconds, for the selected timeframe intervals */
function getSeconds(interval) {
	switch (interval) {
		case "day": return 0;
		case "week": return 604800;
		case "month": return 2592000;
		default: return 0;
	}
}

