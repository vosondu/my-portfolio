// Sends a copy of form submissions to the Client Pipeline Google Sheet.
// Paste the Google Apps Script web app URL below (it ends in /exec).
// While it is empty, forms still work and still email you; they just skip the sheet.
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxQBRrHDvnYMqjvsUd6_J9bMwfqJmaLeMq25zoQzWN2RDbQzMNYRJjOuc261aH_rg9H/exec';

window.sendToSheet = function (tab, data) {
	if (!SHEET_ENDPOINT) return Promise.resolve();
	const clean = {};
	Object.keys(data).forEach(function (key) {
		if (['access_key', 'botcheck', 'subject', 'from_name'].indexOf(key) === -1) clean[key] = data[key];
	});
	// text/plain avoids a CORS preflight that Apps Script cannot answer
	return fetch(SHEET_ENDPOINT, {
		method: 'POST',
		mode: 'no-cors',
		headers: { 'Content-Type': 'text/plain;charset=utf-8' },
		body: JSON.stringify({ tab: tab, data: clean }),
	}).catch(function () {});
};
