const vj = () => {
	let startFollow = function () {
		//click button 'Tiep tuc'
		setTimeout(() => {
			console.log("click");
			$("#contentwsb a.rightbutton")[0].click();
		}, 2000);
	};

	let fill = function () {
		console.log("filling");

		console.log(pageState.getState());
		$("#txtPax1_Addr1").val(pageState.getState().request.diachi);
		$("#txtPax1_City").val(pageState.getState().request.diachi);
		$("#txtPax1_Ctry").val(234); // 234 ~ VN
		$("#txtPax1_EMail").val(pageState.getState().request.email);

		$($("span.mobileNumber")[0]).find("div.selected-flag")[0].click();
		$($("ul.country-list")[0]).find("li[data-dial-code=84]")[0].click();
		$("#txtPax1_Phone2").val(pageState.getState().request.sdt);
		var evt = document.createEvent("KeyboardEvent");
		evt.initEvent("change", true, true);
		document.getElementById("txtPax1_Phone2").dispatchEvent(evt);

		let cnt = 1;
		let child = $("table#tblPaxCountsInfo td:nth-child(3) span").text();
		let cntchild = 1;
		pageState.getState().request.hanhkhach.forEach((value, ind) => {
			if ($(`#txtPax${cnt}_LName`).length > 0) {
				if (value.gioitinh == "MR") $(`select#txtPax${cnt}_Gender`).val("M");
				else $(`select#txtPax${cnt}_Gender`).val("F");

				$(`#txtPax${cnt}_LName`).val(value.hoten.split(" ")[0]);
				$(`#txtPax${cnt}_FName`).val(value.hoten.split(" ").slice(1).join(" "));
				cnt++;
				// response.state.request.hanhkhach[i].check = false;
			} else if (cntchild <= child) {
				// Hết người lớn
				$(`#chkPax${cntchild}_Infant`)[0].click();
				$(`#txtPax${cntchild}_Infant_FName`).val(value.hoten.split(" ")[0]);
				$(`#txtPax${cntchild}_Infant_LName`).val(value.hoten.split(" ").slice(1).join(" "));
				cntchild++;
			}
		});

		setTimeout(() => {
			let request = new RequestDecorator(getRequestData()).withFilledAction().build();
			console.log("filled");
			chrome.runtime.sendMessage(request, (response) => {
				$("#contentwsb a.rightbutton")[0].click();
			});
		}, 4000);
	};

	let redirectToPayments = function () {
		let request = new RequestDecorator(getRequestData()).withRedirectedAction().build();
		chrome.runtime.sendMessage(request, (response) => {
			window.location.href = "https://booking.vietjetair.com/Payments.aspx?lang=vi&st=sl&sesid=";
		});
	};

	let tickDangerousGoods = function () {
		$("#dangerous_goods_check")[0].click();

		if ($('input[name="lstPmtType"]').filter("[value='5,PL,0,V,0,0,0']").length) {
			// neu ko co thanh toan sau thi dung lai
			$('input[name="lstPmtType"]').filter("[value='5,PL,0,V,0,0,0']").click();

			let request = new RequestDecorator(getRequestData()).withConfirmDangerousGoodsAction().build();
			chrome.runtime.sendMessage(request, (response) => {
				$("#contentwsb a.leftbutton")[0].click();
			});
		} else {
			// Stop
			let request = new RequestDecorator(getRequestData()).withStopFollowAction().build();
			chrome.runtime.sendMessage(request, (response) => {
				// $('#contentwsb a.leftbutton')[0].click();
			});
		}
	};

	let tickConfirmOrder = function () {
		$("#chkIAgree")[0].click();

		let request = new RequestDecorator(getRequestData()).withConfirmedOrderAction().build();
		chrome.runtime.sendMessage(request, (response) => {
			console.log("click tiep tuc de ket thuc");
			setTimeout(() => {
				$("#tblBackCont a")[1].click();
			}, 1000);
		});
	};

	let done = function () {
		if ($(".ResNumber").length) {
			var value = $(".ResNumber").html();
			alert(value);
			console.log("done cmnr");
			let request = new RequestDecorator(getRequestData()).withStopFollowAction().build();
			chrome.runtime.sendMessage(request, (response) => {});
		} else {
			console.log("Cho xac nhan");
		}
	};

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		switch (request.state.request.action) {
			case "start-follow":
				console.log("start VJ", pageState.getState());
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
			case "error":
				break;
			case "waiting_result":
				$(document).ready(function () {
					fill();
				});
				break;
			case "filled":
				redirectToPayments();
				break;
			case "redirected":
				console.log("dang o trang payment");
				tickDangerousGoods();
				break;
			case "dangerous_goods":
				console.log("dang trong trang confirm dat cho");
				tickConfirmOrder();
				break;
			case "confirmed_order":
				console.log("da confirmed order");
				done();
				break;
			case "done":
				console.log("Done. FInish");
			default:
		}
	});
};
