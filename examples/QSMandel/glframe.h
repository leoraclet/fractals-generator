#ifndef GLFRAME_H
#define GLFRAME_H

#include <QGLWidget>
#include "glrenderthread.h"

class QGLFrame : public QGLWidget
{
    Q_OBJECT
public:
    explicit QGLFrame(QWidget *parent = 0);
    ~QGLFrame();
    void initRenderThread(void);
    void stopRenderThread(void);

    void updateLabels(const QPoint &pos);
    QGLRenderThread RenderThread;

signals:
    void showRePosition(QString pos);
    void showImPosition(QString pos);
    void showZoomValue(QString z);
    void showIterations(QString i);
    void showRadius(QString r);

public slots:

protected:
    void closeEvent(QCloseEvent *event);
    void resizeEvent(QResizeEvent *event);
    void paintEvent(QPaintEvent *);
    void mousePressEvent(QMouseEvent *event);
    void mouseReleaseEvent(QMouseEvent *event);
    void mouseMoveEvent(QMouseEvent * event);
    void wheelEvent(QWheelEvent * event);

    QPoint DragStart;

private:
    QGLFormat getFormat() const;

};

#endif // GLFRAME_H
