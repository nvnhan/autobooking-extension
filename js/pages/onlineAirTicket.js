const onlineAirTicket = () => {
	let isJetstarTickets = (tdElm) => {
		let concattedText = $(tdElm).find("a").text();
		return /jetstar/gi.test(concattedText);
	};

	/***
	 * return Item Object
	 * @param rowElm
	 */
	let parseItem = (rowElm) => {
		if ($(rowElm).find("td").length > 0) {
			let tdPriceTable = $(rowElm).find("td")[6];
			let planeCd = $($(rowElm).find("td")[1])
				.text()
				.replace(/^[A-z]+/, "");
			if (!isJetstarTickets(tdPriceTable)) {
				let aElms = $(tdPriceTable).find("a");

				let priceTable = [];
				aElms.each((index, elm) => {
					let seat_remaining = parseFloat(
						$(elm)
							.text()
							.replace(/[A-z]+/, "")
					);
					let strInfo = $(elm)
						.attr("onclick")
						.replace(/FillToBooking\('|'\)/gi, "");
					let arrInfo = strInfo.split(";");
					let price_base = parseFloat(arrInfo[6].replace(/,/g, ""));
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
	let find = (items) => {
		let request = pageState.getState().request;
		let result = null;
		// Với từng chuyến bay
		for (let iRow = 0; iRow < items.length; iRow++) {
			let item = items[iRow];
			if (!item.price_table) continue;
			// Với từng chỗ ngồi
			// Từ giá thấp đến cao
			for (let iOption = item.price_table.length - 1; iOption >= 0; iOption--) {
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

		return result;
	};

	let isRunning = false;
	let tryAgainAction = null;

	let tryAgain = () => {
		console.log("tryagain");
		let request = Object.assign(getRequestData(), { action: "try-again" });
		chrome.runtime.sendMessage(request, () => {
			$("#btnSearhOneWay").click();
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
	};

	let getRequestData = function () {
		return pageState.getState.bind(pageState)()["request"];
	};

	let notifyFound = (foundItem) => {
		foundItem.from = $("#SearchOneWayDepartureCity").val();
		foundItem.to = $("#SearchOneWayArrivalCity").val();
		foundItem.date = $("#SearchOneWayDepartureDate").val();
		let request = new RequestDecorator(getRequestData()).withFoundAction().withAcceptedFlight(foundItem).build();
		chrome.runtime.sendMessage(request, (response) => {});
	};

	let startFollow = () => {
		let parsedItems = [];
		isRunning = true;
		console.log("start follow");

		// Duyệt tất cả các hàng
		if ($(".TblGrid tr").length > 0) {
			$(".TblGrid tr").each((index, elm) => {
				if (index !== 0) {
					// Kiểm tra lấy dữ liệu từ các hàng
					let parsedItem = parseItem(elm);
					if (parsedItem) parsedItems.push(parsedItem);
				}
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
				$("#BookPhone").val(pageState.getState().request.sdt);
				$("#BookEmail").val(pageState.getState().request.email);
				//fill seat remaining
				let expected = pageState.getState().request.hanhkhach.length;
				let actual = result.option.seat_remaining;
				let cnt = 0;
				for (var i = 1; i <= expected; i++) {
					if (pageState.getState().request.hanhkhach[i - 1].check) {
						cnt++;
						$("#BookPassenger" + cnt).show();
						$("#BookPassenger" + cnt + "FullName").val(pageState.getState().request.hanhkhach[i - 1].hoten);
						$("#BookPassenger" + cnt + "Title").val(pageState.getState().request.hanhkhach[i - 1].gioitinh);
						if (
							pageState.getState().request.hanhkhach[i - 1].gioitinh == "MISS" ||
							pageState.getState().request.hanhkhach[i - 1].gioitinh == "MSTR"
						) {
							$("#BookPassenger" + cnt + "Birthday").show();
							var ns = new Date(pageState.getState().request.hanhkhach[i - 1].ngaysinh);
							$("#BookPassenger" + cnt + "Birthday").val(ns.getDate() + "/" + (ns.getMonth() + 1) + "/" + ns.getFullYear());
						}
						//////////////
						// Đánh dấu những hành khách đã được đặt chỗ
						////////////////
						pageState.getState().request.booked.push(i - 1);
						if (cnt >= actual)
							// Nếu hết chỗ rồi thì thôi
							break;
					}
				}
				// Điền danh sách hành khách
				$("#BookNumofPassenger>option:nth-of-type(" + cnt + ")").prop("selected", true);
				let ac = pageState.getState().request.action;
				// set booked
				pageState.getState().request.action = "set-state";
				chrome.runtime.sendMessage(pageState.getState().request, (response) => {});
				pageState.getState().request.action = ac;

				// Tự động đặt chỗ
				if (pageState.getState().request.auto_booking) {
					//Gửi yêu cầu xác thực đặt chỗ thành công hay không (vì chuyển page mới xác nhận đc nên cần hay đổi state)
					const request = new RequestDecorator(getRequestData()).withAcceptedFlight(result).withConfirmAction().build();
					chrome.runtime.sendMessage(request, (response) => {});
					//Click đặt chỗ
					$("#btnBookEnable").click();
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

	let confirmBooking = () => {
		let isSuccess = !!$('#ShowBookMessage font[color="blue"]').length;
		let isFail = !!$('#ShowBookMessage font[color="red"]').length;
		console.log("s-f", isSuccess, isFail);
		if (isFail) {
			isRunning = true;
			const request = new RequestDecorator(getRequestData()).withTryAgainAction().build();
			chrome.runtime.sendMessage(request, (response) => {});
			doReload();
		} else if (isSuccess) {
			console.log("notify result", pageState.getState().result);
			notifyFound(pageState.getState().result);

			////////////////
			///////////////////////////////
			console.log("Booked index", pageState.getState().request.booked);
			pageState.getState().request.booked.forEach((item) => {
				console.log("uncheck item ", item);
				pageState.getState().request.hanhkhach[item].check = false;
			});
			pageState.getState().request.booked = [];
			let ac = pageState.getState().request.action;
			// set booked
			pageState.getState().request.action = "set-state";
			chrome.runtime.sendMessage(pageState.getState().request, (response) => {});
			pageState.getState().request.action = ac;
			////////////////////////////
			// Kiểm tra xem danh sách còn ko
			let doit = false;
			pageState.getState().request.hanhkhach.forEach((hk) => {
				if (hk.check) {
					doit = true;
				}
			});
			// Re load lại trang
			if (doit) {
				isRunning = true;
				const request = new RequestDecorator(getRequestData()).withStartFollowAction().build();
				console.log("request send after booking", request);
				chrome.runtime.sendMessage(request, (response) => {});
				doReload();
			} else {
				let request = Object.assign(getRequestData(), { action: "stop-follow" });
				chrome.runtime.sendMessage(request, () => {});
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
				console.log("start follow onlineairticket", pageState.getState());
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
				console.log("confirming");
				confirmBooking();
				break;
			case "refresh":
				startFollow();
				break;
			default:
		}

		// when document ready
		$(document).ready(() => {});
	});
};
