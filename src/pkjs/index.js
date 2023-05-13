/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

const apikey = require('./apikey');
const keys = require('message_keys');
const { corrections } = require('./operator_corrections');
const { VehicleType, RouteShape, GColor, Error } = require("./data");

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

function get_mins_to_hhmmss(datestr, timestr) {
    const now_date = new Date(Date.now());
    // apparently javascript cannot output or parse strings in anything
    // but UTC. timestr is going to be in the local timezone. so
    // adjust now_date so it outputs as local time when converted to UTC?
    now_date.setMinutes(now_date.getMinutes() - now_date.getTimezoneOffset());
    // datestr doesn't seem reliable (on May 6 I was getting TTC routes with service_date set to May 13)
    // so... just assume the trip is in the next 24 hours idk
    const now_datestr = now_date.toISOString().split("T")[0];
    const future_iso_str = now_datestr + "T" + timestr + ".000Z";
    const future_timestamp = Date.parse(future_iso_str);
    if (future_timestamp < now_date) {
        future_timestamp.setDate(future_timestamp.getDate() + 1);
    }
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

function filter_departures(departures_by_stop) {
    let done_ids = new Set();
    let priority = [];
    let last = [];

    for (const [stop, deps] of departures_by_stop) {
        let done_ids_this_stop = new Set();
        for (const dep of deps) {
            if (done_ids_this_stop.has(dep.trip.route.id)) {
                continue;
            } else if (!done_ids.has(dep.trip.route.id)) {
                priority.push([stop, dep]);
                done_ids.add(dep.trip.route.id);
                done_ids_this_stop.add(dep.trip.route.id);
            } else {
                last.push([stop, dep]);
                done_ids_this_stop.add(dep.trip.route.id);
            }
        }
    }

    let total_list = priority.concat(last);
    return total_list;
}

function compare_distance_to_here_stops(lat, lon) {
    return function(stop1, stop2) {
        const stop1_lat = stop1.geometry.coordinates[1];
        const stop1_lon = stop1.geometry.coordinates[0];
        const stop2_lat = stop2.geometry.coordinates[1];
        const stop2_lon = stop2.geometry.coordinates[0];
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

function get_routes() {
    const send_to_watch = function(departures_by_stop) {
        let combined_watch_data = {};
        let filtered_deps = filter_departures(departures_by_stop);
        for (const [index, [stop, dep]] of filtered_deps.entries()) {
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
            combined_watch_data[keys.num_routes] = index + 1;
        }

        if (filtered_deps.length == 0) {
            send_error(Error.NO_RESULTS);
            return;
        }

        Pebble.sendAppMessage(combined_watch_data, function() {
            console.log('Message sent successfully: ' + JSON.stringify(combined_watch_data));
        }, function(e) {
            console.log('Message failed: ' + JSON.stringify(e));
            send_error(Error.COULD_NOT_SEND_MESSAGE);
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
                send_error(Error.UNKNOWN_API_ERROR);
                return;
            }
            if (json.message == 'Invalid authentication credentials') {
                send_error(Error.INVALID_API_KEY);
                return;
            }
            let sorted_stops = json.stops.toSorted(compare_distance_to_here_stops(pos.coords.latitude, pos.coords.longitude));
            let departures_by_stop = new Array(sorted_stops.length);
            for (const [index, stop] of sorted_stops.entries()) {
                let departures_request = new XMLHttpRequest();
                departures_request.onload = function() {
                    let departures_json = "";
                    try {
                        departures_json = JSON.parse(this.responseText);
                    }
                    catch (err) {
                        console.log('Error parsing JSON from departures request');
                        send_error(Error.UNKNOWN_API_ERROR);
                        return;
                    }
                    departures_by_stop[index] = [stop, departures_json.stops[0].departures];
                    if (departures_by_stop.filter(e => e != undefined || e != null).length == sorted_stops.length) {
                        send_to_watch(departures_by_stop);
                    }
                }; 
                departures_request.onerror = function() {
                    send_error(Error.NO_CONNECTION);
                }
                let departures_url = new URL("https://transit.land/api/v2/rest/stops/" + stop.onestop_id + "/departures");
                departures_url.search = new URLSearchParams({
                    "apikey": apikey.TRANSITLAND_KEY,
                }).toString();
                departures_request.open("GET", departures_url);
                departures_request.send();
            }
        };
        request.onerror = function() {
            send_error(Error.NO_CONNECTION);
        }
        let stops_endpoint_url = new URL("https://transit.land/api/v2/rest/stops");
        stops_endpoint_url.search = new URLSearchParams({
            "lat": pos.coords.latitude,
            "lon": pos.coords.longitude,
            "radius": SEARCH_RADIUS_M,
            "apikey": apikey.TRANSITLAND_KEY,
        }).toString();
        request.open("GET", stops_endpoint_url);
        request.send();
    }

    const location_error = function(err) {
        if(err.code == err.PERMISSION_DENIED) {
            console.log('Location access was denied by the user.');  
            send_error(Error.LOCATION_ACCESS_DENIED);
        } else {
            console.log('location error (' + err.code + '): ' + err.message);
            send_error(Error.UNKNOWN_LOCATION_ERROR);
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