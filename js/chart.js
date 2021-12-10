
/* use the chart lib to draw a chart according to our specs and data. Factor is an addon for CPM to dose convertion only */
function initChart(container) {
	return new Dygraph(
		container, [], {
//			axisLabelColor: '#555',
      axisLineWidth: 1,
			legend: 'never',
//			labelsDivStyles: { 'textAlign': 'right' },
			connectSeparatedPoints: true,
			colors: [],
			labels: [],
      		gridLinePattern: [4,4],
			highlightCircleSize: 5,
			strokeWidth: 2
	        
		}
	);
}

