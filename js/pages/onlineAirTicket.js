const onlineAirTicket = () => {
	let isRunning = false;
	let tryAgainAction = null;
	let parsedItems = [];

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		console.log("request", request);
		switch (request.state.request.action) {
			case "start-follow":
				pageState.setState(request.state);
				startFollow();
				return sendResponse();
			case "stop-follow":
				pageState.setState(request.state);
				stopFollow();
				return sendResponse();
		}
	});

	loadCurrentStateTab((state) => {
		console.log("load current state tab");
		switch (state.result.follow_state) {
			case "idle":
				break;
			case "error":
				break;
			case "confirm":
				confirmBooking();
				break;
			case "refresh":
				startFollow();
				break;
			default:
		}
	});

	const isJetstarTickets = (tdElm) => {
		const concattedText = $(tdElm).find("a").text();
		return /jetstar/gi.test(concattedText);
	};

	const isDOMResultLoaded = () => $(".TblGrid tr").length > 0;

	const tryAgain = () => {
		const request1 = new RequestDecorator(getRequestData()).withTryAgainAction().build();
		chrome.runtime.sendMessage(request1, () => $("#btnSearhOneWay").click());
	};

	const doReload = () => {
		if (isRunning) {
			console.log("Waiting for reload...");
			tryAgainAction = setTimeout(tryAgain, getRequestData().time_refresh_in_seconds * 1000);
		}
	};

	const startFollow = () => {
		isRunning = true;
		console.log("Start follow onlineairticket", pageState.getState());
		const request = getRequestData();

		// Duyệt tất cả các hàng
		if (isDOMResultLoaded()) {
			parseDOM();
			// Tìm chuyền bay thỏa mãn
			const result = find(parsedItems);
			if (result) {
				console.log("found", result);

				// Click ghế đã đc chọn
				result.$a[0].click();
				fill(result);

				// Tự động đặt chỗ
				if (request.auto_booking) {
					//Gửi yêu cầu xác thực đặt chỗ thành công hay không (vì chuyển page mới xác nhận đc nên cần hay đổi state)
					const request1 = new RequestDecorator(getRequestData()).withAcceptedFlight(result).withConfirmAction().build();
					chrome.runtime.sendMessage(request1, () => $("#btnBookEnable").click());
					return;
				} else return notifyFound(result); //Neu không tự động đặt, cứ báo thành tìm thấy kết quả
			}
		}
		doReload(); // Nếu không có ghế nào thỏa mãn
	};

	const stopFollow = () => {
		isRunning = false;
		if (tryAgainAction) clearTimeout(tryAgainAction);
	};

	const notifyFound = (foundItem) => {
		foundItem.from = $("#SearchOneWayDepartureCity").val();
		foundItem.to = $("#SearchOneWayArrivalCity").val();
		foundItem.date = $("#SearchOneWayDepartureDate").val();
		const request1 = new RequestDecorator(getRequestData()).withFoundAction().withAcceptedFlight(foundItem).build();
		chrome.runtime.sendMessage(request1, null);
	};

	const fill = (result) => {
		const request = getRequestData();
		console.log("start auto fill", request);
		request.booked = [];

		$("#BookPhone").val(request.sdt);
		$("#BookEmail").val(request.email);
		//fill seat remaining
		const expected = request.hanhkhach.length;
		const actual = result.option.seat_remaining;
		let cnt = 0;
		for (var i = 1; i <= expected; i++) {
			if (request.hanhkhach[i - 1].check) {
				cnt++;
				$("#BookPassenger" + cnt).show();
				$("#BookPassenger" + cnt + "FullName").val(request.hanhkhach[i - 1].hoten);
				$("#BookPassenger" + cnt + "Title").val(request.hanhkhach[i - 1].gioitinh);
				if (checkChild(request.hanhkhach[i - 1])) {
					$("#BookPassenger" + cnt + "Birthday").show();
					var ns = new Date(request.hanhkhach[i - 1].ngaysinh);
					$("#BookPassenger" + cnt + "Birthday").val(ns.getDate() + "/" + (ns.getMonth() + 1) + "/" + ns.getFullYear());
				}
				//////////////
				// Đánh dấu những hành khách đã được đặt chỗ
				////////////////
				request.booked.push(i - 1);
				if (cnt >= actual) break; // Nếu hết chỗ rồi thì thôi
			}
		}
		// Điền danh sách hành khách
		$("#BookNumofPassenger>option:nth-of-type(" + cnt + ")").prop("selected", true);
		const oldAction = request.action;
		// set booked
		request.action = "set-state";
		chrome.runtime.sendMessage(request, null);
		request.action = oldAction;
	};

	const parseDOM = () => {
		parsedItems = [];
		$(".TblGrid tr").each((index, elm) => {
			if (index !== 0) {
				// Kiểm tra lấy dữ liệu từ các hàng
				const parsedItem = parseItem(elm);
				if (parsedItem) parsedItems.push(parsedItem);
			}
		});
	};

	/***
	 * return Item Object
	 * @param rowElm
	 */
	const parseItem = (rowElm) => {
		if ($(rowElm).find("td").length > 0) {
			const tdPriceTable = $(rowElm).find("td")[6];
			const planeCd = $($(rowElm).find("td")[1])
				.text()
				.replace(/^[A-z]+/, "");
			if (!isJetstarTickets(tdPriceTable)) {
				const aElms = $(tdPriceTable).find("a");

				let priceTable = [];
				aElms.each((index, elm) => {
					const seat_remaining = parseFloat(
						$(elm)
							.text()
							.replace(/[A-z]+/, "")
					);
					const strInfo = $(elm)
						.attr("onclick")
						.replace(/FillToBooking\('|'\)/gi, "");
					const arrInfo = strInfo.split(";");
					const price_base = parseFloat(arrInfo[6].replace(/,/g, ""));
					if (price_base)
						priceTable.push({
							seat_type: arrInfo[5].replace(/^[A-z]+/, ""),
							price_base: price_base,
							seat_remaining: seat_remaining,
							$a: $(elm),
						});
				});

				return {
					plane_cd: planeCd,
					price_table: priceTable,
				};
			}
		}

		return null;
	};

	/***
	 * return valid item
	 * @param items result search items
	 */
	const find = (items) => {
		const request = getRequestData();
		let result = null;
		// Với từng chuyến bay
		for (let i = 0; i < items.length; i++) {
			const item = request.order === "asc" ? items[i] : items[items.length - i - 1];
			if (!item.price_table) continue;
			// Với từng chỗ ngồi
			// Từ giá thấp đến cao
			for (let iOption = item.price_table.length - 1; iOption >= 0; iOption--) {
				const option = item.price_table[iOption];
				if (option.price_base <= request.max_cost && option.seat_remaining > 0 && isValidPlaneCd(request.plane_cd, item.plane_cd)) {
					result = {
						plane_cd: item.plane_cd,
						option: option,
						airline_type: "vn",
						$a: option.$a,
					};
					break;
				}

				if (result) break;
			}
		}
		return result;
	};

	const confirmBooking = () => {
		const request = getRequestData();
		const isSuccess = !!$('#ShowBookMessage font[color="blue"]').length;
		const isFail = !!$('#ShowBookMessage font[color="red"]').length;

		if (isFail) {
			isRunning = true;
			doReload();
		} else if (isSuccess) {
			console.log("notify result", pageState.getState().result);
			notifyFound(pageState.getState().result);

			////////////////
			request.booked.forEach((item) => (request.hanhkhach[item].check = false));
			request.booked = [];
			request.action = "set-state";
			chrome.runtime.sendMessage(request, null); // set booked
			////////////////////////////
			// Kiểm tra xem danh sách còn ko
			let doit = false;
			request.hanhkhach.forEach((hk) => hk.check && (doit = true));
			// Re load lại trang
			if (doit) {
				tryAgain();
			} else {
				const request1 = new RequestDecorator(request).withStopFollowAction().build();
				chrome.runtime.sendMessage(request1, () => stopFollow());
			}
		}
	};
};
