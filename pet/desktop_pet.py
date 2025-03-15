import sys
import os
from PyQt5.QtWidgets import (QApplication, QLabel, QWidget, QDialog, QVBoxLayout,
                             QDateTimeEdit, QTextEdit, QPushButton, QMenu, QHBoxLayout)
from PyQt5.QtCore import Qt, QPoint, QTimer, QDateTime
from PyQt5.QtGui import QPixmap, QFont
from PyQt5.QtMultimedia import QSound

class RemindDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle('设置提醒')
        self.initUI()
    
    def initUI(self):
        self.setStyleSheet("""
            QDialog {
                background-color: #f5f5f5;
                border-radius: 10px;
                padding: 20px;
            }
            QLabel {
                color: #333;
                font-size: 14px;
                margin-bottom: 5px;
            }
            QDateTimeEdit {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                min-height: 25px;
            }
            QTextEdit {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                min-height: 100px;
            }
            QPushButton {
                padding: 8px 20px;
                border-radius: 4px;
                font-size: 13px;
                min-width: 80px;
            }
            QPushButton#confirmBtn {
                background-color: #4a90e2;
                color: white;
                border: none;
            }
            QPushButton#confirmBtn:hover {
                background-color: #357abd;
            }
            QPushButton#cancelBtn {
                background-color: #f5f5f5;
                color: #666;
                border: 1px solid #ddd;
            }
            QPushButton#cancelBtn:hover {
                background-color: #e8e8e8;
            }
        """)
        
        layout = QVBoxLayout()
        layout.setSpacing(15)
        
        # 时间选择器部分
        timeLabel = QLabel('提醒时间')
        self.timeEdit = QDateTimeEdit(QDateTime.currentDateTime())
        self.timeEdit.setDisplayFormat('yyyy-MM-dd HH:mm:ss')
        self.timeEdit.setCalendarPopup(True)
        layout.addWidget(timeLabel)
        layout.addWidget(self.timeEdit)
        
        # 提醒内容输入框部分
        contentLabel = QLabel('提醒内容')
        self.contentEdit = QTextEdit()
        self.contentEdit.setPlaceholderText('请输入需要提醒的内容...')
        layout.addWidget(contentLabel)
        layout.addWidget(self.contentEdit)
        
        # 按钮布局
        btnLayout = QHBoxLayout()
        btnLayout.setSpacing(10)
        
        confirmBtn = QPushButton('确认')
        confirmBtn.setObjectName('confirmBtn')
        cancelBtn = QPushButton('取消')
        cancelBtn.setObjectName('cancelBtn')
        
        confirmBtn.clicked.connect(self.accept)
        cancelBtn.clicked.connect(self.reject)
        
        btnLayout.addWidget(cancelBtn)
        btnLayout.addWidget(confirmBtn)
        btnLayout.setAlignment(Qt.AlignRight)
        
        layout.addLayout(btnLayout)
        self.setLayout(layout)
        
        # 设置窗口大小和属性
        self.setMinimumWidth(400)
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowContextHelpButtonHint)

