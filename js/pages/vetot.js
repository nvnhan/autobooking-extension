const vetot = () => {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

	/***
	 * Return true if the result is loaded, otherwise false
	 */
	let isDOMResultLoaded = () => {
		return $(".IBESRMain").length > 0;
	};

	let isPageError = () => {
		return $("#IBEErrorMsg").length > 0;
	};

	/***
	 * Process the result search and return result object
	 * @returns {{vendor: string, from, to, date, cost: {total, base}, max_cost: {total, base}}}
	 */
	let readBookingInfoResult = (rowIndex) => {
		return {
			vendor: "vetot.com.vn",
			from: getDepartureFrom(rowIndex),
			to: getDepartureTo(),
			date: getDepartureDate(),
			plane_cd: getPlaneCd(rowIndex),
			cost: getCost(rowIndex),
		};
	};

	let getPlaneCd = (rowIndex) => {
		return $($(".FlightItem .FlightNumber")[rowIndex]).text().trim();
	};

	let getDepartureFrom = () => {
		return $("#lblDepartureFrom").text();
	};

	let getDepartureTo = () => {
		return $("#lblDepartureTo").text();
	};

	let getDepartureDate = () => {
		return $("#lblDepartureDate").text();
	};

	let getCost = (rowIndex) => {
		let row = $(".FlightItem .Price")[rowIndex];
		return {
			total: $(row).data("price").replace(/\./g, ""),
			base: $(row).data("price-base").replace(/\./g, ""),
		};
	};

	let startFollow = () => {
		checkDOM();
	};

	let stopFollow = () => {
		if (tryAgainAction) clearTimeout(tryAgainAction);
	};

	let checkDOM = () => {
		/***
		 *
		 * Interval for checking result loaded
		 */
		let checkResultLoadedInterval = setInterval(() => {
			if (isDOMResultLoaded()) {
				clearInterval(checkResultLoadedInterval);

				if (!isPageError()) {
					let request = new RequestDecorator(getRequestData()).withGotResultAction().build();
					chrome.runtime.sendMessage(request, (response) => {
						pageState.setState(response.state);
						let acceptedFlights = lookupAcceptFlights(request);
						console.log(acceptedFlights);
						if (acceptedFlights.length > 0) {
							foundAcceptedFLights(acceptedFlights);
						} else {
							tryAgainAction = setTimeout(tryAgain, pageState.getState().request.time_refresh_in_seconds * 1000);
						}
					});
				}
			} else {
				console.log("Not yet!");
			}
		}, Config.time_check_dom_in_milliseconds);
	};

	let tryFollowAgain = () => {
		checkDOM();
	};

	let tryAgainAction = null;

	let tryAgain = () => {
		console.log("tryagain");
		let request = Object.assign(getRequestData(), { action: "try-again" });
		chrome.runtime.sendMessage(request, () => {
			$(".IBESearchButton")[0].click();
		});
	};

	let foundAcceptedFLights = (acceptedFlights) => {
		let request = new RequestDecorator(getRequestData()).withFoundAction().withAcceptedFlight(acceptedFlights[0]).build();
		chrome.runtime.sendMessage(request, (response) => {
			pageState.setState(response.state);

			if (response.state.request.auto_booking) {
				selectFirstAcceptedFlight(acceptedFlights[0].itemIndex);
				book();
			}
		});
	};

	let book = () => {
		setTimeout(() => {
			$("#btnBook").click();
		}, Config.time_wait_to_book_in_milliseconds);
	};

	let selectFirstAcceptedFlight = (rowIndex) => {
		$(".FlightItem .IBESelectFlight")[rowIndex].click();
	};

	let lookupAcceptFlights = (request) => {
		let itemCount = $(".FlightItem").length;
		let acceptedFlights = [];
		for (let i = 0; i < itemCount; i++) {
			let actualResult = readBookingInfoResult(i);
			if (isAcceptedResult(request, actualResult)) {
				actualResult.itemIndex = i;
				acceptedFlights.push(actualResult);
			}
		}

		return acceptedFlights;
	};

	let isAcceptedResult = function (expectedResult, actualResult) {
		let minCostActual = expectedResult.cost_type === "base" ? actualResult.cost.base : actualResult.cost.total;
		let validPlaneCd = isValidPlaneCd(expectedResult.plane_cd, actualResult.plane_cd);

		return parseFloat(minCostActual) <= parseFloat(expectedResult.max_cost) && validPlaneCd;
	};

	let isIdle = (state) => {
		let currentState = state || myState;
		return currentState.result.follow_state == "idle";
	};

	let isFound = (state) => {
		let currentState = state || myState;
		return currentState.result.follow_state == "found";
	};

	let triggerFollow = () => {
		if (isIdle() || isFound()) {
			startFollow();
		} else {
			stopFollow();
		}
	};

	loadCurrentStateTab((state) => {
		switch (state.result.follow_state) {
			case "idle":
				break;
			case "error":
				break;
			case "refresh":
				tryFollowAgain();
			default:
		}
	});
};
