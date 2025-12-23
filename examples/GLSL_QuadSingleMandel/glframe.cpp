#include <QResizeEvent>
#include <math.h>

#include "glframe.h"

QGLFrame::QGLFrame(QWidget *parent) :
    QGLWidget(parent),
    RenderThread(this)
{
    setAutoBufferSwap(false);
}

QGLFrame::~QGLFrame()
{
}

void QGLFrame::initRenderThread(void)
{
    doneCurrent();
    RenderThread.start();
}

void QGLFrame::stopRenderThread(void)
{
    RenderThread.stop();
    RenderThread.wait();
}

void QGLFrame::mousePressEvent(QMouseEvent * event)
{
    if (event->buttons() & Qt::LeftButton)
        {
        DragStart = event->pos();
        setCursor(Qt::OpenHandCursor);
        }
    if (event->buttons() & Qt::RightButton)
        {
        RenderThread.setCenter(event->pos());
        RenderThread.Redraw();
        }
}

void QGLFrame::wheelEvent(QWheelEvent * event)
{
  RenderThread.Zoom( (event->delta()>0), event->pos(), 2.0);
  updateLabels(event->pos());
  RenderThread.Redraw();
}


void QGLFrame::updateLabels(const QPoint &pos)
{
  double x,y;
    RenderThread.getMousePosition(x,y, pos);
    emit showRePosition(QString("%L1").arg(x,0,'f',16));
    emit showImPosition(QString("%L1").arg(y,0,'f',16));
    RenderThread.getZoom(y);
    emit showZoomValue(QString("%L1").arg(log2(y/128.),0,'f',2));
    emit showIterations(QString("%1").arg(RenderThread.getIterations()));
    emit showRadius(QString("%L1").arg(RenderThread.getRadius(),0,'f',2));
}


void QGLFrame::mouseMoveEvent(QMouseEvent * event)
{
    if(event->buttons() & Qt::LeftButton)
        {
        setCursor(Qt::ClosedHandCursor);
        RenderThread.Drag(event->pos()-DragStart);
        DragStart = event->pos();
        RenderThread.Redraw();
        }
    updateLabels(event->pos());
}

void QGLFrame::mouseReleaseEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton)
    {
        setCursor(Qt::ArrowCursor);
    }
}

void QGLFrame::resizeEvent(QResizeEvent *event)
{
    RenderThread.resizeViewport(event->size());
}

void QGLFrame::paintEvent(QPaintEvent *)
{
    RenderThread.Redraw();
}

void QGLFrame::closeEvent(QCloseEvent *event)
{
    stopRenderThread();
    QGLWidget::closeEvent(event);
}
