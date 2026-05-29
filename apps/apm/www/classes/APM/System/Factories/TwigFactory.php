<?php

namespace APM\System\Factories;

use Slim\Views\Twig;
use Twig\Error\LoaderError;

class TwigFactory
{

    /**
     * @throws LoaderError
     */
    public static function create()  : Twig
    {
        return Twig::create('templates');

    }
}