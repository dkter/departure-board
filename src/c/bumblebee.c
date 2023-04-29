#include <pebble.h>

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
static GDrawCommandImage* s_vehicle_image;

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  //text_layer_set_text(s_time_layer, "Select");
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  //text_layer_set_text(s_time_layer, "Up");
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  //text_layer_set_text(s_time_layer, "Down");
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void vehicle_background_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  graphics_context_set_fill_color(ctx, GColorRed);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);
  // gdraw_command_image_draw(ctx, s_vehicle_image, GPoint(0, 0));
  GPoint vehicle_origin = GPoint(bounds.origin.x, bounds.origin.y + 40);
  gdraw_command_image_draw(ctx, s_vehicle_image, vehicle_origin);
}

static void route_layer_update_proc(Layer *layer, GContext *ctx) {
  const char number[] = "504B";
  const char name[] = "King";

  GRect bounds = layer_get_bounds(layer);
  GSize number_text_size = graphics_text_layout_get_content_size(
    number, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft);
  GSize name_text_size = graphics_text_layout_get_content_size(
    name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentRight);
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
  graphics_draw_text(ctx, number, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), number_text_bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, 0);

  graphics_context_set_text_color(ctx, GColorBlack);
  graphics_draw_text(ctx, name, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD), name_bounds, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, 0);
}

static void create_time_layer(GRect bounds) {
  s_time_layer = text_layer_create(GRect(0, 0, bounds.size.w - RIGHT_BAR_WIDTH - 2, 64));
  text_layer_set_text(s_time_layer, "10");
  text_layer_set_font(s_time_layer, fonts_get_system_font(FONT_KEY_LECO_42_NUMBERS));
  text_layer_set_text_alignment(s_time_layer, GTextAlignmentRight);
}

static void create_unit_layer(GRect bounds) {
  s_unit_layer = text_layer_create(GRect(0, 44, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 120));
  text_layer_set_text(s_unit_layer, "min");
  //text_layer_set_font(s_unit_layer, fonts_get_system_font(FONT_KEY_LECO_42_NUMBERS));
  text_layer_set_text_alignment(s_unit_layer, GTextAlignmentRight);
}

static void create_next_layer(GRect bounds) {
  s_next_layer = text_layer_create(GRect(bounds.size.w - RIGHT_BAR_WIDTH - 10 - 72, 5, 32, 42));
  text_layer_set_text(s_next_layer, "");
  text_layer_set_font(s_next_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_next_layer, GTextAlignmentLeft);
}

static void create_stop_layer(GRect bounds) {
  s_stop_layer = text_layer_create(GRect(0, 132, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 72));
  text_layer_set_text(s_stop_layer, "at Dundas West Station");
  text_layer_set_font(s_stop_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_text_alignment(s_stop_layer, GTextAlignmentRight);
}

static void create_dest_layer(GRect bounds) {
  s_dest_layer = text_layer_create(GRect(0, 96, bounds.size.w - RIGHT_BAR_WIDTH - RIGHT_MARGIN, 36));
  text_layer_set_text(s_dest_layer, "to Broadview Station");
  text_layer_set_font(s_dest_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_dest_layer, GTextAlignmentRight);
}

static void create_route_layer(GRect bounds) {
  s_route_layer = layer_create(GRect(0, 64, bounds.size.w - RIGHT_BAR_WIDTH, 32));
  layer_set_update_proc(s_route_layer, route_layer_update_proc);
}

static void create_vehicle_background(GRect bounds) {
  s_vehicle_background_layer = layer_create(GRect(bounds.size.w - RIGHT_BAR_WIDTH, 0, bounds.size.w, bounds.size.h));
  layer_set_update_proc(s_vehicle_background_layer, vehicle_background_update_proc);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  create_time_layer(bounds);
  layer_add_child(window_layer, text_layer_get_layer(s_time_layer));

  create_unit_layer(bounds);
  layer_add_child(window_layer, text_layer_get_layer(s_unit_layer));

  create_next_layer(bounds);
  layer_add_child(window_layer, text_layer_get_layer(s_next_layer));

  create_stop_layer(bounds);
  layer_add_child(window_layer, text_layer_get_layer(s_stop_layer));
  text_layer_enable_screen_text_flow_and_paging(s_stop_layer, 5);

  create_dest_layer(bounds);
  layer_add_child(window_layer, text_layer_get_layer(s_dest_layer));
  text_layer_enable_screen_text_flow_and_paging(s_dest_layer, 5);

  create_vehicle_background(bounds);
  layer_add_child(window_layer, s_vehicle_background_layer);
  layer_mark_dirty(s_vehicle_background_layer);

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
  gdraw_command_image_destroy(s_vehicle_image);
}

static void init(void) {
  s_vehicle_image = gdraw_command_image_create_with_resource(RESOURCE_ID_STREETCAR);

  s_window = window_create();
  window_set_click_config_provider(s_window, click_config_provider);
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
