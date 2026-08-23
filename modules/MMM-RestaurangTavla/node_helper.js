/* node_helper.js for MMM-RestaurangTavla
 * Scrapes https://sodralatin.restaurangtavla.se/
 * Extracts today's normal + vegetarian dishes.
 */

const NodeHelper = require("node_helper");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = NodeHelper.create({
    start() {
        console.log("[MMM-RestaurangTavla] Helper started");
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "GET_LUNCH_DATA") {
            this.fetchData(payload);
        }
    },

    getWeekString() {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        const weekStr = weekNum < 10 ? "0" + weekNum : weekNum;
        return `${date.getFullYear()}-W${weekStr}`;
    },

    async fetchData(config) {
        try {
            const weekStr = this.getWeekString();
            const baseUrl = config.url.split('?')[0]; // Ensure we have the base URL

            console.log(`[MMM-RestaurangTavla] Step 1: Fetching Security Token...`);

            // --- STEP 1: GET the main page to retrieve the Token and Cookies ---
            const initialRequest = await axios.get(baseUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            const $initial = cheerio.load(initialRequest.data);
            const token = $initial('input[name="__RequestVerificationToken"]').val();
            const cookies = initialRequest.headers['set-cookie'];

            if (!token) {
                throw new Error("Could not find security token on page.");
            }

            console.log(`[MMM-RestaurangTavla] Step 2: Posting with Token for ${weekStr}...`);

            // --- STEP 2: POST to get the menu using the Token ---
            const response = await axios({
                method: 'post',
                url: `${baseUrl}?handler=ShowMenus`,
                data: `Week=${weekStr}&SelectedMenuCategory=1468&__Invariant=Week&__RequestVerificationToken=${token}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': cookies ? cookies.join('; ') : '',
                    'X-Requested-With': 'XMLHttpRequest', // Tells the server this is an AJAX request
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            // --- STEP 3: Parse the returned Menu HTML ---
            const $ = cheerio.load(response.data);
            const weekdays = ["SÖNDAG", "MÅNDAG", "TISDAG", "ONSDAG", "TORSDAG", "FREDAG", "LÖRDAG"];
            const todayName = weekdays[new Date().getDay()];

            let normal = "";
            let veg = "";

            $(".day-name").each((i, el) => {
                const dayText = $(el).text().trim().toUpperCase();
                if (dayText === todayName) {
                    // Extract meals following this specific day
                    const mealSpans = $(el).nextUntil(".day-name").find(".menu-meal-name");
                    if (mealSpans.length > 0) normal = $(mealSpans[0]).text().trim();
                    if (mealSpans.length > 1) veg = $(mealSpans[1]).text().trim();
                }
            });

            console.log(`[MMM-RestaurangTavla] SUCCESS! Parsed: ${todayName} -> "${normal}"`);

            this.sendSocketNotification("LUNCH_DATA", {
                day: todayName.charAt(0) + todayName.slice(1).toLowerCase(),
                normal: normal || "No lunch found",
                veg: veg || null
            });

        } catch (err) {
            console.error("[MMM-RestaurangTavla] Fetching Error:", err.response ? `Status ${err.response.status}` : err.message);
            this.sendSocketNotification("LUNCH_DATA", { day: "Error", normal: "Unable to fetch the menu", veg: null });
        }
    }
});