// C++
#include <SFML/Window/Event.hpp>
#include <SFML/Window/Keyboard.hpp>
#include <array>
#include <cmath>
#include <fstream>
#include <iostream>
#include <ostream>
#include <sstream>
#include <quadmath.h>
#include <math.h>
// Dear ImGui
#include "imgui/imgui-SFML.h"
#include "imgui/imgui-style.h"
#include "imgui/imgui.h"
// GLAD
#include "glad/glad.h"
// SFML
#include "SFML/Graphics.hpp"

#ifdef __GNUC__
typedef __float128 LongReal;
#else
typedef long double LongReal;
#endif

// Quad vertices and indices
float vertices[] = {
    -1.0f, -1.0f, 0.0f, 1.0f, 1.0f, 0.0f, -1.0f, 1.0f, 0.0f, 1.0f, -1.0f, 0.0f,
};
unsigned int indices[] = {
    0, 1, 2, 0, 3, 1,
};

// Colors for buttons
ImVec4 RED = ImVec4{0.8f, 0.1f, 0.1f, 1.0f};
ImVec4 GREEN = ImVec4{0.1f, 0.8f, 0.1f, 1.0f};
ImVec4 BLUE = ImVec4{0.1f, 0.1f, 0.8f, 1.0f};
ImVec4 BLACK = ImVec4{0.0f, 0.0f, 0.0f, 1.0f};

enum RENDER_MODES {
  FLOAT,            // Single precision (float32) shader values
  DOUBLE,           // Emulated double precision shader values (double-single)
  EMULATED_DOUBLE,  // Double precision (FP64) shader values
  EMULATED_QUADRUPLE,  // Emulated quadruple precision shader values
                       // (quad-single)
  FP128,               // Fixed-Point 128 bits reals
  NONE,                // Placeholder
  DUAL,                // Single precision (float32) vs. Double precision (float64)
  DUAL_F128,           // Double precision (float64) vs . Quad-single precision (float128 / QS EMU)
};

unsigned int nb_screenshots = 0;
GLubyte *pixels = NULL;
bool smooth = 0;
int color = 1;                    // Color method
int type = 0;                     // Fractal type
int iterations = 100;             // Number of iterations
int mouse_x = 0;                  // Mouse X coordinates
int mouse_y = 0;                  // Mouse Y coordinates
bool mouse_clicked = false;       // Is mouse being clicked ?
std::array<float, 2> c = {0, 0};  // Value of C constant for Julia set

LongReal d_zoom = 1.f / 256.f;  // Zoom in the complex plane
LongReal cx = 0.0;  // Position of the complex plane X-center on screen
LongReal cy = 0.0;  // Position of the complex plane Y-center on screen
double w, h;        // Width & Height of the rendered window

int render_mode = EMULATED_DOUBLE;
sf::Shader shader;
bool shift_hold = false;

void take_screenshot() {
  size_t cur;
  sf::Image sf_image;
  sf_image.create(w, h);
  glReadPixels(0, 0, w, h, GL_RGB, GL_UNSIGNED_BYTE, pixels);

  for (unsigned int i = 0; i < (unsigned int) w; i++) {
    for (unsigned int j = 0; j < (unsigned int) h; j++) {
      cur = (((unsigned int) h - j - 1) * (unsigned int) w + i) * 3;
      sf::Color color(pixels[cur], pixels[cur + 1], pixels[cur + 2]);
      sf_image.setPixel(i, j, color);
    }
  }

  sf_image.saveToFile("screen_" + std::to_string(nb_screenshots++) + ".png");
}

void loadShader(const std::string &filename) {
  sf::Shader::bind(nullptr);

  auto load = [](const std::string &path) {
    std::ifstream file(path);
    std::stringstream buf;
    buf << file.rdbuf();
    return buf.str();
  };

  std::string vert = load("./shaders/fractal.vert");
  std::string frag = load(filename);

  if (!shader.loadFromMemory(vert, frag)) {
    std::cout << "Shader load failed ! " << std::endl;
  }
  sf::Shader::bind(nullptr);
  if (!shader.loadFromFile("./shaders/fractal.vert", filename)) {
    std::cout << "Error loading shader" << std::endl;
    exit(-1);
  }
}

