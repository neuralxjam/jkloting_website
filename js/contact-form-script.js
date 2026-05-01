// Contact Form
$("#contactForm").validator().on("submit", function (event) {
    if (event.isDefaultPrevented()) {
        formError();
        submitMSG(false, "Did you fill in the form properly?");
    } else {
        event.preventDefault();
        submitContactForm();
    }
});

function submitContactForm() {
    $.ajax({
        type: "POST",
        url: "https://api.web3forms.com/submit",
        data: $("#contactForm").serialize(),
        dataType: "json",
        success: function (data) {
            if (data.success) {
                formSuccess();
            } else {
                formError();
                submitMSG(false, data.message || "Something went wrong. Please try again.");
            }
        },
        error: function () {
            formError();
            submitMSG(false, "Something went wrong. Please message us on Facebook.");
        }
    });
}

function formSuccess() {
    $("#contactForm")[0].reset();
    submitMSG(true, "Message Submitted!");
}

function formError() {
    $("#contactForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
        $(this).removeClass();
    });
}

function submitMSG(valid, msg) {
    var msgClasses = valid
        ? "h3 text-center tada animated text-success"
        : "h3 text-center text-danger";
    $("#msgSubmit").removeClass().addClass(msgClasses).text(msg);
}

// Quote Form
$("#quoteForm").validator().on("submit", function (event) {
    if (event.isDefaultPrevented()) {
        // validator shows inline errors
    } else {
        event.preventDefault();
        submitQuoteForm();
    }
});

function submitQuoteForm() {
    var $btn = $('#quote-submit');
    var $msg = $('#quoteSubmit');
    $btn.prop('disabled', true).text('Sending...');
    $.ajax({
        type: "POST",
        url: "https://api.web3forms.com/submit",
        data: $("#quoteForm").serialize(),
        dataType: "json",
        success: function (data) {
            if (data.success) {
                $("#quoteForm")[0].reset();
                $msg.removeClass('hidden text-danger')
                    .addClass('h3 text-center tada animated text-success')
                    .text("Quote Request Sent!");
            } else {
                $msg.removeClass('hidden text-success')
                    .addClass('h3 text-center text-danger')
                    .text(data.message || "Something went wrong. Please try again.");
            }
            $btn.prop('disabled', false).text('Submit Quote Request');
        },
        error: function () {
            $msg.removeClass('hidden text-success')
                .addClass('h3 text-center text-danger')
                .text("Something went wrong. Please message us on Facebook.");
            $btn.prop('disabled', false).text('Submit Quote Request');
        }
    });
}
