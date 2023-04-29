#include <pebble.h>

typedef enum {
    STREETCAR
} VehicleType;

typedef struct {
    int time;
    char* unit;
    char* stop_name;
    char* dest_name;
    char* route_number;
    char* route_name;
    VehicleType vehicle_type;
} WindowData;