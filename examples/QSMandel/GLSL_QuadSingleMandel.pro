#-------------------------------------------------
#
# Project created by QtCreator 2011-07-04T21:12:27
#
#-------------------------------------------------

QT       += core gui opengl

TARGET = GLSL_QuadSingleMandel
TEMPLATE = app
INCLUDEPATH += $$PWD/glad/include

SOURCES += main.cpp\
        mainwindow.cpp \
    glframe.cpp \
    glrenderthread.cpp \
    glad/src/glad.c

HEADERS  += mainwindow.h \
    glrenderthread.h \
    glframe.h

FORMS    += mainwindow.ui

unix {
    LIBS += -ldl
}
