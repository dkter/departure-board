/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

const apikey = require('./apikey');
const keys = require('message_keys');
const { corrections_transitland, corrections_transsee } = require('./operator_corrections');
const { VehicleType, RouteShape, GColor, Error, agencies_by_onestop_name } = require("./data");

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
    let future_timestamp = Date.parse(future_iso_str);
    if (future_timestamp < now_date) {
        future_timestamp = future_timestamp + 24*60*60*1000;
    }
    const minutes = Math.round((future_timestamp - now_date) / 60000);
    return minutes;
}

function get_departure_time(departure) {
    if (departure.departure.estimated != null) {
        return departure.departure.estimated;
    } else if (departure.departure_time != null) {
        return departure.departure_time;
    } else if (departure.arrival.estimated != null) {
        return departure.arrival.estimated;
    } else if (departure.arrival_time != null) {
        return departure.arrival_time;
    } else {
        console.log("Departure of " + departure.trip.route.route_long_name + " has no departure time");
        send_error(Error.UNKNOWN_API_ERROR);
        return null;
    }
}

function get_agency_from_stop(stop) {
    let agency = stop.feed_version.feed.onestop_id.split('-').pop();
    if (agencies_by_onestop_name.hasOwnProperty(agency)) {
        agency = agencies_by_onestop_name[agency];
    }
    return agency;
}

function dep_to_watch_data(stop, departure) {
    let watch_data = {};
    watch_data[keys.time] = get_mins_to_hhmmss(departure.service_date, get_departure_time(departure));
    watch_data[keys.unit] = "min";
    watch_data[keys.stop_name] = stop.stop_name;
    watch_data[keys.dest_name] = "to " + departure.trip.trip_headsign;
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

    if (corrections_transitland.hasOwnProperty(departure.trip.route.agency.agency_name)) {
        corrections_transitland[departure.trip.route.agency.agency_name](stop, departure, watch_data);
    }

    return watch_data;
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
    watch_data[keys.color] = rgb_to_pebble_colour(route.color);
    watch_data[keys.shape] = RouteShape.ROUNDRECT;

    if (corrections_transsee.hasOwnProperty(route.agencyTitle)) {
        corrections_transsee[route.agencyTitle](stop, route, direction, prediction, watch_data);
    }

    return watch_data;
}

function vehicle_already_departed(departure) {
    if (departure.departure.estimated_utc == null) {
        // transitland shouldn't return departures with scheduled times that already happened
        return false;
    }

    const estimated_deptime = Date.parse(departure.departure.estimated_utc);

    const now = Date.now();

    return (estimated_deptime < now);
}

function filter_departures(departures_by_stop) {
    let done_ids = new Set();
    let priority = [];
    let last = [];

    for (const [stop, deps] of departures_by_stop) {
        let done_ids_this_stop = new Set();
        for (const dep of deps) {
            const route_dest_id = dep.trip.route.id << 32 + dep.trip.stop_pattern_id;
            if (done_ids_this_stop.has(route_dest_id)) {
                continue;
            } else if (vehicle_already_departed(dep)) {
                // according to the estimate, this vehicle already departed
                console.log("Skipping " + dep.departure.estimated_utc);
                continue;
            } else if (!done_ids.has(route_dest_id)) {
                priority.push([stop, dep]);
                done_ids.add(route_dest_id);
                done_ids_this_stop.add(route_dest_id);
            } else {
                last.push([stop, dep]);
                done_ids_this_stop.add(route_dest_id);
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

async function get_stops(lat, lon, radius) {
    let stops_endpoint_url = new URL("https://transit.land/api/v2/rest/stops");
    stops_endpoint_url.search = new URLSearchParams({
        "lat": lat,
        "lon": lon,
        "radius": radius,
        "apikey": apikey.TRANSITLAND_KEY,
    }).toString();

    const response = await fetch(stops_endpoint_url).catch((e) => {
        send_error(Error.NO_CONNECTION);
        throw e;
    });
    const json = await response.json().catch((e) => {
        console.log('Error parsing JSON from stops request');
        send_error(Error.UNKNOWN_API_ERROR);
        throw e;
    });
    if (json.message == 'Invalid authentication credentials') {
        send_error(Error.INVALID_API_KEY);
        throw new Error(json.message);
    }

    return json.stops.toSorted(compare_distance_to_here_stops(lat, lon));
}

async function get_departures_transitland(stop) {
    let departures_url = new URL("https://transit.land/api/v2/rest/stops/" + stop.onestop_id + "/departures");
    departures_url.search = new URLSearchParams({
        "apikey": apikey.TRANSITLAND_KEY,
    }).toString();

    const response = await fetch(departures_url).catch((e) => {
        send_error(Error.NO_CONNECTION);
        throw e;
    });
    const json = await response.json().catch((e) => {
        console.log('Error parsing JSON from departures request');
        send_error(Error.UNKNOWN_API_ERROR);
        throw e;
    });
    if (json.message == 'Invalid authentication credentials') {
        send_error(Error.INVALID_API_KEY);
        throw new Error(json.message);
    }

    return json.stops[0].departures;
}

async function get_departures_transsee(stop) {
    if (!apikey.hasOwnProperty("TRANSSEE_USERID")) {
        throw new Error("TRANSSEE_USERID is not set");
    }

    const agency = get_agency_from_stop(stop);

    let departures_url = new URL("http://transsee.ca/publicJSONFeed");
    departures_url.search = new URLSearchParams({
        "command": "predictions",
        "premium": apikey.TRANSSEE_USERID,
        "a": agency,
        "stopId": stop.stop_code,
    });

    const response = await fetch(departures_url).catch((e) => {
        send_error(Error.NO_CONNECTION);
        throw e;
    });
    if (response.status == 500) {
        // sometimes this means invalid API key
        send_error(Error.INVALID_API_KEY);
        throw new Error(await response.body.getReader().read());
    }
    const json = await response.json().catch((e) => {
        console.log('Error parsing JSON from TransSee predictions request');
        send_error(Error.UNKNOWN_API_ERROR);
        throw e;
    });

    return json.predictions;
}

async function get_departures_for_watch_with_stops(stops) {
    let departures_by_index;
    try {
        departures_by_index = await Promise.all(stops.map(get_departures_transsee));
    } catch (e) {
        // no transsee API key; fall back on transitland
        departures_by_index = await Promise.all(stops.map(get_departures_transitland));
        const departures_by_stop = departures_by_index.map(
            (departures, index) => [stops[index], departures]);

        const filtered = filter_departures(departures_by_stop);
        return filtered.map(([stop, dep]) => dep_to_watch_data(stop, dep));
    }
    const departures_by_stop = departures_by_index.map(
        (departures, index) => [stops[index], departures]);

    let departures_for_watch = [];
    for ([stop, dep] of departures_by_stop) {
        for (route of dep) {
            if (!route.hasOwnProperty("direction")) continue;
            for (direction of route.direction) {
                if (!direction.hasOwnProperty("prediction")) continue;
                departures_for_watch.push(transsee_dep_to_watch_data(stop, route, direction.title, direction.prediction[0]));
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
    get_location_and_routes();
});

Pebble.addEventListener('appmessage', function(event) {
    // PebbleKit JS is ready!
    console.log('Refreshing');

    refresh_departures_for_watch().then(
            (departures_for_watch) => send_to_watch(departures_for_watch));
});