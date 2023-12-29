/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

const apikey = require('./apikey');
const keys = require('message_keys');
const corrections = require('./operator_corrections');
const { VehicleType, RouteShape, GColor, ErrorCode } = require("./data");

const MAX_WATCH_DATA = 12;
const SEARCH_RADIUS_M = 500;

function rgb_to_pebble_colour(hexstr) {
    // adapted from https://github.com/pebble-examples/cards-example/blob/master/tools/pebble_image_routines.py
    let r = parseInt(hexstr.substr(0, 2), 16);
    let g = parseInt(hexstr.substr(2, 2), 16);
    let b = parseInt(hexstr.substr(4, 2), 16);

    r = (r / 85) * 85;
    g = (g / 85) * 85;
    b = (b / 85) * 85;

    r >>= 6;
    g >>= 6;
    b >>= 6;
    argb8 = (0x3 << 6) | (r << 4) | (g << 2) | b;
    return argb8;
}

function transsee_dep_to_watch_data(stop, route, direction, prediction) {
    let watch_data = {};
    watch_data[keys.time] = parseInt(prediction.minutes);
    watch_data[keys.unit] = "min";
    watch_data[keys.stop_name] = stop.stop_name;
    watch_data[keys.dest_name] = direction;
    watch_data[keys.route_number] = route.routeTag;
    watch_data[keys.route_name] = route.routeTitle.replace(watch_data[keys.route_number] + "-", "");
    watch_data[keys.vehicle_type] = VehicleType.BUS;
    if (route.hasOwnProperty("color")) {
        watch_data[keys.color] = rgb_to_pebble_colour(route.color);
    } else {
        watch_data[keys.color] = GColor.GColorBlackARGB8;
    }
    watch_data[keys.shape] = RouteShape.ROUNDRECT;

    if (corrections.transsee.hasOwnProperty(route.agencyTitle)) {
        corrections.transsee[route.agencyTitle](stop, route, direction, prediction, watch_data);
    }

    return watch_data;
}

function compare_distance_to_here_stops(lat, lon) {
    return function(stop1, stop2) {
        const stop1_lat = stop1.stop_lat;
        const stop1_lon = stop1.stop_lon;
        const stop2_lat = stop2.stop_lat;
        const stop2_lon = stop2.stop_lon;
        const dist1 = Math.sqrt(
            Math.pow(stop1_lat - lat, 2) + Math.pow(stop1_lon - lon, 2)
        );
        const dist2 = Math.sqrt(
            Math.pow(stop2_lat - lat, 2) + Math.pow(stop2_lon - lon, 2)
        );
        if (dist1 > dist2) {
            return 1;
        } else if (dist1 < dist2) {
            return -1;
        } else {
            return 0;
        }
    }
}

function send_error(error) {
    Pebble.sendAppMessage({"num_routes": error}, function() {
        console.log('Error message sent successfully');
    }, function(e) {
        console.log('Error message failed: ' + JSON.stringify(e));
    });
}

function send_to_watch(departures_for_watch) {
    let combined_watch_data = {};
    for (const [index, watch_data] of departures_for_watch.entries()) {
        if (index == MAX_WATCH_DATA) {
            break;
        }
        combined_watch_data[keys.time + index] = watch_data[keys.time];
        combined_watch_data[keys.unit + index] = watch_data[keys.unit];
        combined_watch_data[keys.stop_name + index] = watch_data[keys.stop_name];
        combined_watch_data[keys.dest_name + index] = watch_data[keys.dest_name];
        combined_watch_data[keys.route_number + index] = watch_data[keys.route_number];
        combined_watch_data[keys.route_name + index] = watch_data[keys.route_name];
        combined_watch_data[keys.vehicle_type + index] = watch_data[keys.vehicle_type];
        combined_watch_data[keys.color + index] = watch_data[keys.color];
        combined_watch_data[keys.shape + index] = watch_data[keys.shape];
        combined_watch_data[keys.num_routes] = index + 1;
    }

    if (departures_for_watch.length == 0) {
        send_error(ErrorCode.NO_RESULTS);
        return;
    }

    Pebble.sendAppMessage(combined_watch_data, function() {
        console.log('Message sent successfully: ' + JSON.stringify(combined_watch_data));
    }, function(e) {
        console.log('Message failed: ' + JSON.stringify(e));
        send_error(ErrorCode.COULD_NOT_SEND_MESSAGE);
    });
}

