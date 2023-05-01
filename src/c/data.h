#pragma once

#include <pebble.h>

typedef enum {
    STREETCAR,
    SUBWAY,
} VehicleType;

typedef enum {
    ROUNDRECT,
    RECT,
    CIRCLE,
} RouteShape;

typedef struct {
    int time;
    char* unit;
    char* stop_name;
    char* dest_name;
    char* route_number;
    char* route_name;
    VehicleType vehicle_type;
    GColor color;
    RouteShape shape;
} WindowData;

typedef struct {
    GColor* color;
} AnimIntermediates;

typedef struct {
    WindowData* array;
    int data_len;
    int data_index;
    AnimIntermediates anim_intermediates;
} WindowDataArray;

WindowData* window_data_current(WindowDataArray*);
WindowData* window_data_next(WindowDataArray*);
WindowData* window_data_prev(WindowDataArray*);
int window_data_inc(WindowDataArray*);
int window_data_dec(WindowDataArray*);
int window_data_can_inc(WindowDataArray*);
int window_data_can_dec(WindowDataArray*);
GColor* get_display_gcolor(WindowDataArray* array);
