// Contact Form (unified — handles general inquiries, quotes, custom orders)
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
    var $btn = $("#submit");
    $btn.prop("disabled", true).text("Sending...");
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
            $btn.prop("disabled", false).text("Send Message");
        },
        error: function () {
            formError();
            submitMSG(false, "Something went wrong. Please message us on Facebook.");
            $btn.prop("disabled", false).text("Send Message");
        }
    });
}

function formSuccess() {
    $("#contactForm")[0].reset();
    submitMSG(true, "Message sent! We'll reply within 24 hours.");
}

function formError() {
    $("#contactForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
        $(this).removeClass();
    });
}

function submitMSG(valid, msg) {
    var msgClasses = valid
        ? "h4 text-center tada animated text-success"
        : "h4 text-center text-danger";
    $("#msgSubmit").removeClass().addClass(msgClasses).text(msg);
}
