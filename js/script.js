////////////////////////////////
// SCRIPT ĐƯỢC CHÈN VÀO TRANG WEB
// NHẬN VÀ PHẢN HỒI REQUEST TỪ TOOL
// XỬ LÝ CÁC NGHIỆP VỤ CHÍNH
//////////////////////////////////

function checkAdult(hanhkhach) {
    return hanhkhach.gioitinh != "MISS" && hanhkhach.gioitinh != "MSTR";
}
function checkChild(hanhkhach) {
    return hanhkhach.gioitinh == "MISS" ||hanhkhach.gioitinh == "MSTR";
}
function checkCheck(hanhkhach) {
    return hanhkhach.check;
}

let vj = () => {
    let startFollow = function () {
        //click button 'Tiep tuc'
        setTimeout(() => {
            console.log('click');
            $('#contentwsb a.rightbutton')[0].click();
        }, 2000)

    }

    let fill = function () {

        console.log('filling');

        console.log(pageState.getState());
        $('#txtPax1_Addr1').val(pageState.getState().request.diachi);
        $('#txtPax1_City').val(pageState.getState().request.diachi);
        $('#txtPax1_Ctry').val(234) // 234 ~ VN
        $('#txtPax1_EMail').val(pageState.getState().request.email);

        $($('span.mobileNumber')[0]).find('div.selected-flag')[0].click();
        $($('ul.country-list')[0]).find('li[data-dial-code=84]')[0].click();
        $('#txtPax1_Phone2').val(pageState.getState().request.sdt);
        var evt = document.createEvent('KeyboardEvent');
        evt.initEvent('change', true, true);
        document.getElementById('txtPax1_Phone2').dispatchEvent(evt);

        let cnt = 1;
        let child = $('table#tblPaxCountsInfo td:nth-child(3) span').text();
        let cntchild = 1;
        pageState.getState().request.hanhkhach.forEach((value, ind) => {
            if($(`#txtPax${cnt}_LName`).length > 0) {
                if(value.gioitinh == 'MR')
                    $(`select#txtPax${cnt}_Gender`).val('M');
                else
                    $(`select#txtPax${cnt}_Gender`).val('F');

                $(`#txtPax${cnt}_LName`).val(value.hoten.split(' ')[0]);
                $(`#txtPax${cnt}_FName`).val(value.hoten.split(' ').slice(1).join(' '));
                cnt++;
               // response.state.request.hanhkhach[i].check = false;
           }
            else if(cntchild <= child)        // Hết người lớn
            {
                $(`#chkPax${cntchild}_Infant`)[0].click();
                $(`#txtPax${cntchild}_Infant_FName`).val(value.hoten.split(' ')[0]);
                $(`#txtPax${cntchild}_Infant_LName`).val(value.hoten.split(' ').slice(1).join(' '));
                cntchild++;
            }
        });
        
        setTimeout(() => {
            let request = new RequestDecorator().withFilledAction().build();
            console.log('filled');
            chrome.runtime.sendMessage(request, (response) => {
                $('#contentwsb a.rightbutton')[0].click();
            });
        }, 4000);
    };

    let redirectToPayments = function () {
        let request = new RequestDecorator().withRedirectedAction().build();
        chrome.runtime.sendMessage(request, (response) => {
            window.location.href = 'https://booking.vietjetair.com/Payments.aspx?lang=vi&st=sl&sesid=';
        });
    }

    let tickDangerousGoods = function () {
        $('#dangerous_goods_check')[0].click();

        if($('input[name="lstPmtType"]').filter("[value='5,PL,0,V,0,0,0']").length) {   // neu ko co thanh toan sau thi dung lai
            $('input[name="lstPmtType"]').filter("[value='5,PL,0,V,0,0,0']").click();

            let request = new RequestDecorator().withConfirmDangerousGoodsAction().build();
            chrome.runtime.sendMessage(request, (response) => {
                $('#contentwsb a.leftbutton')[0].click();
            });
        }
        else {      // Stop
            let request = new RequestDecorator().withStopFollowAction().build();
            chrome.runtime.sendMessage(request, (response) => {
                // $('#contentwsb a.leftbutton')[0].click();
            });
        }
    }

    let tickConfirmOrder = function () {
        $('#chkIAgree')[0].click();

        let request = new RequestDecorator().withConfirmedOrderAction().build();
        chrome.runtime.sendMessage(request, (response) => {
            console.log('click tiep tuc de ket thuc');
            setTimeout(() => {
                $('#tblBackCont a')[1].click();
            }, 1000);
        });
    };

    let done = function () {
        if($('.ResNumber').length) {
            var value = $('.ResNumber').html();
            alert(value);
            console.log('done cmnr');
            let request = new RequestDecorator().withStopFollowAction().build();
            chrome.runtime.sendMessage(request, (response) => {

            });
        }
        else {
            console.log('Cho xac nhan');
        }
    };

    let pageState = new PageState();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.state.request.action) {
            case 'start-follow':
            console.log('start VJ', pageState.getState());
            startFollow();
            return sendResponse();
            case 'stop-follow':
            pageState.setState(request.state);
            stopFollow();
            return sendResponse();
        }
    });

    let loadCurrentStateTab = (callback) => {
        chrome.runtime.sendMessage({
            action: 'get-state'
        }, (response) => {
            pageState.setState(response.state);
            callback && callback(response.state);
        });
    };

    loadCurrentStateTab((state) => {

        switch (state.result.follow_state) {
            case 'idle':
            break;
            case 'error':
            break;
            case 'waiting_result':
            $(document).ready(function () {
                fill();
            })
            break;
            case 'filled':
            redirectToPayments();
            break;
            case 'redirected':
            console.log('dang o trang payment');
            tickDangerousGoods()
            break;
            case 'dangerous_goods':
            console.log('dang trong trang confirm dat cho');
            tickConfirmOrder();
            break;
            case 'confirmed_order':
            console.log('da confirmed order');
            done();
            break;
            case 'done':
            console.log('Done. FInish');
            default:

        }
    });
};