class PetWidget(QLabel):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMouseTracking(True)
        
        # 加载宠物图片
        self.images = {
            'front': QPixmap('images/front.png'),
            'up': QPixmap('images/up.png'),
            'drop': QPixmap('images/drop.png')
        }
        
        # 设置默认图片
        self.setPixmap(self.images['front'])
        
        # 初始化拖拽相关变量
        self.dragging = False
        self.offset = QPoint()
        
        # 初始化提醒列表和定时器字典
        self.reminders = []
        self.reminderTimers = {}
        
        # 加载已保存的提醒
        self.loadReminders()
    
    def contextMenuEvent(self, event):
        menu = QMenu(self)
        setRemindAction = menu.addAction('设置提醒')
        viewRemindAction = menu.addAction('查看提醒')
        setRemindAction.triggered.connect(self.showRemindDialog)
        viewRemindAction.triggered.connect(self.showReminderList)
        menu.exec_(event.globalPos())
    
    def showRemindDialog(self):
        dialog = RemindDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            remindTime = dialog.timeEdit.dateTime()
            content = dialog.contentEdit.toPlainText()
            
            # 计算当前时间到提醒时间的毫秒数
            currentTime = QDateTime.currentDateTime()
            msecToRemind = currentTime.msecsTo(remindTime)
            
            if msecToRemind > 0:
                # 创建新的提醒项
                reminder = {
                    'time': remindTime,
                    'content': content,
                    'id': str(len(self.reminders))
                }
                
                # 添加到提醒列表
                self.reminders.append(reminder)
                
                # 创建并启动定时器
                timer = QTimer(self)
                timer.setSingleShot(True)
                timer.timeout.connect(lambda: self.showReminder(reminder['id']))
                timer.start(msecToRemind)
                
                self.reminderTimers[reminder['id']] = timer
                
                # 保存提醒列表
                self.saveReminders()
    
    def showReminder(self, reminder_id):
        # 获取提醒内容
        reminder = next((r for r in self.reminders if r['id'] == reminder_id), None)
        if reminder:
            self.parent().showMessage(reminder['content'])
            # 移除已触发的提醒
            self.reminders = [r for r in self.reminders if r['id'] != reminder_id]
            if reminder_id in self.reminderTimers:
                del self.reminderTimers[reminder_id]
            self.saveReminders()
    
    def showReminderList(self):
        dialog = QDialog(self)
        dialog.setWindowTitle('提醒列表')
        layout = QVBoxLayout()
        
        if not self.reminders:
            label = QLabel('暂无提醒')
            layout.addWidget(label)
        else:
            for reminder in self.reminders:
                reminderBox = QWidget()
                boxLayout = QVBoxLayout()
                
                timeLabel = QLabel(f'时间：{reminder["time"].toString("yyyy-MM-dd HH:mm:ss")}')
                contentLabel = QLabel(f'内容：{reminder["content"]}')
                deleteBtn = QPushButton('删除')
                
                deleteBtn.clicked.connect(lambda checked, rid=reminder['id']: self.deleteReminder(rid, dialog))
                
                boxLayout.addWidget(timeLabel)
                boxLayout.addWidget(contentLabel)
                boxLayout.addWidget(deleteBtn)
                
                reminderBox.setLayout(boxLayout)
                layout.addWidget(reminderBox)
        
        closeBtn = QPushButton('关闭')
        closeBtn.clicked.connect(dialog.accept)
        layout.addWidget(closeBtn)
        
        dialog.setLayout(layout)
        dialog.exec_()
    
    def deleteReminder(self, reminder_id, dialog=None):
        # 停止并删除定时器
        if reminder_id in self.reminderTimers:
            self.reminderTimers[reminder_id].stop()
            del self.reminderTimers[reminder_id]
        
        # 从列表中移除提醒
        self.reminders = [r for r in self.reminders if r['id'] != reminder_id]
        self.saveReminders()
        
        # 如果是从列表对话框删除的，刷新对话框
        if dialog:
            dialog.accept()
            self.showReminderList()
    
    def saveReminders(self):
        # 将提醒数据保存到文件
        data = [{
            'time': r['time'].toString(Qt.ISODate),
            'content': r['content'],
            'id': r['id']
        } for r in self.reminders]
        
        with open('reminders.json', 'w', encoding='utf-8') as f:
            import json
            json.dump(data, f, ensure_ascii=False)
    
    def loadReminders(self):
        try:
            import json
            if os.path.exists('reminders.json'):
                with open('reminders.json', 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for item in data:
                    reminder = {
                        'time': QDateTime.fromString(item['time'], Qt.ISODate),
                        'content': item['content'],
                        'id': item['id']
                    }
                    
                    # 计算剩余时间
                    currentTime = QDateTime.currentDateTime()
                    msecToRemind = currentTime.msecsTo(reminder['time'])
                    
                    if msecToRemind > 0:
                        self.reminders.append(reminder)
                        
                        # 创建并启动定时器
                        timer = QTimer(self)
                        timer.setSingleShot(True)
                        timer.timeout.connect(lambda rid=reminder['id']: self.showReminder(rid))
                        timer.start(msecToRemind)
                        
                        self.reminderTimers[reminder['id']] = timer
        except Exception as e:
            print(f'加载提醒数据失败：{str(e)}')

    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = True
            self.offset = event.pos()
            self.setPixmap(self.images['up'])
    
    def mouseMoveEvent(self, event):
        if self.dragging:
            self.parent().move(self.parent().pos() + event.pos() - self.offset)
    
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.dragging = False
            self.setPixmap(self.images['drop'])
            # 短暂显示drop状态后恢复到front状态
            QTimer.singleShot(500, lambda: self.setPixmap(self.images['front']))

class PetApp(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()
    
    def initUI(self):
        # 设置窗口无边框和背景透明
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        # 创建宠物widget
        self.pet = PetWidget(self)
        
        # 获取屏幕尺寸
        screen = QApplication.primaryScreen().geometry()
        
        # 设置窗口大小和位置（右下角）
        self.resize(128, 128)  # 根据实际图片大小调整
        self.move(screen.width() - self.width() - 50,
                  screen.height() - self.height() - 50)
        
        self.show()
    
    def showMessage(self, message):
        # 播放提醒音效
        try:
            QSound.play("sounds/notify.wav")
        except:
            pass
        
        # 创建一个美化的消息窗口
        msgDialog = QDialog(self)
        msgDialog.setWindowTitle('提醒')
        msgDialog.setStyleSheet("""
            QDialog {
                background-color: #f0f0f0;
                border: 2px solid #cccccc;
                border-radius: 10px;
            }
            QLabel {
                color: #333333;
                font-size: 14px;
                margin: 10px;
            }
            QPushButton {
                background-color: #4a90e2;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #357abd;
            }
        """)
        
        layout = QVBoxLayout()
        
        # 显示当前时间
        timeLabel = QLabel(QDateTime.currentDateTime().toString("yyyy-MM-dd HH:mm:ss"))
        timeLabel.setAlignment(Qt.AlignCenter)
        timeLabel.setFont(QFont("Arial", 12))
        layout.addWidget(timeLabel)
        
        # 显示提醒内容
        contentLabel = QLabel(message)
        contentLabel.setWordWrap(True)
        contentLabel.setAlignment(Qt.AlignCenter)
        layout.addWidget(contentLabel)
        
        # 确定按钮使用水平布局居中
        btnLayout = QHBoxLayout()
        okBtn = QPushButton('确定')
        okBtn.setFixedWidth(100)
        okBtn.clicked.connect(msgDialog.accept)
        btnLayout.addWidget(okBtn)
        btnLayout.setAlignment(Qt.AlignCenter)
        layout.addLayout(btnLayout)
        
        # 设置布局边距
        layout.setContentsMargins(20, 20, 20, 20)
        msgDialog.setLayout(layout)
        
        # 显示提醒窗口并切换宠物图片
        self.pet.setPixmap(self.pet.images['up'])
        msgDialog.exec_()
        self.pet.setPixmap(self.pet.images['front'])

def main():
    app = QApplication(sys.argv)
    pet = PetApp()
    sys.exit(app.exec_())

if __name__ == '__main__':
    main()