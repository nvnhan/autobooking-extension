/**
 * Xuatve.vn
 */
const xuatve = () => {
	let isRunning = false;
	let foundItems = [];
	let tryAgainAction = null;
	let checkResultLoadedInterval = null;

	const getPlaneCd = ($row) => $($row.find("td")[1]).text().trim();

	let getPrice = (row) => {
		const divPrice = $($(row.find("td")[4]).find("a")[0]);
		let price = {};
		price.class = divPrice.data("class");
		price.price = divPrice.data("price");

		return price;
	};

	const parseDOM = () => {
		let items = [];
		const rows = $("#departure_table tr.airline-flight"); // Only first page ~ 50 items
		for (let iRow = 0; iRow < rows.length; iRow++) {
			let item = {};
			let row = $(rows[iRow]);
			item.plane_cd = getPlaneCd(row);
			item.price = getPrice(row);
			item.$row = row;
			items.push(item);
		}

		return items;
	};

	let find = (items) => {
		let request = pageState.getState().request;
		let result = null;
		for (let iRow = 0; iRow < items.length; iRow++) {
			let item = items[iRow];
			if (!item.price) continue;
			if (item.price.price > 0 && item.price.price <= request.max_cost && isValidPlaneCd(request.plane_cd, item.plane_cd)) {
				result = {
					plane_cd: item.plane_cd,
					price: item.price,
					$row: item.$row,
				};
				console.log(result);
			}
			if (result) break;
		}

		return result;
	};

	const isDOMResultLoaded = () => $("#departure_table tr").length > 0;

	const checkDOM = () => {
		checkResultLoadedInterval = setInterval(() => {
			if (isDOMResultLoaded()) {
				clearInterval(checkResultLoadedInterval);

				const parsedItems = parseDOM();
				const found = find(parsedItems);
				if (found) {
					console.log("Xuatve Found", found);
					foundFlight(found);
				}
			} else {
				console.log("Not yet!");
			}
		}, Config.time_check_dom_in_milliseconds);
	};

	const startFollow = function () {
		$("#ContentPlaceHolder1_SearchBox1_btnLuu")[0].click();
	};

	const fill = () => {
		const request = pageState.getState().request;
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
			case "waiting_result":
				setTimeout(checkDOM, 5000);
				break;
			case "done":
				console.log("Done. FInish");
			default:
		}
	});
};