let vetot = () => {
    const pageState = new PageState();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.state.request.action) {
            case 'start-follow':
            pageState.setState(request.state);
            startFollow();
            return sendResponse();
            case 'stop-follow':
            pageState.setState(request.state);
            stopFollow();
            return sendResponse();
        }
    });


    /***
     * Return true if the result is loaded, otherwise false
     */
     let isDOMResultLoaded = () => {
        return $('.IBESRMain').length > 0;
    };

    let isPageError = () => {
        return $('#IBEErrorMsg').length > 0;
    };

    /***
     * Process the result search and return result object
     * @returns {{vendor: string, from, to, date, cost: {total, base}, max_cost: {total, base}}}
     */
     let readBookingInfoResult = (rowIndex) => {
        return {
            vendor: 'vetot.com.vn',
            from: getDepartureFrom(rowIndex),
            to: getDepartureTo(),
            date: getDepartureDate(),
            plane_cd: getPlaneCd(rowIndex),
            cost: getCost(rowIndex)
        }
    };

    let getPlaneCd = (rowIndex) => {
        return $($('.FlightItem .FlightNumber')[rowIndex]).text().trim()
    };

    let getDepartureFrom = () => {
        return $('#lblDepartureFrom').text();
    };

    let getDepartureTo = () => {
        return $('#lblDepartureTo').text();
    };

    let getDepartureDate = () => {
        return $('#lblDepartureDate').text();
    };

    let getCost = (rowIndex) => {
        let row = $('.FlightItem .Price')[rowIndex];
        return {
            total: $(row).data('price').replace(/\./g, ''),
            base: $(row).data('price-base').replace(/\./g, '')
        }
    };

    let renderFollowBar = (state) => {
        console.log('render', state);
        let afterLoadedView = (response) => {
            $(container).html(response)
            $("body").prepend(container);

            setDataIntoDOM();
        };

        let setDataIntoDOM = () => {
            // set value
            console.log('cost_type', state.request);
            $('input[name=typeCost]').val([state.request.cost_type]);
            $('#maxCost').val(state.request.max_cost);
            $('#placeCd').val(state.request.plane_cd);
            $('#timeRefresh').val(state.request.time_refresh_in_seconds);
            $('#followStateMsg').text(Config.state[state.result.follow_state].title);
            $('#autoBooking').prop('checked', state.request.auto_booking);
            if (isIdle(state) || isFound(state)) {
                $('#btnTriggerFollowMsg').text('Bắt đầu theo dõi');
            } else {
                $('#btnTriggerFollowMsg').text('Dừng theo dõi');
            }
        };

        if ($('._extension-container').length > 0) {
            setDataIntoDOM()
        } else {
            let container = document.createElement("div");
            $(container).addClass("_extension-container");
            $.ajax({
                url: chrome.extension.getURL("follow-bar.html"),
                data: null,
                success: afterLoadedView,
                dataType: "html"
            });
        }


    };

    let getRequestData = function () {
        return pageState.getState.bind(pageState)()['request'];
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
                    })
                }

            } else {
                console.log('Not yet!');
            }
        }, Config.time_check_dom_in_milliseconds);
     };

     let tryFollowAgain = () => {
        checkDOM();
    };

    let tryAgainAction = null;

    let tryAgain = () => {
        console.log('tryagain');
        let request = Object.assign(getRequestData(), {action: 'try-again'});
        chrome.runtime.sendMessage(request, () => {
            $('.IBESearchButton')[0].click();
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
        })
    };

    let book = () => {
        setTimeout(() => {
            $('#btnBook').click();
        }, Config.time_wait_to_book_in_milliseconds);
    };

    let selectFirstAcceptedFlight = (rowIndex) => {
        $('.FlightItem .IBESelectFlight')[rowIndex].click();
    };

    let lookupAcceptFlights = (request) => {
        let itemCount = $('.FlightItem').length;
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
        let minCostActual = expectedResult.cost_type === 'base' ? actualResult.cost.base : actualResult.cost.total;
        let validPlaneCd = isValidPlaneCd(expectedResult.plane_cd, actualResult.plane_cd);

        return parseFloat(minCostActual) <= parseFloat(expectedResult.max_cost) && validPlaneCd;
    };


    let loadCurrentStateTab = (callback) => {
        chrome.runtime.sendMessage({
            action: 'get-state'
        }, (response) => {
            pageState.setState(response.state);
            callback && callback(response.state);
        });
    };

    let isIdle = (state) => {
        let currentState = state || myState;
        return currentState.result.follow_state == 'idle';
    };

    let isFound = (state) => {
        let currentState = state || myState;
        return currentState.result.follow_state == 'found';
    };

    let triggerFollow = () => {
        if (isIdle() || isFound()) {
            startFollow();
        } else {
            stopFollow();
        }
    };

    //init content script
    (() => {
        loadCurrentStateTab((state) => {
            switch (state.result.follow_state) {
                case 'idle':
                break;
                case 'error':
                break;
                case 'refresh':
                tryFollowAgain();
                default:

            }


            // when document ready
            $(document).ready(() => {

            })
        });
    })();
};

