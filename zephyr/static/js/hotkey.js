var hotkeys = (function () {

var exports = {};

var pressed_keys = {};

function num_pressed_keys() {
    var size = 0, key;
    for (key in pressed_keys) {
        if (pressed_keys.hasOwnProperty(key))
            size++;
    }
    return size;
}

var directional_hotkeys = {
    40:  rows.next_visible,  // down arrow
    106: rows.next_visible,  // 'j'
    38:  rows.prev_visible,  // up arrow
    107: rows.prev_visible,  // 'k'
    36:  rows.first_visible, // Home
    35:  rows.last_visible   // End
};

var narrow_hotkeys = {
    115: narrow.by_recipient,  // 's'
    83:  narrow.by_subject,    // 'S'
    104: narrow.all_personals  // 'h'
};

// These are not exported, but we declare them here to make JSLint happy.
var process_key_in_input, process_compose_hotkey;

function simulate_keydown(keycode) {
    $(document).trigger($.Event('keydown', {keyCode: keycode}));
}

function process_hotkey(code) {
    var next_message;

    // Disable hotkeys on settings page etc.
    if (!$('#home').hasClass('active')) {
        return false;
    }

    // Disable hotkeys when in an input, textarea, or button
    if ($('input:focus,textarea:focus,button:focus').length > 0) {
        return process_key_in_input(code);
    }

    if (directional_hotkeys.hasOwnProperty(code)) {
        next_message = directional_hotkeys[code](selected_message);
        if (next_message.length !== 0) {
            select_message(next_message, {then_scroll: true});
        }
        if ((next_message.length === 0) && (code === 40 || code === 106)) {
            // At the last message, scroll to the bottom so we have
            // lots of nice whitespace for new messages coming in.
            //
            // FIXME: this doesn't work for End because rows.last_visible()
            // always returns a message.
            viewport.scrollTop($("#main_div").outerHeight(true));
        }
        return process_hotkey;
    }

    if (narrow_hotkeys.hasOwnProperty(code)) {
        narrow.target(selected_message_id);
        narrow_hotkeys[code]();
        return process_hotkey;
    }

    if (num_pressed_keys() > 1 &&
            // "shift"                        "caps lock"
            !((pressed_keys[16] === true || pressed_keys[20]) &&
                num_pressed_keys() === 2)) {
        // If you are already holding down another key, none of these
        // actions apply.
        return false;
    }

    switch (code) {
    case 33: // Page Up
        if (at_top_of_viewport()) {
            select_message(rows.first_visible(), {then_scroll: false});
        }
        return false; // We want the browser to actually page up and down
    case 32: // Spacebar
    case 34: // Page Down
        if (at_bottom_of_viewport()) {
            select_message(rows.last_visible(), {then_scroll: false});
        }
        return false;
    case 27: // Esc: cancel compose or un-narrow
        if (compose.composing()) {
            compose.cancel();
        } else {
            narrow.show_all_messages();
        }
        return process_hotkey;
    case 99: // 'c': compose
        compose.start('stream');
        return process_compose_hotkey;
    case 67: // 'C': compose huddle
        compose.start('personal');
        return process_compose_hotkey;
    case 114: // 'r': respond to message
        respond_to_message();
        return process_hotkey;
    case 82: // 'R': respond to author
        respond_to_message("personal");
        return process_hotkey;
    }

    return false;
}

/* The current handler function for keydown events.
   It should return a new handler, or 'false' to
   decline to handle the event. */
var keydown_handler = process_hotkey;

process_key_in_input = function (code) {
    if (code === 27) {
        // If the user hit the escape key, cancel the current compose
        compose.cancel();
    }
    // Otherwise, let the browser handle the key normally
    return false;
};

process_compose_hotkey = function (code) {
    if (code === 9) { // Tab: toggles between stream and huddle compose tabs.
        compose.toggle_mode();
        return process_compose_hotkey;
    }
    // Process the first non-tab character and everything after it
    // like any other keys typed in the input box
    keydown_handler = process_hotkey;
    return process_hotkey(code);
};

exports.set_compose = function () {
    keydown_handler = process_compose_hotkey;
};

$(document).keydown(function (e) {
    pressed_keys[e.which] = true;
});

$(document).keyup(function (e) {
    pressed_keys = {};
});

/* We register both a keydown and a keypress function because
   we want to intercept pgup/pgdn, escape, etc, and process them
   as they happen on the keyboard. However, if we processed
   letters/numbers in keydown, we wouldn't know what the case of
   the letters were.

   We want case-sensitive hotkeys (such as in the case of r vs R)
   so we bail in .keydown if the event is a letter or number and
   instead just let keypress go for it. */

$(document).keydown(function (event) {
    if (48 > event.which ||90 < event.which) { // outside the alphanumeric range
        var result = keydown_handler(event.which);
        if (typeof result === 'function') {
            keydown_handler = result;
            event.preventDefault();
        }
    }
});

$(document).keypress(function (event) {
    // What exactly triggers .keypress may vary by browser.
    // Welcome to compatability hell.
    //
    // In particular, when you press tab in Firefox, it fires a
    // keypress event with keycode 0 after processing the original
    // event.
    if (event.which !== 0 && event.charCode !== 0) {
        var result = keydown_handler(event.which);
        if (typeof result === 'function') {
            keydown_handler = result;
            event.preventDefault();
        }
    }
});

return exports;

}());
