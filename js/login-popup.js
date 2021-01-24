const pageStatePopup = new PageState();
pageStatePopup.onStateChange((state) => renderFollowBar(state));
pageStatePopup.onFollowStateChange((followState) => renderFollowStateElements(followState));

const getCurrentTab = (callback) => chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => callback(tabs[0]));
const canStart = (followState) => followState == "idle" || followState == "found";

let getCurrentFollowStateInterval = null;

/**
 * Lấy dữ liệu từ form
 */
const getFormData = () => {
	let checkedAirlines = [];
	$("input[type=checkbox][name=airType]:checked").each(function () {
		checkedAirlines.push($(this).val());
	});
	let hanhkhachs = [];
	$(".hanh-khach .row").each(function () {
		if ($(this).find("#ho-ten").val() != "") {
			hanhkhachs.push({
				hoten: $(this).find("#ho-ten").val().trim(),
				gioitinh: $(this).find("#gioi-tinh").val(),
				ngaysinh: $(this).find("#ngay-sinh").val(),
				check: $(this).find("#chon").prop("checked"),
			});
		}
	});

	return {
		cost_type: $("input[name=typeCost]:checked").val(),
		max_cost: $("#maxCost").val(),
		plane_cd: $("#placeCd").val(),
		time_refresh_in_seconds: $("#timeRefresh").val(),
		auto_booking: $("#autoBooking").prop("checked"),
		daypass: $("#daypass").val(),
		daychecked: 0,
		order: $("#order").val(),
		airlines: checkedAirlines,
		tenkhachhang: $("#tenkhachhang").val(),
		diachi: $("#diachi").val(),
		sdt: $("#sdt").val(),
		email: $("#email").val(),
		hanhkhach: hanhkhachs,
		action: "",
		booked: [],
	};
};
/**
 * Điền thông tin theo từng tab
 * Render lại các giá trị của form tương ứng với dữ liệu state lấy từ background
 */
const renderFollowBar = (state) => {
	const request = state.request;
	$("input[name=typeCost]").val([request.cost_type]);
	$("#maxCost").val(request.max_cost);
	$("#placeCd").val(request.plane_cd);
	$("#timeRefresh").val(request.time_refresh_in_seconds);
	$("#autoBooking").prop("checked", request.auto_booking);

	$("#daypass").val(request.daypass);
	$("#order").val(request.order);

	$("input[type=checkbox][name=airType]").each(function () {
		let value = $(this).val();
		let checked = request.airlines.indexOf(value) >= 0;
		$(this).prop("checked", checked);
	});

	$("#tenkhachhang").val(request.tenkhachhang);
	$("#diachi").val(request.diachi);
	$("#sdt").val(request.sdt);
	$("#email").val(request.email);

	renderListHanhKhach(request.hanhkhach);
	renderFollowStateElements(state.result.follow_state);
};

const renderListHanhKhach = (hanhkhachs) => {
	let s = "";
	// Nếu có danh sách hành khách
	if (hanhkhachs.length > 0) {
		for (let i = 0; i < hanhkhachs.length; i++) {
			s +=
				"<div class='row'><div class='col-xs-4 ho-ten'><input type='text' id='ho-ten' class='form-control input-sm' placeholder='Họ tên' value='" +
				hanhkhachs[i].hoten +
				"' /></div>";
			s +=
				"<div class='col-xs-4 ngay-sinh'><input type='date' id='ngay-sinh' class='form-control input-sm' value='" +
				hanhkhachs[i].ngaysinh +
				"' /></div>";

			s += "<div class='col-xs-2 gioi-tinh'><select id='gioi-tinh' class='form-control input-sm'>";
			s += '<option value="MR"' + (hanhkhachs[i].gioitinh == "MR" && "selected") + ">MR (Quý ông)</option>";
			s += '<option value="MRS"' + (hanhkhachs[i].gioitinh == "MRS" && "selected") + ">MRS (Quý bà)</option>";
			s += '<option value="MS"' + (hanhkhachs[i].gioitinh == "MS" && "selected") + ">MS (Quý cô)</option>";
			s += '<option value="MSTR"' + (hanhkhachs[i].gioitinh == "MSTR" && "selected") + ">MSTR (Bé trai)</option>";
			s += '<option value="MISS"' + (hanhkhachs[i].gioitinh == "MISS" && "selected") + ">MISS (Bé gái)</option>";
			s += "</select></div>";

			s +=
				"<div class='col-xs-2 chuc-nang'><input type='checkbox' id='chon' " +
				(hanhkhachs[i].check && "checked") +
				" /><button class='btn btn-xs btn-danger'>x</button></div></div>";
		}
		$(".hanh-khach").html("");
		$(".hanh-khach").html(s);
		$(".hanh-khach").on("click", "button", (e) => xoaHK(e));
	}
};

