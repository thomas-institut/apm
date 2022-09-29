<?php

$string = "hebrew";

$encoding = mb_detect_encoding($string);

if ($encoding == "ASCII") {
    echo "Yeo";
}