async function get_stops(lat, lon, radius) {
    let stops_endpoint_url = new URL("https://stops.david.industries/api/find");
    stops_endpoint_url.search = new URLSearchParams({
        "lat": lat,
        "lon": lon,
        "limit": 12,
    }).toString();

    const response = await fetch(stops_endpoint_url).catch((e) => {
        send_error(ErrorCode.NO_CONNECTION);
        throw e;
    });
    const json = await response.json().catch((e) => {
        console.log('Error parsing JSON from stops request');
        send_error(ErrorCode.UNKNOWN_API_ERROR);
        throw e;
    });

    return json.toSorted(compare_distance_to_here_stops(lat, lon)).slice(0, 9);
}

async function get_departures_transsee(stop) {
    if (!apikey.hasOwnProperty("TRANSSEE_USERID")) {
        throw new Error("TRANSSEE_USERID is not set");
    }

    let departures_url = new URL("http://transsee.ca/publicJSONFeed");
    if (corrections.stop_tag.hasOwnProperty(stop.agency)) {
        const stop_params = corrections.stop_tag[stop.agency](stop);
        let params = new URLSearchParams({
            "command": "predictionsForMultiStops",
            "premium": apikey.TRANSSEE_USERID,
            "a": stop.agency,
        });
        for (stop_param of stop_params) {
            params.append("stops", stop_param);
        }
        departures_url.search = params;
    } else {
        departures_url.search = new URLSearchParams({
            "command": "predictions",
            "premium": apikey.TRANSSEE_USERID,
            "a": stop.agency,
            "stopId": stop.stop_code,
        });
    }

    const response = await fetch(departures_url).catch((e) => {
        send_error(ErrorCode.NO_CONNECTION);
        throw e;
    });
    if (response.status == 500) {
        // sometimes this means invalid API key
        send_error(ErrorCode.UNKNOWN_API_ERROR);
        const text = await response.text();
        console.log(text);
        throw new Error(text);
    }
    const json = await response.json().catch((e) => {
        console.log('Error parsing JSON from TransSee predictions request');
        send_error(ErrorCode.UNKNOWN_API_ERROR);
        throw e;
    });

    return json.predictions;
}

async function get_departures_for_watch_with_stops(stops) {
    console.log("Obtaining departures for the following stops: " + JSON.stringify(stops));
    const transsee_departures_by_index = await Promise.all(stops.map(get_departures_transsee));
    const transsee_departures_by_stop = transsee_departures_by_index.map(
        (departures, index) => [stops[index], departures]);

    let departures_for_watch = [];
    for ([stop, dep] of transsee_departures_by_stop) {
        for (route of dep) {
            if (!route.hasOwnProperty("direction")) continue;
            for (direction of route.direction) {
                if (direction.title == "") {
                    // I think it's safe to ignore this case? if not I will make it a special case for GO transit
                    // not sure what this means for GO but I keep seeing it. arrival at union maybe?
                    continue;
                }
                else if (direction.title.toLowerCase() == stop.stop_name.toLowerCase()) {
                    // this vehicle's final destination is this stop, so we don't need to show it
                    continue;
                }
                if (!direction.hasOwnProperty("prediction")) continue;
                try {
                    departures_for_watch.push(transsee_dep_to_watch_data(stop, route, direction.title, direction.prediction[0]));
                } catch (e) {
                    console.log("Failed to serialize route to watch data: " + JSON.stringify(route));
                    throw e;
                }
            }
        }
    }
    return departures_for_watch;
}

async function get_departures_for_watch(lat, lon, radius) {
    const stops = await get_stops(lat, lon, radius);
    // store for later
    localStorage.setItem("stops", JSON.stringify(stops));

    return await get_departures_for_watch_with_stops(stops);
}

async function refresh_departures_for_watch() {
    const stops = JSON.parse(localStorage.getItem("stops"));

    return await get_departures_for_watch_with_stops(stops);
}

function get_location_and_routes() {
    const location_success = function(pos) {
        console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);

        get_departures_for_watch(pos.coords.latitude, pos.coords.longitude, SEARCH_RADIUS_M).then(
            (departures_for_watch) => send_to_watch(departures_for_watch));
    }

    const location_error = function(err) {
        if(err.code == err.PERMISSION_DENIED) {
            console.log('Location access was denied by the user.');  
            send_error(ErrorCode.LOCATION_ACCESS_DENIED);
        } else {
            console.log('location error (' + err.code + '): ' + err.message);
            send_error(ErrorCode.UNKNOWN_LOCATION_ERROR);
        }
    }

    // Choose options about the data returned
    var options = {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000
    };

    // Request current position
    navigator.geolocation.getCurrentPosition(location_success, location_error, options);
}

Pebble.addEventListener('ready', function() {
    // PebbleKit JS is ready!
    console.log('PebbleKit JS ready!');
    get_location_and_routes();
});

Pebble.addEventListener('appmessage', function(event) {
    // PebbleKit JS is ready!
    console.log('Refreshing');

    refresh_departures_for_watch().then(
            (departures_for_watch) => send_to_watch(departures_for_watch));
});