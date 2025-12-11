# the minimum version of CMake.
cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

set(rnoh_watermelondb_generated_dir "${CMAKE_CURRENT_SOURCE_DIR}/generated")
file(GLOB_RECURSE rnoh_watermelondb_generated_SRC "${rnoh_watermelondb_generated_dir}/**/*.cpp")
file(GLOB rnoh_watermelondb_SRC CONFIGURE_DEPENDS *.cpp)
add_library(watermelondb SHARED ${rnoh_watermelondb_SRC} ${rnoh_watermelondb_generated_SRC})
target_include_directories(watermelondb PUBLIC ${CMAKE_CURRENT_SOURCE_DIR} ${rnoh_watermelondb_generated_dir})
target_link_libraries(watermelondb PUBLIC rnoh)
