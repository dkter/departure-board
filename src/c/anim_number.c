/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

#include <pebble.h>
#include "anim_number.h"
#include "data.h"

#define NUMBER_ANIM_DURATION_MS 260

void set_time_text(WindowDataArray*);

static int16_t number_getter(void* context) {
    Window* window = (Window*)context;
    WindowDataArray* data_array = window_get_user_data(window);
    return *get_display_time(data_array);
}

static void number_setter(void* context, int16_t time) {
    Window* window = (Window*)context;
    WindowDataArray* data_array = window_get_user_data(window);
    if (data_array->anim_intermediates.time == NULL) {
        data_array->anim_intermediates.time = malloc(sizeof(int16_t));
    }
    *(data_array->anim_intermediates.time) = time;
    set_time_text(data_array);
    layer_mark_dirty(window_get_root_layer(window));
}

static void cleanup_intermediate_number(Animation* animation) {
    Window* window;
    property_animation_get_subject((PropertyAnimation*)animation, (void*)&window);
    WindowDataArray* data_array = window_get_user_data(window);
    if (data_array->anim_intermediates.time != NULL) {
        free(data_array->anim_intermediates.time);
        data_array->anim_intermediates.time = NULL;
    }
}

static const PropertyAnimationImplementation s_anim_number_impl = {
    .base = {
        .update = (AnimationUpdateImplementation) property_animation_update_int16,
        .teardown = (AnimationTeardownImplementation) cleanup_intermediate_number,
    },
    .accessors = {
        .setter = { .int16 = (const Int16Setter) number_setter, },
        .getter = { .int16 = (const Int16Getter) number_getter, },
    },
};

Animation* create_anim_number(Window* window, int16_t* next_number) {
    WindowDataArray* data_array = window_get_user_data(window);
    PropertyAnimation* prop_anim = property_animation_create(
        &s_anim_number_impl, window, NULL, NULL);
    property_animation_from(prop_anim, get_display_time(data_array), sizeof(int16_t), true);
    property_animation_to(prop_anim, next_number, sizeof(int16_t), true);
    Animation* anim = property_animation_get_animation(prop_anim);
    animation_set_duration(anim, NUMBER_ANIM_DURATION_MS);
    return anim;
}