<?php
	$devid = $_GET['open'];
$userid = 7330;
  $userkey = 'd2fa0827bbefb57329ae5eedc8ba86be';
  $openlat = 45.757651275;
  $openlong = 21.23020958;
  $openzoom = 11;
  $title = "Timișoara";
  $city = "images/city.jpg";
    
?>



?>
<html>
<head>
	<meta charset='utf-8'>
  	<meta name='viewport' content='width=device-width, initial-scale=1'>

  	<link href='//fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
  	<link href='//fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>
  	<link href='//maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css' rel="stylesheet" type='text/css'>
	
  	<script src="//code.jquery.com/jquery-3.4.1.min.js"></script>
  	<link href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" rel="stylesheet" >
  	<script src="//code.jquery.com/ui/1.12.1/jquery-ui.min.js"></script>

  	<script src="//maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>
	<script src="//cdnjs.cloudflare.com/ajax/libs/dygraph/1.1.1/dygraph-combined.js"></script>
	<script src="//d3js.org/d3.v3.min.js"></script>
	<script src="//d3js.org/topojson.v1.min.js"></script>
	<script src="//api.tiles.mapbox.com/mapbox.js/plugins/turf/v3.0.11/turf.min.js"></script>
	
	<script src="//cdnjs.cloudflare.com/ajax/libs/moment.js/2.20.1/moment.min.js"></script>
	<!-- <script src="http://esri.github.io/wind-js/windy.js" type="text/javascript"></script> -->

	<?php echo '
	<link  href="'.$dir.'js/daterangepicker.css" rel="stylesheet" type="text/css">
	<link  href="'.$dir.'js/ol.css" rel="stylesheet" type="text/css">
	<link  href="'.$dir.'style.css" rel="stylesheet" >
	<script src="'.$dir.'js/ol.js"></script>
	<script src="'.$dir.'js/daterangepicker.min.js"></script>
	<script src="'.$dir.'js/colour.js"></script>
	<script src="'.$dir.'js/converter.js"></script>
	<script src="'.$dir.'js/dateformat.js"></script> 
	<script src="'.$dir.'js/scroll.js"></script> 
	<script src="'.$dir.'js/daterangepicker.min.js"></script
	<script src="'.$dir.'js/coordinates.js"></script> 
	<script src="'.$dir.'../../lib/limits.js"></script> 
	<script src="'.$dir.'js/map.js"></script> 
	<script src="'.$dir.'js/chart.js"></script> 
	<script src="'.$dir.'js/frontend.js"></script>';
	?>



</head>
<title><?php echo $title; ?></title>

<body>
<?php 
	$openid = isset($_GET['open'])?$_GET['open']:NULL;  
	if (!isset($admin))
		$admin = isset($_GET['admin'])?$_GET['admin']:NULL;  
	$sensor = isset($_GET['sensor'])?$_GET['sensor']:NULL; 
	// if lat long are given open them, else open user location
	//$openlat = isset($_GET['lat'])?$_GET['lat']:$usergeo->getLatitude();
	//$openlong = isset($_GET['long'])?$_GET['long']:$usergeo->getLongitude();
	if ($openzoom > 20) $openzoom = 20;
	if ($openzoom < 1) $openzoom = 1;
?>

<script> 
	var openid = '<?php echo $openid; ?>'; 
	var opensensor = '<?php echo $sensor; ?>';
	var openlat = '<?php echo $openlat; ?>';
	var openlong = '<?php echo $openlong; ?>';
	var openzoom = '<?php echo $openzoom; ?>';
	var userid = '<?php echo $userid; ?>'; 
	var userkey = '<?php echo $userkey; ?>'; 
	var admin = '<?php echo $admin; ?>'; 
	var title = '<?php echo $title; ?>'; 
	// open radiation by default
	if (!opensensor) opensensor = "aqi";
</script>





<div class="container">
	<div class="row" id="progress-container">
		<div id="myProgress"><div id="myBar"></div></div>
	</div>
	<div class="row" id="widget-container">
	
	
		<div class="col-md-4" id="sensors-container" style="background-image:url('<?php echo $city; ?>');">
			<h1><u><?php echo '<span style="color:'.$color.';">'.$title.'</span>'; ?></u></h1>
			<div id="sensors-aqi"></div><br>
			<select class="custom"  id="sensors-selector"><select><input id="datepicker" name="e1" class="custom"><br>
			<br>
			<div id="sensors-note"></div>
		</div>
		<div class="col-md-4" id="map-container">
			<div id="map-legend">x</div>
		</div>
		<div class="col-md-4">
			<div id="details-container">
				<div id="details-legend"></div>
				<div id="details-chart"></div>
			</div>	
			<div  id="units-container"></div>
		</div>
	</div>
	<div class="row">
		<div id="map-copyright"><b>Sursa datelor:</b> Rețeaua globală de monitorizare a mediului - <b>uRADMonitor</b> - <a href="https://www.uradmonitor.com">www.uradmonitor.com</a> , (C) 2015 - 2021 Magnasci SRL Timișoara, Toate drepturile sunt rezervate.</div>
	</div>		
</div>

<script>
	var frontend = new Frontend('map-container', 'chart-container');
	frontend.init();
</script>


</body>
</html>
