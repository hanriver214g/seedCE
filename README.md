# seedCE

BIP-39 中英文助记词转换器。按照 BIP-39 标准的中文表和英文表的完全对照顺序，将输入的助记词转换为对应的另一种语言。

## 功能特性

- 🌐 **中英文互转**：自动识别输入语言（中文或英文），按照 BIP-39 词表索引顺序转换为另一种语言
- 📷 **扫码输入**：支持摄像头扫码识别二维码，快捷输入助记词
- ✍️ **输入提示**：英文助记词输入时自动补全，按前缀匹配 BIP-39 词表
- 🔳 **二维码生成**：一键将转换结果生成二维码，方便其他设备扫码读取
- 🔒 **完全离线**：所有处理均在本地完成，无任何网络请求
- 📱 **跨平台**：Web 版本可直接在浏览器中运行，也提供 Android 应用

## 快速开始

### Web 版本

直接用浏览器打开 `app/src/main/assets/www/index.html` 即可使用。

### Android 版本

使用 Android Studio 打开项目根目录，构建并安装到设备。

```bash
# 构建 Debug 版本
./gradlew assembleDebug
```

## 使用说明

1. 在输入框中输入中文或英文 BIP-39 助记词（用空格、逗号或换行分隔）
2. 点击「转换」按钮，自动识别语言并转换为另一种语言
3. 可使用「扫码输入」通过摄像头扫描二维码快速输入
4. 可使用「生成二维码」将转换结果生成二维码
5. 可使用「↔ 结果作为新输入」进行反向转换验证

## BIP-39 词表

词表来自 Bitcoin BIPs 仓库：
- 英文词表：[bip-0039/english.txt](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)
- 中文简体词表：[bip-0039/chinese_simplified.txt](https://github.com/bitcoin/bips/blob/master/bip-0039/chinese_simplified.txt)

转换规则：两个词表均按顺序排列，转换时按索引（行号）一一对应。

## 安全提示

- 请在离线环境或禁用插件的隐身窗口中使用
- 应用完全离线运行，所有数据仅在本地处理
- Android 版本启用了 FLAG_SECURE，禁止截图和录屏
- 应用进入后台时自动清除敏感数据

## 技术栈

- 前端：纯 HTML + CSS + JavaScript（无框架依赖）
- 二维码识别：[jsQR](https://github.com/cozmo/jsQR)
- 二维码生成：[qrcodejs](https://github.com/davidshimjs/qrcodejs)
- Android：WebView + androidx.webkit

## 许可证

MIT License
