///////////////////////////
// SCRIPT Ở TOOL BACKGROUND
// NHẬN DỮ LIỆU TỪ SCRIPT ĐƯỢC CHÈN VÀO WEB GỬI VỀ
// XỬ LÝ VÀ THÔNG BÁO TỚI USER
///////////////////////

// chrome.tabs.query({}, (tabs) => {
// 	console.log("Chrome tabs", tabs);
// });

chrome.storage.local.set({ user: null, ttlh: null });

const data = {};
const defaultInitState = {
	request: {
		cost_type: "base",
		time_refresh_in_seconds: 5,
		max_cost: "500000",
		plane_cd: "",
		airlines: ["vn", "bl", "vj", "bb"],
		daypass: 1,
		daychecked: 0,
		order: "asc",
		tenkhachhang: "",
		diachi: "",
		sdt: "",
		email: "",
		hanhkhach: [],
		booked: [],
		acceptedFlight: null,
		nhieuChang: false,
	},
	result: {
		follow_state: "idle",
	},
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	let tabId = request.tab ? request.tab.id : sender.tab.id;

	if (!data[tabId]) {
		data[tabId] = defaultInitState;
	}
	// console.log(`Tab${tabId}-FS.${data[tabId].result.follow_state}`);
	// console.log(data);

	switch (request.action) {
		case "get-follow-state":
			return sendResponse({ follow_state: data[tabId].result.follow_state });
		case "start-follow":
			data[tabId] = Object.assign(
				{},
				data[tabId],
				{ request: request },
				{ result: { follow_state: "waiting_result" } }
			);
			console.log("after set", data);
			// Send data (state) cho script.js ở tab tương ứng
			chrome.tabs.sendMessage(tabId, { state: data[tabId] }, () => {});
			break;
		case "stop-follow":
			data[tabId] = Object.assign({}, data[tabId], { request: request }, { result: { follow_state: "idle" } });
			chrome.tabs.sendMessage(tabId, { state: data[tabId] }, () => {});
			break;
		case "get-state":
			sendResponse({ state: data[tabId] });
			break;
		case "got-result":
			data[tabId] = Object.assign({}, data[tabId], { result: Object.assign({ follow_state: "running" }, {}) });
			break;
		case "found":
			notifyFound(request.acceptedFlight, request.auto_booking);
			data[tabId] = Object.assign({}, data[tabId], { request: request }, { result: { follow_state: "found" } });
			break;
		case "confirm":
			data[tabId] = Object.assign({}, data[tabId], { request: request }, { result: { follow_state: "confirm" } });
			break;
		case "final-confirm":
			data[tabId] = Object.assign(
				{},
				data[tabId],
				{ request: request },
				{ result: { follow_state: "final-confirm" } }
			);
			break;
		case "try-again":
			data[tabId] = Object.assign({}, data[tabId], { request: request }, { result: { follow_state: "refresh" } });
			break;
		case "reload":
			chrome.tabs.sendMessage(tabId, { state: data[tabId] }, () => {});
			break;
		case "set-state":
			data[tabId] = Object.assign({}, data[tabId], { request: request });
			break;
		case "filled":
			data[tabId] = Object.assign({}, data[tabId], { request: request }, { result: { follow_state: "filled" } });
			break;
		// Tool VietJet
		case "redirected":
			data[tabId] = Object.assign(
				{},
				data[tabId],
				{ request: request },
				{ result: { follow_state: "redirected" } }
			);
			break;
		case "dangerous_goods":
			console.log("confirmed dangerous_goods bg");
			data[tabId] = Object.assign(
				{},
				data[tabId],
				{ request: request },
				{ result: { follow_state: "dangerous_goods" } }
			);
			break;
		case "confirmed_order":
			console.log("confirmed_order bg");
			data[tabId] = Object.assign(
				{},
				data[tabId],
				{ request: request },
				{ result: { follow_state: "confirmed_order" } }
			);
			break;
		case "done":
			console.log("done bg");
			data[tabId] = Object.assign({}, data[tabId], { request: request }, { result: { follow_state: "done" } });
			break;
	}
	sendResponse({ state: data[tabId] });
});

let notifyFound = (selectedFlight, auto_booking = false) => {
	let audio = new Audio();
	let playPromise = null;
	audio.src = "./audio/found.ogg";
	audio.loop = !auto_booking;

	chrome.notifications.clear("found", () => {
		chrome.notifications.create(
			"found",
			{
				type: "basic",
				iconUrl: "./image/plane-logo.png",
				title: `${selectedFlight.from} - ${selectedFlight.to} `,
				message: `${selectedFlight.date}. CB ${selectedFlight.plane_cd}`,
				requireInteraction: !auto_booking,
			},

			function () {
				playPromise = audio.play();
			}
		);
	});

	chrome.notifications.onClicked.addListener((notificationId) => {
		console.log("clicked notification", notificationId);
		playPromise &&
			playPromise.then((_) => {
				audio.pause();
			});
	});

	chrome.notifications.onClosed.addListener((notificationId) => {
		console.log("closed notification", notificationId);
		playPromise &&
			playPromise.then((_) => {
				audio.pause();
			});
	});
};

$(function () {
	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		if (request.how_id_tab === "ID") {
			chrome.tabs.query({ active: true }, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, { id_is: tabs[0]["id"] });
				console.info("Đã send");
			});
		}
	});
});
