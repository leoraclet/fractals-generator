cmake_minimum_required(VERSION 3.31)

set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/cmake/toolchain.cmake")

project(fractals)

# -----------------------------
# Directories
# -----------------------------
set(IMGUI_SRC_DIR libs/imgui)
set(LIB_SFML_PATH libs/sfml)
set(LIB_DIR libs)
set(INCLUDE_DIR includes)
set(SRC_DIR src)

# -----------------------------
# Load OpenGL
# -----------------------------
set(OpenGL_GL_PREFERENCE "GLVND")
find_package(OpenGL REQUIRED)

# -----------------------------
# Load SFML
# -----------------------------
find_package(
    SFML 2.5.1 REQUIRED COMPONENTS
    system window graphics
    PATHS ${LIB_SFML_PATH}
)

# -----------------------------
# Load source files
# -----------------------------
set(SOURCES ${SRC_DIR}/main.cpp)
set(HEADERS)

# ImGui sources
set(
    IMGUI_LIB_SRC
    ${IMGUI_SRC_DIR}/imgui.cpp
    ${IMGUI_SRC_DIR}/imgui_draw.cpp
    ${IMGUI_SRC_DIR}/imgui_tables.cpp
    ${IMGUI_SRC_DIR}/imgui_widgets.cpp
    ${IMGUI_SRC_DIR}/imgui-SFML.cpp
)

# GLAD
set(
    LIBS_SRC
    ${LIB_DIR}/stb/stb_image.cpp
    ${LIB_DIR}/glad/src/glad.c
)

# -----------------------------
# Include directories
# -----------------------------
include_directories(
    ${LIB_DIR}
    ${INCLUDE_DIR}
    ${LIB_DIR}/glad/include
)

# -----------------------------
# Executable
# -----------------------------
add_executable(
    ${CMAKE_PROJECT_NAME}
    ${SOURCES}
    ${HEADERS}
    ${LIBS_SRC}
    ${IMGUI_LIB_SRC}
)

# Target include directories
target_include_directories(
    ${CMAKE_PROJECT_NAME} PRIVATE
    ${IMGUI_SRC_DIR}
)

# -----------------------------
# Link libraries
# -----------------------------
target_link_libraries(
    ${CMAKE_PROJECT_NAME} PRIVATE
    sfml-system
    sfml-window
    sfml-graphics
    dl
    ${OPENGL_LIBRARY}
    quadmath
)

# -----------------------------
# Copy shaders after build
# -----------------------------
add_custom_command(
    TARGET ${CMAKE_PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory
    $<TARGET_FILE_DIR:${CMAKE_PROJECT_NAME}>/shaders
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/assets/shaders
    $<TARGET_FILE_DIR:${CMAKE_PROJECT_NAME}>/shaders
)

# -----------------------------
# Cross-compile support
# -----------------------------

# See https://blog.kotatsu.dev/posts/2024-04-10-nixpkgs-clangd-missing-headers/
# Not sure if it works, but hey, it doesn't hurt
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
if(CMAKE_EXPORT_COMPILE_COMMANDS)
    set(CMAKE_CXX_STANDARD_INCLUDE_DIRECTORIES ${CMAKE_CXX_IMPLICIT_INCLUDE_DIRECTORIES})
    set(CMAKE_C_STANDARD_INCLUDE_DIRECTORIES ${CMAKE_C_IMPLICIT_INCLUDE_DIRECTORIES})
endif()

# cmake -S . -B build-win -G Ninja -DTARGET=x86_64-windows
# cmake --build build-win
