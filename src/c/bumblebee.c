#include <pebble.h>
#include "anim_colour.h"
#include "anim_number.h"
#include "anim_vehicle.h"
#include "data.h"

#define RIGHT_BAR_WIDTH 50
#define RIGHT_MARGIN 5
#define SPACE 5
#define DELTA 13
#define MAX_ROUTES 6

static Window *s_window;
static TextLayer *s_time_layer;
static TextLayer *s_stop_layer;
static TextLayer *s_dest_layer;
static TextLayer *s_unit_layer;
static Layer *s_route_layer;
static Layer *s_vehicle_background_layer;
static Layer *s_vehicle_layer;
static Layer *s_description_layer;
static GDrawCommandSequence* s_streetcar_sequence;
static GDrawCommandSequence* s_subway_sequence;
static GDrawCommandSequence* s_bus_sequence;
static GDrawCommandSequence* s_regional_train_sequence;
static GDrawCommandSequence* s_vehicle_sequence;
static int s_vehicle_frame_index = 9;

static char time_text[8];
static char stop_text[32];
static char dest_text[32];

static WindowDataArray sample_data_arr = {
    .array = NULL,
    .data_len = 5,
    .data_index = 0,
    .anim_intermediates = {
        .color = NULL,
        .time = NULL,
    }
};

void set_time_text(WindowDataArray* data_arr) {
    snprintf(time_text, sizeof(time_text), "%hd", *get_display_time(data_arr));
    text_layer_set_text(s_time_layer, time_text);
}

static void set_stop_text(WindowData* data) {
    snprintf(stop_text, sizeof(stop_text), "at %s", data->stop_name);
    text_layer_set_text(s_stop_layer, stop_text);
}

static void set_dest_text(WindowData* data) {
    snprintf(dest_text, sizeof(dest_text), "to %s", data->dest_name);
    text_layer_set_text(s_dest_layer, dest_text);
}

static void redraw_all() {
    WindowDataArray* data_arr = window_get_user_data(s_window);
    WindowData* data = window_data_current(data_arr);
    set_time_text(data_arr);
    text_layer_set_text(s_unit_layer, data->unit);
    set_stop_text(data);
    set_dest_text(data);

    layer_mark_dirty(window_get_root_layer(s_window));
}

static Animation *create_anim_scroll_out(Layer *layer, uint32_t duration, int16_t dy) {
    GPoint to_origin = GPoint(0, dy);
    Animation *result = (Animation *) property_animation_create_bounds_origin(layer, NULL, &to_origin);
    animation_set_duration(result, duration);
    animation_set_curve(result, AnimationCurveEaseIn);
    return result;
}

static Animation *create_anim_scroll_in(Layer *layer, uint32_t duration, int16_t dy) {
    GPoint from_origin = GPoint(0, dy);
    Animation *result = (Animation *) property_animation_create_bounds_origin(layer, &from_origin, &GPointZero);
    animation_set_duration(result, duration);
    animation_set_curve(result, AnimationCurveEaseOut);
    return result;
}

static const uint32_t BACKGROUND_SCROLL_DURATION = 100 * 2;
static const uint32_t SCROLL_DURATION = 130 * 2;
static const int16_t SCROLL_DIST_OUT = 40;
static const int16_t SCROLL_DIST_IN = 16;

static Animation *create_text_outbound_anim(ScrollDirection direction) {
    const int16_t to_dy = (direction == ScrollDirectionDown) ? -SCROLL_DIST_OUT : SCROLL_DIST_OUT;

    Animation *out_text = create_anim_scroll_out(s_description_layer, SCROLL_DURATION, to_dy);
    return out_text;
}

static Animation *create_text_inbound_anim(ScrollDirection direction) {
    const int16_t from_dy = (direction == ScrollDirectionDown) ? -SCROLL_DIST_IN : SCROLL_DIST_IN;

    Animation *in_text = create_anim_scroll_in(s_description_layer, SCROLL_DURATION, from_dy);
    return in_text;
}

static void anim_during_scroll_inc(Animation *animation, bool finished, void *context) {
    window_data_inc(&sample_data_arr);
    redraw_all();
}