/**
 * Hiển thị trạng thái hoạt động của tool
 */
const renderFollowStateElements = (followState) => {
	$("#followStateMsg").text(Config.state[followState].title);
	$("#btnTriggerFollowMsg").text(canStart(followState) ? "Bắt đầu theo dõi" : "Dừng theo dõi");
	$("#btnThemHanhKhach").attr("disabled", !canStart(followState));
};

const triggerFollow = (state) => {
	getCurrentTab((tab) => {
		let request = new RequestDecorator(getFormData()).withTab(tab).withStopFollowAction();
		if (canStart(state.result.follow_state)) request = request.withStartFollowAction();
		request = request.build();

		// Lưu thông tin khách hàng
		const ttlh = { tenkhachhang: request.tenkhachhang, diachi: request.diachi, email: request.email, sdt: request.sdt };
		chrome.storage.local.set({ ttlh });

		chrome.runtime.sendMessage(request, (response) => pageStatePopup.setState(response.state));
	});
};

const xoaHK = (e) => e.target.closest(".row").remove();

const convertDate = (s) => {
	const da = s.split("/");
	if (da.length === 3) return da[2] + "-" + (da[1] < 10 ? "0" + da[1] : da[1]) + "-" + (da[0] < 10 ? "0" + da[0] : da[0]);
	return s;
};

/**
 * Khi bật tool => render lại giao diện của tool
 */
const render = () => {
	if (getCurrentFollowStateInterval) clearInterval(getCurrentFollowStateInterval);
	chrome.storage.local.get("user", (data) => {
		if (data.user) {
			$("#welcome").show();
			$("#form-login").hide();
			$("#username").text(data.user.hoten);
			$("#ngayhethan").text(data.user.ngayhethan);

			getCurrentTab((tab) => {
				const url = tab.url;
				if (
					1 ||
					/vetot\.com\.vn/gi.test(url) ||
					/holavietnam\.com\.vn/gi.test(url) ||
					/muadi\.com\.vn/gi.test(url) ||
					/onlinebookingticket\.vn/gi.test(url) ||
					/onlineairticket\.vn/gi.test(url) ||
					/bookingticket\.vn/gi.test(url) ||
					/vnabooking/gi.test(url) ||
					/vietjetair/gi.test(url)
				) {
					$(".content").show();
					$("#error-page").hide();
					// Get state of current tab from background.js
					chrome.runtime.sendMessage({ action: "get-state", tab: tab }, (response) => {
						if (!response.state.tenkhachhang) {
							chrome.storage.local.get("ttlh", (data) => {
								if (data.ttlh) {
									response.state.request.tenkhachhang = data.ttlh.tenkhachhang;
									response.state.request.diachi = data.ttlh.diachi;
									response.state.request.sdt = data.ttlh.sdt;
									response.state.request.email = data.ttlh.email;
								}
								pageStatePopup.setState(response.state);
							});
						} else pageStatePopup.setState(response.state);
					});

					getCurrentFollowStateInterval = setInterval(() => {
						chrome.runtime.sendMessage({ action: "get-follow-state", tab: tab }, (response) =>
							pageStatePopup.setFollowState(response.follow_state)
						);
					}, 500);
				} else {
					$(".content").hide();
					$("#error-page").show();
				}
			});
		} else {
			$("#form-login").show();
			$("#welcome").hide();
			$("#input_username").val("");
			$("#input_password").val("");
			$("#errorMsg").text("").hide();
		}
	});
};

