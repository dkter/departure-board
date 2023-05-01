#include "data.h"

WindowData* window_data_current(WindowDataArray* array) {
    return &array->array[array->data_index];
}

/*
these 2 assume you've already checked you can increment/decrement
*/
WindowData* window_data_next(WindowDataArray* array) {
    return &array->array[array->data_index + 1];
}

WindowData* window_data_prev(WindowDataArray* array) {
    return &array->array[array->data_index - 1];
}

int window_data_inc(WindowDataArray* array) {
    if (array->data_index < array->data_len - 1) {
        array->data_index += 1;
        return 0;
    } else {
        return 1;
    }
}

int window_data_can_inc(WindowDataArray* array) {
    if (array->data_index < array->data_len - 1) {
        return 0;
    } else {
        return 1;
    }
}

int window_data_dec(WindowDataArray* array) {
    if (array->data_index > 0) {
        array->data_index -= 1;
        return 0;
    } else {
        return 1;
    }
}

int window_data_can_dec(WindowDataArray* array) {
    if (array->data_index > 0) {
        return 0;
    } else {
        return 1;
    }
}

/*
Get the colour that should currently be displayed on the side
bar, either the set colour or an animation intermediate
*/
GColor* get_display_gcolor(WindowDataArray* array) {
    if (array->anim_intermediates.color != NULL) {
        return array->anim_intermediates.color;
    } else {
        WindowData* data = window_data_current(array);
        return &(data->color);
    }
}
