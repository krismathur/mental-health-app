(function (global) {
    const DEV_MODE_KEY = "mindzone_dev_mode";
    const OFFSET_KEY = "mindzone_time_offset_days";

    function enableDevModeFromUrl() {
        const params = new URLSearchParams(global.location.search);
        if (params.get("dev") === "1") {
            global.sessionStorage.setItem(DEV_MODE_KEY, "1");
        }
    }

    function isDevMode() {
        return global.sessionStorage.getItem(DEV_MODE_KEY) === "1";
    }

    function getOffsetDays() {
        const stored = global.localStorage.getItem(OFFSET_KEY);
        const parsed = parseInt(stored, 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function setOffsetDays(days) {
        const normalized = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
        global.localStorage.setItem(OFFSET_KEY, String(normalized));
    }

    function getNow() {
        const now = new Date();
        const offsetDays = getOffsetDays();
        if (offsetDays) {
            now.setDate(now.getDate() + offsetDays);
        }
        return now;
    }

    function formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function getToday() {
        return formatLocalDate(getNow());
    }

    function getWeekDates() {
        const today = getNow();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        start.setDate(today.getDate() - today.getDay());

        const dates = [];
        for (let index = 0; index < 7; index += 1) {
            const day = new Date(start);
            day.setDate(start.getDate() + index);
            dates.push(formatLocalDate(day));
        }

        return dates;
    }

    function getWeekKey() {
        const weekDates = getWeekDates();
        return weekDates[0] || getToday();
    }

    function formatDisplayDate(date) {
        return date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    enableDevModeFromUrl();

    global.AppTime = {
        isDevMode: isDevMode,
        enableDevModeFromUrl: enableDevModeFromUrl,
        getOffsetDays: getOffsetDays,
        setOffsetDays: setOffsetDays,
        getNow: getNow,
        getToday: getToday,
        getWeekDates: getWeekDates,
        getWeekKey: getWeekKey,
        formatDisplayDate: formatDisplayDate
    };
})(window);
