/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

const { VehicleType, RouteShape, GColor } = require("./data");
const { titleCaps } = require("./title_caps");
const keys = require('message_keys');

const TTC_SUBWAY_STATIONS = new Set(['14111', '13789', '13860', '13792', '13793', '13795', '13798', '13799', '13802', '13803', '13864', '13806', '13807', '13810', '13811', '13814', '13815', '13817', '13820', '13821', '13824', '13825', '13858', '13853', '13828', '13829', '13832', '13833', '13836', '13837', '13840', '14945', '15664', '15659', '15666', '15656', '15661', '15662', '15663', '15660', '15657', '15667', '15658', '15665', '14110', '13839', '13838', '13835', '13834', '13831', '13830', '13827', '13854', '13857', '13826', '13823', '13822', '13819', '13818', '13816', '13813', '13812', '13809', '13808', '13805', '13863', '13804', '13801', '13800', '13797', '13796', '13794', '13791', '13859', '13790', '14944', '13785', '13784', '13781', '13780', '13777', '13776', '13773', '13772', '13769', '13768', '13765', '13764', '13761', '13760', '13852', '13856', '13757', '13756', '13753', '13752', '13749', '13748', '13746', '13743', '13742', '13739', '13738', '13735', '13734', '13732', '14947', '13865', '13731', '13733', '13736', '13737', '13740', '13741', '13744', '13745', '13747', '13750', '13751', '13754', '13755', '13758', '13855', '13851', '13759', '13762', '13763', '13766', '13767', '13770', '13771', '13774', '13775', '13778', '13779', '13782', '13783', '14948', '13862', '13844', '13845', '13848', '14949', '14109', '13847', '13846', '13843', '13861']);
const GO_TRAIN_STATIONS = new Set(['AL', 'MP', 'ET', 'SM', 'SF', 'OA', 'DA', 'RU', 'RI', 'SC', 'DW', 'MI', 'ST', 'UN', 'AP', 'LN', 'WR', 'CL', 'GU', 'OL', 'MK', 'ER', 'MJ', 'MA', 'SCTH', 'OS', 'AJ', 'UI', 'EX', 'AC', 'KC', 'LS', 'EG', 'WE', 'RO', 'BR', 'BO', 'GL', 'ME', 'AD', 'LO', 'HA', 'OR', 'DI', 'BU', 'SR', 'PO', 'GE', 'BD', 'KI', 'AG', 'BE', 'WH', 'GO', 'KP', 'NI', 'ML', 'KE', 'MO', 'MR', 'BA', 'EA', 'BL', 'CE', 'LI', 'BM', 'LA', 'NE', 'PIN', 'AU', 'CO'])

