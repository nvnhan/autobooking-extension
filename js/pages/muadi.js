let muadi = () => {
	let isRunning = false;
	let foundItems = [];
	let tryAgainAction = null;

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		switch (request.state.request.action) {
			case "start-follow":
				pageState.setState(request.state);
				console.log("start follow muadi", pageState.getState());
				startFollow();
				return sendResponse();
			case "stop-follow":
				pageState.setState(request.state);
				stopFollow();
				return sendResponse();
		}
	});

	loadCurrentStateTab((state) => {
		console.log("muadi -> state.result.follow_state", state.result.follow_state);
		switch (state.result.follow_state) {
			case "waiting_result":
				startFollow();
				break;
			case "confirm":
				confirmBooking();
				break;
			case "final-confirm":
				finalConfirmBooking();
				break;
			case "refresh":
				// Go back to page after send 'try-again' action
				goToMainPage();
			default:
		}
	});

	//#region Get data function
	const foundFlight = (foundItem) => {
		foundItems.push(foundItem);
		console.log("Found items", foundItems);
	};

	const getFlight = (foundItem) => {
		foundItem.from = $($("#flightselection").children("div").children("div")[1]).children("b").text();
		foundItem.to = $($("#flightselection").children("div").children("div")[2]).children("b").text();
		foundItem.date = $($("#flightselection").children("div").children("div")[0]).text();
		return foundItem;
	};

	const switchToVietjetAirJetstar = () => $($("#airlines_menu_dep .airlinetab")[1]).find("a")[0].click();

	const switchToVietnamAirline = () => $($("#airlines_menu_dep .airlinetab")[0]).find("a")[0].click();

	const isOnlyVietnamAirline = () => $("#airlines_menu_dep .airlinetab").length === 0;

	// Đang chờ giữ chỗ???
	const isWaiting = () => $(".flight_header").length > 0 && $(".flight_header").text().indexOf("chờ") >= 0; //  Vui lòng chờ tới khi chỗ của bạn được giữ...

	// Đã giữ chỗ xong
	const isDone = () =>
		$(".flight_header").length > 0 && ($(".flight_header").text().indexOf("xong") >= 0 || $(".flight_header").text().indexOf("công") >= 0);

	// Đã giữ chỗ xong
	const isFail = () => $(".flight_header2").length > 0 && $(".flight_header2").text().indexOf("Không") >= 0;

	const doReload = () => isRunning && (tryAgainAction = setTimeout(tryAgain, getRequestData().time_refresh_in_seconds * 1000));

	const tryAgain = () => {
		const request = new RequestDecorator(getRequestData()).withTryAgainAction().build();
		// Redirect to other day
		chrome.runtime.sendMessage(request, () => (window.location.href = window.location.href + "&go_day=" + getRequestData().daypass));
	};

	const goToMainPage = () => {
		const request = new RequestDecorator(getRequestData()).withStartFollowAction().build();
		// Redirect to other day
		chrome.runtime.sendMessage(request, () => (window.location.href = window.location.href + "&go_day=-" + getRequestData().daypass));
	};

	const getMinResult = (items, airlineTypes) => {
		console.log("🚀 ~ file: muadi.js ~ line 289 ~ getMinResult ~ items, airlineTypes", items, airlineTypes);
		let ret = null;
		let minPrice = Number.MAX_SAFE_INTEGER;
		for (let i = 0; i < items.length; i++) {
			if (items[i].option.price_base < minPrice && airlineTypes.indexOf(items[i].airline_type) >= 0) {
				ret = items[i];
				minPrice = ret.option.price_base;
			}
		}

		return getFlight(ret);
	};

	/***
	 * select combobox adult by number of tickets
	 * @param numberTickets > 0
	 */
	let selectAdult = function (numberTickets) {
		let id = "#ListBooking_ddlADT option:eq(" + numberTickets + ")";
		console.log("selectAdult -> id", id);
		$(id).prop("selected", true);
	};

	/***
	 * select combobox children by number of tickets
	 * @param numberTickets >= 0
	 */
	let selectChildren = function (numberTickets) {
		let id = "#ListBooking_ddlCHD option:eq(" + numberTickets + ")";
		console.log("selectChildren -> id", id);
		$(id).prop("selected", true);
	};
	//#endregion

	// VietNamAirline & Parcific airline (thay cho bl)
	const vietnamAirline = (vn, bl, nextStep, checked) => {
		if (!checked) {
			nextStep && nextStep();
			return;
		}
		console.log("Start VN, PA");

		const getPlaneCd = ($row) => $($row.find("div.item")[1]).find("a b").text();
		const getAirlineType = ($row) => ($($row.find("div.item")[0]).find("img").attr("src").indexOf("VN") >= 0 ? "vn" : "bl");
		const getPriceTable = ($row) => {
			const options = $row.find("select option");
			if (!options.length) return null;
			let priceTable = [];
			for (let iOption = 0; iOption < options.length; iOption++) {
				let $option = $(options[iOption]);
				let optionObj = {};
				optionObj.price_base = $option.data("fare");
				if (optionObj.price_base == "-1")
					// Với những cái E gạch --------, không có giá
					continue;

				let strValue = $option.val().substr(0, 2);
				optionObj.seat_remaining = strValue[1];
				optionObj.seat_type = strValue[0];
				priceTable.push(optionObj);
			}

			return priceTable;
		};

		const parseDOM = () => {
			let items = [];
			let rows = $("#airlines_depart_VN .line_item");
			for (let iRow = 0; iRow < rows.length; iRow++) {
				let item = {};
				let $row = $(rows[iRow]);
				item.plane_cd = getPlaneCd($row);
				item.airline_type = getAirlineType($row);
				item.price_table = getPriceTable($row);
				item.$row = $row;
				if ((vn && item.airline_type === "vn") || (bl && item.airline_type === "bl")) items.push(item);
			}

			return items;
		};

		const find = (items) => {
			const request = getRequestData();
			let result = null;
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (!item.price_table) continue;
				// Giá mặc định là tăng dần
				for (let j = 0; j < item.price_table.length; j++) {
					const option = item.price_table[j];
					if (
						option.price_base > 0 &&
						option.price_base <= request.max_cost &&
						option.seat_remaining > 0 &&
						isValidPlaneCd(request.plane_cd, item.plane_cd)
					) {
						result = {
							plane_cd: item.plane_cd,
							option: option,
							airline_type: item.airline_type,
							$row: item.$row,
						};
						break;
					}
				}
				if (result) break;
			}

			return result;
		};

		const isDOMResultLoaded = () => $("#airlines_depart_VN .line_item").length > 0;
		const isEmptyResult = () => $("#airlines_depart_VN .line_noback_highlight").length > 0;

		let checkDOM = () => {
			let checkResultLoadedInterval = setInterval(() => {
				if (isDOMResultLoaded() || isEmptyResult()) {
					console.log("vn empty", isEmptyResult());
					clearInterval(checkResultLoadedInterval);

					if (isEmptyResult()) {
						nextStep && nextStep();
					} else {
						let parsedItems = parseDOM();
						let found = find(parsedItems);
						if (!found) {
						} else {
							console.log("VN Found", found);
							foundFlight(found);
						}
						// Tìm được hay ko đều chuyển sang bước tiếp: tìm ở jets và vj
						nextStep && nextStep();
					}
				} else {
					console.log("Not yet!");
				}
			}, Config.time_check_dom_in_milliseconds);
		};

		checkDOM();
	}; // End VN

	// Dùng cho cả VJ và BB
	const vjbb = (vj, bb, nextStep, checked) => {
		if (!checked) {
			nextStep && nextStep();
			return;
		}
		console.log("Begin VJ & BB");

		let isDOMResultLoaded = () => {
			return $("#airlines_depart_VJ .line_item").length > 0;
		};

		let getPlaneCd = ($row) => {
			let $plane_cd_div = $($row.find("div.item")[1]);
			return $plane_cd_div.text().trim();
		};

		let parseDOM = () => {
			let items = [];
			let rows = $("#airlines_depart_VJ .line_item");
			for (let iRow = 0; iRow < rows.length; iRow++) {
				let item = {};
				let $row = $(rows[iRow]);
				item.plane_cd = getPlaneCd($row);

				let strPrice = $($row.find(".item")[5])
					.text()
					.replace(/VND|,| /gi, "");
				item.price_base = parseInt(strPrice);
				item.$row = $row;
				items.push(item);
			}

			return items;
		};

		let find = (items) => {
			let request = pageState.getState().request;
			for (let iRow = 0; iRow < items.length; iRow++) {
				let item = items[iRow];
				if (item.price_base <= 0) continue;
				if (item.price_base > 0 && item.price_base <= request.max_cost && isValidPlaneCd(request.plane_cd, item.plane_cd)) {
					// Tìm được cb thỏa đk giá
					if (item.plane_cd.indexOf("QH") >= 0 && bb)
						// Nếu cb là bb và có chọn bb
						return {
							plane_cd: item.plane_cd,
							option: {
								price_base: item.price_base,
							},
							airline_type: "bb",
							$row: item.$row,
						};
					else if (item.plane_cd.indexOf("VJ") >= 0 && vj)
						return {
							plane_cd: item.plane_cd,
							option: {
								price_base: item.price_base,
							},
							airline_type: "vj",
							$row: item.$row,
						};
				}
			}

			return null;
		};

		let isEmptyResult = () => {
			return $("#airlines_depart_VJ .line_noback_highlight").length > 0 || $("#airlines_depart_VJ .line_noback").length > 0;
		};

		let checkDOM = () => {
			let checkResultLoadedInterval = setInterval(() => {
				if (isDOMResultLoaded() || isEmptyResult()) {
					clearInterval(checkResultLoadedInterval);
					if (isEmptyResult()) {
						nextStep && nextStep();
					} else {
						let parsedItems = parseDOM();
						let found = find(parsedItems);
						if (!found) {
						} else {
							console.log("VJ & BB Found", found);
							foundFlight(found);
						}
						nextStep && nextStep();
					}
				} else {
					console.log("Not yet!");
				}
			}, Config.time_check_dom_in_milliseconds);
		};

		checkDOM();
	}; // End vjbb

	const stopFollow = () => {
		isRunning = false;
		if (tryAgainAction) clearTimeout(tryAgainAction);
	};

	// sang giai đoạn nhập thông tin
	let finalStep = () => {
		const request = getRequestData();
		const checkedAirlines = request.airlines;
		if (tryAgainAction) clearTimeout(tryAgainAction);

		if (foundItems.length > 0) {
			let result = getMinResult(foundItems, checkedAirlines);
			if (result) {
				let divSelect = result.$row.find("div.item")[6];
				if (divSelect)
					// Click chọn hàng này
					$(divSelect).find("input")[0].click();

				if (request.auto_booking) {
					////////////////////////////////////
					//if (result.airline_type === "vn") {
					// Số người lớn
					//let expectedAdults = $($('#ChildPage_ListBooking_ddlADT_title .ddTitleText')[0]).text();
					let expectedAdults = request.hanhkhach.filter(checkAdult).filter(checkCheck).length;
					// Số trẻ em
					//let expectedChildren = $($('#ChildPage_ListBooking_ddlCHD_title .ddTitleText')[0]).text();
					let expectedChildren = request.hanhkhach.filter(checkChild).filter(checkCheck).length;
					// Số ghế có thể đặt
					let actual = result.option.seat_remaining;

					expectedAdults = parseInt(expectedAdults ? expectedAdults : 0);
					expectedChildren = parseInt(expectedChildren ? expectedChildren : 0);
					actual = parseInt(actual);

					let selectAdt = 0;
					let selectChd = 0;
					if (actual < expectedAdults + expectedChildren) {
						let missingTickets = expectedChildren + expectedAdults - actual;
						if (missingTickets >= expectedChildren) {
							selectChd = 0;
							selectAdt = actual;
						} else {
							selectAdt = expectedAdults;
							selectChd = expectedChildren - missingTickets;
						}
					} else {
						selectAdt = expectedAdults;
						selectChd = expectedChildren;
					}
					// Chọn trên trang web
					selectAdult(selectAdt);
					selectChildren(selectChd);
					/////////////////////////
					// Set index booked
					//
					let cntA = 0; // Count adult
					let cntC = 0; // Cout child
					request.hanhkhach.forEach((value, ind) => {
						if (value.check) {
							if (checkAdult(value) && cntA < selectAdt) {
								request.booked.push(ind); // Hành khách thứ i đưuọc chọn
								cntA++;
							} else if (checkChild(value) && cntC < selectChd) {
								request.booked.push(ind); // Hành khách thứ i đưuọc chọn
								cntC++;
							}
						}
					});
					//}
					///////////////////////////////////////////////////////////////////

					const request1 = new RequestDecorator(request).withAcceptedFlight(result).withConfirmAction().build();
					chrome.runtime.sendMessage(request1, () => $("#ListBooking_btnSubmit").click());
				} else {
					notifyFound(result);
				}
			} else {
				doReload();
			}
		} else {
			doReload();
		}
	};

	const startFollow = () => {
		isRunning = true;
		foundItems = [];
		const checkedAirlines = getRequestData().airlines;

		if (isOnlyVietnamAirline()) {
			vietnamAirline(
				checkedAirlines.indexOf("vn") >= 0,
				checkedAirlines.indexOf("bl") >= 0,
				finalStep,
				checkedAirlines.indexOf("vn") >= 0 || checkedAirlines.indexOf("bl") >= 0
			);
		} else {
			switchToVietnamAirline();
			wait(500).then(() => {
				vietnamAirline(
					checkedAirlines.indexOf("vn") >= 0,
					checkedAirlines.indexOf("bl") >= 0,
					() => {
						// Next step = không tìm thấy kết quả phù hợp ở tab VN
						switchToVietjetAirJetstar(); // Chuyển sang tab giá rẻ: VJ, Jets
						wait(500).then(() => {
							// Đợi
							vjbb(
								checkedAirlines.indexOf("vj") >= 0,
								checkedAirlines.indexOf("bb") >= 0,
								finalStep,
								checkedAirlines.indexOf("bb") >= 0 || checkedAirlines.indexOf("vj") >= 0
							);
						});
					},
					checkedAirlines.indexOf("vn") >= 0 || checkedAirlines.indexOf("bl") >= 0
				);
			}); // end wait
		} // end else
	};

	const fill = () => {
		const state = getRequestData();
		console.log("start auto fill", state);
		$("#ctl10_txtCustomerName").val(state.tenkhachhang);
		$("#ctl10_txtCustomerAddress").val(state.diachi);
		$("#ctl10_txtCustomerPhone").val(state.sdt);
		$("#ctl10_txtCustomerEmail").val(state.email);

		// Lưu tạm các hành khách đã fill vào mảng booked
		// Nếu đặt thành công thi mới đánh dấu bỏ check
		let cntA = 1;
		let cntC = 1;
		if (state.booked.length > 0) {
			// Nếu có danh sách đánh dấu những người đc chọn (ở VN)
			state.booked.forEach((i) => {
				if (checkAdult(state.hanhkhach[i]) && $("#firstname_adt_" + cntA).length > 0) {
					$("#title_adt_" + cntA).val(state.hanhkhach[i].gioitinh.toLowerCase());
					$("#firstname_adt_" + cntA).val(state.hanhkhach[i].hoten.split(" ")[0]);
					$("#lastname_adt_" + cntA).val(state.hanhkhach[i].hoten.split(" ").slice(1).join(" "));
					cntA++;
					// state.hanhkhach[i].check = false;
				} else if (checkChild(state.hanhkhach[i]) && $("#firstname_chd_" + cntC).length > 0) {
					$("#title_chd_" + cntC).val(state.hanhkhach[i].gioitinh.toLowerCase());
					$("#firstname_chd_" + cntC).val(state.hanhkhach[i].hoten.split(" ")[0]);
					$("#lastname_chd_" + cntC).val(state.hanhkhach[i].hoten.split(" ").slice(1).join(" "));
					cntC++;
					// state.hanhkhach[i].check = false;
				}
			});
			//  state.booked = [];
		} else {
			// Điền danh sách hành khách
			state.booked = [];
			state.hanhkhach.forEach((value, ind) => {
				if (value.check) {
					if (checkAdult(value) && $("#firstname_adt_" + cntA).length > 0) {
						$("#title_adt_" + cntA).val(value.gioitinh.toLowerCase());
						$("#firstname_adt_" + cntA).val(value.hoten.split(" ")[0]);
						$("#lastname_adt_" + cntA).val(value.hoten.split(" ").slice(1).join(" "));
						cntA++;
						state.booked.push(ind);
						// state.hanhkhach[ind].check = false;
					} else if (checkChild(value) && $("#firstname_chd_" + cntC).length > 0) {
						$("#title_chd_" + cntC).val(value.gioitinh.toLowerCase());
						$("#firstname_chd_" + cntC).val(value.hoten.split(" ")[0]);
						$("#lastname_chd_" + cntC).val(value.hoten.split(" ").slice(1).join(" "));
						cntC++;
						state.booked.push(ind);
						// state.hanhkhach[ind].check = false;
					}
				}
			});
		}
		//////////////
		////////// Gửi lại state
		const request = new RequestDecorator(state).withFinalConfirmAction().build();
		console.log("send state after fill muadi", request);
		chrome.runtime.sendMessage(request, () => $("#ctl10_btnConfirm").click());
	};

	const confirmBooking = () => {
		// State = Final: Fill in main method
		// else:
		if ($("#ctl10_btnConfirm").length > 0) {
			setTimeout(fill, 500);
		} else {
			let isFail = $("#ChildPage_ListBooking_divShowError").length > 0;
			if (isFail) {
				isRunning = true;
				doReload();
			} else {
				//$('#ChildPage_ctl09_btnConfirm').click();
			}
		}
	};

	let finalConfirmBooking = () => {
		// Sau khi điền tên và ấn nút, đc xử lý ở hàm chính phía dưới
		// Check xem có thành công không
		wait(10000).then(() => {
			console.log("final confirm booking");

			let checkResultLoadedInterval = setInterval(() => {
				const request = getRequestData();
				if (!isWaiting()) {
					clearInterval(checkResultLoadedInterval);
					if (isDone() && !isFail()) {
						let flight = request.acceptedFlight;
						notifyFound(flight);

						// Bỏ check những hành khách đã được đặt
						let maxInd = 0;
						booked.forEach((ind) => {
							request.hanhkhach[ind].check = false;
							maxInd = ind;
						});
						request.booked = [];

						maxInd++;
						// Còn hành khách thì đặt tiêp
						if (request.hanhkhach.length > maxInd) {
							const request1 = new RequestDecorator(request).withStartFollowAction().build();
							chrome.runtime.sendMessage(request1, null);
							isRunning = true;
						} else {
							const request1 = new RequestDecorator(request).withStopFollowAction().build();
							chrome.runtime.sendMessage(request1, null);
							isRunning = false;
						}

						// Tìm chuyến khác
						// $("#FlightLeftInfo_btnTryOther").click();
					} else {
						console.log("Không giữ được");
						const request1 = new RequestDecorator(request).withStopFollowAction().build();
						chrome.runtime.sendMessage(request1, null);
						isRunning = false;
					}
				} else {
					console.log("still waiting!!!");
				}
			}, Config.time_check_dom_in_milliseconds);
		});
	};
};