static void anim_during_scroll_dec(Animation *animation, bool finished, void *context) {
    window_data_dec(&sample_data_arr);
    redraw_all();
}

static void anim_after_scroll(Animation *animation, bool finished, void *context) {
    redraw_all();
}

static void set_door_open() {
    s_vehicle_frame_index = (int)gdraw_command_sequence_get_num_frames(s_vehicle_sequence);
}

static void open_door_frame_handler(void* context) {
    if (s_vehicle_frame_index < (int)gdraw_command_sequence_get_num_frames(s_vehicle_sequence) - 1) {
        s_vehicle_frame_index += 1;
        layer_mark_dirty(s_vehicle_layer);
        app_timer_register(DELTA, open_door_frame_handler, NULL);
    }
}

static void close_door_frame_handler(void* context) {
    if (s_vehicle_frame_index > 0) {
        s_vehicle_frame_index -= 1;
        layer_mark_dirty(s_vehicle_layer);
        app_timer_register(DELTA, close_door_frame_handler, NULL);
    }
}

static void _open_door_frame_handler(Animation* animation, bool finished, void* context) {
    app_timer_register(400, open_door_frame_handler, NULL);
}

static Animation *create_scroll_anim(ScrollDirection direction) {
    ScrollDirection opposite_direction = (direction == ScrollDirectionDown) ? ScrollDirectionUp : ScrollDirectionDown;
    Animation* out_anim = create_text_outbound_anim(direction);
    animation_set_handlers(out_anim, (AnimationHandlers) {
        .stopped = (direction == ScrollDirectionDown) ? anim_during_scroll_inc : anim_during_scroll_dec,
    }, NULL);
    set_door_open();
    app_timer_register(0, close_door_frame_handler, NULL);
    Animation* in_anim = create_text_inbound_anim(opposite_direction);
    animation_set_handlers(in_anim, (AnimationHandlers) {
        .stopped = _open_door_frame_handler,
    }, NULL);
    Animation* vehicle_out_anim = create_vehicle_outbound_anim(direction, s_vehicle_layer);
    Animation* vehicle_in_anim = create_vehicle_inbound_anim(opposite_direction, s_vehicle_layer);
    Animation* vehicle_sequence = animation_sequence_create(vehicle_out_anim, vehicle_in_anim, NULL);
    animation_set_delay(vehicle_sequence, 200);
    GColor* next_color = (direction == ScrollDirectionDown)
        ? &(window_data_next(&sample_data_arr)->color)
        : &(window_data_prev(&sample_data_arr)->color);
    Animation* colour_anim = create_anim_bg_colour(s_window, next_color);
    int16_t* next_time = (direction == ScrollDirectionDown)
        ? &(window_data_next(&sample_data_arr)->time)
        : &(window_data_prev(&sample_data_arr)->time);
    Animation* number_anim = create_anim_number(s_window, next_time);
    animation_set_delay(number_anim, 100);
    Animation* sequence = animation_spawn_create(
        animation_sequence_create(out_anim, in_anim, NULL),
        vehicle_sequence,
        colour_anim,
        number_anim,
        NULL);
    animation_set_delay(sequence, 140);
    animation_set_handlers(sequence, (AnimationHandlers) {
        .stopped = anim_after_scroll,
    }, NULL);
    return sequence;
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
    //text_layer_set_text(s_time_layer, "Select");
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
    int res = window_data_can_dec(&sample_data_arr);
    if (res == 0) {
        animation_schedule(create_scroll_anim(ScrollDirectionUp));
    }
    else {
        animation_schedule(create_text_inbound_anim(ScrollDirectionUp));
    }
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
    int res = window_data_can_inc(&sample_data_arr);
    if (res == 0) {
        animation_schedule(create_scroll_anim(ScrollDirectionDown));
    }
    else {
        animation_schedule(create_text_inbound_anim(ScrollDirectionDown));
    }
}

