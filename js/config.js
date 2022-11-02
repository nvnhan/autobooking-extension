const Config = {
	state: {
		// follow engine state
		waiting_result: {
			title: "Chờ lấy kết quả tìm kiếm",
			value: "waiting_result",
		},

		running: {
			title: "Đang so sánh kết quả",
			value: "running",
		},

		refresh: {
			title: "Đang làm mới lại trang",
			value: "refresh",
		},

		found: {
			title: "Đã tìm thấy kết quả hợp lệ",
			value: "found",
		},

		confirm: {
			title: "Xác nhận kết quả đặt chỗ",
			value: "confirm",
		},

		booking: {
			title: "Chờ để auto fill để đặt chỗ",
			value: "booking",
		},

		idle: {
			title: "Chưa bắt đầu",
			value: "idle",
		},

		waiting_fill: {
			title: "Chờ fill",
			value: "waiting_fill",
		},

		error: {
			title: "Có lỗi xảy ra",
			value: "error",
		},

		filled: {
			title: "Đã điền thông tin",
			value: "filled",
		},

		final_confirm: {
			title: "Chờ xác nhận",
			value: "final_confirm",
		},

		redirected: {
			title: "Đã sang Payments",
			value: "redirected",
		},

		dangerous_goods: {
			title: "Đã xác nhận vũ khí nguy hiểm",
			value: "dangerous_goods",
		},

		confirmed_order: {
			title: "Xác nhận đặt chỗ",
			value: "confirmed_order",
		},

		done: {
			title: "Xong",
			value: "done",
		},
	},

	time_check_dom_in_milliseconds: 500, //Time interval for checking DOM
	time_wait_to_book_in_milliseconds: 3000,
	time_play_audio_found_loop_in_milliseconds: 360000, // an hour -,-!

	retry_on_error: false,

	host: {
		api: "https://tienve.net/api/",
	},
};