void selectAndLoadShader() {
  // Load shader depending on Redner Mode
  switch (render_mode) {
    case FLOAT:
      loadShader("./shaders/fractal_f64_em.frag");
      break;
    case DOUBLE:
      loadShader("./shaders/fractal_f64.frag");
      break;
    case EMULATED_DOUBLE:
      loadShader("./shaders/fractal.frag");
      break;
    case EMULATED_QUADRUPLE:
      loadShader("./shaders/fractal_f128.frag");
      break;
    case DUAL:
      loadShader("./shaders/fractal_dual.frag");
      break;
    case FP128:
      loadShader("./shaders/fractal_fp128.frag");
      break;
    case DUAL_F128:
      std::cout << "Not implemented yet" << std::endl;
      break;
    default:
      std::cout << "[ERROR] - There is no such render mode !" << std::endl;
      break;
  }
}

int main() {
  sf::RenderWindow window(sf::VideoMode::getDesktopMode(), "Fractals");
  window.setVerticalSyncEnabled(true);
  window.setKeyRepeatEnabled(false);

  h = (double) window.getSize().y;
  w = (double) window.getSize().x;

  // Alloc pixels
  pixels = (unsigned char *) malloc(3 * w * h);

  // Initialize and load GLAD
  int version = gladLoadGL();
  if (version == 0) {
    std::cout << "Failed to initialize GLAD" << std::endl;
    return -1;
  }

  // Successfully loaded OpenGL
  printf("Loaded OpenGL sucessfully\n");

  // ---------------------------------------------------- //
  // Show OpenGL informations
  // ---------------------------------------------------- //
  std::cout << "- Shading Language = "
            << glGetString(GL_SHADING_LANGUAGE_VERSION) << std::endl;
  std::cout << "- Version = " << glGetString(GL_VERSION) << std::endl;
  std::cout << "- Vendor = " << glGetString(GL_VENDOR) << std::endl;
  std::cout << "- Renderer = " << glGetString(GL_RENDERER) << std::endl
            << std::endl;

  GLint numExtensions;
  glGetIntegerv(GL_NUM_EXTENSIONS, &numExtensions);
  std::cout << "- Extensions" << std::endl;
  for (GLint i = 0; i < numExtensions; i++) {
    std::cout << glGetStringi(GL_EXTENSIONS, i) << std::endl;
  }

  std::cout << std::endl;

  // ---------------------------------------------------- //
  // ---------------------------------------------------- //

  // Check for supported hardware dounle
  if (GLAD_GL_ARB_gpu_shader_fp64) {
    std::cout << "- Hardware accelerated double precision enabled" << std::endl;
    render_mode = EMULATED_DOUBLE;
  } else {
    std::cout << "- Your GPU does not support hardware accelerated "
                 "double precision."
              << std::endl;
  }

  std::cout << "- Render mode: " << render_mode << std::endl;
  std::cout << std::endl;

  // OpenGL viewport
  glViewport(0, 0, (int) w, (int) h);

  // Initialize Dear ImGui
  if (!ImGui::SFML::Init(window)) return -1;

  setImGuiStyle();
  selectAndLoadShader();

  // Shape
  unsigned int VAO, VBO, EBO;

  glGenVertexArrays(1, &VAO);
  glGenBuffers(1, &VBO);
  glGenBuffers(1, &EBO);

  glBindVertexArray(VAO);
  glBindBuffer(GL_ARRAY_BUFFER, VBO);
  glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices,
               GL_STATIC_DRAW);
  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float),
                        (void *) nullptr);

  glEnableVertexAttribArray(0);
  glBindBuffer(GL_ARRAY_BUFFER, 0);
  glBindVertexArray(0);

  bool p_open = true;

  // Timer
  sf::Clock clock;

  // Window main loop
  while (window.isOpen()) {
    ImGui::SFML::Update(window, clock.restart());
    sf::Event event{};

    while (window.pollEvent(event)) {
      ImGui::SFML::ProcessEvent(window, event);

      switch (event.type) {
        case sf::Event::Closed:
          window.close();
          break;

        // Handle window resized event
        case sf::Event::Resized:
          glViewport(0, 0, (int) event.size.width, (int) event.size.height);
          break;

        // handle keyboard inputs
        case sf::Event::KeyReleased:
          switch (event.key.code) {
            case sf::Keyboard::Escape:
              window.close();
              break;
            case sf::Keyboard::S: {
              take_screenshot();
              ImGui::OpenPopup("Screenshot saved !");
              break;
            }
            case sf::Keyboard::R:
              d_zoom = 1.f / 256.f;
              cx = 0.0;
              cy = 0.0;
              iterations = 100;
              mouse_clicked = false;
              c[0] = 0;
              c[1] = 1;
              case sf::Keyboard::LShift:
              shift_hold = false;
              break;
            case sf::Keyboard::Right:
              color = (color + 1) % 7;
              break;
            case sf::Keyboard::Left:
              color = (color + 6) % 7;
              break;
            default:
              break;
          }
          break;

        // Handle mouse motion
        case sf::Event::MouseMoved:
          if (mouse_clicked) {
            int delta_x = mouse_x - event.mouseMove.x;
            int delta_y = mouse_y - event.mouseMove.y;

            cx += delta_x * d_zoom;
            cy -= delta_y * d_zoom;
          }
          mouse_x = event.mouseMove.x;
          mouse_y = event.mouseMove.y;
          break;

        // Handle mouse scrolling
        case sf::Event::MouseWheelScrolled: {
          double old_zoom = d_zoom;
          d_zoom = d_zoom * (event.mouseWheelScroll.delta > 0 ? 1.04 : 0.96);

          cx += ((w * old_zoom) - (w * d_zoom)) * (mouse_x - (w / 2.0)) / w;
          cy -= ((h * old_zoom) - (h * d_zoom)) * (mouse_y - (h / 2.0)) / h;

          break;
        }
        case sf::Event::MouseButtonPressed:
          if (event.mouseButton.button == sf::Mouse::Right) {
            mouse_clicked = true;
          }
          break;

        case sf::Event::MouseButtonReleased:
          if (event.mouseButton.button == sf::Mouse::Right) {
            mouse_clicked = false;
          }
          break;
        case sf::Event::KeyPressed:
            switch (event.key.code) {
                case sf::Keyboard::LShift:
                shift_hold = true;
                break;
                default:
                break;
            }
          break;
        default:
          break;
      }
    }

    if (sf::Keyboard::isKeyPressed(sf::Keyboard::Space))
    {
        double old_zoom = d_zoom;
        d_zoom = d_zoom * (shift_hold == true ? 1.01 : 0.99);

        cx += ((w * old_zoom) - (w * d_zoom)) * (mouse_x - (w / 2.0)) / w;
        cy -= ((h * old_zoom) - (h * d_zoom)) * (mouse_y - (h / 2.0)) / h;
    }
    if (sf::Keyboard::isKeyPressed(sf::Keyboard::Z))
    {
        cy += 0.01 * d_zoom * 256.f;
    }
    if (sf::Keyboard::isKeyPressed(sf::Keyboard::S))
    {
        cy -= 0.01 * d_zoom * 256.f;
    }
    if (sf::Keyboard::isKeyPressed(sf::Keyboard::Q))
    {
        cx -= 0.01 * d_zoom * 256.f;
    }
    if (sf::Keyboard::isKeyPressed(sf::Keyboard::D))
    {
        cx += 0.01 * d_zoom * 256.f;
    }
    if (sf::Keyboard::isKeyPressed(sf::Keyboard::Up))
    {
        iterations++;
    }
    if (sf::Keyboard::isKeyPressed(sf::Keyboard::Down))
    {
        iterations--;
    }

    // ImGui window - Menu
    ImGui::Begin("Simulation settings", &p_open,
                 ImGuiWindowFlags_AlwaysAutoResize | ImGuiWindowFlags_NoResize);
    ImGui::PushItemWidth(ImGui::GetWindowWidth() * 0.9f);
    ImGui::Text("Render mode :");
    if (ImGui::Combo("##mode", &render_mode,
                     "FLOAT\0HARDWARE DOUBLE\0EMULATED DOUBLE\0EMULATED "
                     "QUADRUPLE\0FIXED-POINT QUADRUPLE\0----\0DUAL - FLOAT vs. "
                     "DOUBLE\0\0")) {
      selectAndLoadShader();
    }
    ImGui::NewLine();
    ImGui::Text("Fractal type :");
    if (render_mode == DOUBLE) {
      ImGui::Combo("##type", &type,
                   "Mandelbrot\0Julia\0Burning Ship\0Tricorn\0Newton 1\0Newton "
                   "2\0Newton Playground\0\0");
    } else {
      ImGui::Combo(
          "##type", &type,
          "Mandelbrot\0Julia\0Burning Ship\0Tricorn\0Newton 1\0Newton 2\0\0");
    }
    ImGui::NewLine();
    ImGui::Separator();
    ImGui::NewLine();
    ImGui::Text("Maximum iterations :");
    ImGui::SliderInt("##i", &iterations, 10, 500);
    ImGui::NewLine();
    if (type == 1) {
      ImGui::Text("The initial C value (Re and Im) :");
      ImGui::SliderFloat2("##c", c.data(), -2.f, 2.f);
      ImGui::NewLine();
    }
    if (type < 4) {
      ImGui::Text("Color palette :");
      ImGui::Combo("##color", &color,
                   "Black and White\0Original\0Shades of "
                   "Grey\0Sky\0Fire\0Electrical\0Gold\0\0");
      ImGui::NewLine();
    }

    ImGui::Text("Smooth:");
    ImGui::Checkbox("##smooth", &smooth);
    ImGui::NewLine();
    static char Re[64] = "0.0000";
    quadmath_snprintf(Re, sizeof Re, "%0.40Qf", cx);
    ImGui::Text("Real Coordinate :");
    ImGui::SetNextItemWidth(ImGui::GetWindowWidth() * 0.9f);
    bool changed_r = ImGui::InputText("##real", Re, IM_ARRAYSIZE(Re));
    if (changed_r)
    {
        std::cout << Re << std::endl;
    }
    ImGui::NewLine();
    static char Im[64] = "0.0000";
    quadmath_snprintf(Im, sizeof Im, "%0.40Qf", cy);
    ImGui::Text("Imaginary Coordinate :");
    ImGui::SetNextItemWidth(ImGui::GetWindowWidth() * 0.9f);
    bool changed_i = ImGui::InputText("##imaginary", Im, IM_ARRAYSIZE(Im));
    if (changed_i)
    {
        std::cout << Im << std::endl;
    }
    ImGui::NewLine();
    ImGui::PushStyleColor(ImGuiCol_Button, RED);
    if (ImGui::Button("Reset (R)",
                      ImVec2(ImGui::GetWindowSize().x * 0.9f, 40.0f))) {
      d_zoom = 1.f / 256.f;
      cx = 0.0;
      cy = 0.0;
      iterations = 100;
      mouse_clicked = false;
      c[0] = 0;
      c[1] = 1;
    }
    ImGui::PopStyleColor(1);
    ImGui::NewLine();
    ImGui::PushStyleColor(ImGuiCol_Button, GREEN);
    if (ImGui::Button("Screenshot (S)",
                      ImVec2(ImGui::GetWindowSize().x * 0.9f, 40.0f))) {
      take_screenshot();
      ImGui::OpenPopup("Screenshot saved !");
    }
    if (ImGui::BeginPopupModal("Screenshot saved !")) {
      ImGui::Text("You can now close this popup");
      if (ImGui::Button("Close Popup",
                        ImVec2(ImGui::GetWindowSize().x * 0.9f, 30.0f))) {
        ImGui::CloseCurrentPopup();
      }
      ImGui::NewLine();
      ImGui::EndPopup();
    }
    ImGui::PopStyleColor(1);
    ImGui::NewLine();
    ImGui::Separator();
    ImGui::NewLine();
    ImGui::Text("Z  : %0.1Lf", 1. / (long double) d_zoom);
    ImGui::Text("Re : %0.40Lf", (long double) cx);
    ImGui::Text("Im : %0.40Lf", (long double) cy);
    ImGui::Text("Mx : %d", mouse_x);
    ImGui::Text("My : %d", mouse_y);
    ImGui::End();

    // OpenGL
    glEnable(GL_DEPTH_TEST);

    // Use shader
    sf::Shader::bind(&shader);

    // Transfers variables to the shader
    float vec2[2], vec4[4];
    double tmp, dvec2[2];

    shader.setUniform("fractal", type);
    shader.setUniform("iterations", iterations);
    shader.setUniform("color", color);

    shader.setUniform("cR", c[0]);
    shader.setUniform("cI", c[1]);

    switch (render_mode) {
      case FLOAT:
        shader.setUniform("f_cx", (float) cx);
        shader.setUniform("f_cy", (float) cy);

        shader.setUniform("f_w", (float) w);
        shader.setUniform("f_h", (float) h);

        shader.setUniform("f_z", (float) d_zoom);
        break;
      case DOUBLE:
        dvec2[0] = cx;
        dvec2[1] = cy;
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "cx"), 1,
                     &dvec2[0]);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "cy"), 1,
                     &dvec2[1]);

        dvec2[0] = -(double(w)) / 2.0 * d_zoom;
        dvec2[1] = -(double(h)) / 2.0 * d_zoom;
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "sx"), 1,
                     &dvec2[0]);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "sy"), 1,
                     &dvec2[1]);

        tmp = double(d_zoom);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "d_z"), 1,
                     &tmp);
        tmp = double(mouse_x);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "mx"), 1,
                     &tmp);
        tmp = double(mouse_y);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "my"), 1,
                     &tmp);
        break;
      case EMULATED_DOUBLE:
        vec2[0] = float(cx);
        vec2[1] = float(cx - double(vec2[0]));

        shader.setUniform("cx0", vec2[0]);
        shader.setUniform("cx1", vec2[1]);

        vec2[0] = float(cy);
        vec2[1] = float(cy - double(vec2[0]));

        shader.setUniform("cy0", vec2[0]);
        shader.setUniform("cy1", vec2[1]);

        vec2[0] = float(d_zoom);
        vec2[1] = float(d_zoom - double(vec2[0]));

        shader.setUniform("z0", vec2[0]);
        shader.setUniform("z1", vec2[1]);

        tmp = -(double(w)) / 2.0 * d_zoom;
        vec2[0] = float(tmp);
        vec2[1] = float(tmp - double(vec2[0]));

        shader.setUniform("w0", vec2[0]);
        shader.setUniform("w1", vec2[1]);

        tmp = -(double(h)) / 2.0 * d_zoom;
        vec2[0] = float(tmp);
        vec2[1] = float(tmp - double(vec2[0]));

        shader.setUniform("h0", vec2[0]);
        shader.setUniform("h1", vec2[1]);
        break;
      case EMULATED_QUADRUPLE:
        vec4[0] = cx;
        vec4[1] = cx - vec4[0];
        vec4[2] = cx - vec4[0] - vec4[1];
        vec4[3] = cx - vec4[0] - vec4[1] - vec4[2];
        glUniform4fv(glGetUniformLocation(shader.getNativeHandle(), "qs_cx"), 1,
                     vec4);

        vec4[0] = cy;
        vec4[1] = cy - vec4[0];
        vec4[2] = cy - vec4[0] - vec4[1];
        vec4[3] = cy - vec4[0] - vec4[1] - vec4[2];
        glUniform4fv(glGetUniformLocation(shader.getNativeHandle(), "qs_cy"), 1,
                     vec4);

        vec2[0] = float(d_zoom);
        vec2[1] = float(d_zoom - double(vec2[0]));

        glUniform2fv(glGetUniformLocation(shader.getNativeHandle(), "qs_z"), 1,
                     vec2);

        tmp = -(double(w)) / 2.0 * d_zoom;
        vec2[0] = float(tmp);
        vec2[1] = float(tmp - double(vec2[0]));

        glUniform2fv(glGetUniformLocation(shader.getNativeHandle(), "qs_w"), 1,
                     vec2);

        tmp = -(double(h)) / 2.0 * d_zoom;
        vec2[0] = float(tmp);
        vec2[1] = float(tmp - double(vec2[0]));

        glUniform2fv(glGetUniformLocation(shader.getNativeHandle(), "qs_h"), 1,
                     vec2);

        shader.setUniform("one", 1);
        break;
      case FP128:
        // TODO: FP128 shader uniforms
        std::cout << "Not implemented yet !" << std::endl;
        break;
      case DUAL:
        dvec2[0] = cx;
        dvec2[1] = cy;
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "cx"), 1,
                     &dvec2[0]);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "cy"), 1,
                     &dvec2[1]);

        dvec2[0] = -(double(w)) / 2.0 * d_zoom;
        dvec2[1] = -(double(h)) / 2.0 * d_zoom;
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "sx"), 1,
                     &dvec2[0]);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "sy"), 1,
                     &dvec2[1]);

        tmp = double(d_zoom);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "d_z"), 1,
                     &tmp);
        tmp = double(mouse_x);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "mx"), 1,
                     &tmp);
        tmp = double(mouse_y);
        glUniform1dv(glGetUniformLocation(shader.getNativeHandle(), "my"), 1,
                     &tmp);

        shader.setUniform("width", (float) w);
        break;
      case DUAL_F128:
        std::cout << "Not implemented yet !" << std::endl;
        break;
      default:
        std::cout << "Wrong render mode !" << std::endl;
        break;
    }

    // Load buffers and Draw pixels
    glClear(GL_COLOR_BUFFER_BIT);
    glBindVertexArray(VAO);
    glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, nullptr);
    glBindVertexArray(0);

    // Update
    iterations = 50 + 5 * (int)(log((long double)(1.0 / d_zoom)));

    // Render to window
    ImGui::SFML::Render(window);
    window.display();
  }

  // Cleanup buffer
  glDeleteVertexArrays(1, &VAO);
  glDeleteBuffers(1, &VBO);
  glDeleteBuffers(1, &EBO);

  // Shutdown Dear ImGui
  ImGui::SFML::Shutdown();

  // Cleanuop dynamically allcocated memory
  free(pixels);

  return 0;
}