static void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
    window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
    window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void vehicle_update_proc(Layer *layer, GContext *ctx) {
    WindowData* data = window_data_current(window_get_user_data(s_window));
    switch (data->vehicle_type) {
    case STREETCAR:
        s_vehicle_sequence = s_streetcar_sequence;
        break;
    case SUBWAY:
        s_vehicle_sequence = s_subway_sequence;
        break;
    case BUS:
        s_vehicle_sequence = s_bus_sequence;
        break;
    case REGIONAL_TRAIN:
        s_vehicle_sequence = s_regional_train_sequence;
        break;
    }

    GRect bounds = layer_get_bounds(layer);
    GPoint vehicle_origin = GPoint(bounds.origin.x, bounds.origin.y + 40);
    GDrawCommandFrame* frame = gdraw_command_sequence_get_frame_by_index(s_vehicle_sequence, s_vehicle_frame_index);
    if (frame) {
        gdraw_command_frame_draw(ctx, s_vehicle_sequence, frame, vehicle_origin);
    }
}

static void vehicle_background_update_proc(Layer *layer, GContext *ctx) {
    WindowDataArray* data_array = window_get_user_data(s_window);
    WindowData* data = window_data_current(data_array);

    GRect bounds = layer_get_bounds(layer);
    graphics_context_set_fill_color(ctx, *get_display_gcolor(data_array));
    graphics_fill_rect(ctx, bounds, 0, GCornerNone);

    // overhead wire!
    if (data->vehicle_type == STREETCAR) {
        graphics_context_set_stroke_color(ctx, GColorBlack);
        graphics_context_set_stroke_width(ctx, 1);
        graphics_draw_line(ctx, GPoint(
            bounds.origin.x + 32, 0
        ), GPoint(
            bounds.origin.x + 32, bounds.size.h
        ));
    }
}

static void route_layer_update_proc(Layer *layer, GContext *ctx) {
    WindowData* data = window_data_current(window_get_user_data(s_window));

    GRect bounds = layer_get_bounds(layer);
    GSize number_text_size = graphics_text_layout_get_content_size(
        data->route_number, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft);
    uint16_t pill_width = data->shape == CIRCLE ? bounds.size.h : number_text_size.w + 10;
    GSize name_text_size = graphics_text_layout_get_content_size(
        data->route_name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), 
        GRect(bounds.origin.x + pill_width + SPACE, bounds.origin.y, bounds.size.w - pill_width - SPACE - RIGHT_MARGIN, bounds.size.h),
        GTextOverflowModeTrailingEllipsis, GTextAlignmentRight);
    GRect name_bounds = GRect(
        bounds.origin.x + bounds.size.w - name_text_size.w - RIGHT_MARGIN,
        bounds.origin.y,
        name_text_size.w,
        bounds.size.h);
    GRect pill_bounds = GRect(
        name_bounds.origin.x - pill_width - SPACE,
        bounds.origin.y,
        pill_width,
        bounds.size.h);
    GRect number_text_bounds = GRect(
        pill_bounds.origin.x + (pill_width - number_text_size.w) / 2,
        bounds.origin.y,
        number_text_size.w,
        bounds.size.h);

    graphics_context_set_fill_color(ctx, data->color);
    if (data->shape == ROUNDRECT) {
        graphics_fill_rect(ctx, pill_bounds, 10, GCornersAll);
    } else if (data->shape == RECT) {
        graphics_fill_rect(ctx, pill_bounds, 0, GCornerNone);
    } else if (data->shape == CIRCLE) {
        graphics_fill_rect(ctx, pill_bounds, 30, GCornersAll);
    }
    graphics_context_set_text_color(ctx, GColorWhite);
    graphics_draw_text(ctx, data->route_number, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), number_text_bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, 0);

    graphics_context_set_text_color(ctx, GColorBlack);
    graphics_draw_text(ctx, data->route_name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), name_bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, 0);
}

static void description_layer_update_proc(Layer *layer, GContext *ctx) {
}

static void create_time_layer(GRect bounds, WindowDataArray* data_arr) {
    s_time_layer = text_layer_create(GRect(0, 0, bounds.size.w - RIGHT_BAR_WIDTH - 2, 64));
    set_time_text(data_arr);
    text_layer_set_font(s_time_layer, fonts_get_system_font(FONT_KEY_LECO_42_NUMBERS));
    text_layer_set_text_alignment(s_time_layer, GTextAlignmentRight);
}

