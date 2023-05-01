#pragma once
#include <pebble.h>
#include "data.h"

Animation *create_vehicle_outbound_anim(ScrollDirection direction, Layer* vehicle_layer);
Animation *create_vehicle_inbound_anim(ScrollDirection direction, Layer* vehicle_layer);