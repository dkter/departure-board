/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

const apikey = require('./apikey');
const keys = require('message_keys');
const { corrections } = require('./operator_corrections');
const { VehicleType, RouteShape, GColor } = require("./data");

const MAX_WATCH_DATA = 6;

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

function get_mins_to_hhmmss(datestr, timestr) {
    const now_date = new Date(Date.now());
    // apparently javascript cannot output or parse strings in anything
    // but UTC. timestr is going to be in the local timezone. so
    // adjust now_date so it outputs as local time when converted to UTC?
    now_date.setMinutes(now_date.getMinutes() - now_date.getTimezoneOffset());
    const future_iso_str = datestr + "T" + timestr + ".000Z";
    const future_timestamp = Date.parse(future_iso_str);
    const minutes = Math.round((future_timestamp - now_date) / 60000);
    return minutes;
}

function dep_to_watch_data(stop, departure) {
    let watch_data = {};
    watch_data[keys.time] = get_mins_to_hhmmss(departure.service_date, departure.departure_time);
    watch_data[keys.unit] = "min";
    watch_data[keys.stop_name] = stop.stop_name;
    watch_data[keys.dest_name] = departure.trip.trip_headsign;
    watch_data[keys.route_number] = departure.trip.route.route_short_name;
    watch_data[keys.route_name] = departure.trip.route.route_long_name;
    // https://gtfs.org/schedule/reference/#routestxt
    watch_data[keys.vehicle_type] = {
        0: VehicleType.STREETCAR,
        1: VehicleType.SUBWAY,
        2: VehicleType.REGIONAL_TRAIN,
        3: VehicleType.BUS,
        5: VehicleType.STREETCAR, // cable car
        6: VehicleType.STREETCAR, // gondola
        7: VehicleType.SUBWAY, // funicular
        11: VehicleType.BUS, // trolleybus
        12: VehicleType.SUBWAY, // monorail
    }[departure.trip.route.route_type];
    watch_data[keys.color] = rgb_to_pebble_colour(departure.trip.route.route_color);
    watch_data[keys.shape] = RouteShape.ROUNDRECT;

    if (corrections.hasOwnProperty(departure.trip.route.agency.agency_name)) {
        corrections[departure.trip.route.agency.agency_name](stop, departure, watch_data);
    }

    return watch_data;
}

function get_routes() {
    const send_to_watch = function(departures) {
        let index = 0;
        let combined_watch_data = {};
        for (const [stop, deps] of departures) {
            if (index == MAX_WATCH_DATA) {
                break;
            }
            // we only want one departure per route
            deps.reverse();
            const route_ids = deps.map(dep => dep.trip.route.id);
            const filtered_deps = deps.filter((dep, index) => !route_ids.includes(dep.trip.route.id, index + 1)).toReversed();

            for (const dep of filtered_deps) {
                if (index == MAX_WATCH_DATA) {
                    break;
                }
                const watch_data = dep_to_watch_data(stop, dep);
                combined_watch_data[keys.time + index] = watch_data[keys.time];
                combined_watch_data[keys.unit + index] = watch_data[keys.unit];
                combined_watch_data[keys.stop_name + index] = watch_data[keys.stop_name];
                combined_watch_data[keys.dest_name + index] = watch_data[keys.dest_name];
                combined_watch_data[keys.route_number + index] = watch_data[keys.route_number];
                combined_watch_data[keys.route_name + index] = watch_data[keys.route_name];
                combined_watch_data[keys.vehicle_type + index] = watch_data[keys.vehicle_type];
                combined_watch_data[keys.color + index] = watch_data[keys.color];
                combined_watch_data[keys.shape + index] = watch_data[keys.shape];
                index += 1;
            }
        }

        combined_watch_data[keys.num_routes] = index;

        Pebble.sendAppMessage(combined_watch_data, function() {
            console.log('Message sent successfully: ' + JSON.stringify(combined_watch_data));
        }, function(e) {
            console.log('Message failed: ' + JSON.stringify(e));
        });
    }

    const location_success = function(pos) {
        console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);

        let request = new XMLHttpRequest();

        request.onload = function() {
            let json = "";
            try {
                json = JSON.parse(this.responseText);
            } catch(err) {
                console.log('Error parsing JSON from stops request');
                return;
            }
            let departures = new Array(json.stops.length);
            for (const [index, stop] of json.stops.entries()) {
                let departures_request = new XMLHttpRequest();
                departures_request.onload = function() {
                    let departures_json = "";
                    try {
                        departures_json = JSON.parse(this.responseText);
                    }
                    catch (err) {
                        console.log('Error parsing JSON from departures request');
                        return;
                    }
                    departures[index] = [stop, departures_json.stops[0].departures];
                    if (departures.filter(e => e != undefined || e != null).length == json.stops.length) {
                        console.log(JSON.stringify(departures));
                        send_to_watch(departures);
                    }
                };
                let departures_url = new URL("https://transit.land/api/v2/rest/stops/" + stop.onestop_id + "/departures");
                departures_url.search = new URLSearchParams({
                    "apikey": apikey.TRANSITLAND_KEY,
                }).toString();
                departures_request.open("GET", departures_url);
                departures_request.send();
            }
        };
        let stops_endpoint_url = new URL("https://transit.land/api/v2/rest/stops");
        stops_endpoint_url.search = new URLSearchParams({
            "lat": pos.coords.latitude,
            "lon": pos.coords.longitude,
            "radius": 300,
            "apikey": apikey.TRANSITLAND_KEY,
        }).toString();
        request.open("GET", stops_endpoint_url);
        request.send();
    }

    const location_error = function(err) {
        if(err.code == err.PERMISSION_DENIED) {
            console.log('Location access was denied by the user.');  
        } else {
            console.log('location error (' + err.code + '): ' + err.message);
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
    get_routes();
});