// created by Henry Thasler - thasler.org/blog

#include <QGLShader>
#include <QFileInfo>
#include <QElapsedTimer>

#include "glframe.h"
#include "glrenderthread.h"

typedef char GLchar;

#ifndef Q_WS_MAC
# ifndef APIENTRYP
#   ifdef APIENTRY
#     define APIENTRYP APIENTRY *
#   else
#     define APIENTRY
#     define APIENTRYP *
#   endif
# endif
#else
# define APIENTRY
# define APIENTRYP *
#endif

typedef void (APIENTRYP PFNGLUNIFORM1DVPROC) (GLint location, GLsizei count, const GLdouble *value);
PFNGLUNIFORM1DVPROC glUniform1dv;

typedef void (APIENTRYP PFNGLUNIFORM2DVPROC) (GLint location, GLsizei count, const GLdouble *value);
PFNGLUNIFORM2DVPROC glUniform2dv;

typedef void (APIENTRYP PFNGLUNIFORM2FVPROC) (GLint location, GLsizei count, const GLfloat *value);
PFNGLUNIFORM2FVPROC glUniform2fv;

typedef GLint (APIENTRYP PFNGLGETUNIFORMLOCATIONPROC) (GLuint program, const GLchar *name);
PFNGLGETUNIFORMLOCATIONPROC glGetUniformLocation;


QGLRenderThread::QGLRenderThread(QGLFrame *parent) :
    QThread(),
    GLFrame(parent)
{
    doRendering = true;
    doResize = false;
    UpdateFrame = true;
    FrameCounter=0;
    benchmark = false;

    RenderCaps = 0x01 | 0x02;

    ShaderProgram = NULL;
    VertexShader = FragmentShader = NULL;

    VShader.append("./FloatMandel.fsh");
    VShader.append("./EmuMandel.fsh");
    VShader.append("./DoubleMandel.fsh");
    VShader.append("./EmuQSMandel.fsh");

    xpos=-0.5;
    ypos=0.0;
    setZoom(0);

    xpos=-0.0946759168001283;
    ypos=-0.6502981821830600139833;
    setZoom(50);

    setIterations(200);
    setRadius(2.);
    setRenderMode(3);
}


void QGLRenderThread::resizeViewport(const QSize &size)
{
    w = size.width();
    h = size.height();
    doResize = true;
}


void QGLRenderThread::Drag(const QPoint &dir)
{
    xpos = xpos-((double)dir.x())/zoom;
    ypos = ypos+((double)dir.y())/zoom;
}

void QGLRenderThread::setCenter(const QPoint &pos)
{
    xpos = xpos+(double(pos.x())-double(w/2.))/zoom;
    ypos = ypos-(double(pos.y())-double(h/2.))/zoom;
}

// special Point-and-Zoom function
void QGLRenderThread::Zoom(bool dir, const QPoint &pos, double zfact)
{
    long double c;

    c = xpos+(pos.x()-w/2)/zoom;
    xpos = (xpos+((dir)?1.0:-1.0)*(c-xpos)*((dir)?(1.0-1.0/zfact):(zfact-1.0)));

    c = ypos-(pos.y()-h/2)/zoom;
    ypos = (ypos+((dir)?1.0:-1.0)*(c-ypos)*((dir)?(1.0-1.0/zfact):(zfact-1.0)));

    zoom*=(dir)?zfact:(1.0/zfact);
}

void QGLRenderThread::getPosition(double& x, double& y)
{
    x = xpos;
    y = ypos;
}

void QGLRenderThread::getMousePosition(double& x, double& y, const QPoint &pos)
{
    x = xpos+(pos.x()-w/2)/zoom;
    y = ypos-(pos.y()-h/2)/zoom;
}

void QGLRenderThread::stop()
{
    doRendering = false;
    WaitCondition.wakeOne();
}


void QGLRenderThread::Redraw()
{
    WaitCondition.wakeOne();
}


void QGLRenderThread::run()
{
    QElapsedTimer timer;

    GLFrame->makeCurrent();
    GLInit();
    LoadShader("./Basic.vsh", VShader.at(RenderMode));

    timer.start();
    while (doRendering)
        {
        if(doResize)
            {
            GLResize(w, h);
            doResize = false;
            }
        if(reloadShader)
            {
            LoadShader("./Basic.vsh", VShader.at(RenderMode));
            reloadShader = false;
            }


        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        glLoadIdentity();

        paintGL(); // render actual frame

        GLFrame->swapBuffers();

        if(!benchmark)
            {
            Mutex.lock();
            UpdateFrame = false;
            if(!UpdateFrame && doRendering && !reloadShader)
                WaitCondition.wait(&Mutex);
            Mutex.unlock();
            }
        else
            {
            if(!(FrameCounter%100))
                {
                emit showFPS(QString("%L1 FPS").arg(100000.0/(float)timer.elapsed(),0,'f',2));
                timer.restart();
                }
            }

        FrameCounter++;
        }
}


