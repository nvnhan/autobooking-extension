///////////////////////////
// SCRIPT Ở TOOL BACKGROUND
// NHẬN DỮ LIỆU TỪ SCRIPT ĐƯỢC CHÈN VÀO WEB GỬI VỀ
// XỬ LÝ VÀ THÔNG BÁO TỚI USER
///////////////////////

chrome.tabs.query({}, (tabs) => {
    console.log('tabs', tabs);
});

chrome.storage.local.set({user: null});

const data = {};
const defaultInitState = {
    request: {
        cost_type: 'base',
        time_refresh_in_seconds: 5,
        max_cost: '500000',
        plane_cd: '',
        airlines: ["vn", "vj", "bl"],
        tenkhachhang: '',
        diachi: '',
        sdt: '',
        email: '',
        hanhkhach: [],
        booked:[]
    },
    result: {
        follow_state: 'idle'
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let tabId = request.tab ? request.tab.id : sender.tab.id;

    if (!data[tabId]) {
        data[tabId] = defaultInitState;
    }
    console.log(`Tab${tabId}-FS.${data[tabId].result.follow_state}`);
    console.log(data);

    switch (request.action) {
        case 'get-follow-state':

            return sendResponse({follow_state: data[tabId].result.follow_state});
        case 'start-follow':
            data[tabId] = Object.assign({}, data[tabId],
                {request: request},
                {result: {follow_state: 'waiting_result'}});
            console.log('after set', data);
            chrome.tabs.sendMessage(tabId, {state: data[tabId]}, () => {

            });
            return sendResponse({state: data[tabId]});
        case 'stop-follow':
            data[tabId] = Object.assign({},data[tabId],
                {request: request},
                {result: {follow_state: 'idle'}});
            chrome.tabs.sendMessage(tabId, {state: data[tabId]}, () => {

            });
            return sendResponse({state: data[tabId]});
        case 'get-state':
            sendResponse({state: data[tabId]});
            break;
        case 'got-result':
            data[tabId] = Object.assign({},data[tabId],
                // {result: Object.assign({follow_state: 'running'}, request.result_search)})
                {result: Object.assign({follow_state: 'running'}, {})});

            sendResponse({state: data[tabId]});
            break;
        case 'found':
            notifyFound(request.acceptedFlight, request.auto_booking);
            data[tabId] = Object.assign({},data[tabId],
                {request: request},
                {result: {follow_state: 'found'}});
            sendResponse({state: data[tabId]});
            break;
        case 'confirm':
            data[tabId] = Object.assign({},data[tabId],
                {request: request},
                {result: {follow_state: 'confirm'}});
            break;
        case 'final-confirm':
            data[tabId] = Object.assign({},data[tabId],
                {request: request},
                {result: {follow_state: 'final-confirm'}});
            break;
        case 'try-again':
            console.log('try-again');
            data[tabId] = Object.assign({},data[tabId],
                {request: request},
                {result: {follow_state: 'refresh'}});
            break;
        case 'reload':
            console.log('reload');
            chrome.tabs.sendMessage(tabId, {state: data[tabId]}, () => {

            });
            return sendResponse({state: data[tabId]});
            break;
        case 'set-state':
            console.log('set state', request);
            data[tabId] = Object.assign({},data[tabId], {request: request});
            break;
            case 'filled':
            console.log('filled bg');
            data[tabId] = Object.assign({}, data[tabId],
                {request: request},
                {result: {follow_state: 'filled'}});
            sendResponse({state: data[tabId]});
            break;
            // Tool VietJet
        case 'redirected':
            console.log('redirected bg');
            data[tabId] = Object.assign({}, data[tabId],
                {request: request},
                {result: {follow_state: 'redirected'}});
            sendResponse({state: data[tabId]});
            break;
        case 'dangerous_goods':
            console.log('confirmed dangerous_goods bg');
            data[tabId] = Object.assign({}, data[tabId],
                {request: request},
                {result: {follow_state: 'dangerous_goods'}});
            sendResponse({state: data[tabId]});
            break;
        case 'confirmed_order':
            console.log('confirmed_order bg');
            data[tabId] = Object.assign({}, data[tabId],
                {request: request},
                {result: {follow_state: 'confirmed_order'}});
            sendResponse({state: data[tabId]});
            break;
        case 'done':
            console.log('done bg');
            data[tabId] = Object.assign({}, data[tabId],
                {request: request},
                {result: {follow_state: 'done'}});
            sendResponse({state: data[tabId]});
            break;
    }
});

let notifyFound = (selectedFlight, auto_booking) => {
    let audio = new Audio();
    let playPromise = null;
    audio.src = 'audio/found.ogg';
    audio.loop = !auto_booking;

    chrome.notifications.clear('found', () => {
        chrome.notifications.create(
            'found', {
                type: 'basic',
                iconUrl: 'plane-logo.png',
                title: `${selectedFlight.from} - ${selectedFlight.to} `,
                message: `${selectedFlight.date}. CB ${selectedFlight.plane_cd}`,
                requireInteraction: !auto_booking
            },

            function () {
                playPromise = audio.play();
            }
        );
    });

    chrome.notifications.onClicked.addListener(notificationId => {
        console.log('clicked notification', notificationId);
        playPromise && playPromise.then(_ => {
            audio.pause()
        })
    });

    chrome.notifications.onClosed.addListener(notificationId => {
        console.log('closed notification', notificationId);
        playPromise && playPromise.then(_ => {
            audio.pause()
        })
    });
};
$(function(){
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		if(request.how_id_tab ==="ID"){
		chrome.tabs.query({active: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {id_is: tabs[0]["id"]}); console.info("Đã send"); }); } });
});



