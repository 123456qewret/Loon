/*
NodeSeek 自动签到（Loon）
参考项目：https://github.com/dragonff/NodeSeek
版本要求：Loon 3.5.1 (983) 及以上（Script V2）

将下面内容加入 Loon 配置；远程地址按实际托管位置修改。

[Script]
request if ${url} ~= /^https:\/\/www\.nodeseek\.com\/api\/(?:attendance(?:\/board)?|progress\/today|account\/getInfo\/)/i then script("https://raw.githubusercontent.com/123456qewret/Loon/main/tasks/nodeseek.js") with tag="NodeSeek凭证", timeout=20
generic then script("https://raw.githubusercontent.com/123456qewret/Loon/main/Tasks/nodeseek.js", "random=true") with tag="NodeSeek手动签到", timeout=30
cron "10 8 * * *" then script("https://raw.githubusercontent.com/123456qewret/Loon/main/Tasks/nodeseek.js", "random=true") with tag="NodeSeek签到", timeout=30

[Mitm]
hostname = www.nodeseek.com

说明：
1. 登录 NodeSeek 后打开签到页面，脚本会自动保存 Cookie 和 User-Agent。
2. random=true 为随机收益模式；如需固定收益模式，改成 random=false。
3. 定时表达式示例为每天 08:10，可按需要修改。
4. 如果主配置已有 [Mitm]，只需把 www.nodeseek.com 追加到现有 hostname。
*/

const NAME = 'NodeSeek';
const COOKIE_KEY = 'NodeSeek_Cookie';
const USER_AGENT_KEY = 'NodeSeek_UserAgent';
const HOME_URL = 'https://www.nodeseek.com/';

if (typeof $request !== 'undefined') {
    captureCredentials();
} else {
    checkIn();
}

function captureCredentials() {
    if (($request.method || '').toUpperCase() === 'OPTIONS') {
        $done();
        return;
    }

    const cookie = normalizeCookie(getHeaderValues($request.headers, 'cookie'));
    const userAgent = getHeaderValues($request.headers, 'user-agent')[0] || '';

    if (!hasAccountCookie(cookie)) {
        console.log(`${NAME}: 当前请求未包含有效账号 Cookie，跳过保存`);
        $done();
        return;
    }

    const oldCookie = $persistentStore.read(COOKIE_KEY) || '';
    const oldUserAgent = $persistentStore.read(USER_AGENT_KEY) || '';
    const cookieSaved = cookie === oldCookie || $persistentStore.write(cookie, COOKIE_KEY);
    const userAgentSaved = !userAgent || userAgent === oldUserAgent || $persistentStore.write(userAgent, USER_AGENT_KEY);

    if (cookieSaved && userAgentSaved) {
        if (cookie !== oldCookie || (userAgent && userAgent !== oldUserAgent)) {
            notify('凭证更新成功', 'Cookie 与 User-Agent 已保存，可执行定时签到');
        } else {
            console.log(`${NAME}: 凭证未变化`);
        }
    } else {
        notify('凭证保存失败', '请检查 Loon 的持久化存储权限');
    }
    $done();
}

function checkIn() {
    const cookie = $persistentStore.read(COOKIE_KEY) || '';
    const userAgent = $persistentStore.read(USER_AGENT_KEY) || '';
    if (!hasAccountCookie(cookie)) {
        notify('签到失败', '未找到有效 Cookie，请先登录 NodeSeek 并打开签到页面');
        $done();
        return;
    }

    const random = getRandomMode();
    const headers = {
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
        'Origin': HOME_URL.slice(0, -1),
        'Referer': HOME_URL,
        'Cookie': cookie
    };
    if (userAgent) headers['User-Agent'] = userAgent;

    const request = {
        url: `https://www.nodeseek.com/api/attendance?random=${random}`,
        timeout: 25000,
        headers,
        body: '',
        'auto-cookie': false,
        'auto-redirect': false,
        alpn: 'h2'
    };

    $httpClient.post(request, (error, response, data) => {
        try {
            if (error) {
                throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
            }

            const status = response && (response.status || response.statusCode);
            if (status === 403 || looksLikeCloudflareChallenge(data)) {
                notify('签到被 Cloudflare 拦截', '请在 Loon 中打开 NodeSeek 签到页刷新 Cookie 后重试');
                return;
            }
            if (status === 401 || status === 302 || status === 307 || status === 308) {
                notify('Cookie 已失效', '请求被重定向到登录页，请重新登录 NodeSeek 并打开签到页面');
                return;
            }

            let result;
            try {
                result = JSON.parse(data || '{}');
            } catch (parseError) {
                notify('签到响应异常', `HTTP ${status || '未知'}，返回内容不是有效 JSON`);
                return;
            }

            const message = result.message || '';
            if (result.success === true || message.includes('鸡腿')) {
                const fallback = `本次获得 ${result.gain ?? '未知'} 个鸡腿，当前共 ${result.current ?? '未知'} 个`;
                notify('签到成功', message || fallback);
            } else if (message.includes('已完成签到') || message.includes('已经签到') || message.includes('已签到')) {
                notify('今日已签到', message);
            } else if (result.status === 404) {
                notify('Cookie 已失效', message || '请重新登录 NodeSeek 并打开签到页面获取新 Cookie');
            } else {
                notify('签到失败', message || `HTTP ${status || '未知'}，未返回成功状态`);
            }
        } catch (error) {
            console.log(`${NAME}: ${error.stack || error}`);
            notify('签到请求异常', error.message || String(error));
        } finally {
            $done();
        }
    });
}

function getHeaderValues(headers, name) {
    const values = [];
    const target = name.toLowerCase();
    for (const key of Object.keys(headers || {})) {
        if (key.toLowerCase() !== target) continue;
        const value = headers[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item != null && String(item).trim()) values.push(String(item));
            }
        } else if (value != null && String(value).trim()) {
            values.push(String(value));
        }
    }
    return values;
}

function normalizeCookie(values) {
    const cookies = new Map();
    for (const value of values) {
        for (const item of value.split(';')) {
            const separator = item.indexOf('=');
            if (separator <= 0) continue;
            const key = item.slice(0, separator).trim();
            const cookieValue = item.slice(separator + 1).trim();
            if (key) cookies.set(key, cookieValue);
        }
    }
    return Array.from(cookies, ([key, value]) => `${key}=${value}`).join('; ');
}

function hasAccountCookie(cookie) {
    return /(?:^|;\s*)(?:pjwt|session|smac)=/i.test(cookie);
}

function getRandomMode() {
    if (typeof $argument !== 'string') return 'true';
    const argument = $argument.trim();
    const match = argument.match(/(?:^|&)random=(true|false)(?:&|$)/i);
    if (match) return match[1].toLowerCase();
    if (/^(true|false)$/i.test(argument)) return argument.toLowerCase();
    return 'true';
}

function looksLikeCloudflareChallenge(data) {
    const text = String(data || '').toLowerCase();
    return text.includes('cf-chl-') || text.includes('cloudflare') && text.includes('challenge') || text.includes('<title>just a moment');
}

function notify(subtitle, content) {
    $notification.post(NAME, subtitle, content, HOME_URL);
}
