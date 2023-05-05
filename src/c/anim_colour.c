/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

#include <pebble.h>
#include "data.h"

#define COLOUR_ANIM_DURATION_MS 460

static GColor bg_colour_getter(void* context) {
    Window* window = (Window*)context;
    WindowDataArray* data_array = window_get_user_data(window);
    return *get_display_gcolor(data_array);
}

static void bg_colour_setter(void* context, GColor color) {
    Window* window = (Window*)context;
    WindowDataArray* data_array = window_get_user_data(window);
    if (data_array->anim_intermediates.color == NULL) {
        data_array->anim_intermediates.color = malloc(sizeof(GColor));
    }
    *(data_array->anim_intermediates.color) = color;
    layer_mark_dirty(window_get_root_layer(window));
}

static void cleanup_intermediate_bg_colour(Animation* animation) {
    Window* window;
    property_animation_get_subject((PropertyAnimation*)animation, (void*)&window);
    WindowDataArray* data_array = window_get_user_data(window);
    if (data_array->anim_intermediates.color != NULL) {
        free(data_array->anim_intermediates.color);
        data_array->anim_intermediates.color = NULL;
    }
}

static const PropertyAnimationImplementation s_anim_colour_impl = {
    .base = {
        .update = (AnimationUpdateImplementation) property_animation_update_gcolor8,
        .teardown = (AnimationTeardownImplementation) cleanup_intermediate_bg_colour,
    },
    .accessors = {
        .setter = { .gcolor8 = (const GColor8Setter) bg_colour_setter, },
        .getter = { .gcolor8 = (const GColor8Getter) bg_colour_getter, },
    },
};

Animation* create_anim_bg_colour(Window* window, GColor* next_color) {
    WindowDataArray* data_array = window_get_user_data(window);
    PropertyAnimation* prop_anim = property_animation_create(
        &s_anim_colour_impl, window, NULL, NULL);
    property_animation_from(prop_anim, get_display_gcolor(data_array), sizeof(GColor), true);
    property_animation_to(prop_anim, next_color, sizeof(GColor), true);
    Animation* anim = property_animation_get_animation(prop_anim);
    animation_set_duration(anim, COLOUR_ANIM_DURATION_MS);
    return anim;
}