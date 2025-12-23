#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>

class QGLFrame;

namespace Ui {
    class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = 0);
    ~MainWindow();

protected:
    void closeEvent(QCloseEvent *evt);

private:
    Ui::MainWindow *ui;
    QGLFrame *GLFrame;

public slots:
    void setRenderCaps(int);

private slots:
    void on_rbtn_double_toggled(bool checked);
    void on_edit_radius_returnPressed();
    void on_edit_re_returnPressed();
    void on_edit_im_returnPressed();
    void on_edit_zoom_returnPressed();
    void on_edit_iterations_returnPressed();
    void on_check_Benchmark_toggled(bool checked);
    void on_rbtn_emu_toggled(bool checked);
    void on_rbtn_float_toggled(bool checked);
    void on_btn_reloadshader_clicked();
    void on_check_fullscreen_toggled(bool checked);
    void on_rbtn_sq_toggled(bool checked);
};

#endif // MAINWINDOW_H
