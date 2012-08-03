/**
 * This class provides access to the notification code.
 */
function Notification() { };

Notification.prototype.alert = function (message, alertCallback, title, buttonName) {
    title = title || "Alert";
    buttonName = buttonName || "OK";

    var md = new Windows.UI.Popups.MessageDialog(message, title);
    md.commands.append(new Windows.UI.Popups.UICommand(buttonName));
    md.showAsync().then(alertCallback);
};

function alert(message) {
    navigator.notification.alert(message, function () { });
};

Notification.prototype.confirm = function (message, confirmCallback, title, buttonLabels) {
    title = title || "Confirm";
    buttonLabels = buttonLabels || "OK,Cancel";

    var md = new Windows.UI.Popups.MessageDialog(message, title);
    var button = buttonLabels.split(',');
    md.commands.append(new Windows.UI.Popups.UICommand(button[0]));
    md.commands.append(new Windows.UI.Popups.UICommand(button[1]));
    md.showAsync().then(confirmCallback);
};

if (typeof navigator.notification == "undefined") {
    navigator.notification = new Notification;
}