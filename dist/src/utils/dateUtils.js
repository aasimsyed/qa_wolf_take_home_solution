"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHNTime = parseHNTime;
exports.convertToMinutes = convertToMinutes;
exports.isChronologicallyOrdered = isChronologicallyOrdered;
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
dayjs_1.default.extend(relativeTime_1.default);
function parseHNTime(timeString) {
    const match = timeString.match(/(\d+)\s+(\w+)\s+ago/);
    if (!match) {
        throw new Error(`Invalid time string format: ${timeString}`);
    }
    return {
        value: parseInt(match[1], 10),
        unit: match[2],
    };
}
function convertToMinutes(time) {
    const unitMap = {
        minute: 1,
        minutes: 1,
        hour: 60,
        hours: 60,
        day: 1440,
        days: 1440,
    };
    const multiplier = unitMap[time.unit];
    if (!multiplier) {
        throw new Error(`Unsupported time unit: ${time.unit}`);
    }
    return time.value * multiplier;
}
function isChronologicallyOrdered(times) {
    const minutes = times.map((t) => convertToMinutes(parseHNTime(t)));
    for (let i = 1; i < minutes.length; i++) {
        if (minutes[i] < minutes[i - 1]) {
            return false;
        }
    }
    return true;
}
