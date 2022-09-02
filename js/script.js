////////////////////////////////
// SCRIPT ĐƯỢC CHÈN VÀO TRANG WEB
// NHẬN VÀ PHẢN HỒI REQUEST TỪ TOOL
// XỬ LÝ CÁC NGHIỆP VỤ CHÍNH
//////////////////////////////////

const pageState = new PageState();

////////
////////////////////////////////
// Main function
////////////////////////////////
const url = window.location.href;

const checkAdult = (hanhkhach) => hanhkhach.gioitinh != "MISS" && hanhkhach.gioitinh != "MSTR";
const checkChild = (hanhkhach) => !checkAdult(hanhkhach);
const checkCheck = (hanhkhach) => hanhkhach.check;

const getRequestData = () => pageState.getState.bind(pageState)()["request"];

const loadCurrentStateTab = (callback) => {
	chrome.runtime.sendMessage(
		{
			action: "get-state",
		},
		(response) => {
			pageState.setState(response.state);
			callback && callback(response.state);
		}
	);
};

const notifyFound = (foundItem) => {
	const request = new RequestDecorator(getRequestData()).withFoundAction().withAcceptedFlight(foundItem).build();
	chrome.runtime.sendMessage(request, null);
};

const wait = (time_in_millis) => {
	return new Promise((resolve) => {
		setTimeout(resolve, time_in_millis);
	});
};

if (/vetot\.com\.vn/gi.test(url) || /holavietnam\.com\.vn/gi.test(url)) {
	console.log("apply vetot");
	vetot();
} else if (/muadi\.com\.vn/gi.test(url) || /onlinebookingticket\.vn/gi.test(url)) {
	console.log("apply muadi");
	// getRequestData().nhieuChang ? muadi_nhieuchang() :
	muadi();
} else if (/onlineairticket\.vn/gi.test(url) || /systemvna/gi.test(url) || /bookingticket\.vn/gi.test(url)) {
	console.log("apply onlineairticket & bookingticket.vn & systemvna");
	onlineAirTicket();
} else if (/vnabooking/gi.test(url)) {
	console.log("apply http://vnabooking.com.vn");
	vnabooking();
} else if (/vietjetair/gi.test(url)) {
	console.log("apply http://vietjetair.com");
	vj();
} else if (/xuatve/gi.test(url)) {
	console.log("apply xuatve.vn");
	xuatve();
}
