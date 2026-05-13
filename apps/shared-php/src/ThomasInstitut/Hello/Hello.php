<?php

namespace ThomasInstitut\Hello;

/**
 * A simple class that says hello
 *
 * Use it to test shared PHP code configuration in a project
 */
class Hello
{

    public function sayHello(string $name): string
    {
        return "Hello $name!";
    }
}