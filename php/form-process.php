<?php

$EmailTo = "jklothing.official@gmail.com";
$formType = isset($_POST["form_type"]) ? $_POST["form_type"] : "contact";

// --- Honeypot: silently swallow bot submissions ---
// The "website" field is hidden via CSS; only bots fill it.
if (!empty($_POST["website"])) {
    echo "success"; // Lie so the bot logs a "successful" submit and moves on.
    exit;
}

// --- Per-IP rate limit: 30s cooldown to deter spam floods ---
$ip = $_SERVER["REMOTE_ADDR"] ?? "unknown";
$throttleKey = preg_replace("/[^a-z0-9]/i", "_", $ip);
$throttleFile = sys_get_temp_dir() . "/jkl_throttle_" . $throttleKey;
if (file_exists($throttleFile) && (time() - filemtime($throttleFile)) < 30) {
    echo "Please wait a few seconds before sending another message.";
    exit;
}
@touch($throttleFile);

if ($formType === "barong_order") {

    $errors = [];

    $name     = trim($_POST["barong_name"] ?? "");
    $phone    = trim($_POST["barong_phone"] ?? "");
    $email    = trim($_POST["barong_email"] ?? "");
    $product  = trim($_POST["selected_product"] ?? "Polo Barong");
    $size     = trim($_POST["barong_size"] ?? "");
    $qty      = trim($_POST["barong_qty"] ?? "");
    $emb      = trim($_POST["barong_embroidery"] ?? "");
    $occasion = trim($_POST["barong_occasion"] ?? "");
    $deadline = trim($_POST["barong_deadline"] ?? "");
    $delivery = trim($_POST["barong_delivery"] ?? "");
    $notes    = trim($_POST["barong_notes"] ?? "");

    if (empty($name))  $errors[] = "Name is required.";
    if (empty($phone)) $errors[] = "Phone number is required.";
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Valid email is required.";
    if (empty($size))  $errors[] = "Please select a size.";
    if (empty($qty) || !is_numeric($qty) || $qty < 1) $errors[] = "Valid quantity is required.";
    if (empty($delivery)) $errors[] = "Please select a delivery preference.";

    if (!empty($errors)) {
        echo implode(" ", $errors);
        exit;
    }

    $Subject = "New Barong Order from " . htmlspecialchars($name);

    $Body  = "=== BARONG ORDER REQUEST ===\n\n";
    $Body .= "Product:    " . $product . "\n";
    $Body .= "Name:       " . $name . "\n";
    $Body .= "Phone:      " . $phone . "\n";
    $Body .= "Email:      " . $email . "\n\n";
    $Body .= "--- Order Details ---\n";
    $Body .= "Size:       " . $size . "\n";
    $Body .= "Quantity:   " . $qty . " pcs\n";
    $Body .= "Embroidery: " . ($emb === "yes" ? "Yes — quote separately" : "No") . "\n";
    $Body .= "Occasion:   " . ($occasion ?: "—") . "\n";
    $Body .= "Target Date:" . ($deadline ?: "Not specified") . "\n";
    $Body .= "Delivery:   " . $delivery . "\n\n";
    $Body .= "Notes:\n" . ($notes ?: "—") . "\n";

    $headers  = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";

    $success = mail($EmailTo, $Subject, $Body, $headers);

    echo $success ? "success" : "Something went wrong. Please try again or message us on Facebook.";

} elseif ($formType === "quote") {

    $errors = [];

    $name     = trim($_POST["quote_name"] ?? "");
    $email    = trim($_POST["quote_email"] ?? "");
    $phone    = trim($_POST["quote_phone"] ?? "");
    $garment  = trim($_POST["quote_garment"] ?? "");
    $qty      = trim($_POST["quote_qty"] ?? "");
    $deadline = trim($_POST["quote_deadline"] ?? "");
    $notes    = trim($_POST["quote_notes"] ?? "");

    if (empty($name))    $errors[] = "Name is required.";
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Valid email is required.";
    if (empty($garment)) $errors[] = "Garment type is required.";
    if (empty($qty) || !is_numeric($qty) || $qty < 1) $errors[] = "Valid quantity is required.";

    if (!empty($errors)) {
        echo implode(" ", $errors);
        exit;
    }

    $Subject = "New Quote Request from " . htmlspecialchars($name);

    $Body  = "=== QUOTE REQUEST ===\n\n";
    $Body .= "Name:     " . $name . "\n";
    $Body .= "Email:    " . $email . "\n";
    $Body .= "Phone:    " . ($phone ?: "—") . "\n";
    $Body .= "Garment:  " . $garment . "\n";
    $Body .= "Quantity: " . $qty . " pcs\n";
    $Body .= "Deadline: " . ($deadline ?: "Not specified") . "\n\n";
    $Body .= "Notes:\n" . ($notes ?: "—") . "\n\n";

    $headers  = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";

    $success = mail($EmailTo, $Subject, $Body, $headers);

    echo $success ? "success" : "Something went wrong. Please try again or message us on Facebook.";

} else {

    $errors = [];

    $name    = trim($_POST["name"] ?? "");
    $email   = trim($_POST["email"] ?? "");
    $message = trim($_POST["message"] ?? "");

    if (empty($name))    $errors[] = "Name is required.";
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Valid email is required.";
    if (empty($message)) $errors[] = "Message is required.";

    if (!empty($errors)) {
        echo implode(" ", $errors);
        exit;
    }

    $Subject = "New Message from " . htmlspecialchars($name);

    $Body  = "Name:    " . $name . "\n";
    $Body .= "Email:   " . $email . "\n\n";
    $Body .= "Message:\n" . $message . "\n";

    $headers  = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";

    $success = mail($EmailTo, $Subject, $Body, $headers);

    echo $success ? "success" : "Something went wrong. Please try again or message us on Facebook.";
}

?>
