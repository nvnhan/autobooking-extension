const vnabooking = () => {
	/***
	 * return Item Object
	 * @param rowElm
	 */
	let parseItem = (rowElm) => {
		if ($(rowElm).find("td").length > 0) {
			// let tdPriceTable = $(rowElm).find('td')[6];
			// let planeCd = $($(rowElm).find('td')[1]).text().replace(/^[A-z]+/, '');
			let planeCd = "";
			let aElms = $(rowElm).find("input");

			let priceTable = [];
			aElms.each((index, elm) => {
				let arrInfo = $(elm).val().split("|");
				planeCd = arrInfo[0].trim();
				priceTable.push({
					seat_type: arrInfo[1],
					price_base: parseFloat(arrInfo[8]),
					seat_remaining: parseFloat(arrInfo[9]),
					$a: $(elm),
				});
			});

			return {
				plane_cd: planeCd,
				price_table: priceTable,
			};
		}

		return null;
	};

	/***
	 * return valid item
	 * @param items result search items
	 */
	let find = (items) => {
		let request = pageState.getState().request;
		let result = null;
		// Với từng chuyến bay
		for (let iRow = items.length - 1; iRow >= 0; iRow--) {
			let item = items[iRow];
			if (!item.price_table) continue;
			// Với từng chỗ ngồi
			// Từ giá thấp đến cao
			for (let iOption = 0; iOption <= item.price_table.length - 1; iOption++) {
				let option = item.price_table[iOption];
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

		return getFlight(result);
	};

	let isRunning = false;
	let tryAgainAction = null;
	let doAction = null;

	let tryAgain = () => {
		console.log("tryagain");
		let request = Object.assign(getRequestData(), { action: "try-again" });
		chrome.runtime.sendMessage(request, () => {
			//$('#btnSearhOneWay').click();
			window.location.reload(true);
		});
	};

	let doReload = () => {
		console.log("reloading", isRunning);
		if (isRunning) {
			tryAgainAction = setTimeout(tryAgain, pageState.getState().request.time_refresh_in_seconds * 1000);
		}
	};

	let stopFollow = () => {
		isRunning = false;
		if (tryAgainAction) clearTimeout(tryAgainAction);
		if (doAction) clearTimeout(doAction);
	};

	let getRequestData = function () {
		return pageState.getState.bind(pageState)()["request"];
	};

	let getFlight = (foundItem) => {
		foundItem.from = $($("#luotdi_selected").children(".style1")[3]).text();
		foundItem.to = $($("#luotdi_selected").children(".style1")[4]).text();
		foundItem.date = $($("#luotdi_selected").children(".style1")[1]).text();
		return foundItem;
	};

	let doWork = () => {
		let parsedItems = [];
		// Duyệt tất cả các hàng
		console.log("start bussiness");
		if ($("tr.conchim").length > 0) {
			$("tr.conchim").each((index, elm) => {
				// Kiểm tra lấy dữ liệu từ các hàng
				let parsedItem = parseItem(elm);
				if (parsedItem) parsedItems.push(parsedItem);
			});
			console.log("Cac Chuyen bay parsed", parsedItems);
			// Tìm chuyền bay thỏa mãn
			let result = find(parsedItems);
			if (result) {
				console.log("found", result);

				//Neu không tự động đặt, cứ báo thành tìm thấy kết quả
				if (!pageState.getState().request.auto_booking) {
					notifyFound(result);
				}
				// Click ghế đã đc chọn
				result.$a[0].click();
				/////
				console.log("start auto fill", pageState.getState().request);
				$("input#Phone").val(pageState.getState().request.sdt);
				$("input#Email").val(pageState.getState().request.email);
				//fill seat remaining
				let expected = pageState.getState().request.hanhkhach.length;
				let actual = result.option.seat_remaining;
				let cnt = 0;
				for (var i = 1; i <= expected; i++) {
					if (pageState.getState().request.hanhkhach[i - 1].check) {
						cnt++;
						$("#pax_name_" + cnt)
							.removeAttr("disabled")
							.removeClass("dis");
						$("#pax_title_" + cnt)
							.removeAttr("disabled")
							.removeClass("dis");
						$("#pax_name_" + cnt).val(pageState.getState().request.hanhkhach[i - 1].hoten);
						$("#pax_title_" + cnt).val(
							pageState.getState().request.hanhkhach[i - 1].gioitinh.replace(/\w\S*/g, function (txt) {
								return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
							})
						);

						//////////////
						// Đánh dấu những hành khách đã được đặt chỗ
						////////////////
						pageState.getState().request.booked.push(i - 1);
						//pageState.getState().request.hanhkhach[i-1].check = false;
						if (cnt >= actual)
							// Nếu hết chỗ rồi thì thôi
							break;
					}
				}
				// Điền danh sách hành khách
				$("#paxnum_select>option:nth-of-type(" + cnt + ")").prop("selected", true);
				// Set booked state
				let ac = pageState.getState().request.action;
				pageState.getState().request.action = "set-state";
				// pageState.getState().request = Object.assign({}, pageState.getState().request, {acceptedFlight: result});
				chrome.runtime.sendMessage(pageState.getState().request, null);
				pageState.getState().request.action = ac;
				// Tự động đặt chỗ
				if (pageState.getState().request.auto_booking) {
					//Click đặt chỗ
					$("#do_booking input[type=submit]").click();

					setTimeout(confirmBooking, 10 * 1000);
				}
			} else {
				// Nếu không có ghế nào thỏa mãn
				doReload();
			}
		} else {
			// Nếu ko có chuyến bay nào
			doReload();
		}
	};

	let startFollow = () => {
		isRunning = true;
		console.log("start follow");

		doAction = setTimeout(doWork, 10 * 1000); // First time -> chay ngay
	};

	let confirmBooking = () => {
		// let isSuccess = !!$('#ShowBookMessage font[color="blue"]').length;
		// let isFail = !!$('#ShowBookMessage font[color="red"]').length;
		let isFail = $("#pnr_booking").val().indexOf("TÌM KIẾM LẠI") != -1;
		let isSuccess = $("#pnr_booking").val().indexOf("RECEIVED") != -1;
		console.log("s-f", isSuccess, isFail);
		const request = getRequestData();
		if (!isSuccess) {
			isRunning = true;
			const request1 = new RequestDecorator(request).withTryAgainAction().build();
			chrome.runtime.sendMessage(request1, null);
			doReload();
		} else if (isSuccess) {
			console.log("notify result", pageState.getState().result);
			notifyFound(pageState.getState().result);
			////////////////
			///////////////////////////////
			request.booked.forEach((item) => (request.hanhkhach[item].check = false));

			equest.booked = [];
			let ac = request.action;
			// set booked
			request.action = "set-state";
			chrome.runtime.sendMessage(request, null);
			request.action = ac;
			////////////////////////////
			// Kiểm tra xem danh sách còn ko
			let doit = false;
			request.hanhkhach.forEach((hk) => hk.check && (doit = true));
			// Re load lại trang
			if (doit) {
				isRunning = true;
				const request1 = new RequestDecorator(request).withStartFollowAction().build();
				console.log("request send after booking", request1);
				chrome.runtime.sendMessage(request1, null);
				doReload();
			} else {
				const request1 = new RequestDecorator(request).withStopFollowAction().build();
				chrome.runtime.sendMessage(request1, null);
				stopFollow();
			}
		}
	};

	// Chạy trước khi document ready
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
		console.log("load current state tab:", state.result.follow_state);
		switch (state.result.follow_state) {
			case "idle":
				break;
			case "error":
				break;
			case "confirm":
				// console.log('confirming');
				// confirmBooking();
				break;
			case "refresh":
				startFollow();
				break;
			default:
		}
	});
};
