var API_KEY = "AIzaSyBiUK4rtu18Yi4gSpOgbdgKF7uhL9K7npQ";
$(document).ready(function ()
{
	var initGoogleMaps = function(cb){
		var url = "https://maps.googleapis.com/maps/api/js?libraries=drawing,places&key=" + API_KEY + "&language=en";
		$.ajax({
			url: url,
			jsonp: "callback",
			dataType: "jsonp",
			success: cb
		});
	};
	var onMapReady = function(){

	  var isDrawing = false;
	  var isDrawing2 = false;
	  var isDrawing3 = false;
	  var isDrawing4 = false;
	  var isDrawing5 = false;
	  var isDrawing5_2 = false; // after add at least 1 stop
	  var $status = $("#status");
	  var stops = [];
	  var markers = [];
	  var savedRoute;
    var drawingManager;
    var polylines = [];


    function disableAll() {
      $("#start_draw").addClass("disabled");
      $("#start_draw2").addClass("disabled");
      $("#start_draw3").addClass("disabled");
      $("#start_draw4").addClass("disabled");
      $("#start_draw5").addClass("disabled");
      $("#end_draw").addClass("disabled");
      $("#end_draw2").addClass("disabled");
      $("#end_draw3").addClass("disabled");
      $("#end_draw4").addClass("disabled");
      $("#end_draw5").addClass("disabled");
    }
	  function enableStart() {
      $("#start_draw").removeClass("disabled");
      $("#start_draw2").removeClass("disabled");
      $("#start_draw3").removeClass("disabled");
      $("#start_draw4").removeClass("disabled");
      $("#start_draw5").removeClass("disabled");
    }
	  function addSearchBox() {
	    // NOTE: I added "?libraries=drawing,places" for the search and the draw line!

      // Adds a Places search box. Searching for a place will center the map on that
      // location.
      map.controls[google.maps.ControlPosition.RIGHT_TOP].push(
        document.getElementById('bar'));
      var autocomplete = new google.maps.places.Autocomplete(
        document.getElementById('autoc'));
      autocomplete.bindTo('bounds', map);
      autocomplete.addListener('place_changed', function() {
        var place = autocomplete.getPlace();
        if (!place.geometry)
          return;
        // remove the "false" if u want to use the viewport:
        if (false && place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          var zoom = +$("#zoom").val() || 17;
          map.setZoom(zoom);
        }
      });
	  }
    function clearMarkers() {
      markers.map(function(marker){
        marker.setMap(null);
      });
      directionsDisplayTemp.setMap(null);
      directionsDisplay.setMap(null);
      directionsDisplayArr.map(function(_directionsDisplay){
        _directionsDisplay.setMap(null);
      });
      directionsDisplayArr = [];
      markers = [];
      stops = [];
      isDrawing = false;
      isDrawing2 = false;
      isDrawing3 = false;
      isDrawing4 = false;
      isDrawing5 = false;
      isDrawing5_2 = false;
      disableAll();
      enableStart();
      for (var i = 0; i < polylines.length; ++i) {
        polylines[i].setMap(null);
      }
      polylines = [];
      if (drawingManager)
        drawingManager.setMap(null);
    }
    function loadMasterTable() {
      window.addStopFunc = function (e) {
        var i = +$(e).attr("data-i");
        // remove old marker:
        markers[i].setMap(null);

        stop = MASTER_TABLE[i];
        var pos = {
          lat: stop.lat,
          lng: stop.long
        };

        // update route:
        addStopToRoute(pos);

        //crete new marker:
        var marker = new google.maps.Marker({
          position: pos,
          icon: "assets/dot green.png",
          title: stop.name,
          // id: stop.id,
          map: map
        });
        var stopIndex = stops.length - 1;
        // for real custom popup, with buttons, etc.:
        // https://developers.google.com/maps/documentation/javascript/examples/overlay-popup
        var contentString = '<div id="content" class="tooltip-class">'+
          '<div class="aaa">Part of the route</div>'+
          '<h1>' + stop.name + '</h1>'+
          '<button data-i="' + i + '" onclick="removeStopFunc(this)">Remove</button>' +
          '</div>';
        var infowindow = new google.maps.InfoWindow({
          content: contentString
        });
        marker.addListener('click', function() {
          infowindow.open(map, marker);
        });
        markers[i] = marker;
      };
      window.removeStopFunc = function (e) {
        var i = +$(e).attr("data-i");

        // remove old marker:
        markers[i].setMap(null);

        var stop = MASTER_TABLE[i];
        var pos = {
          lat: stop.lat,
          lng: stop.long
        };

        // update route:
        removeStopfromRoute(pos);

        //crete new marker:
        var marker = addMasterTableStopMarker(stop, i);
        markers[i] = marker;
      };
      function addMasterTableStopMarker(stop, i){
        var pos = {
          lat: stop.lat,
          lng: stop.long
        };
        var marker = new google.maps.Marker({
          position: pos,
          icon: "assets/dot.png",
          title: stop.name,
          // id: stop.id,
          map: map
        });
        // for real custom popup, with buttons, etc.:
        // https://developers.google.com/maps/documentation/javascript/examples/overlay-popup
        var contentString = '<div id="content" class="tooltip-class">'+
          '<div class="aaa">'+
          '</div>'+
          '<h1>' + stop.name + '</h1>'+
          '<button data-i="' + i + '" onclick="addStopFunc(this)">Add</button>' +
          '</div>';
        var infowindow = new google.maps.InfoWindow({
          content: contentString
        });
        marker.addListener('click', function() {
          infowindow.open(map, marker);
        });
        return marker;
      }
      markers = MASTER_TABLE.map(addMasterTableStopMarker);
    }
    function startDraw3() {
      // Enables the polyline drawing control. Click on the map to start drawing a
      // polyline. Each click will add a new vertice. Double-click to stop drawing.
      drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYLINE,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [
            google.maps.drawing.OverlayType.POLYLINE
          ]
        },
        polylineOptions: {
          strokeColor: '#696969',
          strokeWeight: 2
        }
      });
      drawingManager.setMap(map);

      // Snap-to-road when the polyline is completed.
      drawingManager.addListener('polylinecomplete', function(poly) {
        var path = poly.getPath();
        polylines.push(poly);
        var pathValues = [];
        for (var i = 0; i < path.getLength(); i++) {
          pathValues.push(path.getAt(i).toUrlValue());
        }
        var pathValue = pathValues.join('|');
        runSnapToRoad(pathValue);
      });

    }
    function startDraw4() {
      // Enables the polyline drawing control. Click on the map to start drawing a
      // polyline. Each click will add a new vertice. Double-click to stop drawing.
      drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYLINE,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: [
            google.maps.drawing.OverlayType.POLYLINE
          ]
        },
        polylineOptions: {
          strokeColor: 'red',
          strokeWeight: 1
        }
      });
      drawingManager.setMap(map);

      // find new routes when the polyline is completed, and snap-to-road for the new routes
      drawingManager.addListener('polylinecomplete', function(poly) {
        // clear existing routes:
        directionsDisplayArr.map(function(_directionsDisplay){
          _directionsDisplay.setMap(null);
        });
        directionsDisplayArr = [];

        var path = poly.getPath();
        polylines.push(poly);
        var segments = [];
        for (var i = 0; i < path.getLength() - 1; i++) {
          segments.push({origin: path.getAt(i), destination: path.getAt(i + 1)});
        }
        segments.map(function(segment){
          directionsService.route({
            origin: segment.origin,
            destination: segment.destination,
            // optimizeWaypoints: !true,
            travelMode: 'DRIVING'
          }, function(response, status) {
            if (status === 'OK') {
              var _directionsDisplay = new google.maps.DirectionsRenderer({
                // draggable: true,
                polylineOptions: {
                  geodesic: true,
                  strokeColor: '#33c8c2',
                  strokeOpacity: 0.35,
                  strokeWeight: 8
                }//, suppressMarkers: true
              });
              directionsDisplayArr.push(_directionsDisplay);
              _directionsDisplay.setMap(map);
              _directionsDisplay.setDirections(response);
              addStopsToRoute(response);

            } else {
              $status.text('Directions request failed due to ' + status);
              console.log('Directions request failed due to ' + status);
            }
          });
        });
      });
    }

    // get directionsService response, and search for stops on it, and add 'em
    function addStopsToRoute(response) {
      var route = response.routes[0];
      // find the path:
      for (var i = 0; i < route.legs.length; i++) {

        var steps = route.legs[i].steps.map(function(s){
          return s.path.map(function(p){
            return p.lat() + ',' + p.lng();
          });
        });
        steps = _.flatten(steps);
        var pathValue = steps.join("|");
        runSnapToRoad(pathValue);
      }
    }

    // Snap a user-created polyline to roads and draw the snapped path
    function runSnapToRoad(pathValue) {
      $.get('https://roads.googleapis.com/v1/snapToRoads', {
        interpolate: true,
        key: API_KEY,
        path: pathValue
      }, function(data) {
        var html = "";
        data.snappedPoints.map(function (p) {
          html += p.placeId + "<br>";
          html += p.location.latitude + "," + p.location.longitude + "<br><br>";
          var stop = _.find(MASTER_TABLE, function (s){
            return p.placeId === s.placeId;
          });
          if (stop) {
            var pos = {
              lat: stop.lat,
              lng: stop.long
            };
            //crete new marker:
            var marker = new google.maps.Marker({
              position: pos,
              icon: "assets/dot green.png",
              title: stop.name,
              map: map
            });
            var contentString = '<div id="content" class="tooltip-class">'+
              '<h1>' + stop.name + '</h1>'+
              '</div>';
            var infowindow = new google.maps.InfoWindow({
              content: contentString
            });
            marker.addListener('click', function() {
              infowindow.open(map, marker);
            });
            markers.push(marker);

          }
        });
        $status.html(html);

        console.log(data);
      });
    }
    $("#remove_all_markers").click(clearMarkers);
    $("#start_draw").click(function(){
      clearMarkers();
      disableAll();
      $("#end_draw").removeClass("disabled");
      isDrawing = true;
      $status.text("Click on the map to add stops to the route");
    });
    $("#end_draw").click(function(){
      disableAll();
      enableStart();
      isDrawing = false;
      $status.text("Route done. stops count = " + stops.length);
    });
    $("#start_draw2").click(function(){
      clearMarkers();
      disableAll();
      $("#end_draw2").removeClass("disabled");
      loadMasterTable();
      isDrawing2 = true;
      $status.text("Click on the stop to add stops to the route");
    });
    $("#end_draw2").click(function(){
      disableAll();
      enableStart();
      isDrawing2 = false;
      $status.text("Route done. stops count = " + stops.length);
    });
    $("#start_draw3").click(function(){
      clearMarkers();
      disableAll();
      $("#end_draw3").removeClass("disabled");
      startDraw3();
      isDrawing3 = true;
      $status.text("Click on the map to draw the route");
    });
    $("#end_draw3").click(function(){
      disableAll();
      enableStart();
      isDrawing3 = false;
      clearMarkers();
    });
    $("#start_draw4").click(function(){
      clearMarkers();
      disableAll();
      $("#end_draw4").removeClass("disabled");
      startDraw4();
      isDrawing4 = true;
      $status.text("Click on the map to draw the route");
    });
    $("#end_draw4").click(function(){
      disableAll();
      enableStart();
      isDrawing4 = false;
      clearMarkers();
    });
    $("#start_draw5").click(function(){
      clearMarkers();
      disableAll();
      $("#end_draw5").removeClass("disabled");
      isDrawing5 = true;
      $status.text("Click on the map to draw the route");
    });
    $("#end_draw5").click(function(){
      disableAll();
      enableStart();
      isDrawing5 = false;
      isDrawing5_2 = false;
      clearMarkers();
    });
    $("#save_route").click(function(){
      savedRoute = directionsDisplay.getDirections();
      $status.text("Route saved");
    });
    $("#load_route").click(function(){
      if (savedRoute) {
        directionsDisplay.setMap(map);
        directionsDisplay.setDirections(savedRoute);
      } else {
        $status.text("There is no saved route...");
      }
    });
    $("#import").click(function(){
      $("#import").addClass("disabled");
      var max = MASTER_TABLE2.length;
      MASTER_TABLE = [];
      function loadStop () {
        var stop = MASTER_TABLE2.pop();
        if (!stop){
          $status.html("DONE!");
          return;
        }
        var pathValue = stop.lat + "," + stop.long;
        $.get('https://roads.googleapis.com/v1/snapToRoads', {
          interpolate: true,
          key: API_KEY,
          path: pathValue
        }, function(data) {
          stop.placeId = data.snappedPoints[0].placeId;
          MASTER_TABLE.push(stop);
          $status.html(MASTER_TABLE.length + " / " + max);
          console.log(data);
          loadStop();
        });
      }
      loadStop();
    });

    var directionsService = new google.maps.DirectionsService;
    var directionsDisplayArr = [];
    var directionsDisplay = new google.maps.DirectionsRenderer({
      draggable: true,
      polylineOptions: {
        geodesic: true,
        strokeColor: '#33c8c2',
        strokeOpacity: 0.35,
        strokeWeight: 8
      }, suppressMarkers: true
    });
    var directionsDisplayTemp = new google.maps.DirectionsRenderer({
      preserveViewport: true,
      // draggable: true,
      polylineOptions: {
        geodesic: true,
        strokeColor: '#33c8c2',
        strokeOpacity: 0.2,
        strokeWeight: 6
      }, suppressMarkers: true
    });
    directionsDisplay.addListener('directions_changed', function() {
      $status.text("Route Changed!");
    });
    var center = {lat: 32.052810, lng: 34.848917};
    var map = new google.maps.Map(document.getElementById('map'), {
      zoom: 13,
      center: center,
      styles: STYLE
    });

    google.maps.event.addListener(map, 'click', function(event) {
      if (isDrawing || isDrawing5) {
        directionsDisplayTemp.setMap(null);
        isDrawing5_2 = true;
        placeMarker(event.latLng, isDrawing5);
      }
      else
        $status.text("You are not in drawing mode of PoC 1 or 5...");
    });
    var debounceCounter = 0
    google.maps.event.addListener(map, 'mousemove', function(event) {
      if (!isDrawing5)
        return;
      if (!isDrawing5_2)
        return;
      debounceCounter++;
      var _debounceCounter = debounceCounter;
      setTimeout(function(){
        if (_debounceCounter < debounceCounter)
          return;
        directionsService.route({
          origin: stops[stops.length - 1],
          destination: event.latLng,
          // waypoints: [],
          // optimizeWaypoints: !true,
          travelMode: 'DRIVING'
        }, function(response, status) {
          if (_debounceCounter < debounceCounter)
            return;
          if (status === 'OK') {
            directionsDisplayTemp.setMap(map);
            directionsDisplayTemp.setDirections(response);
          } else {
            $status.text('Directions request failed due to ' + status);
            console.log('Directions request failed due to ' + status);
          }
        });
      }, 100);

    });
    addSearchBox();

    function placeMarker(location, isPoc5) {
      var draggable = !isPoc5;
      var icon = isPoc5 ? "assets/dot.png" : "assets/dot green.png";
      var marker = new google.maps.Marker({
        position: location,
        icon: icon,
        draggable: draggable,
        map: map
      });
      var index = markers.length; // index for stops array
      markers.push(marker);
      addStopToRoute(location, isPoc5);
      if (draggable) {
        google.maps.event.addListener(marker, 'dragend', function (event) {
          stops[index] = event.latLng;
          // location.lat = event.latLng.lat();
          // location.long = event.latLng.lng();
          recalcRouteFromStops();
        });
      }
    }

    function recalcRouteFromStops(searchForStops) {
      if (stops.length > 1)
        calculateAndDisplayRoute(directionsService, directionsDisplay, searchForStops);
      else
        directionsDisplay.setMap(null); // delete route
    }
    function addStopToRoute(location, searchForStops) {
      stops.push(location);
      recalcRouteFromStops(searchForStops);
    }

    function removeStopfromRoute(location) {
      var index = _.findIndex(stops, function (s) {
        return _.isEqual(s, location);
      });
      stops.splice(index, 1);
      recalcRouteFromStops();
    }

    function calculateAndDisplayRoute(directionsService, directionsDisplay, searchForStops) {
      var waypts = [];
      for (var i = 1; i < stops.length - 1; i++) {
        waypts.push({
          location: stops[i],
          stopover: true
        });
      }

      directionsService.route({
        origin: stops[0],
        destination: stops[stops.length - 1],
        waypoints: waypts,
        optimizeWaypoints: !true,
        travelMode: 'DRIVING'
      }, function(response, status) {
        if (status === 'OK') {
          directionsDisplay.setMap(map);
          directionsDisplay.setDirections(response);
          if (searchForStops)
            addStopsToRoute(response);
          else {
            var route = response.routes[0];
            var html = '';
            // For each route, display summary information.
            for (var i = 0; i < route.legs.length; i++) {
              var routeSegment = i + 1;
              html += '<b>Route Segment: ' + routeSegment +
                '</b><br>';
              html += route.legs[i].start_address + ' to ';
              html += route.legs[i].end_address + '<br>';
              html += route.legs[i].distance.text + '<br><br>';
              html += 'PATH:<br>';
              var steps = route.legs[i].steps.map(function (s) {
                return s.path.map(function (p) {
                  return p.lat() + ',' + p.lng();
                });
              });
              steps = _.flatten(steps);
              html += steps.join("|") + '<br><br>';
            }
            $status.html(html);
          }
        } else {
          $status.text('Directions request failed due to ' + status);
        }
      });
    }
	};
	initGoogleMaps(onMapReady);
});

// var addStopFunc;
