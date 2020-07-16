(() => {
	const pageState = new PageState();
	pageState.onStateChange((state) => renderFollowBar(state));
	pageState.onFollowStateChange((followState) => renderFollowStateElements(followState));

	const getCurrentTab = (callback) => chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => callback(tabs[0]));
	const canStart = (followState) => followState == "idle" || followState == "found";

	/**
	 * Lấy dữ liệu từ form
	 */
	const getRequestData = () => {
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
		$("input[name=typeCost]").val([state.request.cost_type]);
		$("#maxCost").val(state.request.max_cost);
		$("#placeCd").val(state.request.plane_cd);
		$("#timeRefresh").val(state.request.time_refresh_in_seconds);
		$("#autoBooking").prop("checked", state.request.auto_booking);

		$("input[type=checkbox][name=airType]").each(function () {
			let value = $(this).val();
			let checked = state.request.airlines.indexOf(value) >= 0;
			$(this).prop("checked", checked);
		});

		$("#tenkhachhang").val(state.request.tenkhachhang);
		$("#diachi").val(state.request.diachi);
		$("#sdt").val(state.request.sdt);
		$("#email").val(state.request.email);

		let s = "";
		// Nếu có danh sách hành khách
		if (state.request.hanhkhach.length > 0) {
			for (let ie = 0; ie < state.request.hanhkhach.length; ie++) {
				s +=
					"<div class='row'><div class='col-xs-4 ho-ten'><input type='text' id='ho-ten' class='form-control input-sm' placeholder='Họ tên' value='" +
					state.request.hanhkhach[ie].hoten +
					"' /></div>";
				s +=
					"<div class='col-xs-4 ngay-sinh'><input type='date' id='ngay-sinh' class='form-control input-sm' value='" +
					state.request.hanhkhach[ie].ngaysinh +
					"' /></div>";

				s += "<div class='col-xs-2 gioi-tinh'><select id='gioi-tinh' class='form-control input-sm'>";
				s += '<option value="MR"' + (state.request.hanhkhach[ie].gioitinh == "MR" && "selected") + ">MR (Quý ông)</option>";
				s += '<option value="MRS"' + (state.request.hanhkhach[ie].gioitinh == "MRS" && "selected") + ">MRS (Quý bà)</option>";
				s += '<option value="MS"' + (state.request.hanhkhach[ie].gioitinh == "MS" && "selected") + ">MS (Quý cô)</option>";
				s += '<option value="MSTR"' + (state.request.hanhkhach[ie].gioitinh == "MSTR" && "selected") + ">MSTR (Bé trai)</option>";
				s += '<option value="MISS"' + (state.request.hanhkhach[ie].gioitinh == "MISS" && "selected") + ">MISS (Bé gái)</option>";
				s += "</select></div>";

				s +=
					"<div class='col-xs-2 chuc-nang'><input type='checkbox' id='chon' " +
					(state.request.hanhkhach[ie].check && "checked") +
					" /><button class='btn btn-xs btn-danger'>x</button></div></div>";
			}
			$(".hanh-khach").html("");
			$(".hanh-khach").html(s);
			$(".hanh-khach").on("click", "button", (e) => xoaHK(e));
		}

		renderFollowStateElements(state.result.follow_state);
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
			let request = new RequestDecorator(getRequestData()).withTab(tab).withStopFollowAction();
			if (canStart(state.result.follow_state)) request = request.withStartFollowAction();
			request = request.build();

			chrome.runtime.sendMessage(request, (response) => pageState.setState(response.state));
		});
	};

	const xoaHK = (e) => e.target.closest(".row").remove();

	$(document).ready(() => {
		let getCurrentFollowStateInterval = null;

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
							chrome.runtime.sendMessage({ action: "get-state", tab: tab }, (response) => pageState.setState(response.state));

							getCurrentFollowStateInterval = setInterval(() => {
								chrome.runtime.sendMessage({ action: "get-follow-state", tab: tab }, (response) =>
									pageState.setFollowState(response.follow_state)
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

		render();

		// Ấn nút theo dõi
		///////////////////
		$("#btnTriggerFollow").on("click", () => triggerFollow(pageState.getState()));

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
	}); // End ready
})();
