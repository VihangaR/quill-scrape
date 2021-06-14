const puppeteer = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// CSV setup for the file and headers
const csvWriter = createCsvWriter({
	path: "ScrapeQuill.csv",
	header: [
		{ id: "name", title: "NAME" },
		{ id: "subtitle", title: "SUBTITLE" },
	],
});

const scrapeQuill = async () => {
	const browser = await puppeteer.launch({
		headless: true,
	});
	const page = await browser.newPage();
	// The viewport is currently set to a height of 1080 to get the first few
	// links that would show up in a normal sized browser but if we want to
	// get more links, we can simply change the height to a higher value
	// (changing it to around 7000 grabs all of them)
	await page.setViewport({
		width: 1920,
		height: 1080,
		deviceScaleFactor: 1,
	});

	await page.goto("https://app.quillit.io/search");
	// This is the selector we'll use to grab the links
	await page.waitForSelector(".RepeatingGroup a");
	// Now we scrape the links
	const data = await page.evaluate(() => {
		const links = document.querySelectorAll(".RepeatingGroup a");
		const urls = Array.from(links).map((l) => l.href);
		return urls;
	});

	const result = [];
	for (let url of data) {
		// Visit the URL and wait for the content to load
		await page.goto(url);
		await page.waitForSelector(".content");
		// Sometimes the content doesn't properly load even after the
		// selector appears and this helps fix that
		await page.waitForTimeout(1500);
		// Something to show on the screen to show it's running properly
		console.log("Grabbing name and subtitle from url:", url);
		// Once the content has loaded, we can scrape the name and subtitle
		const urlInfo = await page.evaluate(() => {
			window.onbeforeunload = null;
			const info = {};
			const content = document.querySelectorAll(".content");
			// Name is the value of the content array at index 0
			info.name = content[0].innerText;
			// The subtitle will be either at index 2 or 3. This is because if the user
			// has a rating, it'll be in the second index so the subtitle is in the
			// third index. However, if the user doesn't have a rating, the subtitle
			// will be in the second index instead.
			if (isNaN(content[2].innerText)) {
				info.subtitle = content[2].innerText.replace(/(\n\n)/gm, " ");
			} else {
				info.subtitle = content[3].innerText.replace(/(\n\n)/gm, " ");
			}
			return info;
		});
		// Push the name and subtitle into the result
		result.push(urlInfo);
	}

	await browser.close();
	// All that's left to do is make the CSV file
	await csvWriter.writeRecords(result);
};

scrapeQuill();