void QGLRenderThread::GLInit(void)
{
    glClearColor(0.25f, 0.25f, 0.4f, 0.0f);     // Background => dark blue
    glDisable(GL_DEPTH_TEST);
    glEnable(GL_TEXTURE_2D);

    const GLubyte* pGPU = glGetString(GL_RENDERER);
    const GLubyte* pVersion = glGetString(GL_VERSION);
    const GLubyte* pShaderVersion = glGetString(GL_SHADING_LANGUAGE_VERSION);

    qDebug() << "GPU: " << QString((char*)pGPU);
    qDebug() << "OpenGL: " << QString((char*)pVersion);
    qDebug() << "GLSL: " << QString((char*)pShaderVersion);

    glGetUniformLocation = (PFNGLGETUNIFORMLOCATIONPROC) GLFrame->context()->getProcAddress("glGetUniformLocation");
    glUniform2fv = (PFNGLUNIFORM2FVPROC) GLFrame->context()->getProcAddress("glUniform2fv");

    // collect special handles four double precision
    glUniform1dv = (PFNGLUNIFORM1DVPROC) GLFrame->context()->getProcAddress("glUniform1dv");
    glUniform2dv = (PFNGLUNIFORM2DVPROC) GLFrame->context()->getProcAddress("glUniform2dv");

    if(glGetUniformLocation && glUniform1dv && glUniform2dv) // did we get all handles?
        {
        qDebug() << "Yay! Hardware accelerated double precision enabled.";
        RenderCaps |= 0x04; // yes, we can perform double precision rendering
        }
    else qDebug() << "Too bad, your GPU does not support hardware accelerated double precision.";

    emit updateRenderCaps(RenderCaps);
}


void QGLRenderThread::GLResize(int& width, int& height)
{
    glViewport(0, 0, width, height);
    glMatrixMode(GL_PROJECTION);

    glLoadIdentity();

    glOrtho (0, width, 0, height, 0, 1);

    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
}


