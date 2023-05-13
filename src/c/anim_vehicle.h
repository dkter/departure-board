/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

#pragma once
#include <pebble.h>
#include "data.h"

Animation *create_vehicle_outbound_anim(ScrollDirection direction, Layer* vehicle_layer, AnimationStoppedHandler stopped_handler);
Animation *create_vehicle_inbound_anim(ScrollDirection direction, Layer* vehicle_layer);