<?php

require __DIR__ . '/vendor/autoload.php';


$hello = new ThomasInstitut\Hello\Hello();

echo "The backend says " . $hello->sayHello('World');