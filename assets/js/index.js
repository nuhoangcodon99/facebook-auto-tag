class Ws {
    static Alert(type, message) {
        const notify = document.getElementById("notify");
        if (!notify) return;

        notify.innerHTML = "";
        const alertDiv = document.createElement("div");
        alertDiv.classList.add("alert", type);

        const closeButton = document.createElement("span");
        closeButton.classList.add("alertClose");
        closeButton.textContent = "X";
        closeButton.onclick = () => {
            notify.innerHTML = "";
            notify.style.display = "none";
        };

        const messageSpan = document.createElement("span");
        messageSpan.classList.add("alertText");
        messageSpan.innerHTML = message + '<br class="clear"/>';

        alertDiv.appendChild(closeButton);
        alertDiv.appendChild(messageSpan);

        notify.appendChild(alertDiv);
        notify.style.display = "block";

        setTimeout(() => {
            notify.innerHTML = "";
            notify.style.display = "none";
        }, 2550);
    }
}

// DOM Elements
const wsStart = document.getElementById("wt-button");
const wsPause = document.getElementById("wt-reset");
const wsInfo = document.getElementById("wt-info");
const wsContent = document.getElementById("wt-content");
const wsFast = document.getElementById("fast");

let fastMode = false;
wsFast.addEventListener("change", () => {
    fastMode = wsFast.checked;
});

const saveData = (key, value) => {
    chrome.storage.local.set({ [key]: value });
};

const getData = (key, callback) => {
    chrome.storage.local.get([key], (result) => {
        callback(result[key] || null);
    });
};

const clearCookies = () => {
    document.cookie.split(";").forEach(cookie => {
        document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
};

wsStart.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!/^https:\/\/www\.facebook\.com\/messages\/t\/.+$/.test(tab.url)) {
            alert("Hãy đến trang https://www.facebook.com/messages/t/id_group để sử dụng công cụ.");
            return;
        }

        const info = wsInfo.value.trim();
        const content = wsContent.value.trim();

        if (!info) return alert("Thông tin không được để trống!");
        if (!/^\d+\|.+$/.test(info)) return alert("Thông tin phải có định dạng: uid|fullname");
        if (content.length > 999) return alert("Nội dung không được vượt quá 999 ký tự.");

        const [uid, fullname] = info.split("|");
        const messages = content.split(",").map(msg => msg.trim()).filter(msg => msg);

        clearCookies();

        startTagging(uid, fullname, messages, tab.id);
    });
});

let tagging = false;

const startTagging = async (uid, fullname, messages, tabId) => {
    tagging = true;
    let messageIndex = 0;

    while (tagging) {
        if (messageIndex >= messages.length) messageIndex = 0;

        const success = await chrome.scripting.executeScript({
            target: { tabId },
            func: (uid, fullname, message) => {
                const inputBox = document.querySelector('div[contenteditable="true"][role="textbox"][data-lexical-editor="true"]');
                if (!inputBox) {
                    alert("Không tìm thấy hộp thoại để tag.");
                    return false;
                }

                const triggerInput = (text) => {
                    const event = new InputEvent("input", {
                        bubbles: true,
                        cancelable: true,
                        inputType: "insertText",
                        data: text
                    });
                    inputBox.dispatchEvent(event);
                };

                inputBox.focus();
                triggerInput("@" + fullname);
                const nameItem = document.querySelector(`li[id="${uid} name"] > div[role="presentation"]`);

                if (nameItem) {
                    nameItem.click();
                    if (message.trim()) triggerInput(" " + message);

                    const enterEvent = new KeyboardEvent("keydown", {
                        bubbles: true,
                        cancelable: true,
                        key: "Enter",
                        keyCode: 13
                    });
                    inputBox.dispatchEvent(enterEvent);
                    return true;
                } else {
                    alert("Không tìm thấy người dùng.");
                    return false;
                }
            },
            args: [uid, fullname, messages[messageIndex]]
        }).catch(err => console.error("Error:", err));

        if (!success) break;
        messageIndex++;
        await new Promise(res => setTimeout(res, fastMode ? 40 : 1000));
    }
};

wsPause.addEventListener("click", () => {
    tagging = false;
    Ws.Alert("success", "Dừng auto tag thành công!");
});

// Load saved data
getData("ws-info", data => {
    if (data) wsInfo.value = data;
});

getData("ws-content", data => {
    if (data) wsContent.value = data;
});