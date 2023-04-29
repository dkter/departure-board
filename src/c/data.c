#include "data.h"

WindowData* window_data_current(WindowDataArray* array) {
    return &array->array[array->data_index];
}

int window_data_inc(WindowDataArray* array) {
  if (array->data_index < array->data_len - 1) {
    array->data_index += 1;
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