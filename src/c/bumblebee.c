#include <pebble.h>
#include "data.h"

#define RIGHT_BAR_WIDTH 50
#define RIGHT_MARGIN 5
#define SPACE 5

static Window *s_window;
static TextLayer *s_time_layer;
static TextLayer *s_stop_layer;
static TextLayer *s_dest_layer;
static TextLayer *s_unit_layer;
static TextLayer *s_next_layer;
static Layer *s_route_layer;
static Layer *s_vehicle_background_layer;
static Layer *s_vehicle_layer;
static GDrawCommandSequence* s_vehicle_sequence;
static int s_vehicle_frame_index = 9;

static char time_text[8];
static char stop_text[32];
static char dest_text[32];

static WindowData sample_data__arr[] = {
  {
    .time = 10,
    .unit = "min",
    .stop_name = "Dundas West Station",
    .dest_name = "Distillery",
    .route_number = "504A",
    .route_name = "King",
    .vehicle_type = STREETCAR,
  },
  {
    .time = 6,
    .unit = "min",
    .stop_name = "Dundas West Station",
    .dest_name = "Broadview Station",
    .route_number = "505",
    .route_name = "Dundas",
    .vehicle_type = STREETCAR,
  }
};
static WindowDataArray sample_data_arr = {
  .array = sample_data__arr,
  .data_len = 2,
  .data_index = 0,
};

static void set_time_text(WindowData* data) {
  snprintf(time_text, sizeof(time_text), "%d", data->time);
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
  WindowData* data = window_data_current(window_get_user_data(s_window));
  set_time_text(data);
  text_layer_set_text(s_unit_layer, data->unit);
  set_stop_text(data);
  set_dest_text(data);

  layer_mark_dirty(window_get_root_layer(s_window));
}

static Animation *create_anim_scroll_out(Layer *layer, uint32_t duration, int16_t dy) {
  GPoint to_origin = GPoint(0, dy);
  Animation *result = (Animation *) property_animation_create_bounds_origin(layer, NULL, &to_origin);
  animation_set_duration(result, duration);
  animation_set_curve(result, AnimationCurveLinear);
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
static const int16_t SCROLL_DIST_OUT = 20;
static const int16_t SCROLL_DIST_IN = 8;

typedef enum {
  ScrollDirectionDown,
  ScrollDirectionUp,
} ScrollDirection;

static Animation *create_outbound_anim(ScrollDirection direction) {
  const int16_t to_dy = (direction == ScrollDirectionDown) ? -SCROLL_DIST_OUT : SCROLL_DIST_OUT;

  Animation *out_stop = create_anim_scroll_out(text_layer_get_layer(s_stop_layer), SCROLL_DURATION, to_dy);
  Animation *out_dest = create_anim_scroll_out(text_layer_get_layer(s_dest_layer), SCROLL_DURATION, to_dy);
  Animation *out_route = create_anim_scroll_out(s_route_layer, SCROLL_DURATION, to_dy);

  return animation_spawn_create(out_stop, out_dest, out_route, NULL);
}

static Animation *create_inbound_anim(ScrollDirection direction) {
  const int16_t from_dy = (direction == ScrollDirectionDown) ? -SCROLL_DIST_IN : SCROLL_DIST_IN;

  Animation *in_stop = create_anim_scroll_in(text_layer_get_layer(s_stop_layer), SCROLL_DURATION, from_dy);
  Animation *in_dest = create_anim_scroll_in(text_layer_get_layer(s_dest_layer), SCROLL_DURATION, from_dy);
  Animation *in_route = create_anim_scroll_in(s_route_layer, SCROLL_DURATION, from_dy);

  return animation_spawn_create(in_stop, in_dest, in_route, NULL);
}

static void anim_during_scroll_inc(Animation *animation, bool finished, void *context) {
  window_data_inc(&sample_data_arr);
}

static void anim_during_scroll_dec(Animation *animation, bool finished, void *context) {
  window_data_dec(&sample_data_arr);
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  //text_layer_set_text(s_time_layer, "Select");
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  int res = window_data_can_dec(&sample_data_arr);
  if (res == 0) {
    Animation* out_anim = create_outbound_anim(ScrollDirectionUp);
    animation_set_handlers(out_anim, (AnimationHandlers) {
      .stopped = anim_during_scroll_dec,
    }, NULL);
    Animation* in_anim = create_inbound_anim(ScrollDirectionDown);
    animation_schedule(animation_sequence_create(out_anim, in_anim, NULL));
  }
  else {
    animation_schedule(create_inbound_anim(ScrollDirectionDown));
  }
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  int res = window_data_can_inc(&sample_data_arr);
  if (res == 0) {
    Animation* out_anim = create_outbound_anim(ScrollDirectionDown);
    animation_set_handlers(out_anim, (AnimationHandlers) {
      .stopped = anim_during_scroll_inc,
    }, NULL);
    Animation* in_anim = create_inbound_anim(ScrollDirectionUp);
    animation_schedule(animation_sequence_create(out_anim, in_anim, NULL));
  }
  else {
    animation_schedule(create_inbound_anim(ScrollDirectionUp));
  }
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void vehicle_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  GPoint vehicle_origin = GPoint(bounds.origin.x, bounds.origin.y + 40);
  GDrawCommandFrame* frame = gdraw_command_sequence_get_frame_by_index(s_vehicle_sequence, s_vehicle_frame_index);
  if (frame) {
    gdraw_command_frame_draw(ctx, s_vehicle_sequence, frame, vehicle_origin);
  }
}

static void vehicle_background_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  graphics_context_set_fill_color(ctx, GColorRed);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  // overhead wire!
  graphics_context_set_stroke_color(ctx, GColorBlack);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_line(ctx, GPoint(
    bounds.origin.x + 32, 0
  ), GPoint(
    bounds.origin.x + 32, bounds.size.h
  ));
}