$(document).ready(() => {
	render();

	// Ấn nút theo dõi
	///////////////////
	$("#btnTriggerFollow").on("click", () => triggerFollow(pageStatePopup.getState()));

	$("#btnLogin").on("click", (e) => {
		e.preventDefault();

		let username = $("#input_username").val().trim();
		let password = $("#input_password").val().trim();
		// Default admin
		const defaultUser = {
			username: "admin",
			hoten: "Default admin",
			ngayhethan: "31/12/2099",
		};
		if (username === "admin" && password === "1") {
			chrome.storage.local.set({ user: defaultUser }, () => {
				render();
			});
		} else {
			var ip = "";

			$.getJSON("http://gd.geobytes.com/GetCityDetails", function (data) {
				ip = data.geobytesipaddress;

				$.ajax({
					url: Config.host.api + "login?username=" + username + "&password=" + password + "&ip=" + ip,
					method: "GET",
					dataType: "json",
					contentType: "application/json",
					// data: JSON.stringify({username, password})
				}).then(
					(credential) => {
						console.log(credential);
						chrome.storage.local.set({ user: credential }, () => {
							render();
						});
					},
					(jqXHR) => {
						if (jqXHR.responseJSON !== undefined) $("#errorMsg").text(jqXHR.responseJSON.message).show();
					}
				);
			});
		}
	});

	$("#btnLogout").on("click", (e) => {
		e.preventDefault();

		var username = "";
		chrome.storage.local.get("user", (data) => {
			if (data.user) {
				username = data.user.username;
				$.ajax({
					url: Config.host.api + "logout?username=" + username,
					method: "GET",
					dataType: "json",
					contentType: "application/json",
					// data: JSON.stringify({username, password})
				});
			}
		});

		chrome.storage.local.set({ user: null }, render);
	});

	$("#btnXoaHanhKhach").on("click", (e) => xoaHK(e));

	$("#btnThemHanhKhach").on("click", (e) => {
		e.preventDefault();
		$(".hanh-khach").append(
			"<div class='row'><div class='col-xs-4 ho-ten'><input type='text' id='ho-ten' class='form-control input-sm' placeholder='Họ tên' /></div>" +
				"<div class='col-xs-4 ngay-sinh'><input type='date' id='ngay-sinh' class='form-control input-sm' /></div>" +
				"<div class='col-xs-2 gioi-tinh'><select id='gioi-tinh' class='form-control input-sm'><option value='MR'>MR (Quý ông)</option><option value='MRS'>MRS (Quý bà)</option><option value='MS'>MS (Quý cô)</option><option value='MSTR'>MSTR (Bé trai)</option><option value='MISS'>MISS (Bé gái)</option></select></div>" +
				"<div class='col-xs-2 chuc-nang'><input type='checkbox' id='chon' checked /><button class='btn btn-xs btn-danger'>x</button></div></div>"
		);
		$(".hanh-khach").on("click", "button", (e) => xoaHK(e));
	});

	$("#btnExcel").on("click", (e) => {
		var data = $("#txtExcel").val();
		var rows = data.split("\n").filter((e) => e != undefined && e != "");

		var hanhkhachs = [];
		for (var y in rows) {
			var cells = rows[y].split("\t");
			if (cells.length >= 3 && cells[0] != "")
				hanhkhachs.push({
					hoten: cells[0],
					gioitinh: cells[1],
					ngaysinh: convertDate(cells[2]),
					check: true,
				});
		}
		$("#txtExcel").val("");
		renderListHanhKhach(hanhkhachs);
	});

	$("#btnExcelHelp").on("click", (e) =>
		alert(
			"Copy nội dung từ file excel dán vào ô bên cạnh để xử lý.\n" +
				"Các cột trong Excel:\n1. Họ tên\n2. Giới tính: MR, MRS, MS, MSTR, MISS\n3. Ngày sinh (dạng dd/mm/yyyy hoặc yyyy-mm-dd)"
		)
	);
}); // End ready
