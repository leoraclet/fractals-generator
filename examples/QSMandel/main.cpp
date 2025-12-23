#include <QtGui/QApplication>
#include "mainwindow.h"

int main(int argc, char *argv[])
{
    QApplication::setAttribute(Qt::AA_X11InitThreads);
    QApplication a(argc, argv);
    MainWindow w;
    w.show();

    return a.exec();
}
