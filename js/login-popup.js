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
		$(".load_data").each(function () {
			if ($(this).children(".txtkhach").val() != "") {
				hanhkhachs.push({
					hoten: $(this).children(".txtkhach").val().trim(),
					gioitinh: $(this).children(".gioitinh").val(),
					ngaysinh: $(this).children(".ngaysinh").val(),
					check: $(this).children(".checkbox").prop("checked"),
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

		let nhapTen = "";
		// Nếu có danh sách hành khách
		if (state.request.hanhkhach.length > 0) {
			$("#soHanhKhach>option:nth-of-type(" + state.request.hanhkhach.length + ")").attr({ selected: "selected" });
			for (let ie = 0; ie < state.request.hanhkhach.length; ie++) {
				nhapTen += '<div class="row"><label class="control-label col-md-2">Khách ' + (ie + 1) + "</label>";
				nhapTen += '<div class="load_data col-md-10"><input type="text" class="txtkhach form-control" placeholder="Họ và tên" id="txtKhach' + (ie + 1) + '" value="' + state.request.hanhkhach[ie].hoten + '"><select class="form-control gioitinh">';

				nhapTen += '<option value="MR"' + (state.request.hanhkhach[ie].gioitinh == "MR" && "selected") + ">MR (Quý ông)</option>";
				nhapTen += '<option value="MRS"' + (state.request.hanhkhach[ie].gioitinh == "MRS" && "selected") + ">MRS (Quý bà)</option>";
				nhapTen += '<option value="MS"' + (state.request.hanhkhach[ie].gioitinh == "MS" && "selected") + ">MS (Quý cô)</option>";
				nhapTen += '<option value="MSTR"' + (state.request.hanhkhach[ie].gioitinh == "MSTR" && "selected") + ">MSTR (Bé trai)</option>";
				nhapTen += '<option value="MISS"' + (state.request.hanhkhach[ie].gioitinh == "MISS" && "selected") + ">MISS (Bé gái)</option>";
				nhapTen += '</select><input type="date" id="date" placeholder="Ngày sinh" class="form-control ngaysinh" value="' + state.request.hanhkhach[ie].ngaysinh + '">';
				nhapTen += '<input type="checkbox" class="checkbox"' + (state.request.hanhkhach[ie].check && "checked") + " /></div></div>";
			}
			$(".nhapTen").html("");
			$(".nhapTen").html(nhapTen);
		} else {
			$("#soHanhKhach>option:nth-of-type(1)").attr({ selected: "selected" });
			nhapTen += '<div class="row"><label class="control-label col-md-2">Khách 1</label>';
			nhapTen += '<div class="load_data col-md-10"><input type="text" class="txtkhach form-control" placeholder="Họ và tên" id="txtKhach1"><select class="form-control gioitinh">' + '<option value="MR">MR (Quý ông)</option>' + '<option value="MRS">MRS (Quý bà)</option>' + '<option value="MS">MS (Quý cô)</option>' + '<option value="MSTR">MSTR (Bé trai)</option>' + '<option value="MISS">MISS (Bé gái)</option>' + '</select><input type="date" id="date" placeholder="Ngày sinh" class="form-control ngaysinh">' + '<input type="checkbox" class="checkbox" checked /></div></div>';

			$(".nhapTen").html("");
			$(".nhapTen").html(nhapTen);
		}

		renderFollowStateElements(state.result.follow_state);
	};
	/**
	 * Hiển thị trạng thái hoạt động của tool
	 */
	const renderFollowStateElements = (followState) => {
		$("#followStateMsg").text(Config.state[followState].title);
		$("#btnTriggerFollowMsg").text(canStart(followState) ? "Bắt đầu theo dõi" : "Dừng theo dõi");
	};

	const triggerFollow = (state) => {
		getCurrentTab((tab) => {
			let request = new RequestDecorator(getRequestData()).withTab(tab).withStopFollowAction();
			if (canStart(state.result.follow_state)) request = request.withStartFollowAction();
			request = request.build();

			chrome.runtime.sendMessage(request, (response) => pageState.setState(response.state));
		});
	};

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
						// Get state of current tab from background.js
						chrome.runtime.sendMessage({ action: "get-state", tab: tab }, (response) => pageState.setState(response.state));

						getCurrentFollowStateInterval = setInterval(() => {
							chrome.runtime.sendMessage({ action: "get-follow-state", tab: tab }, (response) => pageState.setFollowState(response.follow_state));
						}, 500);
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

		// Chọn số hành khách
		$('select[name="soHanhKhach"]').change(() => {
			let nhapTen = "";
			for (let i = 0; i < $('select[name="soHanhKhach"]').val(); i++) {
				nhapTen += '<div class="row"><label class="control-label col-md-2">Khách ' + (i + 1) + "</label>";
				nhapTen += '<div class="load_data col-md-10"><input type="text" class="txtkhach form-control" placeholder="Họ và tên" id="txtKhach' + (i + 1) + '"><select class="form-control gioitinh">' + '<option value="MR">MR (Quý ông)</option>' + '<option value="MRS">MRS (Quý bà)</option>' + '<option value="MS">MS (Quý cô)</option>' + '<option value="MSTR">MSTR (Bé trai)</option>' + '<option value="MISS">MISS (Bé gái)</option>' + '</select><input type="date" id="date" placeholder="Ngày sinh" class="form-control ngaysinh">' + '<input type="checkbox" class="checkbox" checked /></div></div>';
			}

			$(".nhapTen").html("");
			$(".nhapTen").html(nhapTen);
		});
	}); // End ready
})();
