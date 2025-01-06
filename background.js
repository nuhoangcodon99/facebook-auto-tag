chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "execute") {
        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            func: (code) => {
                try {
                    eval(code); // Xử lý code nội bộ
                } catch (error) {
                    console.error("Error executing code:", error);
                }
            },
            args: [message.code]
        }).catch(error => {
            console.error("Error executing script:", error);
        });
    }
});