exports.transitland = {
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

exports.transsee = {
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
    "Toronto TTC Subway": function(stop, route, direction, prediction, watch_data) {

    },
    "GO Transit": function(stop, route, direction, prediction, watch_data) {
        watch_data[keys.shape] = RouteShape.RECT;
        
        const [route_number, ...rest] = direction.split(" - ");
        watch_data[keys.route_number] = route_number;
        watch_data[keys.dest_name] = "to " + rest.join(" - ");
    },
    "GO Trains": function(stop, route, direction, prediction, watch_data) {
        watch_data[keys.shape] = RouteShape.RECT;
        watch_data[keys.vehicle_type] = VehicleType.REGIONAL_TRAIN;

        const [route_number, ...rest] = direction.split(" - ");
        watch_data[keys.route_number] = route_number;
        watch_data[keys.dest_name] = "to " + rest.join(" - ");
    },
    "Kitchener-Waterloo GRT": function(stop, route, direction, prediction, watch_data) {
        if (route.routeTag == "301") {
            watch_data[keys.vehicle_type] = VehicleType.STREETCAR;
        }
    },
    "UP Express": function(stop, route, direction, prediction, watch_data) {
        watch_data[keys.shape] = RouteShape.RECT;
        watch_data[keys.vehicle_type] = VehicleType.REGIONAL_TRAIN;
    }
}

// this function maps between the OneStop name from Transitland (the thing at the end of the OneStop ID)
// and the agency name needed for TransSee. sometimes a OneStop name maps to multiple TransSee agency names,
// depending on which stop it is, which is why this is a function of the stop now instead of a dict
exports.transsee_agency_from_onestop_name = function(onestop_name, stop) {
    if (onestop_name == "grandrivertransit") return "grt";
    else if (onestop_name == "ontario~northland~ca") return "northland";
    //else if (onestop_name == "viarail~traindecharlevoix") return "viarail";
    else if (onestop_name == "ttc") {
        if (TTC_SUBWAY_STATIONS.has(stop.stop_code)) {
            return "ttcsubway";
        }
        return "ttc";
    }
    else if (onestop_name == "gotransit") {
        if (GO_TRAIN_STATIONS.has(stop.stop_id)) {
            return "gotrain";
        }
        return "gotransit";
    }
    return onestop_name;
}

// these functions return arrays of {route tag}|{stop tag}
// see https://retro.umoiq.com/xmlFeedDocs/NextBusXMLFeed.pdf page 12 for the difference
// between stop IDs and stop tags
// these corrections are used for agencies that don't have stop IDs, for example
exports.stop_tag = {
    "upexpress": function(stop) {
        return ["UP|" + stop.stop_id];
    },
    "gotrain": function(stop) {
        // I can't think of a better way to do this other than to hardcode a mapping
        // of every station to the lines that serve it
        if (stop.stop_id == "UN") {
            return ["LW|UN_0", "LE|UN_0", "GT|UN_0", "MI|UN_0", "BR|UN_0", "RH|UN_0", "ST|UN_0"];
        }
        else if (['MI', 'OA', 'AP', 'BO', 'SCTH', 'LO', 'BU', 'WR', 'CL', 'NI', 'EX', 'HA', 'AL', 'PO'].includes(stop.stop_id)) {
            return ["LW|" + stop.stop_id + "_0"];
        }
        else if (['OS', 'WH', 'SC', 'RO', 'PIN', 'GU', 'AJ', 'EG', 'DA'].includes(stop.stop_id)) {
            return ["LE|" + stop.stop_id + "_0"];
        }
        else if (['ML', 'LS', 'CO', 'SR', 'ME', 'KP', 'DI', 'ER'].includes(stop.stop_id)) {
            return ["MI|" + stop.stop_id + "_0"];
        }
        else if (['AC', 'SM', 'MA', 'KI', 'SF', 'BE', 'MO', 'GE', 'GL', 'WE', 'BL', 'LN', 'ET', 'BR'].includes(stop.stop_id)) {
            return ["GT|" + stop.stop_id + "_0"];
        }
        else if (['AD', 'RU', 'AU', 'KC', 'MP', 'NE', 'EA', 'BD', 'DW', 'BA'].includes(stop.stop_id)) {
            return ["BR|" + stop.stop_id + "_0"];
        }
        else if (['OR', 'BM', 'GO', 'OL', 'LA', 'RI'].includes(stop.stop_id)) {
            return ["RH|" + stop.stop_id + "_0"];
        }
        else if (['ST', 'CE', 'AG', 'MJ', 'KE', 'MR', 'UI', 'MK', 'LI'].includes(stop.stop_id)) {
            return ["ST|" + stop.stop_id + "_0"];
        }
        return [];
    },
    "viarail": function(stop) {
        // this thing is weird, I'll deal with it later
        // GTFS returns a stop id (119) and a stop code (TRTO)
        // transsee accepts a route tag and a stop tag. route tags are seemingly just ranges of stops on the route
        // (119-341) and stop codes are of the form 119_0 (not sure what the _0 is for but maybe I can just add it
        // like above?)
        // could do something like what gotrain does but there are way more stops probably
        return [];
    }
}