class PageState {
	constructor() {
		this.state = null;
		this.stateChangeListeners = [];
		this.followStateChangeListeners = [];
	}

	getState() {
		return this.state;
	}

	setState(state) {
		this.state = state;

		this.stateChangeListeners.forEach((listener) => {
			listener(this.state);
		});

		return this;
	}

	setFollowState(followState) {
		if (this.state) this.state.result.follow_state = followState;

		this.followStateChangeListeners.forEach((listener) => {
			listener(followState);
		});

		return this;
	}

	onFollowStateChange(listener) {
		if (listener) this.followStateChangeListeners.push(listener);
		return this;
	}

	onStateChange(listener) {
		if (listener) this.stateChangeListeners.push(listener);
		return this;
	}
}

class RequestDecorator {
	constructor(request) {
		this.request = request;
	}

	withTab(tab) {
		this.request = Object.assign({}, this.request, { tab: tab });
		return this;
	}

	withStartFollowAction() {
		this.request = Object.assign({}, this.request, { action: "start-follow" });
		return this;
	}

	withStopFollowAction() {
		this.request = Object.assign({}, this.request, { action: "stop-follow" });
		return this;
	}

	withGotResultAction() {
		this.request = Object.assign({}, this.request, { action: "got-result" });
		return this;
	}

	withFoundAction() {
		this.request = Object.assign({}, this.request, { action: "found" });
		return this;
	}

	withTryAgainAction() {
		this.request = Object.assign({}, this.request, { action: "try-again" });
		return this;
	}

	withReloadAction() {
		this.request = Object.assign({}, this.request, { action: "reload" });
		return this;
	}

	withAcceptedFlight(acceptedFlight) {
		this.request = Object.assign({}, this.request, { acceptedFlight: acceptedFlight });
		return this;
	}

	withConfirmAction() {
		this.request = Object.assign({}, this.request, { action: "confirm" });
		return this;
	}

	withFilledAction() {
		this.request = Object.assign({}, this.request, { action: "filled" });
		return this;
	}

	withRedirectedAction() {
		this.request = Object.assign({}, this.request, { action: "redirected" });
		return this;
	}

	withManualRedirectAction() {
		this.request = Object.assign({}, this.request, { action: "manual_redirected" });
		return this;
	}

	withConfirmDangerousGoodsAction() {
		this.request = Object.assign({}, this.request, { action: "dangerous_goods" });
		return this;
	}

	withConfirmedOrderAction() {
		this.request = Object.assign({}, this.request, { action: "confirmed_order" });
		return this;
	}

	withDoneAction() {
		this.request = Object.assign({}, this.request, { action: "done" });
		return this;
	}

	build() {
		return this.request;
	}
}

isValidPlaneCd = (expected, actual) => {
	// if (!expected) return true;
	// let arr = expected.split(',');
	// if (arr.length === 1) {
	//     return arr[0].toUpperCase() === actual.toUpperCase();
	// }

	// for (let i = 0; i < arr.length; i++) {
	//     if(arr[i].toUpperCase() === actual) {
	//         return true;
	//     }
	// }

	// return false;
	return !expected || expected == "" || expected.split(",").indexOf(actual) != -1;
};
//thuật toán đồng bộ hóa
// $(function(){
// 	$("#btnTriggerFollow").click(function(){
// 		var array = [];
// 		id_tab ="";
// 		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
// 		id_tab = tabs[0].id; $(".nhapTen input.txtkhach").each(function(index){
// 		var a = $(this).val();
// 		console.info(a);
// 		array.push(a);
// 		});
// 		chrome.storage.sync.set({data:{data:array,id_tab: id_tab}}); });

// 	});
// });
/**
 * Created by windluffy on 1/17/18.
 */
