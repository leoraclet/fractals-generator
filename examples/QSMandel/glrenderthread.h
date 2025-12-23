#ifndef GLRENDERTHREAD_H
#define GLRENDERTHREAD_H

#include <QThread>
#include <QGLWidget>
#include <QWaitCondition>
#include <QMutex>
#include <math.h>

#define GL_SHADING_LANGUAGE_VERSION       0x8B8C

#define min(a, b) ((a)<(b))?(a):(b)

class QGLFrame;
class QSize;
class QGLShaderProgram;
class QGLShader;

#ifdef __GNUC__
typedef __float128 LongReal;
#else
typedef long double LongReal;
#endif

class QGLRenderThread : public QThread
{
    Q_OBJECT
public:
    explicit QGLRenderThread(QGLFrame *parent = 0);
    void resizeViewport(const QSize &size);

    void setXpos(LongReal val) {xpos = val;}
    void setYpos(LongReal val) {ypos = val;}
    void setZoom(double val) {zoom = ((double)(128.))*((double)(exp2(val)));}
    void setIterations(int val) {max_iterations = val;}
    void setRadius(double val) {radius = val;}
    void setBenchmark(bool OnOff) {benchmark = OnOff; FrameCounter=0;}
    void setRenderMode(int Mode) {RenderMode= min(Mode,VShader.length()-1);reloadShader = true;}
    void setCenter(const QPoint &pos);
    void Zoom(bool dir, const QPoint &pos, double);
    void getPosition(double &x, double &y);
    void getZoom(double &z) {z=zoom;}
    double getRadius(void) {return((double)radius);}
    int getIterations(void) {return(max_iterations);}
    void getMousePosition(double& x, double& y, const QPoint &pos);
    void Drag(const QPoint &dir);

    void Redraw();

    void run(void);
    void stop(void);
    void ReloadShader(void) {reloadShader = true;}

protected:
    void GLInit(void);
    void GLResize(int& width, int& height);
    void paintGL(void);
    void LoadShader(const QString& vshader,const QString& fshader);
private:
    void setupBuffers();

signals:
    void showFPS(QString fps);
    void updateRenderCaps(const int &caps);

public slots:


private:
    GLuint vbo, vao;
    bool doRendering, doResize, UpdateFrame, reloadShader, benchmark;
    int w, h, FrameCounter;

    QGLFrame *GLFrame;

    QGLShaderProgram *ShaderProgram;
    QGLShader *VertexShader, *FragmentShader;

    LongReal xpos, ypos, zoom, radius;
    int max_iterations;

    int RenderMode, RenderCaps;
    QStringList VShader;

    QWaitCondition WaitCondition;
    QMutex Mutex;
};

#endif // GLRENDERTHREAD_H
