#include <pebble.h>
#include "anim_vehicle.h"
#include "data.h"

static const uint32_t VEHICLE_SCROLL_DURATION = 240;
static const int16_t VEHICLE_SCROLL_DIST = 60;

static Animation* out_anim;
static Animation* in_anim;

Animation *create_vehicle_outbound_anim(ScrollDirection direction, Layer* vehicle_layer) {
    const int16_t to_dy = (direction == ScrollDirectionDown) ? -VEHICLE_SCROLL_DIST : VEHICLE_SCROLL_DIST;

    GPoint to_origin = GPoint(0, to_dy);
    out_anim = (Animation *) property_animation_create_bounds_origin(vehicle_layer, NULL, &to_origin);
    animation_set_duration(out_anim, VEHICLE_SCROLL_DURATION);
    animation_set_curve(out_anim, AnimationCurveLinear);

    return out_anim;
}

Animation *create_vehicle_inbound_anim(ScrollDirection direction, Layer* vehicle_layer) {
    const int16_t from_dy = (direction == ScrollDirectionDown) ? -VEHICLE_SCROLL_DIST : VEHICLE_SCROLL_DIST;

    GPoint from_origin = GPoint(0, from_dy);
    in_anim = (Animation *) property_animation_create_bounds_origin(vehicle_layer, &from_origin, NULL);
    animation_set_duration(in_anim, VEHICLE_SCROLL_DURATION);
    animation_set_curve(in_anim, AnimationCurveEaseOut);

    return in_anim;
}