static void create_unit_layer(GRect bounds, WindowData* data) {
    s_unit_layer = text_layer_create(GRect(0, 44, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 120));
    text_layer_set_text(s_unit_layer, data->unit);
    text_layer_set_text_alignment(s_unit_layer, GTextAlignmentRight);
}

static void create_stop_layer(GRect bounds, WindowData* data) {
    s_stop_layer = text_layer_create(GRect(0, 68, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 72));
    set_stop_text(data);
    text_layer_set_font(s_stop_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
    text_layer_set_text_alignment(s_stop_layer, GTextAlignmentRight);
}

static void create_dest_layer(GRect bounds, WindowData* data) {
    s_dest_layer = text_layer_create(GRect(0, 32, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 36));
    set_dest_text(data);
    text_layer_set_font(s_dest_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
    text_layer_set_text_alignment(s_dest_layer, GTextAlignmentRight);
}

static void create_route_layer(GRect bounds) {
    s_route_layer = layer_create(GRect(0, 0, bounds.size.w - RIGHT_BAR_WIDTH, 32));
    layer_set_update_proc(s_route_layer, route_layer_update_proc);
}

static void create_vehicle(GRect bounds) {
    s_vehicle_layer = layer_create(GRect(bounds.size.w - RIGHT_BAR_WIDTH, 0, bounds.size.w, bounds.size.h));
    layer_set_update_proc(s_vehicle_layer, vehicle_update_proc);
}

static void create_vehicle_background(GRect bounds) {
    s_vehicle_background_layer = layer_create(GRect(bounds.size.w - RIGHT_BAR_WIDTH, 0, bounds.size.w, bounds.size.h));
    layer_set_update_proc(s_vehicle_background_layer, vehicle_background_update_proc);
}

static void create_description(GRect bounds, WindowData* data) {
    s_description_layer = layer_create(
        GRect(bounds.origin.x, 64, bounds.size.w - RIGHT_BAR_WIDTH, bounds.size.h - 64));
    layer_set_update_proc(s_description_layer, description_layer_update_proc);

    create_stop_layer(bounds, data);
    layer_add_child(s_description_layer, text_layer_get_layer(s_stop_layer));

    create_dest_layer(bounds, data);
    layer_add_child(s_description_layer, text_layer_get_layer(s_dest_layer));
}

static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);
    WindowDataArray* data_arr = window_get_user_data(window);
    WindowData* data = window_data_current(data_arr);

    create_time_layer(bounds, data_arr);
    layer_add_child(window_layer, text_layer_get_layer(s_time_layer));

    create_unit_layer(bounds, data);
    layer_add_child(window_layer, text_layer_get_layer(s_unit_layer));

    create_description(bounds, data);
    layer_add_child(window_layer, s_description_layer);
    text_layer_enable_screen_text_flow_and_paging(s_stop_layer, 5);
    text_layer_enable_screen_text_flow_and_paging(s_dest_layer, 5);
    layer_mark_dirty(s_description_layer);

    create_vehicle_background(bounds);
    layer_add_child(window_layer, s_vehicle_background_layer);
    layer_mark_dirty(s_vehicle_background_layer);

    create_vehicle(bounds);
    layer_add_child(window_layer, s_vehicle_layer);
    layer_mark_dirty(s_vehicle_layer);

    create_route_layer(bounds);
    layer_add_child(s_description_layer, s_route_layer);
    layer_mark_dirty(s_route_layer);
}

static void window_unload(Window *window) {
    text_layer_destroy(s_time_layer);
    text_layer_destroy(s_unit_layer);
    text_layer_destroy(s_stop_layer);
    text_layer_destroy(s_dest_layer);
    layer_destroy(s_vehicle_background_layer);
    layer_destroy(s_vehicle_layer);
    layer_destroy(s_description_layer);
    gdraw_command_sequence_destroy(s_streetcar_sequence);
    gdraw_command_sequence_destroy(s_subway_sequence);
    gdraw_command_sequence_destroy(s_bus_sequence);
    gdraw_command_sequence_destroy(s_regional_train_sequence);
    layer_destroy(s_route_layer);
}

