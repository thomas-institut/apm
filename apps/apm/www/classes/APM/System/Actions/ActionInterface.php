<?php

namespace APM\System\Actions;

interface ActionInterface
{

    public function execute(mixed $payload): mixed;

}