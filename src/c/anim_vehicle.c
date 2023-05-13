/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

#include <pebble.h>
#include "anim_vehicle.h"
#include "data.h"

static const uint32_t VEHICLE_SCROLL_DURATION = 200;
static const int16_t VEHICLE_SCROLL_DIST = 40;

static Animation* out_anim = NULL;
static Animation* in_anim = NULL;

Animation *create_vehicle_outbound_anim(ScrollDirection direction, Layer* vehicle_layer, AnimationStoppedHandler stopped_handler) {
    if (animation_is_scheduled(out_anim)) {
        animation_unschedule(out_anim);

        // reset to `from` point
        GPoint origin;
        property_animation_get_from_gpoint((PropertyAnimation*)out_anim, &origin);
        GRect bounds = layer_get_bounds(vehicle_layer);
        layer_set_bounds(vehicle_layer, GRect(origin.x, origin.y, bounds.size.w, bounds.size.h));
    }

    const int16_t to_dy = (direction == ScrollDirectionDown) ? -VEHICLE_SCROLL_DIST : VEHICLE_SCROLL_DIST;

    GPoint to_origin = GPoint(0, to_dy);
    out_anim = (Animation *) property_animation_create_bounds_origin(vehicle_layer, NULL, &to_origin);
    animation_set_duration(out_anim, VEHICLE_SCROLL_DURATION);
    animation_set_curve(out_anim, AnimationCurveLinear);
    animation_set_handlers(out_anim, (AnimationHandlers) {
        .stopped = stopped_handler,
    }, NULL);

    return out_anim;
}

Animation *create_vehicle_inbound_anim(ScrollDirection direction, Layer* vehicle_layer) {
    if (animation_is_scheduled(in_anim)) {
        animation_unschedule(in_anim);

        // reset to `to` point
        GPoint origin;
        property_animation_get_to_gpoint((PropertyAnimation*)in_anim, &origin);
        GRect bounds = layer_get_bounds(vehicle_layer);
        layer_set_bounds(vehicle_layer, GRect(origin.x, origin.y, bounds.size.w, bounds.size.h));
    }

    const int16_t from_dy = (direction == ScrollDirectionDown) ? -VEHICLE_SCROLL_DIST : VEHICLE_SCROLL_DIST;

    GPoint from_origin = GPoint(0, from_dy);
    in_anim = (Animation *) property_animation_create_bounds_origin(vehicle_layer, &from_origin, NULL);
    animation_set_duration(in_anim, VEHICLE_SCROLL_DURATION);
    animation_set_curve(in_anim, AnimationCurveEaseOut);

    return in_anim;
}
