const { VehicleType, RouteShape, GColor } = require("./data");
const { titleCaps } = require("./title_caps");
const keys = require('message_keys');

exports.corrections = {
    "TTC": function(json_stop, json_departure, watch_data) {
        watch_data[keys.dest_name] = json_departure.trip.trip_headsign.split(" towards ")[1];

        // make the stop name a little shorter
        watch_data[keys.stop_name] = watch_data[keys.stop_name].replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)? at /g, " / ")
            .replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)?$/g, "");

        watch_data[keys.route_name] = watch_data[keys.route_name].replace(/LINE \d \((.+)\)/, "$1");

        // TTC data has these in all caps which is annoying
        watch_data[keys.route_name] = titleCaps(watch_data[keys.route_name].toLowerCase());
        watch_data[keys.dest_name] = titleCaps(watch_data[keys.dest_name].toLowerCase());

        let route_number = parseInt(json_departure.trip.route.route_short_name);
        if (1 <= route_number && route_number <= 6) {
            watch_data[keys.shape] = RouteShape.CIRCLE;
        }
    },
    "GO Transit": function(json_stop, json_departure, watch_data) {
        watch_data[keys.dest_name] = watch_data[keys.dest_name].replace(watch_data[keys.route_number] + " - ", "")
        watch_data[keys.shape] = RouteShape.RECT;
    }
}