let muadi = () => {

    let isRunning = false;
	let foundItems = [];
	let tryAgainAction = null;
    
    // VietNamAirline
	let vietnamAirline = (nextStep, checked) => {
		if (!checked) {
			nextStep && nextStep();
			return;
		}
		console.log("Start VN");
		let getPlaneCd = $row => {
			let $plane_cd_div = $($row.find("div.item")[1]);
			return $plane_cd_div.find("a b").text();
		};

		let getPriceTable = $row => {
			let options = $row.find("select option");
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

		let parseDOM = () => {
			let items = [];
			let rows = $("#airlines_depart_VN .line_item");
			for (let iRow = 0; iRow < rows.length; iRow++) {
				let item = {};
				let $row = $(rows[iRow]);
				item.plane_cd = getPlaneCd($row);
				item.price_table = getPriceTable($row);
				item.$row = $row;
				items.push(item);
			}

			return items;
		};

		let find = items => {
			let request = pageState.getState().request;
			let result = null;
			for (let iRow = 0; iRow < items.length; iRow++) {
				let item = items[iRow];
				if (!item.price_table) continue;
				for (       // Giá mặc định là tăng dần 
					let iOption = 0;
					iOption < item.price_table.length;
					iOption++
				) {
					let option = item.price_table[iOption];
					if (
                        option.price_base > 0 &&
						option.price_base <= request.max_cost &&
						option.seat_remaining > 0 &&
						isValidPlaneCd(request.plane_cd, item.plane_cd)
					) {
						result = {
							plane_cd: item.plane_cd,
							option: option,
							airline_type: "vn",
							$row: item.$row
						};
						break;
					}
				}
				if (result) break;
			}

			return result;
		};

		let isDOMResultLoaded = () => {
			return $("#airlines_depart_VN .line_item").length > 0;
		};

		let isEmptyResult = () => {
			return $("#airlines_depart_VN .line_noback_highlight").length > 0;
		};

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

	// Dùng cho cả VJ và jets
	let jetstar = (vj, jets, nextStep, checked) => {
		if (!checked) {
			nextStep && nextStep();
			return;
		}
		console.log("Begin VJ & Jetstar");

		let isDOMResultLoaded = () => {
			return $("#airlines_depart_VJ .line_item").length > 0;
		};

		let getPlaneCd = $row => {
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

		let find = items => {
			let request = pageState.getState().request;
			for (let iRow = 0; iRow < items.length; iRow++) {
				let item = items[iRow];
				if (item.price_base <= 0) continue;
				if (
                    item.price_base > 0 &&
					item.price_base <= request.max_cost &&
					isValidPlaneCd(request.plane_cd, item.plane_cd)
				) {
					// Tìm được cb thỏa đk giá
					if (item.plane_cd.indexOf("BL") >= 0 && jets)
						// Nếu cb là Jets và có chọn jets
						return {
							plane_cd: item.plane_cd,
							option: {
								price_base: item.price_base
							},
							airline_type: "bl",
							$row: item.$row
						};
					else if (item.plane_cd.indexOf("VJ") >= 0 && vj)
						return {
							plane_cd: item.plane_cd,
							option: {
								price_base: item.price_base
							},
							airline_type: "vj",
							$row: item.$row
						};
				}
			}

			return null;
		};

		let isEmptyResult = () => {
			return (
				$("#airlines_depart_VJ .line_noback_highlight").length > 0 ||
				$("#airlines_depart_VJ .line_noback").length > 0
			);
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
							console.log("VJ & BL Found", found);
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
	};

	let getRequestData = function() {
		return pageState.getState.bind(pageState)()["request"];
	};

	let foundFlight = foundItem => {
		foundItems.push(foundItem);
		console.log("Found items", foundItems);
		//notifyFound(foundItem);
		//
		// if (pageState.getState().request.auto_booking) {
		//     let divSelect = foundItem.$row.find('div.item')[6];
		//     $(divSelect).find('input')[0].click();
		//     $('#ChildPage_ListBooking_btnSubmit').click();
		// }
	};

    let getFlight = foundItem => {
        foundItem.from = $(
			$("#flightselection")
				.children("div")
				.children("div")[1]
		)
			.children("b")
			.text();
		foundItem.to = $(
			$("#flightselection")
				.children("div")
				.children("div")[2]
		)
			.children("b")
			.text();
		foundItem.date = $(
			$("#flightselection")
				.children("div")
				.children("div")[0]
        ).text();
        return foundItem;
    };

	let notifyFound = foundItem => {		
		let request = new RequestDecorator(getRequestData())
			.withFoundAction()
			.withAcceptedFlight(foundItem)
			.build();
		chrome.runtime.sendMessage(request, response => {});
	};

	let switchToVietjetAirJetstar = () => {
		$($("#airlines_menu_dep .airlinetab")[1])
			.find("a")[0]
			.click();
	};

	let switchToVietnamAirline = () => {
		$($("#airlines_menu_dep .airlinetab")[0])
			.find("a")[0]
			.click();
	};

	let isOnlyVietnamAirline = () => {
		return $("#airlines_menu_dep .airlinetab").length === 0;
	};

	let tryAgain = () => {
		console.log("tryagain");
		let request = new RequestDecorator(getRequestData())
			.withTryAgainAction()
			.build();
		chrome.runtime.sendMessage(request, () => {
			window.location.href = window.location.href.replace(
				"&error=seat_error",
				""
			);
		});
	};

	let stopFollow = () => {
		isRunning = false;
		if (tryAgainAction) clearTimeout(tryAgainAction);
	};

	let wait = time_in_millis => {
		return new Promise(resolve => {
			setTimeout(resolve, time_in_millis);
		});
	};

	let getMinResult = (items, airlineTypes) => {
		console.log("atypes", airlineTypes);
		let ret = null;
		let minPrice = Number.MAX_SAFE_INTEGER;
		for (let i = 0; i < items.length; i++) {
			if (
				items[i].option.price_base < minPrice &&
				airlineTypes.indexOf(items[i].airline_type) >= 0
			) {
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
	let selectAdult = function(numberTickets) {
        let id = "#ListBooking_ddlADT option:eq(" + numberTickets + ")";
        console.log("selectAdult -> id", id)
		$(id).prop('selected', true);
	};

	/***
	 * select combobox children by number of tickets
	 * @param numberTickets >= 0
	 */
	let selectChildren = function(numberTickets) {
		let id = "#ListBooking_ddlCHD option:eq(" + numberTickets + ")";
        console.log("selectChildren -> id", id)
		$(id).prop("selected", true);
	};

    // sang giai đoạn nhập thông tin
	let finalStep = () => {
		const checkedAirlines = pageState.getState().request.airlines;
		if (tryAgainAction) clearTimeout(tryAgainAction);
		if (foundItems.length > 0) {
			let result = getMinResult(foundItems, checkedAirlines);
			if (result) {
                let divSelect = result.$row.find("div.item")[6];
                if(divSelect)                   // Click chọn hàng này
				    $(divSelect).find("input")[0].click();

				if (pageState.getState().request.auto_booking) {
					////////////////////////////////////
					//if (result.airline_type === "vn") {
						// Số người lớn
						//let expectedAdults = $($('#ChildPage_ListBooking_ddlADT_title .ddTitleText')[0]).text();
						let expectedAdults = pageState
							.getState()
							.request.hanhkhach.filter(checkAdult)
							.filter(checkCheck).length;
						// Số trẻ em
						//let expectedChildren = $($('#ChildPage_ListBooking_ddlCHD_title .ddTitleText')[0]).text();
						let expectedChildren = pageState
							.getState()
							.request.hanhkhach.filter(checkChild)
							.filter(checkCheck).length;
						// Số ghế có thể đặt
						let actual = result.option.seat_remaining;

						expectedAdults = parseInt(
							expectedAdults ? expectedAdults : 0
						);
						expectedChildren = parseInt(
							expectedChildren ? expectedChildren : 0
						);
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
						let cntA = 0;       // Count adult
						let cntC = 0;       // Cout child
						pageState.getState().request.hanhkhach.forEach((value, ind) => {
								if (value.check) {
									if (checkAdult(value) && cntA < selectAdt) {
										pageState.getState().request.booked.push(ind); // Hành khách thứ i đưuọc chọn
										cntA++;
									} else if (checkChild(value) && cntC < selectChd) {
										pageState.getState().request.booked.push(ind); // Hành khách thứ i đưuọc chọn
										cntC++;
									}
								}
							});
					//}
					///////////////////////////////////////////////////////////////////

					const request = new RequestDecorator(getRequestData())
						.withAcceptedFlight(result)
						.withConfirmAction()
						.build();
					chrome.runtime.sendMessage(request, response => {});
					$("#ListBooking_btnSubmit").click();
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

	let startFollow = () => {
		isRunning = true;
		foundItems = [];
		const checkedAirlines = pageState.getState().request.airlines;
		if (isOnlyVietnamAirline()) {
			vietnamAirline(finalStep, checkedAirlines.indexOf("vn") >= 0);
		} else {
			switchToVietnamAirline();
			wait(500).then(() => {
				vietnamAirline(() => {

                    // Next step = không tìm thấy kết quả phù hợp ở tab VN
					switchToVietjetAirJetstar(); // Chuyển sang tab giá rẻ: VJ, Jets
					wait(500).then(() => {
						// Đợi
						jetstar(
							checkedAirlines.indexOf("vj") >= 0,
							checkedAirlines.indexOf("bl") >= 0,
							finalStep,
							checkedAirlines.indexOf("bl") >= 0 ||
								checkedAirlines.indexOf("vj") >= 0
						);
					});
				}, checkedAirlines.indexOf("vn") >= 0);
			}); // end wait
		} // end else
	};

	let doReload = () => {
		if (isRunning) {
			tryAgainAction = setTimeout(
				tryAgain,
				pageState.getState().request.time_refresh_in_seconds * 1000
			);
		}
	};

	const pageState = new PageState();

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

	let confirmBooking = () => {
        // State = Final: Fill in main method
        // else: 
		let isFail = $("#ChildPage_ListBooking_divShowError").length > 0;
		if (isFail) {
			const request = new RequestDecorator(getRequestData())
				.withTryAgainAction()
				.build();
			chrome.runtime.sendMessage(request, response => {});

			isRunning = true;
			doReload();
		} else {
			//$('#ChildPage_ctl09_btnConfirm').click();
		}
	};

    // Đang chờ giữ chỗ???
    let isWaiting = () => {
        return $(".flight_header").length > 0 && $(".flight_header").text().indexOf("chờ") >= 0;         //  Vui lòng chờ tới khi chỗ của bạn được giữ...
    };
    // Đã giữ chỗ xong
    let isDone = () => {
        return $(".flight_header").length > 0 && ($(".flight_header").text().indexOf("xong") >= 0 || $(".flight_header").text().indexOf("công") >= 0);
    };
    // Đã giữ chỗ xong
    let isFail = () => {
        return $(".flight_header2").length > 0 && $(".flight_header2").text().indexOf("Không") >= 0;
    };

	let finalConfirmBooking = () => {
		// Sau khi điền tên và ấn nút, đc xử lý ở hàm chính phía dưới
		// Check xem có thành công không
		wait(10000).then(() => {
			console.log("final confirm booking");

            let checkResultLoadedInterval = setInterval(() => {
				if (!isWaiting()) {
					clearInterval(checkResultLoadedInterval);
					if (isDone() && !isFail()) {
                        let flight = getRequestData().acceptedFlight;
                        notifyFound(flight);
                        
                        // Bỏ check những hành khách đã được đặt
                        let maxInd = 0;
                        pageState.getState().request.booked.forEach(ind => {
                            pageState.getState().request.hanhkhach[ind].check = false;
                            maxInd = ind;
                        });
                        pageState.getState().request.booked = [];
                        
                        maxInd++;
                        if (pageState.getState().request.hanhkhach.length > maxInd) {
                            const request = new RequestDecorator(getRequestData()).withTryAgainAction().build();
                            chrome.runtime.sendMessage(request, response => {});
                            isRunning = true;
                        } else {
                            const request = new RequestDecorator(getRequestData()).withStopFollowAction().build();
                            chrome.runtime.sendMessage(request, response => {});
                            isRunning = false;
                        }

                        // Tìm chuyến khác
                        // $("#FlightLeftInfo_btnTryOther").click();
                    } else {
                        console.log("Không giữ được");
                        const request = new RequestDecorator(getRequestData()).withStopFollowAction().build();
                        chrome.runtime.sendMessage(request, response => {});
                        isRunning = false;
                    }
				} else {
					console.log("still waiting!!!");
				}
            }, Config.time_check_dom_in_milliseconds);
            
		});
	};

	let loadCurrentStateTab = callback => {
		chrome.runtime.sendMessage(
			{
				action: "get-state"
			},
			response => {
				pageState.setState(response.state);
				callback && callback(response.state);
			}
		);
	};

	loadCurrentStateTab(state => {
        console.log(
            "muadi -> state.result.follow_state",
            state.result.follow_state
        );
		switch (state.result.follow_state) {
			case "idle":
				break;
			case "error":
				break;
			case "confirm":
				confirmBooking();
				break;
			case "final-confirm":
				finalConfirmBooking();
				break;
			case "refresh":
				startFollow();
			default:
		}

		// when document ready
		$(document).ready(() => {});
	});
};

let onlineAirTicket = () => {
    let isJetstarTickets = (tdElm) => {
        let concattedText = $(tdElm).find('a').text();
        return /jetstar/gi.test(concattedText);
    };

    /***
     * return Item Object
     * @param rowElm
     */
     let parseItem = (rowElm) => {
        if ($(rowElm).find('td').length > 0) {
            let tdPriceTable = $(rowElm).find('td')[6];
            let planeCd = $($(rowElm).find('td')[1]).text().replace(/^[A-z]+/, '');
            if (!isJetstarTickets(tdPriceTable)) {
                let aElms = $(tdPriceTable).find('a');

                let priceTable = [];
                aElms.each((index, elm) => {
                    let seat_remaining = parseFloat($(elm).text().replace(/[A-z]+/, ''));
                    let strInfo = $(elm).attr('onclick').replace(/FillToBooking\('|'\)/gi, '');
                    let arrInfo = strInfo.split(';');
                    let price_base = parseFloat(arrInfo[6].replace(/,/g, ''));
                    if (price_base)
                        priceTable.push({
                            seat_type: arrInfo[5].replace(/^[A-z]+/, ''),
                            price_base: price_base,
                            seat_remaining: seat_remaining,
                            $a: $(elm)
                        });
                });

                return {
                    plane_cd: planeCd,
                    price_table: priceTable
                }
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
                        airline_type: 'vn',
                        $a: option.$a
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
        console.log('tryagain');
        let request = Object.assign(getRequestData(), {action: 'try-again'});
        chrome.runtime.sendMessage(request, () => {
            $('#btnSearhOneWay').click();
        });
    };

    let doReload = () => {
        console.log('reloading', isRunning);
        if (isRunning) {
            tryAgainAction = setTimeout(tryAgain, pageState.getState().request.time_refresh_in_seconds * 1000);
        }
    };

    let stopFollow = () => {
        isRunning = false;
        if (tryAgainAction) clearTimeout(tryAgainAction);
    };

    let getRequestData = function () {
        return pageState.getState.bind(pageState)()['request'];
    };

    let notifyFound = (foundItem) => {
        foundItem.from = $('#SearchOneWayDepartureCity').val();
        foundItem.to = $('#SearchOneWayArrivalCity').val();
        foundItem.date = $('#SearchOneWayDepartureDate').val();
        let request = new RequestDecorator(getRequestData()).withFoundAction().withAcceptedFlight(foundItem).build();
        chrome.runtime.sendMessage(request, (response) => {

        });
    };

    let startFollow = () => {
        let parsedItems = [];
        isRunning = true;
        console.log('start follow');

        // Duyệt tất cả các hàng
        if ($('.TblGrid tr').length > 0) {
            $('.TblGrid tr').each((index, elm) => {
                if (index !== 0) {
                    // Kiểm tra lấy dữ liệu từ các hàng
                    let parsedItem = parseItem(elm);
                    if (parsedItem) parsedItems.push(parsedItem);
                }

            });
            console.log('Cac Chuyen bay parsed', parsedItems);
            // Tìm chuyền bay thỏa mãn
            let result = find(parsedItems);
            if (result) {
                console.log('found', result);

                //Neu không tự động đặt, cứ báo thành tìm thấy kết quả
                if (!pageState.getState().request.auto_booking) {
                    notifyFound(result);
                }
                // Click ghế đã đc chọn
                result.$a[0].click();
                /////       
                console.log('start auto fill', pageState.getState().request);
                $('#BookPhone').val(pageState.getState().request.sdt);
                $('#BookEmail').val(pageState.getState().request.email);
                //fill seat remaining
                let expected = pageState.getState().request.hanhkhach.length;
                let actual = result.option.seat_remaining;
                let cnt = 0;
                for(var i = 1; i <= expected; i++) {
                    if(pageState.getState().request.hanhkhach[i-1].check) {
                        cnt++;
                        $("#BookPassenger" + cnt).show();
                        $("#BookPassenger" + cnt + "FullName").val(pageState.getState().request.hanhkhach[i-1].hoten);
                        $("#BookPassenger" + cnt + "Title").val(pageState.getState().request.hanhkhach[i-1].gioitinh);
                        if(pageState.getState().request.hanhkhach[i-1].gioitinh == "MISS" || pageState.getState().request.hanhkhach[i-1].gioitinh == "MSTR") {
                            $("#BookPassenger" + cnt + "Birthday").show();
                            var ns = new Date(pageState.getState().request.hanhkhach[i-1].ngaysinh);
                            $("#BookPassenger" + cnt + "Birthday").val(ns.getDate() + '/' + (ns.getMonth() + 1) + '/' +  ns.getFullYear());
                        }
                        //////////////
                        // Đánh dấu những hành khách đã được đặt chỗ
                        ////////////////
                        pageState.getState().request.booked.push(i-1);
                        if(cnt >= actual)   // Nếu hết chỗ rồi thì thôi
                            break;
                    }
                }
                // Điền danh sách hành khách
                $("#BookNumofPassenger>option:nth-of-type(" + cnt + ")").prop('selected',true);
                let ac = pageState.getState().request.action;
                // set booked
                pageState.getState().request.action = 'set-state';
                chrome.runtime.sendMessage(pageState.getState().request, (response) => {

                });
                pageState.getState().request.action = ac;

                // Tự động đặt chỗ
                if (pageState.getState().request.auto_booking) {
                    //Gửi yêu cầu xác thực đặt chỗ thành công hay không (vì chuyển page mới xác nhận đc nên cần hay đổi state)
                    const request = new RequestDecorator(getRequestData()).withAcceptedFlight(result).withConfirmAction().build();
                    chrome.runtime.sendMessage(request, (response) => {

                    });
                    //Click đặt chỗ
                    $('#btnBookEnable').click();
                }
            } else {    // Nếu không có ghế nào thỏa mãn
                doReload();
            }
        } else {        // Nếu ko có chuyến bay nào
            doReload();
        }
    };

    let confirmBooking = () => {
        let isSuccess = !!$('#ShowBookMessage font[color="blue"]').length;
        let isFail = !!$('#ShowBookMessage font[color="red"]').length;
        console.log('s-f', isSuccess, isFail);
        if (isFail) {
            isRunning = true;
            const request = new RequestDecorator(getRequestData()).withTryAgainAction().build();
            chrome.runtime.sendMessage(request, (response) => {

            });
            doReload();
        } else if (isSuccess) {
            console.log('notify result', pageState.getState().result);
            notifyFound(pageState.getState().result);

            ////////////////
            ///////////////////////////////
            console.log('Booked index', pageState.getState().request.booked);
            pageState.getState().request.booked.forEach((item) => {
                console.log('uncheck item ', item);
                pageState.getState().request.hanhkhach[item].check = false;
            });
            pageState.getState().request.booked = [];
            let ac = pageState.getState().request.action;
            // set booked
            pageState.getState().request.action = 'set-state';
            chrome.runtime.sendMessage(pageState.getState().request, (response) => {

            });
            pageState.getState().request.action = ac;
            ////////////////////////////
            // Kiểm tra xem danh sách còn ko
            let doit = false;
            pageState.getState().request.hanhkhach.forEach((hk) => {
                if(hk.check) {
                    doit = true;
                }
            });
            // Re load lại trang
            if(doit) {
                isRunning = true;
                const request = new RequestDecorator(getRequestData()).withStartFollowAction().build();
                console.log('request send after booking', request);
                chrome.runtime.sendMessage(request, (response) => {

                });
                doReload();
            } else {
                let request = Object.assign(getRequestData(), {action: 'stop-follow'});
                chrome.runtime.sendMessage(request, () => {

                });
                stopFollow();
            }
        }
    };

    const pageState = new PageState();

    // Chạy trước khi document ready
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('request', request);
        switch (request.state.request.action) {
            case 'start-follow':
            pageState.setState(request.state);
            console.log('start follow onlineairticket', pageState.getState());
            startFollow();
            return sendResponse();
            case 'stop-follow':
            pageState.setState(request.state);
            stopFollow();
            return sendResponse();
        }
    });

    let loadCurrentStateTab = (callback) => {
        chrome.runtime.sendMessage({
            action: 'get-state'
        }, (response) => {
            pageState.setState(response.state);
            callback && callback(response.state);
        });
    };

    loadCurrentStateTab((state) => {
        console.log('load current state tab');
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
        $(document).ready(() => {

        })
    });
};

let vnabooking = () => {
    /***
     * return Item Object
     * @param rowElm
     */
     let parseItem = (rowElm) => {
        if ($(rowElm).find('td').length > 0) {
            // let tdPriceTable = $(rowElm).find('td')[6];
            // let planeCd = $($(rowElm).find('td')[1]).text().replace(/^[A-z]+/, '');
            let planeCd = '';
            let aElms = $(rowElm).find('input');

            let priceTable = [];
            aElms.each((index, elm) => {
                let arrInfo = $(elm).val().split('|');
                planeCd = arrInfo[0].trim();
                priceTable.push({
                    seat_type: arrInfo[1],
                    price_base: parseFloat(arrInfo[8]),
                    seat_remaining: parseFloat(arrInfo[9]),
                    $a: $(elm)
                });
            });

            return {
                plane_cd: planeCd,
                price_table: priceTable
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
                        airline_type: 'vn',
                        $a: option.$a
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
    let doAction = null;

    let tryAgain = () => {
        console.log('tryagain');
        let request = Object.assign(getRequestData(), {action: 'try-again'});
        chrome.runtime.sendMessage(request, () => {
            //$('#btnSearhOneWay').click();
            window.location.reload(true);
        });
    };

    let doReload = () => {
        console.log('reloading', isRunning);
        if (isRunning) {
            tryAgainAction = setTimeout(tryAgain, pageState.getState().request.time_refresh_in_seconds * 1000);
        }
    };

    let stopFollow = () => {
        isRunning = false;
        if (tryAgainAction) clearTimeout(tryAgainAction);
        if(doAction) clearTimeout(doAction);
    };

    let getRequestData = function () {
        return pageState.getState.bind(pageState)()['request'];
    };

    let notifyFound = (foundItem) => {
        foundItem.from = $($('#luotdi_selected').children('.style1')[3]).text();
        foundItem.to = $($('#luotdi_selected').children('.style1')[4]).text();
        foundItem.date = $($('#luotdi_selected').children('.style1')[1]).text();
        console.log(foundItem.from);
        let request = new RequestDecorator(getRequestData()).withFoundAction().withAcceptedFlight(foundItem).build();
        chrome.runtime.sendMessage(request, (response) => {

        });
    };

    let doWork = () => {
        let parsedItems = [];
        // Duyệt tất cả các hàng
        console.log('start bussiness');
        if ($('tr.conchim').length > 0) {
            $('tr.conchim').each((index, elm) => {
                // Kiểm tra lấy dữ liệu từ các hàng
                let parsedItem = parseItem(elm);
                if (parsedItem) parsedItems.push(parsedItem);
            });
            console.log('Cac Chuyen bay parsed', parsedItems);
            // Tìm chuyền bay thỏa mãn
            let result = find(parsedItems);
            if (result) {
                console.log('found', result);

                //Neu không tự động đặt, cứ báo thành tìm thấy kết quả
                if (!pageState.getState().request.auto_booking) {
                    notifyFound(result);
                }
                // Click ghế đã đc chọn
                result.$a[0].click();
                /////       
                console.log('start auto fill', pageState.getState().request);
                $('input#Phone').val(pageState.getState().request.sdt);
                $('input#Email').val(pageState.getState().request.email);
                //fill seat remaining
                let expected = pageState.getState().request.hanhkhach.length;
                let actual = result.option.seat_remaining;
                let cnt = 0;
                for(var i = 1; i <= expected; i++) {
                    if(pageState.getState().request.hanhkhach[i-1].check) {
                        cnt++;
                        $("#pax_name_" + cnt).removeAttr('disabled').removeClass('dis');
                        $("#pax_title_" + cnt).removeAttr('disabled').removeClass('dis');
                        $("#pax_name_" + cnt).val(pageState.getState().request.hanhkhach[i-1].hoten);
                        $("#pax_title_" + cnt).val(pageState.getState().request.hanhkhach[i-1].gioitinh.
                            replace(/\w\S*/g, function(txt)
                                {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}));
                        
                        //////////////
                        // Đánh dấu những hành khách đã được đặt chỗ
                        ////////////////
                        pageState.getState().request.booked.push(i-1);
                        //pageState.getState().request.hanhkhach[i-1].check = false;
                        if(cnt >= actual)   // Nếu hết chỗ rồi thì thôi
                            break;
                    }
                }
                // Điền danh sách hành khách
                $("#paxnum_select>option:nth-of-type(" + cnt + ")").prop('selected',true);
                // Set booked state
                let ac = pageState.getState().request.action;
                pageState.getState().request.action = 'set-state';
                // pageState.getState().request = Object.assign({}, pageState.getState().request, {acceptedFlight: result});
                chrome.runtime.sendMessage(pageState.getState().request, (response) => {

                });
                pageState.getState().request.action = ac;
                // Tự động đặt chỗ
                if (pageState.getState().request.auto_booking) {

                    //Click đặt chỗ
                    $('#do_booking input[type=submit]').click();

                    setTimeout(confirmBooking, 10 * 1000);
                }
            } else {    // Nếu không có ghế nào thỏa mãn
                doReload();
            }
        } else {        // Nếu ko có chuyến bay nào
            doReload();
        }
    };

    let startFollow = () => {
        isRunning = true;
        console.log('start follow');

        doAction = setTimeout(doWork, 10 * 1000);       // First time -> chay ngay
    };

    let confirmBooking = () => {
        // let isSuccess = !!$('#ShowBookMessage font[color="blue"]').length;
        // let isFail = !!$('#ShowBookMessage font[color="red"]').length;
        let isFail = $('#pnr_booking').val().indexOf("TÌM KIẾM LẠI") != -1;
        let isSuccess = $('#pnr_booking').val().indexOf("RECEIVED") != -1;
        console.log('s-f', isSuccess, isFail);
        if (!isSuccess) {
            isRunning = true;
            const request = new RequestDecorator(getRequestData()).withTryAgainAction().build();
            chrome.runtime.sendMessage(request, (response) => {

            });
            doReload();
        } else if (isSuccess) {
            console.log('notify result', pageState.getState().result);
            notifyFound(pageState.getState().result);
            ////////////////
            ///////////////////////////////
            pageState.getState().request.booked.forEach((item) => {
                pageState.getState().request.hanhkhach[item].check = false;
            });
            pageState.getState().request.booked = [];
            let ac = pageState.getState().request.action;
            // set booked
            pageState.getState().request.action = 'set-state';
            chrome.runtime.sendMessage(pageState.getState().request, (response) => {

            });
            pageState.getState().request.action = ac;
            ////////////////////////////
            // Kiểm tra xem danh sách còn ko
            let doit = false;
            pageState.getState().request.hanhkhach.forEach((hk) => {
                if(hk.check) {
                    doit = true;
                }
            });
            // Re load lại trang
            if(doit) {
                isRunning = true;
                const request = new RequestDecorator(getRequestData()).withStartFollowAction().build();
                console.log('request send after booking', request);
                chrome.runtime.sendMessage(request, (response) => {

                });
                doReload();
            } else {
                let request = Object.assign(getRequestData(), {action: 'stop-follow'});
                chrome.runtime.sendMessage(request, () => {

                });
                stopFollow();
            }
        }
    };

    const pageState = new PageState();

    // Chạy trước khi document ready
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('request', request);
        switch (request.state.request.action) {
            case 'start-follow':
            pageState.setState(request.state);
            startFollow();
            return sendResponse();
            case 'stop-follow':
            pageState.setState(request.state);
            stopFollow();
            return sendResponse();
        }
    });

    let loadCurrentStateTab = (callback) => {
        chrome.runtime.sendMessage({
            action: 'get-state'
        }, (response) => {
            pageState.setState(response.state);
            callback && callback(response.state);
        });
    };

    loadCurrentStateTab((state) => {
        console.log('load current state tab:', state.result.follow_state);
        switch (state.result.follow_state) {
            case 'idle':
            break;
            case 'error':
            break;
            case 'confirm':
            // console.log('confirming');
            // confirmBooking();
            break;
            case 'refresh':
            startFollow();
            break;
            default:

        }

        // when document ready
        $(document).ready(() => {

        })
    });
};

let url = window.location.href;

if (/vetot\.com\.vn/gi.test(url) || /holavietnam\.com\.vn/gi.test(url)) {
    vetot();
} else if (/muadi\.com\.vn/gi.test(url) || /onlinebookingticket\.vn/gi.test(url)) {
    chrome.runtime.sendMessage({
        action: 'get-state'
    }, (response) => {
        if (
			response.state.result.follow_state === "confirm" &&
			$("#ctl10_btnConfirm").length > 0
		) {
			setTimeout(() => {
				// Vào được trang đặt chỗ
				////////////////
				/////
				console.log("start auto fill", response);
				$("#ctl10_txtCustomerName").val(
					response.state.request.tenkhachhang
				);
				$("#ctl10_txtCustomerAddress").val(
					response.state.request.diachi
				);
				$("#ctl10_txtCustomerPhone").val(response.state.request.sdt);
				$("#ctl10_txtCustomerEmail").val(response.state.request.email);

				let cntA = 1;
				let cntC = 1;
				if (response.state.request.booked.length > 0) {
					// Nếu có danh sách đánh dấu những người đc chọn (ở VN)
					response.state.request.booked.forEach(i => {
						if (
							checkAdult(response.state.request.hanhkhach[i]) &&
							$("#firstname_adt_" + cntA).length > 0
						) {
							$("#title_adt_" + cntA).val(
								response.state.request.hanhkhach[
									i
								].gioitinh.toLowerCase()
							);
							$("#firstname_adt_" + cntA).val(
								response.state.request.hanhkhach[i].hoten.split(
									" "
								)[0]
							);
							$("#lastname_adt_" + cntA).val(
								response.state.request.hanhkhach[i].hoten
									.split(" ")
									.slice(1)
									.join(" ")
							);
							cntA++;
							// response.state.request.hanhkhach[i].check = false;
						} else if (
							checkChild(response.state.request.hanhkhach[i]) &&
							$("#firstname_chd_" + cntC).length > 0
						) {
							$("#title_chd_" + cntC).val(
								response.state.request.hanhkhach[
									i
								].gioitinh.toLowerCase()
							);
							$("#firstname_chd_" + cntC).val(
								response.state.request.hanhkhach[i].hoten.split(
									" "
								)[0]
							);
							$("#lastname_chd_" + cntC).val(
								response.state.request.hanhkhach[i].hoten
									.split(" ")
									.slice(1)
									.join(" ")
							);
							cntC++;
							// response.state.request.hanhkhach[i].check = false;
						}
					});
					//  response.state.request.booked = [];
				} else {
					// Điền danh sách hành khách
					response.state.request.booked = [];
					response.state.request.hanhkhach.forEach((value, ind) => {
						if (value.check) {
							if (
								checkAdult(value) &&
								$("#firstname_adt_" + cntA).length > 0
							) {
								$("#title_adt_" + cntA).val(
									value.gioitinh.toLowerCase()
								);
								$("#firstname_adt_" + cntA).val(
									value.hoten.split(" ")[0]
								);
								$("#lastname_adt_" + cntA).val(
									value.hoten
										.split(" ")
										.slice(1)
										.join(" ")
								);
								cntA++;
								response.state.request.booked.push(ind);
								// response.state.request.hanhkhach[ind].check = false;
							} else if (
								checkChild(value) &&
								$("#firstname_chd_" + cntC).length > 0
							) {
								$("#title_chd_" + cntC).val(
									value.gioitinh.toLowerCase()
								);
								$("#firstname_chd_" + cntC).val(
									value.hoten.split(" ")[0]
								);
								$("#lastname_chd_" + cntC).val(
									value.hoten
										.split(" ")
										.slice(1)
										.join(" ")
								);
								cntC++;
								response.state.request.booked.push(ind);
								// response.state.request.hanhkhach[ind].check = false;
							}
						}
					});
				}
				//////////////
				////////// Gửi lại state
				let request = Object.assign(response.state.request, {
					action: "final-confirm"
				});
				console.log("send state after fill muadi", request);
				chrome.runtime.sendMessage(request, () => {});

				$("#ctl10_btnConfirm").click();
			}, 500);
		} else {
			console.log("apply muadi");
			muadi();
		}

    });

} else if (/onlineairticket\.vn/gi.test(url) || /bookingticket\.vn/gi.test(url)) {
    console.log('apply onlineairticket & bookingticket.vn');
    onlineAirTicket();
} else if (/vnabooking/gi.test(url)) {
    console.log('apply http://vnabooking.com.vn');
    vnabooking();
} else if (/vietjetair/gi.test(url)) {
    console.log('apply http://vietjetair.com');
    vj();
};
