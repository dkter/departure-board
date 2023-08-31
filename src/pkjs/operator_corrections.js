/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

const { VehicleType, RouteShape, GColor } = require("./data");
const { titleCaps } = require("./title_caps");
const keys = require('message_keys');

exports.corrections_transitland = {
    "TTC": function(json_stop, json_departure, watch_data) {
        watch_data[keys.dest_name] = json_departure.trip.trip_headsign.split(" towards ")[1];

        // make the stop name a little shorter
        watch_data[keys.stop_name] = watch_data[keys.stop_name].replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)? at /g, " / ")
            .replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)?$/g, "");

        watch_data[keys.route_name] = watch_data[keys.route_name].replace(/LINE \d \((.+)\)/, "$1");

        // TTC data has these in all caps which is annoying
        watch_data[keys.route_name] = titleCaps(watch_data[keys.route_name].toLowerCase());
        watch_data[keys.dest_name] = "to " + titleCaps(watch_data[keys.dest_name].toLowerCase());

        let route_number = parseInt(json_departure.trip.route.route_short_name);
        if (1 <= route_number && route_number <= 6) {
            watch_data[keys.shape] = RouteShape.CIRCLE;
        }
    },
    "GO Transit": function(json_stop, json_departure, watch_data) {
        watch_data[keys.dest_name] = watch_data[keys.dest_name].replace(watch_data[keys.route_number] + " - ", "")
        watch_data[keys.shape] = RouteShape.RECT;
    },
    "grt": function(json_stop, json_departure, watch_data) {
        // iXpress is yellow
        let route_number = parseInt(json_departure.trip.route.route_short_name);
        if (200 <= route_number && route_number <= 299) {
            watch_data[keys.color] = GColor.GColorLimerickARGB8;
        }

        // ION is blue
        if (300 <= route_number && route_number <= 399) {
            watch_data[keys.color] = GColor.GColorBlueARGB8;
        }
    }
}

exports.corrections_transsee = {
    "Toronto TTC": function(stop, route, direction, prediction, watch_data) {
        const route_number = parseInt(route.routeTag);
        if (1 <= route_number && route_number <= 6) {
            watch_data[keys.shape] = RouteShape.CIRCLE;
            watch_data[keys.vehicle_type] = VehicleType.SUBWAY;
        }
        if (["501", "502", "503", "504", "504A", "504B", "505", "506",
            "507", "508", "509", "510", "511", "512", "513", "514",
            "301", "304", "306", "310"].includes(route.routeTag)) {
            watch_data[keys.vehicle_type] = VehicleType.STREETCAR;
        }

        // not sure how to fix something like this other than making a special case for everything
        if (prediction.dirTag.split("_")[2] == "506Cbus") {
            watch_data[keys.route_number] = "506C";
            watch_data[keys.vehicle_type] = VehicleType.BUS;
        }

        // make the stop name a little shorter
        watch_data[keys.stop_name] = watch_data[keys.stop_name].replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)? at /g, " / ")
            .replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)?$/g, "");

        watch_data[keys.route_name] = watch_data[keys.route_name].replace(/LINE \d \((.+)\)/, "$1");
    },
    "GO Transit": function(stop, route, direction, prediction, watch_data) {
        watch_data[keys.shape] = RouteShape.RECT;
    },
    "Kitchener-Waterloo GRT": function(stop, route, direction, prediction, watch_data) {
        if (route.routeTag == "301") {
            watch_data[keys.vehicle_type] = VehicleType.STREETCAR;
        }
    }
}