void QGLRenderThread::paintGL(void)
{
  double tmp, dvec2[2];
  float vec2[2];

    // common shader values
    ShaderProgram->setUniformValue("iterations", max_iterations);
    ShaderProgram->setUniformValue("radius", float(radius));
    ShaderProgram->setUniformValue("frame", (float)FrameCounter);

    switch(RenderMode)
        {
        case 0: // single precision (float32) shader values
                ShaderProgram->setUniformValue("f_cx",  (float)xpos);
                ShaderProgram->setUniformValue("f_cy",  (float)ypos);

                ShaderProgram->setUniformValue("f_sx",  (float)(-((double)w)/2.0/zoom));
                ShaderProgram->setUniformValue("f_sy",  (float)(-((double)h)/2.0/zoom));

                ShaderProgram->setUniformValue("f_z", (float)(1./zoom));
                break;

        case 1: // emulated double precision shader values (double-single)
                vec2[0] = (float)xpos;
                vec2[1] = xpos - (double)vec2[0];
                ShaderProgram->setUniformValue("ds_cx0",  vec2[0]);
                ShaderProgram->setUniformValue("ds_cx1",  vec2[1]);

                vec2[0] = (float)ypos;
                vec2[1] = ypos - (double)vec2[0];
                ShaderProgram->setUniformValue("ds_cy0",  vec2[0]);
                ShaderProgram->setUniformValue("ds_cy1",  vec2[1]);

                tmp= 1./zoom;
                vec2[0] = (float)tmp;
                vec2[1] = tmp - (double)vec2[0];
                ShaderProgram->setUniformValue("ds_z0",  vec2[0]);
                ShaderProgram->setUniformValue("ds_z1",  vec2[1]);

                tmp= -((double)w)/2.0/zoom;
                vec2[0] = (float)tmp;
                vec2[1] = tmp - (double)vec2[0];
                ShaderProgram->setUniformValue("ds_w0",  vec2[0]);
                ShaderProgram->setUniformValue("ds_w1",  vec2[1]);

                tmp= -((double)h)/2.0/zoom;
                vec2[0] = (float)tmp;
                vec2[1] = tmp - (double)vec2[0];
                ShaderProgram->setUniformValue("ds_h0",  vec2[0]);
                ShaderProgram->setUniformValue("ds_h1",  vec2[1]);
                break;

        case 2: // double precision (FP64) shader values
                dvec2[0] = xpos;
                dvec2[1] = ypos;
                glUniform2dv(glGetUniformLocation(ShaderProgram->programId(), "d_c"), 2, dvec2);
                dvec2[0] = -((double)w)/2.0/zoom;
                dvec2[1] = -((double)h)/2.0/zoom;
                glUniform2dv(glGetUniformLocation(ShaderProgram->programId(), "d_s"), 2, dvec2);
                tmp = 1./zoom;
                glUniform1dv(glGetUniformLocation(ShaderProgram->programId(), "d_z"), 1, &tmp);
                break;

        case 3: // emulated quadruple precision shader values (quad-single)
                vec2[0] = (float)xpos;
                vec2[1] = xpos - (double)vec2[0];
                glUniform2fv(glGetUniformLocation(ShaderProgram->programId(), "qs_cx"), 2, vec2);

                vec2[0] = (float)ypos;
                vec2[1] = ypos - (double)vec2[0];
                glUniform2fv(glGetUniformLocation(ShaderProgram->programId(), "qs_cy"), 2, vec2);

                tmp= 1./zoom;
                vec2[0] = (float)tmp;
                vec2[1] = tmp - (double)vec2[0];
                glUniform2fv(glGetUniformLocation(ShaderProgram->programId(), "qs_z"), 2, vec2);

                tmp= -((double)w)/2.0/zoom;
                vec2[0] = (float)tmp;
                vec2[1] = tmp - (double)vec2[0];
                glUniform2fv(glGetUniformLocation(ShaderProgram->programId(), "qs_w"), 2, vec2);

                tmp= -((double)h)/2.0/zoom;
                vec2[0] = (float)tmp;
                vec2[1] = tmp - (double)vec2[0];
                glUniform2fv(glGetUniformLocation(ShaderProgram->programId(), "qs_h"), 2, vec2);
                break;
            }


    // draw canvas
    glBegin(GL_QUADS);
        glNormal3f(0.,0.,1.); glColor3f(1.,0.,0.); glTexCoord2f(0, 0); glVertex3i(0, 0, 0);
        glNormal3f(0.,0.,1.); glColor3f(1.,1.,0.); glTexCoord2f(w, 0); glVertex3i(w, 0, 0);
        glNormal3f(0.,0.,1.); glColor3f(1.,1.,1.); glTexCoord2f(w, h); glVertex3i(w, h, 0);
        glNormal3f(0.,0.,1.); glColor3f(1.,0.,1.); glTexCoord2f(0, h); glVertex3i(0, h, 0);
    glEnd();
}

void QGLRenderThread::LoadShader(const QString& vshader,const QString& fshader)
{
    if(ShaderProgram)   // clear existing ShaderProgram
        {
        ShaderProgram->release();
        ShaderProgram->removeAllShaders();
        delete ShaderProgram;
        ShaderProgram = NULL;
        }

    if(VertexShader)
        {
        delete VertexShader;
        VertexShader = NULL;
        }

    if(FragmentShader)
        {
        delete FragmentShader;
        FragmentShader = NULL;
        }

    // create ShaderProgram instance
    ShaderProgram = new QGLShaderProgram;

    // load and compile vertex shader
    QFileInfo vsh(vshader);
    if(vsh.exists())
        {
        VertexShader = new QGLShader(QGLShader::Vertex);
        if(VertexShader->compileSourceFile(vshader))
            ShaderProgram->addShader(VertexShader);
        else qWarning() << "Vertex Shader Error" << VertexShader->log();
        }
    else qWarning() << "Vertex Shader source file " << vshader << " not found.";


    // load and compile fragment shader
    QFileInfo fsh(fshader);
    if(fsh.exists())
        {
        FragmentShader = new QGLShader(QGLShader::Fragment);
        if(FragmentShader->compileSourceFile(fshader))
            ShaderProgram->addShader(FragmentShader);
        else qWarning() << "Fragment Shader Error" << FragmentShader->log();
        }
    else qWarning() << "Fragment Shader source file " << fshader << " not found.";

    if(!ShaderProgram->link())
        {
        qWarning() << "Shader Program Linker Error" << ShaderProgram->log();
        }
    else ShaderProgram->bind();
}
