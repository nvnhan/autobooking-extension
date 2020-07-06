/**
 * Created by windluffy on 1/9/18.
 */

console.log('inject script from extension');


(function () {
    console.log('unready', window.IBE);
    $(document).ready(() => {
       console.log(window.IBE);
    });

    //Add "hook" to xmlHttpRequest
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
        var xmlInstance = this;
        console.log('request started!');
        this.addEventListener('load', function () {
            console.log('request completed!');
            console.log(this.readyState);
        });

        origOpen.apply(this, arguments);
    };

})();