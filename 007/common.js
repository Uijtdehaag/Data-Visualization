	require([
		"dojo/query", "esri/map", "esri/dijit/Scalebar", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleMarkerSymbol", "esri/graphic", "esri/Color",
		"esri/renderers/SimpleRenderer", "dojo/parser", "esri/layers/FeatureLayer", "esri/layers/GraphicsLayer", "esri/dijit/PopupTemplate", "esri/geometry/Extent", 
		"esri/SpatialReference", "esri/dijit/HomeButton", "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dojo/domReady!"
	], function(
		query, Map, Scalebar, SimpleLineSymbol, SimpleMarkerSymbol, SimpleGraphic, Color,
		SimpleRenderer, parser, FeatureLayer, GraphicsLayer, PopupTemplate, Extent, SpatialReference, HomeButton
	) {

		parser.parse();
		var map;
		var destinationPointsUrl = 'http://services.arcgis.com/WQ9KVmV6xGGMnCiQ/arcgis/rest/services/Bond_Locations_FS/FeatureServer/0';
		var mi6Url = 'http://services.arcgis.com/WQ9KVmV6xGGMnCiQ/arcgis/rest/services/MI6_HQ/FeatureServer/0';
		var destinationPoints;
		var mi6;
		var inputSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([172,234,252,0.4]), 1);
		var pointSymbol = new SimpleMarkerSymbol().setColor(new Color([255,255,255,0.6]));
		var renderer = new SimpleRenderer(pointSymbol);
		var startExtent = new Extent(-16144685.47,-7868007.45,19077497.16 ,15613447.64, new SpatialReference({ wkid:3857 }));
		var popupTemplate = new PopupTemplate({
				title: "{title_1}", 
				description:"{Bond_1} {visited_1} {Label_1} {in1} {Film_1}"
			});

		map = new Map("map", {
			basemap: "dark-gray",
			extent: startExtent,
            maxZoom: 7
		});
		
		var home = new HomeButton({
			map: map
		}, "HomeButton");
		home.startup();
		home.hide();


		function initFeatures(){
			//define a popup template
			destinationPoints = new FeatureLayer(destinationPointsUrl, {
				mode: FeatureLayer.MODE_SNAPSHOT,
				opacity : 0,
				outFields: ["*"]
			});

			destinationPoints.setRenderer(renderer);

			mi6 = new FeatureLayer(mi6Url, {
				mode: FeatureLayer.MODE_SNAPSHOT,
				opacity : 0
			});

			map.addLayer(mi6);
			map.addLayer(destinationPoints);

			//Wait for the points to be completely loaded before continuing:
			map.on("layer-add-result", function(layer){
				if (layer.layer.url == destinationPointsUrl){
					var interval = setInterval(function(layer){
						if(destinationPoints.graphics.length < 110 || mi6.graphics.length <1){
							//wait...
						} else { 
							//Everything is ready
							clearInterval(interval);
							$("body").removeClass('loading');
							$( "#play > *" ).click(function() {
								constructLines(destinationPoints);
							});
						}
					},100);
				}
			});
		}

		// Constructs a geodesic line given a start and end point
		function createLine(start, end) {
			//create polyline
			var polyline = new esri.geometry.Polyline(map.spatialReference);
			polyline.addPath([start, end]);
			//convert to wgs84 and densify to show shortest great circle path
			var geodesicGeomGeo = esri.geometry.geodesicDensify(esri.geometry.webMercatorToGeographic(polyline), 100000);
			//convert from wgs84 to web mercator for display
			var geodesicGeom = esri.geometry.geographicToWebMercator(geodesicGeomGeo);
			return geodesicGeom;
		}

		//Creates flight paths and adds them to the map
		function constructLines(locationPoints) {
			$("#play").velocity("transition.expandOut");
			$("#date").velocity("transition.fadeIn");
			var pointNumber = -1;
			//Loop through the location points and draw them in date order
			var interval = setInterval(function(){
				pointNumber++;
				if(pointNumber <= locationPoints.graphics.length){
					for (p in locationPoints.graphics){
						if(locationPoints.graphics[p].attributes.BondID_1 == pointNumber){
							$("#clock").html(locationPoints.graphics[p].attributes.year);
							var geodesicGeom = createLine(mi6.graphics[0].geometry, locationPoints.graphics[p].geometry);       
							geodesicGraphic = new esri.Graphic(geodesicGeom, inputSymbol); 
							map.graphics.add(geodesicGraphic);
							geodesicGraphic.getNode().style.strokeOpacity = '0';
							drawLine(geodesicGraphic.getNode());
						} 
					}
				} else {
					clearInterval(interval);
					showPoints();
				}
			}, 35); //The delay between each point drawing
		}

		//Draw the destination points onto the map after the animation is complete
		function showPoints(){
			setTimeout(function(){
				$("#map_graphics_layer > *").velocity('transition.fadeOut');
				$("#clock").velocity('transition.fadeOut');						
				setTimeout(function(){
					destinationPoints.setOpacity(0.6);
					$("#graphicsLayer3_layer > *").velocity('transition.fadeIn');
					destinationPoints.setInfoTemplate(popupTemplate);
						setTimeout(function(){
							home.show();
							map.showZoomSlider();
							map.enablePan();
							map.enableScrollWheelZoom();
							map.enableRubberBandZoom();
							map.graphics.clear();
                            replay();
							//$("#replay").html('<a href="#" class="replay btn">Replay</a>').velocity('transition.fadeIn');		
						}, 1500);//enable map interaction
					}, 1000); //make destination points visible
			}, 3000); //clear out the animation stuff (from the last line starting to draw, not ending)
		}

		//Replay button listener: 
		//$( "#replay" ).click(function() {
		function replay(){
			//clear out points and popups
			$("#graphicsLayer3_layer > *").velocity('transition.fadeOut');
			map.infoWindow.hide();
			destinationPoints.setInfoTemplate();
			setTimeout(function(){
				//reset the extent ready for the animation
				destinationPoints.setOpacity(0);
				map.setExtent(startExtent);
				setTimeout(function(){
					//disable user interaction
					$("#replay").velocity('transition.fadeOut');
					home.hide();
					map.hideZoomSlider();
					map.disablePan();
					map.disableScrollWheelZoom();
					map.disableRubberBandZoom();
					setTimeout(function(){
						//start the animation
						$("#clock").velocity('transition.fadeIn');
						constructLines(destinationPoints);
					}, 1000); // redraw
				},500); // set extent
			},500); //point fadeout
		};//);

		map.on("load", function(){
			//disable user interaction and initialise 
			map.hideZoomSlider();
			map.disablePan();
			map.disableScrollWheelZoom();
			map.disableRubberBandZoom();
			map.disableDoubleClickZoom();
			$('span.esriAttributionList').append("<span> Data: EMPIRE | </span>");
			initFeatures();
		});

		//Animate a line given an svg object
		function drawLine(svg){	
			svg.style.strokeOpacity = '0.6';
			var length = svg.getTotalLength();
			// Clear any previous transition
			svg.style.transition = svg.style.WebkitTransition ='none';
			// Set up the starting positions
			svg.style.strokeDasharray = length + ' ' + length;
			svg.style.strokeDashoffset = length;
			// Trigger a layout so styles are calculated & the browser
			// picks up the starting position before animating
			svg.getBoundingClientRect();
			// Define our transition
			svg.style.transition = svg.style.WebkitTransition = 'stroke-dashoffset 2s ease-in-out';
			// Go!
			svg.style.strokeDashoffset = '0';
		}
	});

	//Google Analytics Stuff
