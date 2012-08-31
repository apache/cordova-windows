/** fireEvent fires off event to target
 *    name specifies the name of the vent
 *    type specifies type of event
 *      HTMLEvents
 *      KeyEvents
 *      MouseEvents
 *      MutationEvents
 *      UIEvents
 */
function fireEvent(name, target, type) {
    var evt = target.createEvent(type);

    evt.initEvent(name, true, true);

    target.dispatchEvent(evt);
};