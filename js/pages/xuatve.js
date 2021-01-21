/**
 * Xuatve.vn
 */
const xuatve = () => {
	let isRunning = false;
	let foundItems = [];
	let tryAgainAction = null;
	let checkResultLoadedInterval = null;

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		switch (request.state.request.action) {
			case "start-follow":
				console.log("start Xuatve", pageState.getState());
				startFollow();
				return sendResponse();
			case "stop-follow":
				pageState.setState(request.state);
				stopFollow();
				return sendResponse();
		}
	});

	loadCurrentStateTab((state) => {
		switch (state.result.follow_state) {
			case "idle":
				break;
			case "found":
				fill();
				break;
			case "refresh":
			case "waiting_result":
				setTimeout(checkDOM, 5000);
				break;
			case "done":
				console.log("Done. FInish");
			default:
		}
	});

	const startFollow = () => {
		$("#ContentPlaceHolder1_SearchBox1_btnLuu")[0].click();
	};

	const stopFollow = () => {
		isRunning = false;
		if (tryAgainAction) clearTimeout(tryAgainAction);
	};

	const isDOMResultLoaded = () => $("#departure_table tr").length > 0;
	const getPlaneCd = ($row) =>
		$($($row.find("td")[1]).find("strong")[0])
			.text()
			.trim();

	const getAirlineType = ($row) => {
		const image = $($row.find("img")[0]).attr("src");
		if (image.indexOf("vn6") >= 0) return "bl"; // Parcific airline
		if (image.indexOf("VJ") >= 0) return "vj";
		if (image.indexOf("QH") >= 0) return "bb";
		return "vn";
	};
	const getPrice = ($row) => {
		const divPrice = $($($row.find("td")[4]).find("a")[0]);
		let price = {};
		price.class = divPrice.data("class");
		price.price = divPrice.data("price");

		return price;
	};

	const getFlight = (foundItem) => {
		const ht = $(foundItem.$row.find("td")[2]).text().split("-");
		foundItem.from = ht[0];
		foundItem.to = ht[1];
		foundItem.date = $(foundItem.$row.find("td")[3]).text();
		return foundItem;
	};

	const getMinResult = (items, airlineTypes) => {
		let ret = null;
		let minPrice = Number.MAX_SAFE_INTEGER;
		for (let i = 0; i < items.length; i++) {
			if (items[i].price.price < minPrice && airlineTypes.indexOf(items[i].airline_type) >= 0) {
				ret = items[i];
				minPrice = ret.price.price;
			}
		}

		return getFlight(ret);
	};

	const doReload = () => isRunning && (tryAgainAction = setTimeout(tryAgain, getRequestData().time_refresh_in_seconds * 1000));

	const tryAgain = () => {
		const request = new RequestDecorator(getRequestData()).withTryAgainAction().build();
		// Redirect to other day
		chrome.runtime.sendMessage(request, () => location.reload());
	};

	const parseDOM = () => {
		let items = [];
		const rows = $("#departure_table tr.airline-flight"); // Only first page ~ 50 items
		for (let iRow = 0; iRow < rows.length; iRow++) {
			let item = {};
			const row = $(rows[iRow]);
			item.plane_cd = getPlaneCd(row);
			item.price = getPrice(row);
			item.airline_type = getAirlineType(row);
			item.$row = row;
			items.push(item);
		}

		return items;
	};

	const find = (items) => {
		const request = getRequestData();
		for (let iRow = 0; iRow < items.length; iRow++) {
			const item = items[iRow];
			if (!item.price) continue;
			if (item.price.price > 0 && item.price.price <= request.max_cost && isValidPlaneCd(request.plane_cd, item.plane_cd)) {
				foundItems.push(item);
			}
		}
	};

	const checkDOM = () => {
		isRunning = true;
		checkResultLoadedInterval = setInterval(() => {
			if (isDOMResultLoaded()) {
				clearInterval(checkResultLoadedInterval);

				const parsedItems = parseDOM();
				find(parsedItems);

				finalStep();
			} else {
				console.log("Not yet!");
			}
		}, Config.time_check_dom_in_milliseconds);
	};

	// sang giai đoạn nhập thông tin
	let finalStep = () => {
		const request = getRequestData();
		const checkedAirlines = request.airlines;
		if (tryAgainAction) clearTimeout(tryAgainAction);

		if (foundItems.length > 0) {
			let result = getMinResult(foundItems, checkedAirlines);
			if (result) {
				let divSelect = result.$row.find("td")[5];
				// Click chọn hàng này
				if (divSelect) $(divSelect).find("label")[0].click();

				if (request.auto_booking) {
					const request1 = new RequestDecorator(request).withAcceptedFlight(result).withFoundAction().build();
					chrome.runtime.sendMessage(request1, () => $("#ContentPlaceHolder1_btnContinue").click());
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

	const fill = () => {
		const request = getRequestData();
		$("#ContentPlaceHolder1_txtFirstName").val(request.tenkhachhang.split(" ")[0]);
		$("#ContentPlaceHolder1_txtLastName").val(request.tenkhachhang.split(" ").slice(1).join(" "));
		$("#ContentPlaceHolder1_txtPhone").val(request.sdt);
		$("#ContentPlaceHolder1_txtEmail").val(request.email);

		let cntA = 0;
		let cntC = 0;
		let cntI = 0;
		request.hanhkhach.forEach((value, ind) => {
			if (!value.check) return;
			if (checkAdult(value) && $("#ContentPlaceHolder1_rptADT_ddlGender_" + cntA).length > 0) {
				$("#ContentPlaceHolder1_rptADT_ddlGender_" + cntA).val(value.gioitinh === "MR" ? 0 : 1);
				$("#ContentPlaceHolder1_rptADT_txtHo_" + cntA).val(value.hoten.split(" ")[0]);
				$("#ContentPlaceHolder1_rptADT_txtDemTen_" + cntA).val(value.hoten.split(" ").slice(1).join(" "));
				cntA++;
				request.hanhkhach[ind].check = false;
			} else if (checkChild(value) && $("#ContentPlaceHolder1_rptCHD_ddlGender_" + cntC).length > 0) {
				$("#ContentPlaceHolder1_rptCHD_ddlGender_" + cntC).val(value.gioitinh === "MSTR" ? 0 : 1);
				$("#ContentPlaceHolder1_rptCHD_txtHo_" + cntC).val(value.hoten.split(" ")[0]);
				$("#ContentPlaceHolder1_rptCHD_txtDemTen_" + cntC).val(value.hoten.split(" ").slice(1).join(" "));
				$("#ContentPlaceHolder1_rptCHD_txtBD_" + cntC).val(convertDate(value.ngaysinh));
				cntC++;
				request.hanhkhach[ind].check = false;
			} else if (checkInfant(value) && $("#ContentPlaceHolder1_rptINF_ddlGender_" + cntI).length > 0) {
				$("#ContentPlaceHolder1_rptINF_ddlGender_" + cntI).val(value.gioitinh === "eMSTR" ? 0 : 1);
				$("#ContentPlaceHolder1_rptINF_txtHo_" + cntI).val(value.hoten.split(" ")[0]);
				$("#ContentPlaceHolder1_rptINF_txtDemTen_" + cntI).val(value.hoten.split(" ").slice(1).join(" "));
				$("#ContentPlaceHolder1_rptINF_txtBD_" + cntI).val(convertDate(value.ngaysinh));
				cntI++;
				request.hanhkhach[ind].check = false;
			}
		});
		setTimeout(() => {
			const req = new RequestDecorator(request).withStopFollowAction().build(); // Gửi request về background
			chrome.runtime.sendMessage(req, () => request.auto_booking && $("#btnContinue")[0].click()); // Click tiếp tục
		}, 4000);
	};
};
