<?php

$conn = mysqli_connect(
    "localhost",
    "root",
    "",
    "hospital_locator"
);

if (!$conn) {
    die("Connection failed");
}

?>