static void inbox_received_callback(DictionaryIterator *iter, void *context) {
    Tuple* num_routes = dict_find(iter, MESSAGE_KEY_num_routes);
    if (num_routes) {
        sample_data_arr.data_len = num_routes->value->int16;
        sample_data_arr.data_index = 0;
        for (int i = 0; i < sample_data_arr.data_len; i += 1) {
            Tuple* time = dict_find(iter, MESSAGE_KEY_time + i);
            Tuple* unit = dict_find(iter, MESSAGE_KEY_unit + i);
            Tuple* stop_name = dict_find(iter, MESSAGE_KEY_stop_name + i);
            Tuple* dest_name = dict_find(iter, MESSAGE_KEY_dest_name + i);
            Tuple* route_number = dict_find(iter, MESSAGE_KEY_route_number + i);
            Tuple* route_name = dict_find(iter, MESSAGE_KEY_route_name + i);
            Tuple* vehicle_type = dict_find(iter, MESSAGE_KEY_vehicle_type + i);
            Tuple* color = dict_find(iter, MESSAGE_KEY_color + i);
            Tuple* shape = dict_find(iter, MESSAGE_KEY_shape + i);

            sample_data_arr.array[i].time = time->value->int16;
            strncpy(sample_data_arr.array[i].unit, unit->value->cstring, 32);
            strncpy(sample_data_arr.array[i].stop_name, stop_name->value->cstring, 32);
            strncpy(sample_data_arr.array[i].dest_name, dest_name->value->cstring, 32);
            strncpy(sample_data_arr.array[i].route_number, route_number->value->cstring, 32);
            strncpy(sample_data_arr.array[i].route_name, route_name->value->cstring, 32);
            sample_data_arr.array[i].vehicle_type = (VehicleType)vehicle_type->value->int16;
            sample_data_arr.array[i].color = (GColor){.argb=color->value->int16};
            sample_data_arr.array[i].shape = (RouteShape)shape->value->int16;
        }
        redraw_all();
    }
}

static void init(void) {
    sample_data_arr.array = malloc(MAX_ROUTES*sizeof(WindowData));
    for (int i = 0; i < MAX_ROUTES; i += 1) {
        sample_data_arr.array[i] = (WindowData) {
            .time = 10,
            .unit = malloc(32*sizeof(char)),
            .stop_name = malloc(32*sizeof(char)),
            .dest_name = malloc(32*sizeof(char)),
            .route_number = malloc(32*sizeof(char)),
            .route_name = malloc(32*sizeof(char)),
            .vehicle_type = STREETCAR,
            .color = GColorRed,
            .shape = ROUNDRECT,
        };
    }

    s_streetcar_sequence = gdraw_command_sequence_create_with_resource(RESOURCE_ID_STREETCAR_ANIM);
    s_subway_sequence = gdraw_command_sequence_create_with_resource(RESOURCE_ID_SUBWAY_ANIM);
    s_bus_sequence = gdraw_command_sequence_create_with_resource(RESOURCE_ID_BUS_ANIM);
    s_regional_train_sequence = gdraw_command_sequence_create_with_resource(RESOURCE_ID_TRAIN_ANIM);

    app_message_register_inbox_received(inbox_received_callback);
    const int inbox_size = 1024;
    const int outbox_size = 32;
    app_message_open(inbox_size, outbox_size);

    s_window = window_create();
    window_set_click_config_provider(s_window, click_config_provider);
    window_set_user_data(s_window, &sample_data_arr);
    window_set_window_handlers(s_window, (WindowHandlers) {
        .load = window_load,
        .unload = window_unload,
    });
    const bool animated = true;
    window_stack_push(s_window, animated);
}

static void deinit(void) {
    window_destroy(s_window);
    for (int i = 0; i < MAX_ROUTES; i += 1) {
        free(sample_data_arr.array[i].unit);
        free(sample_data_arr.array[i].stop_name);
        free(sample_data_arr.array[i].dest_name);
        free(sample_data_arr.array[i].route_number);
        free(sample_data_arr.array[i].route_name);
    }
    free(sample_data_arr.array);
}

int main(void) {
    init();

    APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", s_window);

    app_event_loop();
    deinit();
}