static void route_layer_update_proc(Layer *layer, GContext *ctx) {
  WindowData* data = window_data_current(window_get_user_data(s_window));

  GRect bounds = layer_get_bounds(layer);
  GSize number_text_size = graphics_text_layout_get_content_size(
    data->route_number, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft);
  GSize name_text_size = graphics_text_layout_get_content_size(
    data->route_name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentRight);
  GRect name_bounds = GRect(
    bounds.origin.x + bounds.size.w - name_text_size.w - RIGHT_MARGIN,
    bounds.origin.y,
    name_text_size.w,
    bounds.size.h);
  GRect pill_bounds = GRect(
    name_bounds.origin.x - number_text_size.w - SPACE - 10,
    bounds.origin.y,
    number_text_size.w + 10,
    bounds.size.h);
  GRect number_text_bounds = GRect(
    pill_bounds.origin.x + 5,
    bounds.origin.y,
    number_text_size.w,
    bounds.size.h);

  graphics_context_set_fill_color(ctx, GColorRed);
  graphics_fill_rect(ctx, pill_bounds, 10, GCornersAll);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_draw_text(ctx, data->route_number, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), number_text_bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, 0);

  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, data->route_name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), name_bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, 0);
}

static void create_time_layer(GRect bounds, WindowData* data) {
  s_time_layer = text_layer_create(GRect(0, 0, bounds.size.w - RIGHT_BAR_WIDTH - 2, 64));
  set_time_text(data);
  text_layer_set_font(s_time_layer, fonts_get_system_font(FONT_KEY_LECO_42_NUMBERS));
  text_layer_set_text_alignment(s_time_layer, GTextAlignmentRight);
}

static void create_unit_layer(GRect bounds, WindowData* data) {
  s_unit_layer = text_layer_create(GRect(0, 44, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 120));
  text_layer_set_text(s_unit_layer, data->unit);
  text_layer_set_text_alignment(s_unit_layer, GTextAlignmentRight);
}

static void create_next_layer(GRect bounds, WindowData* data) {
  s_next_layer = text_layer_create(GRect(bounds.size.w - RIGHT_BAR_WIDTH - 10 - 72, 5, 32, 42));
  text_layer_set_text(s_next_layer, "");
  text_layer_set_font(s_next_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_next_layer, GTextAlignmentLeft);
}

static void create_stop_layer(GRect bounds, WindowData* data) {
  s_stop_layer = text_layer_create(GRect(0, 132, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 72));
  set_stop_text(data);
  text_layer_set_font(s_stop_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_text_alignment(s_stop_layer, GTextAlignmentRight);
}

static void create_dest_layer(GRect bounds, WindowData* data) {
  s_dest_layer = text_layer_create(GRect(0, 96, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 36));
  set_dest_text(data);
  text_layer_set_font(s_dest_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_dest_layer, GTextAlignmentRight);
}

static void create_route_layer(GRect bounds) {
  s_route_layer = layer_create(GRect(0, 64, bounds.size.w - RIGHT_BAR_WIDTH, 32));
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

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  WindowData* data = window_data_current(window_get_user_data(window));

  create_time_layer(bounds, data);
  layer_add_child(window_layer, text_layer_get_layer(s_time_layer));

  create_unit_layer(bounds, data);
  layer_add_child(window_layer, text_layer_get_layer(s_unit_layer));

  create_next_layer(bounds, data);
  layer_add_child(window_layer, text_layer_get_layer(s_next_layer));

  create_stop_layer(bounds, data);
  layer_add_child(window_layer, text_layer_get_layer(s_stop_layer));
  text_layer_enable_screen_text_flow_and_paging(s_stop_layer, 5);

  create_dest_layer(bounds, data);
  layer_add_child(window_layer, text_layer_get_layer(s_dest_layer));
  text_layer_enable_screen_text_flow_and_paging(s_dest_layer, 5);

  create_vehicle_background(bounds);
  layer_add_child(window_layer, s_vehicle_background_layer);
  layer_mark_dirty(s_vehicle_background_layer);

  create_vehicle(bounds);
  layer_add_child(window_layer, s_vehicle_layer);
  layer_mark_dirty(s_vehicle_layer);

  create_route_layer(bounds);
  layer_add_child(window_layer, s_route_layer);
  layer_mark_dirty(s_route_layer);
}

static void window_unload(Window *window) {
  text_layer_destroy(s_time_layer);
  text_layer_destroy(s_unit_layer);
  text_layer_destroy(s_next_layer);
  text_layer_destroy(s_stop_layer);
  text_layer_destroy(s_dest_layer);
  layer_destroy(s_vehicle_background_layer);
  layer_destroy(s_vehicle_layer);
  gdraw_command_sequence_destroy(s_vehicle_sequence);
  layer_destroy(s_route_layer);
}

static void init(void) {
  s_vehicle_sequence = gdraw_command_sequence_create_with_resource(RESOURCE_ID_STREETCAR_ANIM);

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
}

int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", s_window);

  app_event_loop();
  deinit();
}
