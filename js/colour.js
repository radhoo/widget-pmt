var red = { r:255, g:0, b:0 };
var yellow = { r:255, g:255, b:0 };
var green = { r:0, g:255, b:0 };

function gradient(color1, color2, color3, alpha, percent) {
    var newColor = {};
    
    if (percent > 100) percent = 100;

    function makeChannel(a, b, c) { 
		if (percent < 50)
			return(a + Math.round((b-a)*(percent/50))); 
		else 
			return(b + Math.round((c-b)*((percent-50)/50))); 
    }

    var r = makeChannel(color1.r, color2.r, color3.r);
    var g = makeChannel(color1.g, color2.g, color3.g);
    var b = makeChannel(color1.b, color2.b, color3.b);

    return "rgba(" +r + ", " + g + ", " + b + ", " + alpha + ")";
}

function getColorPercent(alpha, percent) {
    return gradient(green, yellow, red, alpha, percent);
}

