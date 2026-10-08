(function (root) {
    "use strict";
    function createAccountStorage(storage) {
        let account = null;
        const prefix = function () { return "mindzone:account:" + account + ":"; };
        return {
            bind: function (id) { account = Number.isSafeInteger(Number(id)) && Number(id) > 0 ? String(id) : null; },
            account: function () { return account; },
            getItem: function (key) { return account === null ? null : storage.getItem(prefix() + key); },
            setItem: function (key, value) { if (account !== null) { storage.setItem(prefix() + key, String(value)); } },
            removeItem: function (key) { if (account !== null) { storage.removeItem(prefix() + key); } },
            clearAccount: function () {
                if (account === null) { return; }
                const owned = prefix();
                for (let i = storage.length - 1; i >= 0; i -= 1) {
                    const key = storage.key(i);
                    if (key.startsWith(owned)) { storage.removeItem(key); }
                }
            }
        };
    }
    if (typeof module !== "undefined" && module.exports) { module.exports = createAccountStorage; }
    else { root.MindZoneStorage = createAccountStorage(root.localStorage); }
})(typeof window !== "undefined" ? window : globalThis);
