# Loon

Loon 自用配置与插件，无时效性保证。

## 目录结构

```
Loon.lcf                  主配置
Loon.lpx                  自用插件合集（Abema 1080P / 京东注销会员 / Emby VIP）
Plugins/Huazhuhui.lpx     华住会：获取 Token + 每日自动签到
Plugins/Nodeseek.lpx      NodeSeek：获取 Token + 每日自动签到
Tasks/hzh.js              华住会签到脚本
```

## 订阅地址

插件可直接在 Loon 中通过以下地址订阅：

```
https://github.com/123456qewret/Loon/raw/main/Loon.lpx
https://raw.githubusercontent.com/123456qewret/Loon/refs/heads/main/Plugins/Huazhuhui.lpx
https://raw.githubusercontent.com/123456qewret/Loon/refs/heads/main/Plugins/Nodeseek.lpx
```

## 说明

- 插件使用 Loon **3.5.1 (983)** 起支持的 Script V2 语法，低版本无法加载。
- `Loon.lcf` 中的节点、订阅、证书等信息已清空，需自行填写后使用。
- 华住会与 NodeSeek 插件均需先打开对应 App 的签到页面抓取 Token，获取成功后建议关闭插件参数中的「获取 Token」开关。

## 致谢

- 华住会脚本原作者 [@wf021325](https://github.com/wf021325)
- NodeSeek 脚本作者 [@Sliverkiss](https://github.com/Sliverkiss)
- Emby 脚本作者 [@Tartarus2014](https://github.com/Tartarus2014)
