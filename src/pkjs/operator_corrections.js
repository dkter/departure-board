const { VehicleType, RouteShape, GColor } = require("./data");
const keys = require('message_keys');

exports.corrections = {
    "TTC": function(json_stop, json_departure, watch_data) {
        watch_data[keys.dest_name] = json_departure.trip.trip_headsign.split(" towards ")[1];

        // make the stop name a little shorter
        watch_data[keys.stop_name] = watch_data[keys.stop_name].replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)? at /g, " / ")
            .replaceAll(/ (St|Av|Ave|Dr|Rd)( East| West)?$/g, "");

        let route_number = json_departure.trip.route.route_short_name;
        if (route_number == 1) {
            // watch_data[keys.vehicle_type] = VehicleType.SUBWAY;
            watch_data[keys.route_shape] = RouteShape.CIRCLE;
            watch_data[keys.color] = GColor.GColorYellowARGB8;
        }
        else if (route_number == 2) {
            // watch_data[keys.vehicle_type] = VehicleType.SUBWAY;
            watch_data[keys.route_shape] = RouteShape.CIRCLE;
            watch_data[keys.color] = GColor.GColorGreenARGB8;
        }
        else if (route_number == 3) {
            // watch_data[keys.vehicle_type] = VehicleType.SUBWAY;
            watch_data[keys.route_shape] = RouteShape.CIRCLE;
            watch_data[keys.color] = GColor.GColorBlueARGB8;
        }
        else if (route_number == 4) {
            // watch_data[keys.vehicle_type] = VehicleType.SUBWAY;
            watch_data[keys.route_shape] = RouteShape.CIRCLE;
            watch_data[keys.color] = GColor.GColorPurpleARGB8;
        }
        else if (route_number == 5) {
            // watch_data[keys.vehicle_type] = VehicleType.STREETCAR;
            watch_data[keys.route_shape] = RouteShape.CIRCLE;
            watch_data[keys.color] = GColor.GColorOrangeARGB8;
        }
        else if (route_number == 6) {
            // watch_data[keys.vehicle_type] = VehicleType.STREETCAR;
            watch_data[keys.route_shape] = RouteShape.CIRCLE;
            watch_data[keys.color] = GColor.GColorDarkGrayARGB8;
        }
        else if (500 <= route_number <= 599) {
            // watch_data[keys.vehicle_type] = VehicleType.STREETCAR;
            watch_data[keys.route_shape] = RouteShape.ROUNDRECT;
            watch_data[keys.color] = GColor.GColorRedARGB8;
        }
        else if (900 <= route_number <= 999) {
            // watch_data[keys.vehicle_type] = VehicleType.BUS;
            watch_data[keys.route_shape] = RouteShape.ROUNDRECT;
            watch_data[keys.color] = GColor.GColorGreenARGB8;
        }
        else if (400 <= route_number <= 499) {
            // watch_data[keys.vehicle_type] = VehicleType.BUS;
            watch_data[keys.route_shape] = RouteShape.ROUNDRECT;
            watch_data[keys.color] = GColor.GColorLightGrayARGB8;
        }
        else if (300 <= route_number <= 399) {
            // watch_data[keys.vehicle_type] = VehicleType.BUS;
            watch_data[keys.route_shape] = RouteShape.ROUNDRECT;
            watch_data[keys.color] = GColor.GColorLightGrayARGB8;
        }
        else {
            // watch_data[keys.vehicle_type] = VehicleType.BUS;
            watch_data[keys.route_shape] = RouteShape.ROUNDRECT;
            watch_data[keys.color] = GColor.GColorRedARGB8;
        }
    }
}